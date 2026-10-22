/*
 Phase 2 rule resolver and immutable snapshot foundation.
 Apply after 20261015_hsn_gst_phase1_foundation.sql and
 20261015_hsn_gst_phase1_mapping_lifecycle.sql.
 No Sales/Purchase table, row, procedure, or calculation is changed.
*/
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID(N'dbo.GstRateRules', N'U') IS NULL
   OR OBJECT_ID(N'dbo.GstRateRuleVersions', N'U') IS NULL
   OR OBJECT_ID(N'dbo.HsnSacMasters', N'U') IS NULL
   OR OBJECT_ID(N'dbo.ItemHsnOverrides', N'U') IS NULL
   OR OBJECT_ID(N'dbo.CategoryHsnDefaults', N'U') IS NULL
    THROW 51100, N'Phase 1 HSN/GST foundation and lifecycle objects are required.', 1;
GO
IF COL_LENGTH(N'dbo.GstRateRuleVersions', N'ApprovalStatus') IS NULL
    ALTER TABLE dbo.GstRateRuleVersions ADD ApprovalStatus TINYINT NOT NULL CONSTRAINT DF_GstRateRuleVersions_ApprovalStatus DEFAULT 0 WITH VALUES;
GO
IF COL_LENGTH(N'dbo.GstRateRuleVersions', N'ApprovedAtUtc') IS NULL
    ALTER TABLE dbo.GstRateRuleVersions ADD ApprovedAtUtc DATETIME2(3) NULL, ApprovedBy BIGINT NULL, RetiredAtUtc DATETIME2(3) NULL, RetiredBy BIGINT NULL, SupersededByVersionId BIGINT NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.GstRateRuleVersions') AND name=N'CK_GstRateRuleVersions_ApprovalStatus')
    ALTER TABLE dbo.GstRateRuleVersions ADD CONSTRAINT CK_GstRateRuleVersions_ApprovalStatus CHECK(ApprovalStatus IN(0,1,2));
GO
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.GstRateRuleVersions') AND name=N'FK_GstRateRuleVersions_SupersededBy')
    ALTER TABLE dbo.GstRateRuleVersions ADD CONSTRAINT FK_GstRateRuleVersions_SupersededBy FOREIGN KEY(SupersededByVersionId) REFERENCES dbo.GstRateRuleVersions(Id);
GO
IF OBJECT_ID(N'dbo.GstRateRuleVersionApplicabilities', N'U') IS NULL
CREATE TABLE dbo.GstRateRuleVersionApplicabilities
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GstRateRuleVersionApplicabilities PRIMARY KEY,
    GstRateRuleVersionId BIGINT NOT NULL,
    HsnSacId BIGINT NOT NULL,
    Priority INT NOT NULL CONSTRAINT DF_GstRuleApplicability_Priority DEFAULT 100,
    CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_GstRuleApplicability_Created DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL,
    CONSTRAINT FK_GstRuleApplicability_Version FOREIGN KEY(GstRateRuleVersionId) REFERENCES dbo.GstRateRuleVersions(Id),
    CONSTRAINT FK_GstRuleApplicability_Hsn FOREIGN KEY(HsnSacId) REFERENCES dbo.HsnSacMasters(Id),
    CONSTRAINT UQ_GstRuleApplicability_VersionHsn UNIQUE(GstRateRuleVersionId,HsnSacId),
    CONSTRAINT CK_GstRuleApplicability_Priority CHECK(Priority >= 0)
);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.GstRateRuleVersionApplicabilities') AND name=N'IX_GstRuleApplicability_Hsn')
    CREATE INDEX IX_GstRuleApplicability_Hsn ON dbo.GstRateRuleVersionApplicabilities(HsnSacId,GstRateRuleVersionId) INCLUDE(Priority);
GO
IF OBJECT_ID(N'dbo.GstRateRuleVersionComponents', N'U') IS NULL
CREATE TABLE dbo.GstRateRuleVersionComponents
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GstRateRuleVersionComponents PRIMARY KEY,
    GstRateRuleVersionId BIGINT NOT NULL,
    JurisdictionScope TINYINT NOT NULL,
    ComponentKind TINYINT NOT NULL,
    ComponentCode NVARCHAR(50) NOT NULL,
    Rate DECIMAL(5,2) NOT NULL,
    CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_GstRuleComponent_Created DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL,
    CONSTRAINT FK_GstRuleComponent_Version FOREIGN KEY(GstRateRuleVersionId) REFERENCES dbo.GstRateRuleVersions(Id),
    CONSTRAINT UQ_GstRuleComponent_Identity UNIQUE(GstRateRuleVersionId,JurisdictionScope,ComponentKind,ComponentCode),
    CONSTRAINT CK_GstRuleComponent_Scope CHECK(JurisdictionScope IN(1,2)),
    CONSTRAINT CK_GstRuleComponent_Kind CHECK(ComponentKind IN(1,2,3,4)),
    CONSTRAINT CK_GstRuleComponent_Rate CHECK(Rate >= 0 AND Rate <= 100)
);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.GstRateRuleVersionComponents') AND name=N'IX_GstRuleComponent_VersionScope')
    CREATE INDEX IX_GstRuleComponent_VersionScope ON dbo.GstRateRuleVersionComponents(GstRateRuleVersionId,JurisdictionScope) INCLUDE(ComponentKind,ComponentCode,Rate);
GO
CREATE OR ALTER PROCEDURE dbo.usp_GstTaxRuleVersion_Approve
    @VersionId BIGINT,
    @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    DECLARE @RuleId BIGINT, @From DATE, @To DATE, @TotalRate DECIMAL(5,2), @IsActive BIT, @Status TINYINT;
    SELECT @RuleId=GstRateRuleId,@From=EffectiveFrom,@To=EffectiveTo,@TotalRate=TotalRate,@IsActive=IsActive,@Status=ApprovalStatus
    FROM dbo.GstRateRuleVersions WITH(UPDLOCK,HOLDLOCK) WHERE Id=@VersionId;
    IF @RuleId IS NULL BEGIN ROLLBACK TRANSACTION; THROW 51101,N'GST rule version was not found.',1; END;
    IF @IsActive=0 OR @Status=2 BEGIN ROLLBACK TRANSACTION; THROW 51102,N'Inactive or retired rule versions cannot be approved.',1; END;
    IF NOT EXISTS(SELECT 1 FROM dbo.GstRateRuleVersionApplicabilities WITH(UPDLOCK,HOLDLOCK) WHERE GstRateRuleVersionId=@VersionId)
    BEGIN ROLLBACK TRANSACTION; THROW 51103,N'An approved rule version requires at least one HSN/SAC applicability.',1; END;
    IF NOT EXISTS(SELECT 1 FROM dbo.GstRateRuleVersionComponents WITH(UPDLOCK,HOLDLOCK) WHERE GstRateRuleVersionId=@VersionId AND JurisdictionScope=1)
       OR NOT EXISTS(SELECT 1 FROM dbo.GstRateRuleVersionComponents WITH(UPDLOCK,HOLDLOCK) WHERE GstRateRuleVersionId=@VersionId AND JurisdictionScope=2)
    BEGIN ROLLBACK TRANSACTION; THROW 51104,N'An approved rule version requires explicit intra-state and inter-state components.',1; END;
    IF EXISTS(SELECT 1 FROM dbo.GstRateRuleVersionComponents WITH(UPDLOCK,HOLDLOCK) WHERE GstRateRuleVersionId=@VersionId GROUP BY JurisdictionScope HAVING CAST(SUM(Rate) AS DECIMAL(5,2))<>@TotalRate)
    BEGIN ROLLBACK TRANSACTION; THROW 51105,N'Each jurisdiction component set must reconcile to the total rate before approval.',1; END;
    IF EXISTS(SELECT 1 FROM dbo.GstRateRuleVersions WITH(UPDLOCK,HOLDLOCK) WHERE GstRateRuleId=@RuleId AND Id<>@VersionId AND IsActive=1 AND ApprovalStatus=1 AND EffectiveFrom<=ISNULL(@To,'99991231') AND @From<=ISNULL(EffectiveTo,'99991231'))
    BEGIN ROLLBACK TRANSACTION; THROW 51106,N'Approved versions of the same GST rule cannot have overlapping effective dates.',1; END;
    UPDATE dbo.GstRateRuleVersions SET ApprovalStatus=1,ApprovedAtUtc=SYSUTCDATETIME(),ApprovedBy=@UserId,RetiredAtUtc=NULL,RetiredBy=NULL WHERE Id=@VersionId;
    COMMIT TRANSACTION;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_GstTaxCalculation_ResolveReference
    @ItemId BIGINT,
    @OnDate DATE
AS
BEGIN
    /*
       The declarations below are procedure-local. Deploy this complete CREATE OR ALTER batch,
       then invoke it with EXEC dbo.usp_GstTaxCalculation_ResolveReference; do not execute a
       selected fragment of the body as ad-hoc SQL.
    */
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    BEGIN TRANSACTION;

    DECLARE @MappingId BIGINT=NULL,@HsnSacId BIGINT=NULL,@Source NVARCHAR(30)=NULL,@EffectiveFrom DATE=NULL,@EffectiveTo DATE=NULL;
    ;WITH candidates AS
    (
        SELECT m.Id MappingId,m.HsnSacId,N'ProductOverride' Source,m.EffectiveFrom,m.EffectiveTo,1 Priority
        FROM dbo.ItemHsnOverrides m JOIN dbo.HsnSacMasters h ON h.Id=m.HsnSacId
        WHERE m.ItemId=@ItemId AND h.IsActive=1 AND h.IsDeleted=0 AND m.EffectiveFrom<=@OnDate AND(m.EffectiveTo IS NULL OR m.EffectiveTo>=@OnDate)
        UNION ALL
        SELECT m.Id,m.HsnSacId,N'CategoryDefault',m.EffectiveFrom,m.EffectiveTo,2
        FROM dbo.Items i JOIN dbo.CategoryHsnDefaults m ON m.CategoryId=i.CategoryId JOIN dbo.HsnSacMasters h ON h.Id=m.HsnSacId
        WHERE i.Id=@ItemId AND h.IsActive=1 AND h.IsDeleted=0 AND m.EffectiveFrom<=@OnDate AND(m.EffectiveTo IS NULL OR m.EffectiveTo>=@OnDate)
    )
    SELECT TOP(1) @MappingId=MappingId,@HsnSacId=HsnSacId,@Source=Source,@EffectiveFrom=EffectiveFrom,@EffectiveTo=EffectiveTo
    FROM candidates ORDER BY Priority,EffectiveFrom DESC,MappingId DESC;

    SELECT @MappingId MappingId,@HsnSacId HsnSacId,h.Code,h.CodeType,@Source Source,h.IsActive,@EffectiveFrom EffectiveFrom,@EffectiveTo EffectiveTo
    FROM dbo.HsnSacMasters h WHERE h.Id=@HsnSacId;

    DECLARE @CandidateVersions TABLE(VersionId BIGINT PRIMARY KEY);
    INSERT @CandidateVersions(VersionId)
    SELECT v.Id
    FROM dbo.GstRateRuleVersionApplicabilities a
    JOIN dbo.GstRateRuleVersions v ON v.Id=a.GstRateRuleVersionId
    JOIN dbo.GstRateRules r ON r.Id=v.GstRateRuleId AND r.IsDeleted=0
    WHERE a.HsnSacId=@HsnSacId AND v.IsActive=1 AND v.ApprovalStatus=1 AND v.EffectiveFrom<=@OnDate AND(v.EffectiveTo IS NULL OR v.EffectiveTo>=@OnDate);

    SELECT r.Id RuleId,v.Id VersionId,a.HsnSacId,r.RuleCode,v.ApprovalStatus,v.IsActive,v.EffectiveFrom,v.EffectiveTo,v.TotalRate,a.Priority
    FROM @CandidateVersions c JOIN dbo.GstRateRuleVersions v ON v.Id=c.VersionId JOIN dbo.GstRateRules r ON r.Id=v.GstRateRuleId JOIN dbo.GstRateRuleVersionApplicabilities a ON a.GstRateRuleVersionId=v.Id AND a.HsnSacId=@HsnSacId
    ORDER BY a.Priority,v.EffectiveFrom DESC,v.Id DESC;

    SELECT c.GstRateRuleVersionId VersionId,c.JurisdictionScope,c.ComponentKind,c.ComponentCode,c.Rate
    FROM dbo.GstRateRuleVersionComponents c JOIN @CandidateVersions v ON v.VersionId=c.GstRateRuleVersionId
    ORDER BY c.GstRateRuleVersionId,c.JurisdictionScope,c.Id;

    SELECT CASE
        WHEN @HsnSacId IS NULL THEN N'CLASSIFICATION_MISSING'
        WHEN NOT EXISTS(SELECT 1 FROM dbo.GstRateRuleVersionApplicabilities WHERE HsnSacId=@HsnSacId) THEN N'RULE_MISSING'
        WHEN NOT EXISTS(SELECT 1 FROM dbo.GstRateRuleVersionApplicabilities a JOIN dbo.GstRateRuleVersions v ON v.Id=a.GstRateRuleVersionId WHERE a.HsnSacId=@HsnSacId AND v.IsActive=1 AND v.ApprovalStatus=1) THEN N'RULE_UNAPPROVED_OR_INACTIVE'
        WHEN NOT EXISTS(SELECT 1 FROM @CandidateVersions) THEN N'RULE_NOT_EFFECTIVE'
        ELSE NULL END DiagnosticCode;
    COMMIT TRANSACTION;
END;
GO
IF OBJECT_ID(N'dbo.GstCalculationSnapshots', N'U') IS NULL
CREATE TABLE dbo.GstCalculationSnapshots
(
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GstCalculationSnapshots PRIMARY KEY CONSTRAINT DF_GstCalculationSnapshots_Id DEFAULT NEWSEQUENTIALID(),
    DocumentReference NVARCHAR(128) NULL,
    DocumentLineReference NVARCHAR(128) NULL,
    ItemId BIGINT NOT NULL,
    HsnSacId BIGINT NOT NULL,
    HsnSacCode NVARCHAR(50) NULL,
    HsnSacCodeType NVARCHAR(3) NULL,
    MappingId BIGINT NULL,
    MappingSource NVARCHAR(30) NOT NULL,
    MappingEffectiveFrom DATE NULL,
    MappingEffectiveTo DATE NULL,
    GstRateRuleId BIGINT NOT NULL,
    GstRateRuleVersionId BIGINT NOT NULL,
    RuleCode NVARCHAR(100) NULL,
    RuleApprovalStatus TINYINT NULL,
    RuleEffectiveFrom DATE NULL,
    RuleEffectiveTo DATE NULL,
    TransactionDate DATE NOT NULL,
    SellerRegistrationId BIGINT NOT NULL,
    SellerStateCode NVARCHAR(20) NOT NULL,
    BuyerTreatment TINYINT NOT NULL,
    BuyerStateCode NVARCHAR(20) NULL,
    PlaceOfSupplyStateCode NVARCHAR(20) NOT NULL,
    TransactionType TINYINT NOT NULL,
    PriceBasis TINYINT NOT NULL,
    Quantity DECIMAL(18,4) NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL,
    LineDiscountAmount DECIMAL(18,2) NOT NULL,
    TaxableChargeAmount DECIMAL(18,2) NOT NULL,
    TaxableValue DECIMAL(18,2) NOT NULL,
    TotalRate DECIMAL(5,2) NOT NULL,
    TotalTaxAmount DECIMAL(18,2) NOT NULL,
    CgstAmount DECIMAL(18,2) NOT NULL,
    SgstAmount DECIMAL(18,2) NOT NULL,
    IgstAmount DECIMAL(18,2) NOT NULL,
    OtherTaxAmount DECIMAL(18,2) NOT NULL,
    RoundingAdjustment DECIMAL(18,2) NOT NULL,
    TotalAmount DECIMAL(18,2) NOT NULL,
    CalculationEngineVersion NVARCHAR(50) NOT NULL,
    DecisionInputsJson NVARCHAR(MAX) NOT NULL,
    CalculationHash VARBINARY(32) NOT NULL,
    SupersedesSnapshotId UNIQUEIDENTIFIER NULL,
    CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_GstCalculationSnapshots_Created DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL,
    CONSTRAINT FK_GstCalculationSnapshots_Hsn FOREIGN KEY(HsnSacId) REFERENCES dbo.HsnSacMasters(Id),
    CONSTRAINT FK_GstCalculationSnapshots_Rule FOREIGN KEY(GstRateRuleId) REFERENCES dbo.GstRateRules(Id),
    CONSTRAINT FK_GstCalculationSnapshots_RuleVersion FOREIGN KEY(GstRateRuleVersionId) REFERENCES dbo.GstRateRuleVersions(Id),
    CONSTRAINT FK_GstCalculationSnapshots_Supersedes FOREIGN KEY(SupersedesSnapshotId) REFERENCES dbo.GstCalculationSnapshots(Id),
    CONSTRAINT CK_GstCalculationSnapshots_DecisionJson CHECK(ISJSON(DecisionInputsJson)=1)
);
IF COL_LENGTH(N'dbo.GstCalculationSnapshots', N'HsnSacCode') IS NULL
    ALTER TABLE dbo.GstCalculationSnapshots ADD HsnSacCode NVARCHAR(50) NULL;
IF COL_LENGTH(N'dbo.GstCalculationSnapshots', N'HsnSacCodeType') IS NULL
    ALTER TABLE dbo.GstCalculationSnapshots ADD HsnSacCodeType NVARCHAR(3) NULL;
IF COL_LENGTH(N'dbo.GstCalculationSnapshots', N'MappingEffectiveFrom') IS NULL
    ALTER TABLE dbo.GstCalculationSnapshots ADD MappingEffectiveFrom DATE NULL;
IF COL_LENGTH(N'dbo.GstCalculationSnapshots', N'MappingEffectiveTo') IS NULL
    ALTER TABLE dbo.GstCalculationSnapshots ADD MappingEffectiveTo DATE NULL;
IF COL_LENGTH(N'dbo.GstCalculationSnapshots', N'RuleCode') IS NULL
    ALTER TABLE dbo.GstCalculationSnapshots ADD RuleCode NVARCHAR(100) NULL;
IF COL_LENGTH(N'dbo.GstCalculationSnapshots', N'RuleApprovalStatus') IS NULL
    ALTER TABLE dbo.GstCalculationSnapshots ADD RuleApprovalStatus TINYINT NULL;
IF COL_LENGTH(N'dbo.GstCalculationSnapshots', N'RuleEffectiveFrom') IS NULL
    ALTER TABLE dbo.GstCalculationSnapshots ADD RuleEffectiveFrom DATE NULL;
IF COL_LENGTH(N'dbo.GstCalculationSnapshots', N'RuleEffectiveTo') IS NULL
    ALTER TABLE dbo.GstCalculationSnapshots ADD RuleEffectiveTo DATE NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.GstCalculationSnapshots') AND name=N'IX_GstCalculationSnapshots_DocumentLine')
    CREATE INDEX IX_GstCalculationSnapshots_DocumentLine ON dbo.GstCalculationSnapshots(DocumentReference,DocumentLineReference,CreatedAtUtc DESC);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.GstCalculationSnapshots') AND name=N'UX_GstCalculationSnapshots_Supersedes')
    CREATE UNIQUE INDEX UX_GstCalculationSnapshots_Supersedes ON dbo.GstCalculationSnapshots(SupersedesSnapshotId) WHERE SupersedesSnapshotId IS NOT NULL;
GO
IF OBJECT_ID(N'dbo.GstCalculationSnapshotComponents', N'U') IS NULL
CREATE TABLE dbo.GstCalculationSnapshotComponents
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GstCalculationSnapshotComponents PRIMARY KEY,
    SnapshotId UNIQUEIDENTIFIER NOT NULL,
    ComponentKind TINYINT NOT NULL,
    ComponentCode NVARCHAR(50) NOT NULL,
    Rate DECIMAL(5,2) NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    CONSTRAINT FK_GstCalculationSnapshotComponents_Snapshot FOREIGN KEY(SnapshotId) REFERENCES dbo.GstCalculationSnapshots(Id),
    CONSTRAINT UQ_GstCalculationSnapshotComponents_Identity UNIQUE(SnapshotId,ComponentKind,ComponentCode)
);
GO
CREATE OR ALTER TRIGGER dbo.trg_GstCalculationSnapshots_PreventMutation ON dbo.GstCalculationSnapshots AFTER UPDATE,DELETE AS
BEGIN
    SET NOCOUNT ON;
    THROW 51110,N'GST calculation snapshots are immutable; create a superseding snapshot instead.',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_GstCalculationSnapshotComponents_PreventMutation ON dbo.GstCalculationSnapshotComponents AFTER UPDATE,DELETE AS
BEGIN
    SET NOCOUNT ON;
    THROW 51111,N'GST calculation snapshot components are immutable.',1;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_GstCalculationSnapshot_Create
    @DocumentReference NVARCHAR(128)=NULL,@DocumentLineReference NVARCHAR(128)=NULL,@ItemId BIGINT,@HsnSacId BIGINT,@HsnSacCode NVARCHAR(50),@HsnSacCodeType NVARCHAR(3),@MappingId BIGINT=NULL,@MappingSource NVARCHAR(30),@MappingEffectiveFrom DATE=NULL,@MappingEffectiveTo DATE=NULL,
    @GstRateRuleId BIGINT,@GstRateRuleVersionId BIGINT,@RuleCode NVARCHAR(100),@RuleApprovalStatus TINYINT,@RuleEffectiveFrom DATE,@RuleEffectiveTo DATE=NULL,@TransactionDate DATE,@SellerRegistrationId BIGINT,@SellerStateCode NVARCHAR(20),@BuyerTreatment TINYINT,@BuyerStateCode NVARCHAR(20)=NULL,@PlaceOfSupplyStateCode NVARCHAR(20),@TransactionType TINYINT,@PriceBasis TINYINT,
    @Quantity DECIMAL(18,4),@UnitPrice DECIMAL(18,2),@LineDiscountAmount DECIMAL(18,2),@TaxableChargeAmount DECIMAL(18,2),@TaxableValue DECIMAL(18,2),@TotalRate DECIMAL(5,2),@TotalTaxAmount DECIMAL(18,2),@CgstAmount DECIMAL(18,2),@SgstAmount DECIMAL(18,2),@IgstAmount DECIMAL(18,2),@OtherTaxAmount DECIMAL(18,2),@RoundingAdjustment DECIMAL(18,2),@TotalAmount DECIMAL(18,2),@CalculationEngineVersion NVARCHAR(50),@DecisionInputsJson NVARCHAR(MAX),@ComponentsJson NVARCHAR(MAX),@SupersedesSnapshotId UNIQUEIDENTIFIER=NULL,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF ISJSON(@DecisionInputsJson)<>1 OR ISJSON(@ComponentsJson)<>1 THROW 51112,N'Canonical decision inputs and components must be valid JSON.',1;
    IF @TotalAmount<>@TaxableValue+@TotalTaxAmount+@RoundingAdjustment THROW 51113,N'Snapshot totals do not reconcile.',1;
    IF @MappingSource NOT IN(N'ProductOverride',N'CategoryDefault') OR @HsnSacCode IS NULL OR @HsnSacCodeType NOT IN(N'HSN',N'SAC')
        THROW 51117,N'Snapshot classification source and code identity are required.',1;
    BEGIN TRANSACTION;
    IF @SupersedesSnapshotId IS NOT NULL
       AND NOT EXISTS
       (
           SELECT 1
           FROM dbo.GstCalculationSnapshots WITH(UPDLOCK,HOLDLOCK)
           WHERE Id=@SupersedesSnapshotId
             AND ItemId=@ItemId
             AND ((DocumentReference=@DocumentReference) OR (DocumentReference IS NULL AND @DocumentReference IS NULL))
             AND ((DocumentLineReference=@DocumentLineReference) OR (DocumentLineReference IS NULL AND @DocumentLineReference IS NULL))
       )
        THROW 51120,N'A superseding snapshot must reference an existing snapshot for the same document line and item.',1;
    IF NOT EXISTS(SELECT 1 FROM dbo.HsnSacMasters WHERE Id=@HsnSacId AND Code=@HsnSacCode AND CodeType=@HsnSacCodeType)
        THROW 51118,N'Snapshot HSN/SAC identity does not match the supplied master classification.',1;
    IF @RuleApprovalStatus<>1
       OR NOT EXISTS(SELECT 1 FROM dbo.GstRateRuleVersions v JOIN dbo.GstRateRules r ON r.Id=v.GstRateRuleId JOIN dbo.GstRateRuleVersionApplicabilities a ON a.GstRateRuleVersionId=v.Id AND a.HsnSacId=@HsnSacId WHERE v.Id=@GstRateRuleVersionId AND v.GstRateRuleId=@GstRateRuleId AND r.RuleCode=@RuleCode AND v.IsActive=1 AND v.ApprovalStatus=1 AND v.EffectiveFrom=@RuleEffectiveFrom AND((v.EffectiveTo=@RuleEffectiveTo)OR(v.EffectiveTo IS NULL AND @RuleEffectiveTo IS NULL)) AND v.EffectiveFrom<=@TransactionDate AND(v.EffectiveTo IS NULL OR v.EffectiveTo>=@TransactionDate) AND v.TotalRate=@TotalRate)
        THROW 51115,N'Snapshot rule identity does not match the supplied rule version.',1;
    DECLARE @Components TABLE(ComponentKind TINYINT NULL,ComponentCode NVARCHAR(50) NULL,Rate DECIMAL(5,2) NULL,Amount DECIMAL(18,2) NULL);
    INSERT @Components(ComponentKind,ComponentCode,Rate,Amount)
    SELECT ComponentKind,ComponentCode,Rate,Amount FROM OPENJSON(@ComponentsJson) WITH(ComponentKind TINYINT '$.componentKind',ComponentCode NVARCHAR(50) '$.componentCode',Rate DECIMAL(5,2) '$.rate',Amount DECIMAL(18,2) '$.amount');
    IF NOT EXISTS(SELECT 1 FROM @Components) THROW 51114,N'A snapshot requires at least one component.',1;
    IF EXISTS(SELECT 1 FROM @Components WHERE ComponentKind NOT IN(1,2,3,4) OR NULLIF(LTRIM(RTRIM(ComponentCode)),N'') IS NULL OR Rate IS NULL OR Amount IS NULL OR Rate<0 OR Amount<0)
        THROW 51119,N'Snapshot components require supported kinds, codes, and non-negative rate and amount values.',1;
    IF @TotalTaxAmount<>(SELECT SUM(Amount) FROM @Components) OR @TotalRate<>(SELECT SUM(Rate) FROM @Components) OR @TotalTaxAmount<>@CgstAmount+@SgstAmount+@IgstAmount+@OtherTaxAmount
        THROW 51116,N'Snapshot component rates and amounts do not reconcile to supplied totals.',1;
    DECLARE @Id UNIQUEIDENTIFIER=NEWID();
    INSERT dbo.GstCalculationSnapshots(Id,DocumentReference,DocumentLineReference,ItemId,HsnSacId,HsnSacCode,HsnSacCodeType,MappingId,MappingSource,MappingEffectiveFrom,MappingEffectiveTo,GstRateRuleId,GstRateRuleVersionId,RuleCode,RuleApprovalStatus,RuleEffectiveFrom,RuleEffectiveTo,TransactionDate,SellerRegistrationId,SellerStateCode,BuyerTreatment,BuyerStateCode,PlaceOfSupplyStateCode,TransactionType,PriceBasis,Quantity,UnitPrice,LineDiscountAmount,TaxableChargeAmount,TaxableValue,TotalRate,TotalTaxAmount,CgstAmount,SgstAmount,IgstAmount,OtherTaxAmount,RoundingAdjustment,TotalAmount,CalculationEngineVersion,DecisionInputsJson,CalculationHash,SupersedesSnapshotId,CreatedBy)
    VALUES(@Id,@DocumentReference,@DocumentLineReference,@ItemId,@HsnSacId,@HsnSacCode,@HsnSacCodeType,@MappingId,@MappingSource,@MappingEffectiveFrom,@MappingEffectiveTo,@GstRateRuleId,@GstRateRuleVersionId,@RuleCode,@RuleApprovalStatus,@RuleEffectiveFrom,@RuleEffectiveTo,@TransactionDate,@SellerRegistrationId,@SellerStateCode,@BuyerTreatment,@BuyerStateCode,@PlaceOfSupplyStateCode,@TransactionType,@PriceBasis,@Quantity,@UnitPrice,@LineDiscountAmount,@TaxableChargeAmount,@TaxableValue,@TotalRate,@TotalTaxAmount,@CgstAmount,@SgstAmount,@IgstAmount,@OtherTaxAmount,@RoundingAdjustment,@TotalAmount,@CalculationEngineVersion,@DecisionInputsJson,HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@DecisionInputsJson)),@SupersedesSnapshotId,@UserId);
    INSERT dbo.GstCalculationSnapshotComponents(SnapshotId,ComponentKind,ComponentCode,Rate,Amount)
    SELECT @Id,ComponentKind,ComponentCode,Rate,Amount FROM @Components;
    COMMIT TRANSACTION;
    SELECT @Id Id,CalculationHash FROM dbo.GstCalculationSnapshots WHERE Id=@Id;
END;
GO
