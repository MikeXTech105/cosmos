/*
  Forward-only foundation for server-side statutory-document generation.
  It intentionally does not backfill historical invoices or enable generation.
*/
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.GstComplianceSnapshots', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.GstComplianceSnapshots
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GstComplianceSnapshots PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        SalesInvoiceId BIGINT NOT NULL,
        CompanyGstRegistrationId BIGINT NOT NULL,
        SnapshotVersion INT NOT NULL CONSTRAINT DF_GstComplianceSnapshots_Version DEFAULT(1),
        Status NVARCHAR(30) NOT NULL CONSTRAINT DF_GstComplianceSnapshots_Status DEFAULT(N'PendingPolicy'),
        CanonicalPayloadJson NVARCHAR(MAX) NULL,
        SnapshotHash VARBINARY(32) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_GstComplianceSnapshots_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        CONSTRAINT FK_GstComplianceSnapshots_SalesInvoices FOREIGN KEY(SalesInvoiceId) REFERENCES dbo.SalesInvoices(Id),
        CONSTRAINT FK_GstComplianceSnapshots_Registrations FOREIGN KEY(CompanyGstRegistrationId) REFERENCES dbo.CompanyGstRegistrations(Id),
        CONSTRAINT CK_GstComplianceSnapshots_Status CHECK(Status IN(N'PendingPolicy',N'Validated',N'Invalid',N'Superseded')),
        CONSTRAINT CK_GstComplianceSnapshots_Hash CHECK((CanonicalPayloadJson IS NULL AND SnapshotHash IS NULL) OR (CanonicalPayloadJson IS NOT NULL AND DATALENGTH(SnapshotHash)=32))
    );
    CREATE UNIQUE INDEX UX_GstComplianceSnapshots_InvoiceVersion ON dbo.GstComplianceSnapshots(SalesInvoiceId, SnapshotVersion);
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_GstComplianceSnapshots_PreventMutation ON dbo.GstComplianceSnapshots AFTER UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    ROLLBACK TRANSACTION;
    THROW 52003, N'Compliance snapshots are immutable. Create an explicit superseding snapshot after an approved correction workflow.', 1;
END;
GO

IF OBJECT_ID(N'dbo.GstGenerationRequests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.GstGenerationRequests
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GstGenerationRequests PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        ComplianceSnapshotId UNIQUEIDENTIFIER NOT NULL,
        DocumentType NVARCHAR(20) NOT NULL,
        IdempotencyKey UNIQUEIDENTIFIER NOT NULL,
        PayloadFingerprint VARBINARY(32) NULL,
        State NVARCHAR(30) NOT NULL CONSTRAINT DF_GstGenerationRequests_State DEFAULT(N'NotEligible'),
        AttemptCount INT NOT NULL CONSTRAINT DF_GstGenerationRequests_AttemptCount DEFAULT(0),
        CorrelationId NVARCHAR(100) NULL,
        ProviderReference NVARCHAR(500) NULL,
        ErrorCode NVARCHAR(100) NULL,
        ErrorMessage NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_GstGenerationRequests_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,
        CreatedBy BIGINT NULL,
        UpdatedBy BIGINT NULL,
        CONSTRAINT FK_GstGenerationRequests_Snapshot FOREIGN KEY(ComplianceSnapshotId) REFERENCES dbo.GstComplianceSnapshots(Id),
        CONSTRAINT CK_GstGenerationRequests_DocumentType CHECK(DocumentType IN(N'EInvoice',N'EWayBill')),
        CONSTRAINT CK_GstGenerationRequests_State CHECK(State IN(N'NotEligible',N'Ready',N'InProgress',N'OutcomeUnknown',N'Confirmed',N'RetryableFailure',N'PermanentFailure',N'ReconciliationRequired')),
        CONSTRAINT CK_GstGenerationRequests_AttemptCount CHECK(AttemptCount>=0)
    );
    CREATE UNIQUE INDEX UX_GstGenerationRequests_IdempotencyKey ON dbo.GstGenerationRequests(IdempotencyKey);
    CREATE UNIQUE INDEX UX_GstGenerationRequests_SnapshotDocument ON dbo.GstGenerationRequests(ComplianceSnapshotId, DocumentType);
END;
GO

IF OBJECT_ID(N'dbo.GstGenerationAttempts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.GstGenerationAttempts
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GstGenerationAttempts PRIMARY KEY,
        GenerationRequestId UNIQUEIDENTIFIER NOT NULL,
        AttemptNumber INT NOT NULL,
        State NVARCHAR(30) NOT NULL,
        CorrelationId NVARCHAR(100) NULL,
        ProviderReference NVARCHAR(500) NULL,
        ErrorCode NVARCHAR(100) NULL,
        ErrorMessage NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_GstGenerationAttempts_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        CONSTRAINT FK_GstGenerationAttempts_Request FOREIGN KEY(GenerationRequestId) REFERENCES dbo.GstGenerationRequests(Id),
        CONSTRAINT UQ_GstGenerationAttempts_RequestNumber UNIQUE(GenerationRequestId, AttemptNumber),
        CONSTRAINT CK_GstGenerationAttempts_State CHECK(State IN(N'InProgress',N'Confirmed',N'OutcomeUnknown',N'RetryableFailure',N'PermanentFailure',N'ReconciliationRequired'))
    );
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_GstGenerationRequest_Reserve
    @ComplianceSnapshotId UNIQUEIDENTIFIER,
    @DocumentType NVARCHAR(20),
    @IdempotencyKey UNIQUEIDENTIFIER,
    @PayloadFingerprint VARBINARY(32),
    @CorrelationId NVARCHAR(100)=NULL,
    @UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;
    DECLARE @RequestId UNIQUEIDENTIFIER;
    SELECT @RequestId=Id FROM dbo.GstGenerationRequests WITH(UPDLOCK,HOLDLOCK)
    WHERE ComplianceSnapshotId=@ComplianceSnapshotId AND DocumentType=@DocumentType;
    IF @RequestId IS NOT NULL
    BEGIN
        COMMIT TRANSACTION;
        SELECT 200 StatusCode,N'Existing generation request returned; do not submit again until its state is resolved.' Message;
        SELECT * FROM dbo.GstGenerationRequests WHERE Id=@RequestId;
        RETURN;
    END;
    IF NOT EXISTS(SELECT 1 FROM dbo.GstComplianceSnapshots WITH(UPDLOCK,HOLDLOCK) WHERE Id=@ComplianceSnapshotId AND Status=N'Validated')
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT 409 StatusCode,N'A validated immutable compliance snapshot is required.' Message;
        RETURN;
    END;
    SET @RequestId=NEWID();
    INSERT dbo.GstGenerationRequests(Id,ComplianceSnapshotId,DocumentType,IdempotencyKey,PayloadFingerprint,State,CorrelationId,CreatedBy)
    VALUES(@RequestId,@ComplianceSnapshotId,@DocumentType,@IdempotencyKey,@PayloadFingerprint,N'Ready',@CorrelationId,@UserId);
    COMMIT TRANSACTION;
    SELECT 201 StatusCode,N'Generation request reserved. Provider submission remains a separate controlled operation.' Message;
    SELECT * FROM dbo.GstGenerationRequests WHERE Id=@RequestId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_GstGenerationRequest_RecordAttempt
    @GenerationRequestId UNIQUEIDENTIFIER,
    @ExpectedState NVARCHAR(30),
    @NewState NVARCHAR(30),
    @CorrelationId NVARCHAR(100)=NULL,
    @ProviderReference NVARCHAR(500)=NULL,
    @ErrorCode NVARCHAR(100)=NULL,
    @ErrorMessage NVARCHAR(1000)=NULL,
    @UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;
    DECLARE @Attempt INT;
    SELECT @Attempt=AttemptCount FROM dbo.GstGenerationRequests WITH(UPDLOCK,HOLDLOCK) WHERE Id=@GenerationRequestId AND State=@ExpectedState;
    IF @Attempt IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT 409 StatusCode,N'Generation request state changed or does not exist.' Message;
        RETURN;
    END;
    IF @NewState NOT IN(N'InProgress',N'Confirmed',N'OutcomeUnknown',N'RetryableFailure',N'PermanentFailure',N'ReconciliationRequired')
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 52004,N'Unsupported generation-request state.',1;
    END;
    IF NOT ((@ExpectedState=N'Ready' AND @NewState=N'InProgress')
        OR (@ExpectedState=N'InProgress' AND @NewState IN(N'Confirmed',N'OutcomeUnknown',N'RetryableFailure',N'PermanentFailure',N'ReconciliationRequired'))
        OR (@ExpectedState=N'OutcomeUnknown' AND @NewState=N'ReconciliationRequired')
        OR (@ExpectedState=N'RetryableFailure' AND @NewState=N'InProgress')
        OR (@ExpectedState=N'ReconciliationRequired' AND @NewState IN(N'Confirmed',N'PermanentFailure')))
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT 409 StatusCode,N'Invalid generation-request state transition.' Message;
        RETURN;
    END;
    SET @Attempt=@Attempt+1;
    UPDATE dbo.GstGenerationRequests SET State=@NewState,AttemptCount=@Attempt,CorrelationId=COALESCE(@CorrelationId,CorrelationId),ProviderReference=COALESCE(@ProviderReference,ProviderReference),ErrorCode=@ErrorCode,ErrorMessage=@ErrorMessage,UpdatedAt=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@GenerationRequestId;
    INSERT dbo.GstGenerationAttempts(GenerationRequestId,AttemptNumber,State,CorrelationId,ProviderReference,ErrorCode,ErrorMessage,CreatedBy)
    VALUES(@GenerationRequestId,@Attempt,@NewState,@CorrelationId,@ProviderReference,@ErrorCode,@ErrorMessage,@UserId);
    COMMIT TRANSACTION;
    SELECT 200 StatusCode,N'Generation request attempt recorded.' Message;
    SELECT * FROM dbo.GstGenerationRequests WHERE Id=@GenerationRequestId;
END;
GO

IF NOT EXISTS(SELECT 1 FROM dbo.EInvoices WHERE IsDeleted=0 AND Irn IS NOT NULL GROUP BY Irn HAVING COUNT(*)>1)
AND NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_EInvoices_Irn_Active' AND object_id=OBJECT_ID(N'dbo.EInvoices'))
    CREATE UNIQUE INDEX UX_EInvoices_Irn_Active ON dbo.EInvoices(Irn) WHERE IsDeleted=0 AND Irn IS NOT NULL;
ELSE IF EXISTS(SELECT 1 FROM dbo.EInvoices WHERE IsDeleted=0 AND Irn IS NOT NULL GROUP BY Irn HAVING COUNT(*)>1)
    THROW 52001, N'Cannot apply GST uniqueness: duplicate active E-Invoice IRNs exist. Resolve them before retrying.', 1;

IF NOT EXISTS(SELECT 1 FROM dbo.EWayBills WHERE IsDeleted=0 AND EWayBillNumber IS NOT NULL GROUP BY EWayBillNumber HAVING COUNT(*)>1)
AND NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_EWayBills_Number_Active' AND object_id=OBJECT_ID(N'dbo.EWayBills'))
    CREATE UNIQUE INDEX UX_EWayBills_Number_Active ON dbo.EWayBills(EWayBillNumber) WHERE IsDeleted=0 AND EWayBillNumber IS NOT NULL;
ELSE IF EXISTS(SELECT 1 FROM dbo.EWayBills WHERE IsDeleted=0 AND EWayBillNumber IS NOT NULL GROUP BY EWayBillNumber HAVING COUNT(*)>1)
    THROW 52002, N'Cannot apply GST uniqueness: duplicate active E-Way Bill numbers exist. Resolve them before retrying.', 1;

COMMIT TRANSACTION;
GO
