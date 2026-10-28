/* Additive E-Way Bill extension command tracking. No tax documents are issued by this script.
   Requires 003_gst_integration_module.sql. Run only after backup in the ordered upgrade plan. */
SET XACT_ABORT ON;
GO
IF OBJECT_ID(N'dbo.EWayBills',N'U') IS NULL THROW 52010,N'GST integration foundation is required before E-Way extension commands.',1;
IF COL_LENGTH(N'dbo.EWayBills',N'ProviderCommandVersion') IS NULL ALTER TABLE dbo.EWayBills ADD ProviderCommandVersion ROWVERSION;
GO
IF OBJECT_ID(N'dbo.GstEWayExtensionCommands',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.GstEWayExtensionCommands(
  IdempotencyKey UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GstEWayExtensionCommands PRIMARY KEY,
  EWayBillId BIGINT NOT NULL CONSTRAINT FK_GstEWayExtensionCommands_Bill REFERENCES dbo.EWayBills(Id),
  PayloadFingerprint VARBINARY(32) NOT NULL,
  ReservedVersion BINARY(8) NOT NULL,
  PriorValidUpTo DATETIME2 NOT NULL,
  State NVARCHAR(30) NOT NULL,
  IsTerminal BIT NOT NULL CONSTRAINT DF_GstEWayExtensionCommands_Terminal DEFAULT(0),
  ResponseJson NVARCHAR(MAX) NULL,
  CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_GstEWayExtensionCommands_Created DEFAULT SYSUTCDATETIME(),
  UpdatedAtUtc DATETIME2 NULL,
  CreatedBy BIGINT NULL,UpdatedBy BIGINT NULL,
  CONSTRAINT CK_GstEWayExtensionCommands_State CHECK(State IN(N'InProgress',N'OutcomeUnknown',N'Confirmed',N'Rejected')),
  CONSTRAINT CK_GstEWayExtensionCommands_Hash CHECK(DATALENGTH(PayloadFingerprint)=32),
  CONSTRAINT CK_GstEWayExtensionCommands_Response CHECK(ResponseJson IS NULL OR ISJSON(ResponseJson)=1)
 );
 CREATE UNIQUE INDEX UX_GstEWayExtensionCommands_Unresolved ON dbo.GstEWayExtensionCommands(EWayBillId) WHERE IsTerminal=0;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_EWayBill_GetByNumber @EWayBillNumber NVARCHAR(100) AS
BEGIN
 SET NOCOUNT ON;
 SELECT e.*,CONVERT(VARCHAR(18),e.ProviderCommandVersion,1) ConcurrencyVersion FROM dbo.EWayBills e WHERE e.EWayBillNumber=@EWayBillNumber AND e.IsDeleted=0;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_GstEWayExtension_Get @IdempotencyKey UNIQUEIDENTIFIER AS
BEGIN
 SET NOCOUNT ON;
 SELECT c.IdempotencyKey,c.EWayBillId,e.CompanyGstRegistrationId,e.EWayBillNumber,c.State,CAST(0 AS BIT) IsNew,c.PriorValidUpTo
 FROM dbo.GstEWayExtensionCommands c JOIN dbo.EWayBills e ON e.Id=c.EWayBillId AND e.IsDeleted=0 WHERE c.IdempotencyKey=@IdempotencyKey;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_GstEWayExtension_Reserve
 @CompanyGstRegistrationId BIGINT,@EWayBillNumber NVARCHAR(100),@IdempotencyKey UNIQUEIDENTIFIER,@Version VARCHAR(18),@PayloadFingerprint VARBINARY(32),@PriorValidUpTo DATETIME2,@UserId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY BEGIN TRAN;
 DECLARE @Bill BIGINT,@CurrentVersion BINARY(8),@Status NVARCHAR(50),@ExistingBill BIGINT,@ExistingHash VARBINARY(32);
 SELECT @ExistingBill=EWayBillId,@ExistingHash=PayloadFingerprint FROM dbo.GstEWayExtensionCommands WITH(UPDLOCK,HOLDLOCK) WHERE IdempotencyKey=@IdempotencyKey;
 IF @ExistingBill IS NOT NULL
 BEGIN
  IF @ExistingHash<>@PayloadFingerprint OR NOT EXISTS(SELECT 1 FROM dbo.EWayBills WHERE Id=@ExistingBill AND CompanyGstRegistrationId=@CompanyGstRegistrationId AND EWayBillNumber=@EWayBillNumber AND IsDeleted=0)
  BEGIN ROLLBACK;SELECT 409 StatusCode,N'An extension command key cannot be reused for changed intent or another document.' Message;RETURN;END;
  COMMIT;SELECT 200 StatusCode,N'Existing extension command returned; its result must be reconciled before another submission.' Message;
  EXEC dbo.sp_GstEWayExtension_Get @IdempotencyKey;RETURN;
 END;
 SELECT @Bill=Id,@CurrentVersion=ProviderCommandVersion,@Status=Status FROM dbo.EWayBills WITH(UPDLOCK,HOLDLOCK) WHERE EWayBillNumber=@EWayBillNumber AND CompanyGstRegistrationId=@CompanyGstRegistrationId AND IsDeleted=0;
 IF @Bill IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Stored E-Way Bill does not belong to the selected GST registration.' Message;RETURN;END;
 IF @CurrentVersion<>TRY_CONVERT(BINARY(8),@Version,1) OR TRY_CONVERT(BINARY(8),@Version,1) IS NULL BEGIN ROLLBACK;SELECT 409 StatusCode,N'The stored E-Way Bill changed. Reload it before reviewing an extension.' Message;RETURN;END;
 IF @Status NOT IN(N'ACT',N'Active',N'Generated',N'Extended',N'VehicleUpdated') BEGIN ROLLBACK;SELECT 409 StatusCode,N'Only a stored active E-Way Bill can be extended.' Message;RETURN;END;
 IF @PriorValidUpTo IS NULL OR DATALENGTH(@PayloadFingerprint)<>32 BEGIN ROLLBACK;SELECT 400 StatusCode,N'A verified provider validity and command fingerprint are required.' Message;RETURN;END;
 IF EXISTS(SELECT 1 FROM dbo.GstEWayExtensionCommands WITH(UPDLOCK,HOLDLOCK) WHERE EWayBillId=@Bill AND IsTerminal=0) BEGIN ROLLBACK;SELECT 409 StatusCode,N'An earlier extension has an unresolved outcome. Reconcile that command before another extension.' Message;RETURN;END;
 INSERT dbo.GstEWayExtensionCommands(IdempotencyKey,EWayBillId,PayloadFingerprint,ReservedVersion,PriorValidUpTo,State,CreatedBy) VALUES(@IdempotencyKey,@Bill,@PayloadFingerprint,@CurrentVersion,@PriorValidUpTo,N'InProgress',@UserId);
 COMMIT;
 SELECT 201 StatusCode,N'Extension command reserved.' Message;
 SELECT c.IdempotencyKey,c.EWayBillId,e.CompanyGstRegistrationId,e.EWayBillNumber,c.State,CAST(1 AS BIT) IsNew,c.PriorValidUpTo FROM dbo.GstEWayExtensionCommands c JOIN dbo.EWayBills e ON e.Id=c.EWayBillId WHERE c.IdempotencyKey=@IdempotencyKey;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_GstEWayExtension_Complete
 @IdempotencyKey UNIQUEIDENTIFIER,@Confirmed BIT,@ValidUpTo DATETIME2=NULL,@VehicleNumber NVARCHAR(50)=NULL,@TransportMode NVARCHAR(20)=NULL,@ResponseJson NVARCHAR(MAX)=NULL,@UserId BIGINT=NULL,@Rejected BIT=0 AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY BEGIN TRAN;
 DECLARE @Bill BIGINT,@Version BINARY(8),@Prior DATETIME2,@State NVARCHAR(30);
 SELECT @Bill=EWayBillId,@Version=ReservedVersion,@Prior=PriorValidUpTo,@State=State FROM dbo.GstEWayExtensionCommands WITH(UPDLOCK,HOLDLOCK) WHERE IdempotencyKey=@IdempotencyKey;
 IF @Bill IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Extension command was not found.' Message;RETURN;END;
 IF @State=N'Confirmed' BEGIN COMMIT;SELECT 200 StatusCode,N'Existing confirmed extension returned.' Message;SELECT e.*,CONVERT(VARCHAR(18),e.ProviderCommandVersion,1) ConcurrencyVersion FROM dbo.EWayBills e WHERE e.Id=@Bill AND e.IsDeleted=0;RETURN;END;
 IF @State=N'Rejected' BEGIN ROLLBACK;SELECT 409 StatusCode,N'A rejected extension cannot be marked confirmed; review a new command.' Message;RETURN;END;
 IF @Confirmed=1 AND (@ValidUpTo IS NULL OR @ValidUpTo<=@Prior) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Provider readback must confirm a later validity for this exact E-Way Bill.' Message;RETURN;END;
 IF @Confirmed=1
 BEGIN
  UPDATE dbo.EWayBills SET ValidUpTo=@ValidUpTo,VehicleNumber=COALESCE(@VehicleNumber,VehicleNumber),TransportMode=COALESCE(@TransportMode,TransportMode),GeneratedResponseJson=COALESCE(@ResponseJson,GeneratedResponseJson),Status=N'ACT',UpdatedAt=SYSUTCDATETIME(),UpdatedBy=@UserId
  WHERE Id=@Bill AND IsDeleted=0 AND ProviderCommandVersion=@Version AND Status NOT IN(N'Cancelled',N'CNL',N'Closed');
  IF @@ROWCOUNT<>1
  BEGIN
   -- A separate readback may already have saved the same or a later authoritative validity.
   -- Confirm that observation without overwriting its newer vehicle/status metadata.
   IF EXISTS(SELECT 1 FROM dbo.EWayBills WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Bill AND IsDeleted=0 AND ValidUpTo>=@ValidUpTo AND Status IN(N'ACT',N'Active',N'Generated',N'Extended',N'VehicleUpdated'))
   BEGIN
    UPDATE dbo.GstEWayExtensionCommands SET State=N'Confirmed',IsTerminal=1,ResponseJson=COALESCE(@ResponseJson,ResponseJson),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE IdempotencyKey=@IdempotencyKey;
    COMMIT;SELECT 200 StatusCode,N'Provider validity was already reconciled locally; newer metadata preserved.' Message;
    SELECT e.*,CONVERT(VARCHAR(18),e.ProviderCommandVersion,1) ConcurrencyVersion FROM dbo.EWayBills e WHERE e.Id=@Bill AND e.IsDeleted=0;RETURN;
   END;
   UPDATE dbo.GstEWayExtensionCommands SET State=N'OutcomeUnknown',ResponseJson=COALESCE(@ResponseJson,ResponseJson),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE IdempotencyKey=@IdempotencyKey;
   COMMIT;SELECT 409 StatusCode,N'Provider extension returned but the local E-Way Bill changed. Reconcile without resubmitting.' Message;RETURN;
  END;
 END;
 UPDATE dbo.GstEWayExtensionCommands SET State=CASE WHEN @Confirmed=1 THEN N'Confirmed' WHEN @Rejected=1 THEN N'Rejected' ELSE N'OutcomeUnknown' END,IsTerminal=IIF(@Confirmed=1 OR @Rejected=1,1,0),ResponseJson=COALESCE(@ResponseJson,ResponseJson),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE IdempotencyKey=@IdempotencyKey;
 COMMIT;
 SELECT 200 StatusCode,IIF(@Confirmed=1,N'Extended validity persisted.',N'Extension outcome is unresolved; provider readback is required.') Message;
 SELECT e.*,CONVERT(VARCHAR(18),e.ProviderCommandVersion,1) ConcurrencyVersion FROM dbo.EWayBills e WHERE e.Id=@Bill AND e.IsDeleted=0;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO
