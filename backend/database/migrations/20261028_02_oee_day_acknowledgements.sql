-- Additive OEE operational acknowledgements; no generated readings or stock events.
-- Apply after OEE module migrations. An acknowledgement is not a shift calendar.
SET XACT_ABORT ON;
GO
IF OBJECT_ID(N'dbo.OeeMachineDayAcknowledgements',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.OeeMachineDayAcknowledgements(
  Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OeeMachineDayAcknowledgements PRIMARY KEY,
  ProductionDate DATE NOT NULL,
  MachineId BIGINT NOT NULL,
  State NVARCHAR(20) NOT NULL,
  Reason NVARCHAR(700) NOT NULL,
  PreviousId BIGINT NULL,
  CommandKey UNIQUEIDENTIFIER NOT NULL,
  PayloadHash VARBINARY(32) NOT NULL,
  CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_OeeDayAcknowledgements_Created DEFAULT SYSUTCDATETIME(),
  CreatedBy BIGINT NULL,
  CONSTRAINT FK_OeeDayAcknowledgements_Machine FOREIGN KEY(MachineId) REFERENCES dbo.OeeMachines(Id),
  CONSTRAINT FK_OeeDayAcknowledgements_Previous FOREIGN KEY(PreviousId) REFERENCES dbo.OeeMachineDayAcknowledgements(Id),
  CONSTRAINT CK_OeeDayAcknowledgements_State CHECK(State IN(N'NotRun',N'PlannedStop',N'Withdrawn')),
  CONSTRAINT UQ_OeeDayAcknowledgements_Command UNIQUE(CommandKey)
 );
 CREATE INDEX IX_OeeDayAcknowledgements_DateMachine ON dbo.OeeMachineDayAcknowledgements(ProductionDate,MachineId,Id DESC);
 CREATE UNIQUE INDEX UX_OeeDayAcknowledgements_Revision ON dbo.OeeMachineDayAcknowledgements(PreviousId) WHERE PreviousId IS NOT NULL;
END;
GO
CREATE OR ALTER TRIGGER dbo.TR_OeeDayAcknowledgements_AppendOnly ON dbo.OeeMachineDayAcknowledgements
AFTER UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;THROW 52083,N'OEE machine day acknowledgement history is append-only; create a linked revision.',1;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_OeeDayAcknowledgement_List
 @FromDate DATE,@ToDate DATE,@MachineId BIGINT=NULL,@PageNumber INT=1,@PageSize INT=100
AS
BEGIN
 SET NOCOUNT ON;
 SELECT a.Id,a.ProductionDate,a.MachineId,m.MachineCode,m.MachineName,a.State,a.Reason,a.PreviousId,a.CreatedAt,a.CreatedBy,COUNT(*) OVER() TotalCount
 FROM dbo.OeeMachineDayAcknowledgements a JOIN dbo.OeeMachines m ON m.Id=a.MachineId
 WHERE a.ProductionDate BETWEEN @FromDate AND @ToDate AND(@MachineId IS NULL OR a.MachineId=@MachineId)
 AND NOT EXISTS(SELECT 1 FROM dbo.OeeMachineDayAcknowledgements newer WHERE newer.ProductionDate=a.ProductionDate AND newer.MachineId=a.MachineId AND newer.Id>a.Id)
 ORDER BY a.ProductionDate DESC,m.MachineCode,a.Id OFFSET((@PageNumber-1)*@PageSize) ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_OeeDayAcknowledgement_Save
 @ProductionDate DATE,@MachineId BIGINT,@State NVARCHAR(20),@Reason NVARCHAR(700),@PreviousId BIGINT=NULL,@CommandKey UNIQUEIDENTIFIER,@UserId BIGINT=NULL
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Latest BIGINT,@Id BIGINT,@PriorHash VARBINARY(32),@Hash VARBINARY(32)=HASHBYTES('SHA2_256',CONCAT(CONVERT(CHAR(10),@ProductionDate,23),N'|',@MachineId,N'|',@State,N'|',@Reason,N'|',@PreviousId));
 IF @ProductionDate IS NULL OR @MachineId<=0 OR @State NOT IN(N'NotRun',N'PlannedStop',N'Withdrawn') OR NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL OR @CommandKey IS NULL
 BEGIN SELECT 400 StatusCode,N'An operational date, machine, supported state, reason and command identity are required.' Message;RETURN;END;
 BEGIN TRY
  BEGIN TRAN;
  -- Use the existing machine as a mutex also for the first acknowledgement.
  IF NOT EXISTS(SELECT 1 FROM dbo.OeeMachines WITH(UPDLOCK,HOLDLOCK) WHERE Id=@MachineId AND IsDeleted=0 AND IsActive=1)
  BEGIN ROLLBACK;SELECT 409 StatusCode,N'Choose a current active machine.' Message;RETURN;END;
  SELECT @Id=Id,@PriorHash=PayloadHash FROM dbo.OeeMachineDayAcknowledgements WITH(UPDLOCK,HOLDLOCK) WHERE CommandKey=@CommandKey;
  IF @Id IS NOT NULL
  BEGIN
   IF @PriorHash<>@Hash BEGIN ROLLBACK;SELECT 409 StatusCode,N'This command key belongs to another acknowledgement intent.' Message;RETURN;END;
  END
  ELSE
  BEGIN
   SELECT TOP(1) @Latest=Id FROM dbo.OeeMachineDayAcknowledgements WITH(UPDLOCK,HOLDLOCK) WHERE ProductionDate=@ProductionDate AND MachineId=@MachineId ORDER BY Id DESC;
   IF ISNULL(@Latest,0)<>ISNULL(@PreviousId,0) OR(@State=N'Withdrawn' AND @Latest IS NULL)
   BEGIN ROLLBACK;SELECT 409 StatusCode,N'The machine day changed. Reload and review its latest acknowledgement.' Message;RETURN;END;
   IF @State<>N'Withdrawn' AND EXISTS(SELECT 1 FROM dbo.OeeProductionEntries WITH(UPDLOCK,HOLDLOCK) WHERE ProductionDate=@ProductionDate AND MachineId=@MachineId AND IsDeleted=0)
   BEGIN ROLLBACK;SELECT 409 StatusCode,N'This machine already has a saved reading on this date. Correct that reading through its authorized history action before acknowledging a stopped day.' Message;RETURN;END;
   INSERT dbo.OeeMachineDayAcknowledgements(ProductionDate,MachineId,State,Reason,PreviousId,CommandKey,PayloadHash,CreatedBy)
    VALUES(@ProductionDate,@MachineId,@State,@Reason,@PreviousId,@CommandKey,@Hash,@UserId);
   SET @Id=SCOPE_IDENTITY();
  END;
  COMMIT;
  SELECT 200 StatusCode,N'Machine day acknowledged. No reading or stock movement was created.' Message;
  SELECT a.Id,a.ProductionDate,a.MachineId,m.MachineCode,m.MachineName,a.State,a.Reason,a.PreviousId,a.CreatedAt,a.CreatedBy,0 TotalCount
   FROM dbo.OeeMachineDayAcknowledgements a JOIN dbo.OeeMachines m ON m.Id=a.MachineId WHERE a.Id=@Id;
 END TRY
 BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO
-- Keep a stopped-day attestation and a running reading mutually exclusive even
-- under concurrent requests or direct authorized procedure calls. Withdrawal
-- is a linked revision; it never erases earlier evidence.
CREATE OR ALTER TRIGGER dbo.TR_OeeProductionEntries_DayAcknowledgement ON dbo.OeeProductionEntries
AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.OeeMachineDayAcknowledgements a WITH(UPDLOCK,HOLDLOCK)
  ON a.MachineId=i.MachineId AND a.ProductionDate=i.ProductionDate
  WHERE i.IsDeleted=0 AND a.State<>N'Withdrawn' AND NOT EXISTS(
   SELECT 1 FROM dbo.OeeMachineDayAcknowledgements newer WHERE newer.MachineId=a.MachineId AND newer.ProductionDate=a.ProductionDate AND newer.Id>a.Id))
 THROW 52084,N'A stopped-day acknowledgement is active. Withdraw it through its history action before recording running time or shots.',1;
END;
GO
