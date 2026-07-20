/*
    COSMOS ERP - Rojmel / Wallet Ledger Module
    Idempotent additive migration. Posted movements are immutable: cancellation
    records a linked reversal entry and never physically deletes ledger history.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.Wallets', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Wallets
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Wallets PRIMARY KEY,
        WalletCode NVARCHAR(30) NOT NULL,
        WalletName NVARCHAR(150) NOT NULL,
        WalletType INT NOT NULL,
        LinkedUserId INT NULL,
        OpeningBalance DECIMAL(18,2) NOT NULL CONSTRAINT DF_Wallets_OpeningBalance DEFAULT (0),
        CurrentBalance DECIMAL(18,2) NOT NULL CONSTRAINT DF_Wallets_CurrentBalance DEFAULT (0),
        IsCompanyWallet BIT NOT NULL CONSTRAINT DF_Wallets_IsCompanyWallet DEFAULT (0),
        IsDefault BIT NOT NULL CONSTRAINT DF_Wallets_IsDefault DEFAULT (0),
        IsActive BIT NOT NULL CONSTRAINT DF_Wallets_IsActive DEFAULT (1),
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Wallets_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy INT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy INT NULL,
        DeletedAt DATETIME2(3) NULL,
        DeletedBy INT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_Wallets_IsDeleted DEFAULT (0),
        CONSTRAINT CK_Wallets_Type CHECK (WalletType IN (1,2,3,4,5)),
        CONSTRAINT CK_Wallets_Balances CHECK (OpeningBalance >= 0 AND CurrentBalance >= 0),
        CONSTRAINT CK_Wallets_UserLink CHECK ((WalletType = 2 AND LinkedUserId IS NOT NULL) OR (WalletType <> 2 AND LinkedUserId IS NULL)),
        CONSTRAINT FK_Wallets_LinkedUser FOREIGN KEY (LinkedUserId) REFERENCES dbo.Users(Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.WalletCategories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WalletCategories
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WalletCategories PRIMARY KEY,
        Name NVARCHAR(150) NOT NULL,
        CategoryType INT NOT NULL,
        IsSystemCategory BIT NOT NULL CONSTRAINT DF_WalletCategories_IsSystemCategory DEFAULT (0),
        IsActive BIT NOT NULL CONSTRAINT DF_WalletCategories_IsActive DEFAULT (1),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_WalletCategories_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy INT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy INT NULL,
        DeletedAt DATETIME2(3) NULL,
        DeletedBy INT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_WalletCategories_IsDeleted DEFAULT (0),
        CONSTRAINT CK_WalletCategories_Type CHECK (CategoryType IN (1,2,3))
    );
END;
GO

IF OBJECT_ID(N'dbo.WalletTransfers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WalletTransfers
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WalletTransfers PRIMARY KEY,
        TransferNo NVARCHAR(40) NOT NULL,
        TransferDate DATE NOT NULL,
        FromWalletId BIGINT NOT NULL,
        ToWalletId BIGINT NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        Description NVARCHAR(1000) NULL,
        ReferenceNo NVARCHAR(100) NULL,
        Status INT NOT NULL CONSTRAINT DF_WalletTransfers_Status DEFAULT (1),
        ReversalOfTransferId BIGINT NULL,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_WalletTransfers_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy INT NULL,
        CancelledAt DATETIME2(3) NULL,
        CancelledBy INT NULL,
        CancelReason NVARCHAR(1000) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_WalletTransfers_IsDeleted DEFAULT (0),
        CONSTRAINT UQ_WalletTransfers_TransferNo UNIQUE (TransferNo),
        CONSTRAINT CK_WalletTransfers_Amount CHECK (Amount > 0),
        CONSTRAINT CK_WalletTransfers_Status CHECK (Status IN (1,2)),
        CONSTRAINT CK_WalletTransfers_DifferentWallets CHECK (FromWalletId <> ToWalletId),
        CONSTRAINT FK_WalletTransfers_FromWallet FOREIGN KEY (FromWalletId) REFERENCES dbo.Wallets(Id),
        CONSTRAINT FK_WalletTransfers_ToWallet FOREIGN KEY (ToWalletId) REFERENCES dbo.Wallets(Id),
        CONSTRAINT FK_WalletTransfers_Reversal FOREIGN KEY (ReversalOfTransferId) REFERENCES dbo.WalletTransfers(Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.WalletTransactions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WalletTransactions
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WalletTransactions PRIMARY KEY,
        TransactionNo NVARCHAR(40) NOT NULL,
        WalletId BIGINT NOT NULL,
        TransactionDate DATE NOT NULL,
        TransactionType INT NOT NULL,
        CategoryId BIGINT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        BalanceBefore DECIMAL(18,2) NOT NULL,
        BalanceAfter DECIMAL(18,2) NOT NULL,
        PaymentMode NVARCHAR(50) NULL,
        Description NVARCHAR(1000) NULL,
        ReferenceNo NVARCHAR(100) NULL,
        RelatedTransferId BIGINT NULL,
        ReversalOfTransactionId BIGINT NULL,
        Status INT NOT NULL CONSTRAINT DF_WalletTransactions_Status DEFAULT (1),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_WalletTransactions_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy INT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy INT NULL,
        CancelledAt DATETIME2(3) NULL,
        CancelledBy INT NULL,
        CancelReason NVARCHAR(1000) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_WalletTransactions_IsDeleted DEFAULT (0),
        CONSTRAINT UQ_WalletTransactions_TransactionNo UNIQUE (TransactionNo),
        CONSTRAINT CK_WalletTransactions_Type CHECK (TransactionType IN (1,2,3,4,5,6,7)),
        CONSTRAINT CK_WalletTransactions_Amount CHECK (Amount > 0),
        CONSTRAINT CK_WalletTransactions_Status CHECK (Status IN (1,2)),
        CONSTRAINT CK_WalletTransactions_Balance CHECK (BalanceBefore >= 0 AND BalanceAfter >= 0),
        CONSTRAINT FK_WalletTransactions_Wallet FOREIGN KEY (WalletId) REFERENCES dbo.Wallets(Id),
        CONSTRAINT FK_WalletTransactions_Category FOREIGN KEY (CategoryId) REFERENCES dbo.WalletCategories(Id),
        CONSTRAINT FK_WalletTransactions_Transfer FOREIGN KEY (RelatedTransferId) REFERENCES dbo.WalletTransfers(Id),
        CONSTRAINT FK_WalletTransactions_Reversal FOREIGN KEY (ReversalOfTransactionId) REFERENCES dbo.WalletTransactions(Id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Wallets_ActiveCode' AND object_id=OBJECT_ID(N'dbo.Wallets'))
    CREATE UNIQUE INDEX UX_Wallets_ActiveCode ON dbo.Wallets(WalletCode) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Wallets_OneCompany' AND object_id=OBJECT_ID(N'dbo.Wallets'))
    CREATE UNIQUE INDEX UX_Wallets_OneCompany ON dbo.Wallets(IsCompanyWallet) WHERE IsCompanyWallet=1 AND IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Wallets_OnePrimaryUserWallet' AND object_id=OBJECT_ID(N'dbo.Wallets'))
    CREATE UNIQUE INDEX UX_Wallets_OnePrimaryUserWallet ON dbo.Wallets(LinkedUserId) WHERE LinkedUserId IS NOT NULL AND IsDefault=1 AND IsActive=1 AND IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_Wallets_UserAccess' AND object_id=OBJECT_ID(N'dbo.Wallets'))
    CREATE INDEX IX_Wallets_UserAccess ON dbo.Wallets(LinkedUserId, IsActive, IsDeleted) INCLUDE(WalletCode, WalletName, CurrentBalance);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_WalletCategories_Name' AND object_id=OBJECT_ID(N'dbo.WalletCategories'))
    CREATE UNIQUE INDEX UX_WalletCategories_Name ON dbo.WalletCategories(Name) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_WalletTransactions_WalletDate' AND object_id=OBJECT_ID(N'dbo.WalletTransactions'))
    CREATE INDEX IX_WalletTransactions_WalletDate ON dbo.WalletTransactions(WalletId, TransactionDate DESC, Id DESC) INCLUDE(TransactionType, Amount, Status, CategoryId, RelatedTransferId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_WalletTransactions_Report' AND object_id=OBJECT_ID(N'dbo.WalletTransactions'))
    CREATE INDEX IX_WalletTransactions_Report ON dbo.WalletTransactions(TransactionDate, TransactionType, Status, WalletId) INCLUDE(Amount, CategoryId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_WalletTransfers_Date' AND object_id=OBJECT_ID(N'dbo.WalletTransfers'))
    CREATE INDEX IX_WalletTransfers_Date ON dbo.WalletTransfers(TransferDate DESC, Status, FromWalletId, ToWalletId) INCLUDE(Amount);
GO

MERGE dbo.WalletCategories AS target
USING (VALUES
    (N'General Income', 1, 1), (N'Sales Collection', 1, 1), (N'Other Income', 1, 1),
    (N'General Expense', 2, 1), (N'Petty Cash', 2, 1), (N'Travel', 2, 1), (N'Food', 2, 1), (N'Miscellaneous', 3, 1)
) AS source(Name, CategoryType, IsSystemCategory)
ON target.Name=source.Name AND target.IsDeleted=0
WHEN MATCHED THEN UPDATE SET CategoryType=source.CategoryType, IsSystemCategory=source.IsSystemCategory, IsActive=1
WHEN NOT MATCHED THEN INSERT(Name,CategoryType,IsSystemCategory,IsActive) VALUES(source.Name,source.CategoryType,source.IsSystemCategory,1);
GO

/* A deployment starts with exactly one empty company wallet. Opening balance is managed through an auditable transaction. */
IF NOT EXISTS (SELECT 1 FROM dbo.Wallets WHERE IsCompanyWallet=1 AND IsDeleted=0)
BEGIN
    INSERT dbo.Wallets(WalletCode,WalletName,WalletType,OpeningBalance,CurrentBalance,IsCompanyWallet,IsDefault,IsActive,Notes)
    VALUES(N'COMPANY',N'Company Master Wallet',1,0,0,1,1,1,N'System-seeded master company wallet.');
END;
GO

/* Navigation and default SuperAdmin grants. Other roles are intentionally not granted all-wallet visibility. */
MERGE dbo.Pages AS target
USING (VALUES (N'Rojmel',N'Rojmel / Wallet',N'/rojmel',N'wallet',90)) AS source(Name,DisplayName,Route,Icon,SortOrder)
ON target.Name=source.Name
WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName,Route=source.Route,Icon=source.Icon,SortOrder=source.SortOrder,IsActive=1
WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,SortOrder,IsActive) VALUES(source.Name,source.DisplayName,source.Route,source.Icon,source.SortOrder,1);
GO
DECLARE @RojmelParentId INT=(SELECT Id FROM dbo.Pages WHERE Name=N'Rojmel');
MERGE dbo.Pages AS target
USING (VALUES
 (N'Rojmel.Dashboard',N'Rojmel Dashboard',N'/rojmel/dashboard',N'chart-line',91),
 (N'Rojmel.MyWallet',N'My Wallet',N'/rojmel/my-wallet',N'wallet',92),
 (N'Rojmel.Wallets',N'Wallet Management',N'/rojmel/wallets',N'wallet-cards',93),
 (N'Rojmel.Transactions',N'Wallet Transactions',N'/rojmel/transactions',N'receipt',94),
 (N'Rojmel.Transfers',N'Wallet Transfers',N'/rojmel/transfers',N'arrow-left-right',95),
 (N'Rojmel.Reports',N'Rojmel Reports',N'/rojmel/reports',N'file-chart',96),
 (N'Rojmel.Admin',N'Rojmel Administration',N'/rojmel/admin',N'shield',97)
) AS source(Name,DisplayName,Route,Icon,SortOrder)
ON target.Name=source.Name
WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName,Route=source.Route,Icon=source.Icon,ParentPageId=@RojmelParentId,SortOrder=source.SortOrder,IsActive=1
WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,ParentPageId,SortOrder,IsActive) VALUES(source.Name,source.DisplayName,source.Route,source.Icon,@RojmelParentId,source.SortOrder,1);
GO
DECLARE @RojmelSuperAdminRoleId INT=(SELECT Id FROM dbo.Roles WHERE Name=N'SuperAdmin');
IF @RojmelSuperAdminRoleId IS NOT NULL
BEGIN
 MERGE dbo.RolePermissions AS target
 USING (SELECT @RojmelSuperAdminRoleId RoleId,Id PageId FROM dbo.Pages WHERE Name=N'Rojmel' OR Name LIKE N'Rojmel.%') AS source
 ON target.RoleId=source.RoleId AND target.PageId=source.PageId
 WHEN MATCHED THEN UPDATE SET CanView=1,CanCreate=1,CanEdit=1,CanDelete=1,CanExport=1,CanApprove=1
 WHEN NOT MATCHED THEN INSERT(RoleId,PageId,CanView,CanCreate,CanEdit,CanDelete,CanExport,CanApprove) VALUES(source.RoleId,source.PageId,1,1,1,1,1,1);
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Wallet_GetById @Id BIGINT,@CurrentUserId INT,@CanAccessAllWallets BIT=0 AS
BEGIN
 SET NOCOUNT ON;
 SELECT w.Id,w.WalletCode,w.WalletName,w.WalletType,w.LinkedUserId,u.FullName LinkedUserName,w.OpeningBalance,w.CurrentBalance,w.IsCompanyWallet,w.IsDefault,w.IsActive,w.Notes,w.CreatedAt,w.CreatedBy,w.ModifiedAt,w.ModifiedBy
 FROM dbo.Wallets w LEFT JOIN dbo.Users u ON u.Id=w.LinkedUserId
 WHERE w.Id=@Id AND w.IsDeleted=0 AND (@CanAccessAllWallets=1 OR w.LinkedUserId=@CurrentUserId);
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Wallet_GetList
 @Search NVARCHAR(200)=NULL,@WalletType INT=NULL,@LinkedUserId INT=NULL,@IsActive BIT=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=NULL,@CurrentUserId INT,@CanAccessAllWallets BIT=0
AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT w.Id,w.WalletCode,w.WalletName,w.WalletType,w.LinkedUserId,u.FullName LinkedUserName,w.OpeningBalance,w.CurrentBalance,w.IsCompanyWallet,w.IsDefault,w.IsActive,w.Notes,w.CreatedAt,w.CreatedBy,w.ModifiedAt,w.ModifiedBy,COUNT(1) OVER() TotalCount
 FROM dbo.Wallets w LEFT JOIN dbo.Users u ON u.Id=w.LinkedUserId
 WHERE w.IsDeleted=0 AND (@CanAccessAllWallets=1 OR w.LinkedUserId=@CurrentUserId)
   AND (@WalletType IS NULL OR w.WalletType=@WalletType) AND (@LinkedUserId IS NULL OR w.LinkedUserId=@LinkedUserId) AND (@IsActive IS NULL OR w.IsActive=@IsActive)
   AND (NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL OR w.WalletCode LIKE N'%'+LTRIM(RTRIM(@Search))+N'%' OR w.WalletName LIKE N'%'+LTRIM(RTRIM(@Search))+N'%' OR u.FullName LIKE N'%'+LTRIM(RTRIM(@Search))+N'%')
 ORDER BY w.IsCompanyWallet DESC,w.WalletName OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Wallet_GetMyWallet @CurrentUserId INT AS
BEGIN
 SET NOCOUNT ON;
 SELECT TOP(1) w.Id,w.WalletCode,w.WalletName,w.WalletType,w.LinkedUserId,u.FullName LinkedUserName,w.OpeningBalance,w.CurrentBalance,w.IsCompanyWallet,w.IsDefault,w.IsActive,w.Notes,w.CreatedAt,w.CreatedBy,w.ModifiedAt,w.ModifiedBy
 FROM dbo.Wallets w JOIN dbo.Users u ON u.Id=w.LinkedUserId
 WHERE w.LinkedUserId=@CurrentUserId AND w.IsDeleted=0 AND w.IsActive=1 ORDER BY w.IsDefault DESC,w.Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Wallet_GetBalance @WalletId BIGINT,@CurrentUserId INT,@CanAccessAllWallets BIT=0 AS
BEGIN
 SET NOCOUNT ON;
 SELECT w.Id WalletId,w.WalletCode,w.WalletName,w.CurrentBalance,SYSUTCDATETIME() AsOfUtc
 FROM dbo.Wallets w WHERE w.Id=@WalletId AND w.IsDeleted=0 AND (@CanAccessAllWallets=1 OR w.LinkedUserId=@CurrentUserId);
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_WalletCategory_GetList @CategoryType INT=NULL AS
BEGIN
 SET NOCOUNT ON;
 SELECT Id,Name,CategoryType,IsSystemCategory,IsActive FROM dbo.WalletCategories
 WHERE IsDeleted=0 AND IsActive=1 AND (@CategoryType IS NULL OR CategoryType IN (@CategoryType,3)) ORDER BY Name;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Wallet_Create
 @WalletCode NVARCHAR(30),@WalletName NVARCHAR(150),@WalletType INT,@LinkedUserId INT=NULL,@OpeningBalance DECIMAL(18,2),@IsDefault BIT=0,@IsActive BIT=1,@Notes NVARCHAR(1000)=NULL,@CurrentUserId INT
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  SET @WalletCode=UPPER(LTRIM(RTRIM(@WalletCode))); SET @WalletName=LTRIM(RTRIM(@WalletName));
  IF @WalletType NOT IN(2,3,4,5) BEGIN SELECT 400 StatusCode,N'Company wallets are system-managed and cannot be created through this endpoint.' Message;RETURN;END;
  IF @OpeningBalance<0 BEGIN SELECT 400 StatusCode,N'Opening balance cannot be negative.' Message;RETURN;END;
  IF (@WalletType=2 AND @LinkedUserId IS NULL) OR (@WalletType<>2 AND @LinkedUserId IS NOT NULL) BEGIN SELECT 400 StatusCode,N'Wallet type and linked user are inconsistent.' Message;RETURN;END;
  IF @LinkedUserId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Users WHERE Id=@LinkedUserId AND IsActive=1 AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Linked user was not found.' Message;RETURN;END;
  BEGIN TRAN;
  IF EXISTS(SELECT 1 FROM dbo.Wallets WITH(UPDLOCK,HOLDLOCK) WHERE WalletCode=@WalletCode AND IsDeleted=0) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Wallet code already exists.' Message;RETURN;END;
  IF @IsDefault=1 AND @LinkedUserId IS NOT NULL UPDATE dbo.Wallets SET IsDefault=0,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@CurrentUserId WHERE LinkedUserId=@LinkedUserId AND IsDefault=1 AND IsActive=1 AND IsDeleted=0;
  INSERT dbo.Wallets(WalletCode,WalletName,WalletType,LinkedUserId,OpeningBalance,CurrentBalance,IsDefault,IsActive,Notes,CreatedBy) VALUES(@WalletCode,@WalletName,@WalletType,@LinkedUserId,@OpeningBalance,@OpeningBalance,@IsDefault,@IsActive,@Notes,@CurrentUserId);
  DECLARE @Id BIGINT=SCOPE_IDENTITY();
  IF @OpeningBalance>0 INSERT dbo.WalletTransactions(TransactionNo,WalletId,TransactionDate,TransactionType,Amount,BalanceBefore,BalanceAfter,Description,Status,CreatedBy) VALUES(CONCAT(N'WT-',@Id,N'-OPEN'),@Id,CONVERT(DATE,SYSUTCDATETIME()),5,@OpeningBalance,0,@OpeningBalance,N'Opening balance',1,@CurrentUserId);
  COMMIT;
  SELECT 201 StatusCode,N'Wallet created.' Message; EXEC dbo.usp_Wallet_GetById @Id,@CurrentUserId,1;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; IF ERROR_NUMBER() IN(2601,2627) SELECT 409 StatusCode,N'Wallet conflicts with an existing active wallet.' Message; ELSE SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Wallet_Update
 @Id BIGINT,@WalletName NVARCHAR(150),@WalletType INT,@LinkedUserId INT=NULL,@IsDefault BIT,@Notes NVARCHAR(1000)=NULL,@CurrentUserId INT
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF @WalletType NOT IN(2,3,4,5) BEGIN SELECT 400 StatusCode,N'Company wallet type cannot be changed.' Message;RETURN;END;
  IF (@WalletType=2 AND @LinkedUserId IS NULL) OR (@WalletType<>2 AND @LinkedUserId IS NOT NULL) BEGIN SELECT 400 StatusCode,N'Wallet type and linked user are inconsistent.' Message;RETURN;END;
  IF @LinkedUserId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Users WHERE Id=@LinkedUserId AND IsActive=1 AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Linked user was not found.' Message;RETURN;END;
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.Wallets WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0) BEGIN ROLLBACK;SELECT 404 StatusCode,N'Wallet was not found.' Message;RETURN;END;
  IF EXISTS(SELECT 1 FROM dbo.Wallets WHERE Id=@Id AND IsCompanyWallet=1) BEGIN ROLLBACK;SELECT 400 StatusCode,N'Company wallet identity cannot be changed.' Message;RETURN;END;
  IF @IsDefault=1 AND @LinkedUserId IS NOT NULL UPDATE dbo.Wallets SET IsDefault=0,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@CurrentUserId WHERE LinkedUserId=@LinkedUserId AND Id<>@Id AND IsDefault=1 AND IsActive=1 AND IsDeleted=0;
  UPDATE dbo.Wallets SET WalletName=LTRIM(RTRIM(@WalletName)),WalletType=@WalletType,LinkedUserId=@LinkedUserId,IsDefault=@IsDefault,Notes=@Notes,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@CurrentUserId WHERE Id=@Id;
  COMMIT; SELECT 200 StatusCode,N'Wallet updated.' Message; EXEC dbo.usp_Wallet_GetById @Id,@CurrentUserId,1;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; IF ERROR_NUMBER() IN(2601,2627) SELECT 409 StatusCode,N'Wallet conflicts with another primary wallet.' Message; ELSE SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Wallet_SetActive @Id BIGINT,@IsActive BIT,@CurrentUserId INT AS
BEGIN
 SET NOCOUNT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Wallets WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Wallet was not found.' Message;RETURN;END;
 IF EXISTS(SELECT 1 FROM dbo.Wallets WHERE Id=@Id AND IsCompanyWallet=1 AND @IsActive=0) BEGIN SELECT 400 StatusCode,N'The company wallet cannot be deactivated.' Message;RETURN;END;
 UPDATE dbo.Wallets SET IsActive=@IsActive,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@CurrentUserId WHERE Id=@Id;
 SELECT 200 StatusCode,IIF(@IsActive=1,N'Wallet activated.',N'Wallet deactivated.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_WalletTransaction_GetById @Id BIGINT,@CurrentUserId INT,@CanAccessAllWallets BIT=0 AS
BEGIN
 SET NOCOUNT ON;
 SELECT t.Id,t.TransactionNo,t.WalletId,w.WalletCode,w.WalletName,t.TransactionDate,t.TransactionType,t.CategoryId,c.Name CategoryName,t.Amount,t.BalanceBefore,t.BalanceAfter,t.PaymentMode,t.Description,t.ReferenceNo,t.RelatedTransferId,t.Status,t.CreatedAt,t.CreatedBy,t.CancelledAt,t.CancelledBy,t.CancelReason
 FROM dbo.WalletTransactions t JOIN dbo.Wallets w ON w.Id=t.WalletId LEFT JOIN dbo.WalletCategories c ON c.Id=t.CategoryId
 WHERE t.Id=@Id AND t.IsDeleted=0 AND w.IsDeleted=0 AND (@CanAccessAllWallets=1 OR w.LinkedUserId=@CurrentUserId);
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_WalletTransaction_GetList
 @FromDate DATE=NULL,@ToDate DATE=NULL,@WalletId BIGINT=NULL,@LinkedUserId INT=NULL,@CategoryId BIGINT=NULL,@TransactionType INT=NULL,@Status INT=NULL,@Search NVARCHAR(200)=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=NULL,@CurrentUserId INT,@CanAccessAllWallets BIT=0
AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT t.Id,t.TransactionNo,t.WalletId,w.WalletCode,w.WalletName,t.TransactionDate,t.TransactionType,t.CategoryId,c.Name CategoryName,t.Amount,t.BalanceBefore,t.BalanceAfter,t.PaymentMode,t.Description,t.ReferenceNo,t.RelatedTransferId,t.Status,t.CreatedAt,t.CreatedBy,t.CancelledAt,t.CancelledBy,t.CancelReason,COUNT(1) OVER() TotalCount
 FROM dbo.WalletTransactions t JOIN dbo.Wallets w ON w.Id=t.WalletId LEFT JOIN dbo.WalletCategories c ON c.Id=t.CategoryId
 WHERE t.IsDeleted=0 AND w.IsDeleted=0 AND (@CanAccessAllWallets=1 OR w.LinkedUserId=@CurrentUserId)
 AND (@FromDate IS NULL OR t.TransactionDate>=@FromDate) AND (@ToDate IS NULL OR t.TransactionDate<=@ToDate) AND (@WalletId IS NULL OR t.WalletId=@WalletId) AND (@LinkedUserId IS NULL OR w.LinkedUserId=@LinkedUserId)
 AND (@CategoryId IS NULL OR t.CategoryId=@CategoryId) AND (@TransactionType IS NULL OR t.TransactionType=@TransactionType) AND (@Status IS NULL OR t.Status=@Status)
 AND (NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL OR t.TransactionNo LIKE N'%'+LTRIM(RTRIM(@Search))+N'%' OR t.Description LIKE N'%'+LTRIM(RTRIM(@Search))+N'%' OR t.ReferenceNo LIKE N'%'+LTRIM(RTRIM(@Search))+N'%')
 ORDER BY t.TransactionDate DESC,t.Id DESC OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_WalletTransaction_GetMyList
 @FromDate DATE=NULL,@ToDate DATE=NULL,@CategoryId BIGINT=NULL,@TransactionType INT=NULL,@Status INT=NULL,@Search NVARCHAR(200)=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=NULL,@CurrentUserId INT
AS
BEGIN
 EXEC dbo.usp_WalletTransaction_GetList @FromDate,@ToDate,NULL,NULL,@CategoryId,@TransactionType,@Status,@Search,@PageNumber,@PageSize,@SortBy,@SortDirection,@CurrentUserId,0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_WalletTransaction_CreateCore
 @WalletId BIGINT,@TransactionDate DATE,@CategoryId BIGINT=NULL,@Amount DECIMAL(18,2),@PaymentMode NVARCHAR(50)=NULL,@Description NVARCHAR(1000)=NULL,@ReferenceNo NVARCHAR(100)=NULL,@TransactionType INT,@CurrentUserId INT,@CanAccessAllWallets BIT=0
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF @Amount<=0 OR @TransactionType NOT IN(1,2) BEGIN SELECT 400 StatusCode,N'Only positive income or expense entries are supported.' Message;RETURN;END;
  IF @CategoryId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.WalletCategories WHERE Id=@CategoryId AND IsDeleted=0 AND IsActive=1 AND CategoryType IN(@TransactionType,3)) BEGIN SELECT 400 StatusCode,N'Category is inactive or incompatible with this transaction type.' Message;RETURN;END;
  BEGIN TRAN;
  DECLARE @Balance DECIMAL(18,2),@LinkedUserId INT,@Active BIT,@Deleted BIT;
  SELECT @Balance=CurrentBalance,@LinkedUserId=LinkedUserId,@Active=IsActive,@Deleted=IsDeleted FROM dbo.Wallets WITH(UPDLOCK,HOLDLOCK) WHERE Id=@WalletId;
  IF @Balance IS NULL OR @Deleted=1 OR @Active=0 BEGIN ROLLBACK;SELECT 404 StatusCode,N'Wallet was not found or is inactive.' Message;RETURN;END;
  IF @CanAccessAllWallets=0 AND @LinkedUserId<>@CurrentUserId BEGIN ROLLBACK;SELECT 403 StatusCode,N'Wallet is not available to the current user.' Message;RETURN;END;
  IF @TransactionType=2 AND @Balance<@Amount BEGIN ROLLBACK;SELECT 409 StatusCode,N'Insufficient wallet balance.' Message;RETURN;END;
  DECLARE @After DECIMAL(18,2)=IIF(@TransactionType=1,@Balance+@Amount,@Balance-@Amount);
  UPDATE dbo.Wallets SET CurrentBalance=@After,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@CurrentUserId WHERE Id=@WalletId;
  INSERT dbo.WalletTransactions(TransactionNo,WalletId,TransactionDate,TransactionType,CategoryId,Amount,BalanceBefore,BalanceAfter,PaymentMode,Description,ReferenceNo,Status,CreatedBy)
  VALUES(N'PENDING',@WalletId,@TransactionDate,@TransactionType,@CategoryId,@Amount,@Balance,@After,@PaymentMode,@Description,@ReferenceNo,1,@CurrentUserId);
  DECLARE @Id BIGINT=SCOPE_IDENTITY(); UPDATE dbo.WalletTransactions SET TransactionNo=CONCAT(N'WT-',@Id) WHERE Id=@Id;
  COMMIT; SELECT 201 StatusCode,N'Wallet transaction posted.' Message; EXEC dbo.usp_WalletTransaction_GetById @Id,@CurrentUserId,1;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_WalletTransaction_CreateIncome @WalletId BIGINT,@TransactionDate DATE,@CategoryId BIGINT=NULL,@Amount DECIMAL(18,2),@PaymentMode NVARCHAR(50)=NULL,@Description NVARCHAR(1000)=NULL,@ReferenceNo NVARCHAR(100)=NULL,@CurrentUserId INT,@CanAccessAllWallets BIT=0 AS
BEGIN EXEC dbo.usp_WalletTransaction_CreateCore @WalletId,@TransactionDate,@CategoryId,@Amount,@PaymentMode,@Description,@ReferenceNo,1,@CurrentUserId,@CanAccessAllWallets; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WalletTransaction_CreateExpense @WalletId BIGINT,@TransactionDate DATE,@CategoryId BIGINT=NULL,@Amount DECIMAL(18,2),@PaymentMode NVARCHAR(50)=NULL,@Description NVARCHAR(1000)=NULL,@ReferenceNo NVARCHAR(100)=NULL,@CurrentUserId INT,@CanAccessAllWallets BIT=0 AS
BEGIN EXEC dbo.usp_WalletTransaction_CreateCore @WalletId,@TransactionDate,@CategoryId,@Amount,@PaymentMode,@Description,@ReferenceNo,2,@CurrentUserId,@CanAccessAllWallets; END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_WalletTransaction_CreateAdjustment
 @WalletId BIGINT,@TransactionDate DATE,@IsIncrease BIT,@Amount DECIMAL(18,2),@Description NVARCHAR(1000)=NULL,@ReferenceNo NVARCHAR(100)=NULL,@CurrentUserId INT,@CanAccessAllWallets BIT=0
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF @Amount<=0 BEGIN SELECT 400 StatusCode,N'Adjustment amount must be greater than zero.' Message;RETURN;END;
  BEGIN TRAN;
  DECLARE @Balance DECIMAL(18,2),@LinkedUserId INT,@Active BIT,@Deleted BIT;
  SELECT @Balance=CurrentBalance,@LinkedUserId=LinkedUserId,@Active=IsActive,@Deleted=IsDeleted FROM dbo.Wallets WITH(UPDLOCK,HOLDLOCK) WHERE Id=@WalletId;
  IF @Balance IS NULL OR @Deleted=1 OR @Active=0 BEGIN ROLLBACK;SELECT 404 StatusCode,N'Wallet was not found or is inactive.' Message;RETURN;END;
  IF @CanAccessAllWallets=0 AND @LinkedUserId<>@CurrentUserId BEGIN ROLLBACK;SELECT 403 StatusCode,N'Wallet is not available to the current user.' Message;RETURN;END;
  IF @IsIncrease=0 AND @Balance<@Amount BEGIN ROLLBACK;SELECT 409 StatusCode,N'Insufficient wallet balance.' Message;RETURN;END;
  DECLARE @Type INT=IIF(@IsIncrease=1,6,7),@After DECIMAL(18,2)=IIF(@IsIncrease=1,@Balance+@Amount,@Balance-@Amount);
  UPDATE dbo.Wallets SET CurrentBalance=@After,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@CurrentUserId WHERE Id=@WalletId;
  INSERT dbo.WalletTransactions(TransactionNo,WalletId,TransactionDate,TransactionType,Amount,BalanceBefore,BalanceAfter,Description,ReferenceNo,Status,CreatedBy) VALUES(N'PENDING',@WalletId,@TransactionDate,@Type,@Amount,@Balance,@After,@Description,@ReferenceNo,1,@CurrentUserId);
  DECLARE @Id BIGINT=SCOPE_IDENTITY(); UPDATE dbo.WalletTransactions SET TransactionNo=CONCAT(N'WT-',@Id) WHERE Id=@Id;
  COMMIT; SELECT 201 StatusCode,N'Wallet adjustment posted.' Message; EXEC dbo.usp_WalletTransaction_GetById @Id,@CurrentUserId,1;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_WalletTransaction_Cancel @Id BIGINT,@Reason NVARCHAR(1000),@CurrentUserId INT,@CanAccessAllWallets BIT=0 AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @WalletId BIGINT,@Type INT,@Amount DECIMAL(18,2),@Status INT,@WalletBalance DECIMAL(18,2),@LinkedUserId INT;
  SELECT @WalletId=t.WalletId,@Type=t.TransactionType,@Amount=t.Amount,@Status=t.Status FROM dbo.WalletTransactions t WITH(UPDLOCK,HOLDLOCK) WHERE t.Id=@Id AND t.IsDeleted=0;
  IF @WalletId IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Wallet transaction was not found.' Message;RETURN;END;
  IF @Type IN(3,4) OR EXISTS(SELECT 1 FROM dbo.WalletTransactions WHERE ReversalOfTransactionId=@Id AND Status=1) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Transfer or already-reversed transactions cannot be cancelled here.' Message;RETURN;END;
  IF @Status<>1 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Only posted transactions can be cancelled.' Message;RETURN;END;
  SELECT @WalletBalance=CurrentBalance,@LinkedUserId=LinkedUserId FROM dbo.Wallets WITH(UPDLOCK,HOLDLOCK) WHERE Id=@WalletId AND IsDeleted=0;
  IF @CanAccessAllWallets=0 AND @LinkedUserId<>@CurrentUserId BEGIN ROLLBACK;SELECT 403 StatusCode,N'Wallet is not available to the current user.' Message;RETURN;END;
  DECLARE @OriginalImpact DECIMAL(18,2)=CASE WHEN @Type IN(1,5,6) THEN @Amount ELSE -@Amount END;
  DECLARE @After DECIMAL(18,2)=@WalletBalance-@OriginalImpact;
  IF @After<0 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Cancellation would make the wallet balance negative.' Message;RETURN;END;
  DECLARE @ReversalType INT=IIF(@OriginalImpact>0,7,6);
  UPDATE dbo.Wallets SET CurrentBalance=@After,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@CurrentUserId WHERE Id=@WalletId;
  UPDATE dbo.WalletTransactions SET Status=2,CancelledAt=SYSUTCDATETIME(),CancelledBy=@CurrentUserId,CancelReason=@Reason WHERE Id=@Id;
  INSERT dbo.WalletTransactions(TransactionNo,WalletId,TransactionDate,TransactionType,Amount,BalanceBefore,BalanceAfter,Description,ReferenceNo,ReversalOfTransactionId,Status,CreatedBy) VALUES(N'PENDING',@WalletId,CONVERT(DATE,SYSUTCDATETIME()),@ReversalType,@Amount,@WalletBalance,@After,CONCAT(N'Reversal of ',@Id,N': ',@Reason),NULL,@Id,1,@CurrentUserId);
  DECLARE @ReversalId BIGINT=SCOPE_IDENTITY(); UPDATE dbo.WalletTransactions SET TransactionNo=CONCAT(N'WT-',@ReversalId) WHERE Id=@ReversalId;
  COMMIT; SELECT 200 StatusCode,N'Wallet transaction cancelled with a reversal entry.' Message;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_WalletTransfer_GetById @Id BIGINT,@CurrentUserId INT,@CanAccessAllWallets BIT=0 AS
BEGIN
 SET NOCOUNT ON;
 SELECT x.Id,x.TransferNo,x.TransferDate,x.FromWalletId,fw.WalletName FromWalletName,x.ToWalletId,tw.WalletName ToWalletName,x.Amount,x.Description,x.ReferenceNo,x.Status,
  (SELECT TOP(1) Id FROM dbo.WalletTransactions WHERE RelatedTransferId=x.Id AND TransactionType=4 AND IsDeleted=0) TransferOutTransactionId,
  (SELECT TOP(1) Id FROM dbo.WalletTransactions WHERE RelatedTransferId=x.Id AND TransactionType=3 AND IsDeleted=0) TransferInTransactionId,x.CreatedAt,x.CreatedBy,x.CancelledAt,x.CancelledBy,x.CancelReason
 FROM dbo.WalletTransfers x JOIN dbo.Wallets fw ON fw.Id=x.FromWalletId JOIN dbo.Wallets tw ON tw.Id=x.ToWalletId
 WHERE x.Id=@Id AND x.IsDeleted=0 AND (@CanAccessAllWallets=1 OR fw.LinkedUserId=@CurrentUserId OR tw.LinkedUserId=@CurrentUserId);
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_WalletTransfer_GetList
 @FromDate DATE=NULL,@ToDate DATE=NULL,@WalletId BIGINT=NULL,@Status INT=NULL,@Search NVARCHAR(200)=NULL,@PageNumber INT=1,@PageSize INT=20,@CurrentUserId INT,@CanAccessAllWallets BIT=0
AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT x.Id,x.TransferNo,x.TransferDate,x.FromWalletId,fw.WalletName FromWalletName,x.ToWalletId,tw.WalletName ToWalletName,x.Amount,x.Description,x.ReferenceNo,x.Status,
  (SELECT TOP(1) Id FROM dbo.WalletTransactions WHERE RelatedTransferId=x.Id AND TransactionType=4 AND IsDeleted=0) TransferOutTransactionId,
  (SELECT TOP(1) Id FROM dbo.WalletTransactions WHERE RelatedTransferId=x.Id AND TransactionType=3 AND IsDeleted=0) TransferInTransactionId,x.CreatedAt,x.CreatedBy,x.CancelledAt,x.CancelledBy,x.CancelReason,COUNT(1) OVER() TotalCount
 FROM dbo.WalletTransfers x JOIN dbo.Wallets fw ON fw.Id=x.FromWalletId JOIN dbo.Wallets tw ON tw.Id=x.ToWalletId
 WHERE x.IsDeleted=0 AND (@CanAccessAllWallets=1 OR fw.LinkedUserId=@CurrentUserId OR tw.LinkedUserId=@CurrentUserId)
 AND (@FromDate IS NULL OR x.TransferDate>=@FromDate) AND (@ToDate IS NULL OR x.TransferDate<=@ToDate) AND (@WalletId IS NULL OR x.FromWalletId=@WalletId OR x.ToWalletId=@WalletId) AND (@Status IS NULL OR x.Status=@Status)
 AND (NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL OR x.TransferNo LIKE N'%'+LTRIM(RTRIM(@Search))+N'%' OR x.Description LIKE N'%'+LTRIM(RTRIM(@Search))+N'%' OR x.ReferenceNo LIKE N'%'+LTRIM(RTRIM(@Search))+N'%')
 ORDER BY x.TransferDate DESC,x.Id DESC OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_WalletTransfer_Create
 @TransferDate DATE,@FromWalletId BIGINT,@ToWalletId BIGINT,@Amount DECIMAL(18,2),@Description NVARCHAR(1000)=NULL,@ReferenceNo NVARCHAR(100)=NULL,@CurrentUserId INT,@CanAccessAllWallets BIT=0
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF @FromWalletId=@ToWalletId OR @Amount<=0 BEGIN SELECT 400 StatusCode,N'Transfer needs two different wallets and a positive amount.' Message;RETURN;END;
  BEGIN TRAN;
  DECLARE @FromBalance DECIMAL(18,2),@ToBalance DECIMAL(18,2),@FromUser INT,@ToUser INT,@FromActive BIT,@ToActive BIT,@FirstWalletId BIGINT,@SecondWalletId BIGINT,@FirstBalance DECIMAL(18,2),@SecondBalance DECIMAL(18,2),@FirstUser INT,@SecondUser INT,@FirstActive BIT,@SecondActive BIT;
  /* Every transfer locks the pair in ascending wallet-ID order to avoid opposite-transfer deadlocks. */
  SET @FirstWalletId=IIF(@FromWalletId<@ToWalletId,@FromWalletId,@ToWalletId); SET @SecondWalletId=IIF(@FromWalletId<@ToWalletId,@ToWalletId,@FromWalletId);
  SELECT @FirstBalance=CurrentBalance,@FirstUser=LinkedUserId,@FirstActive=IsActive FROM dbo.Wallets WITH(UPDLOCK,HOLDLOCK) WHERE Id=@FirstWalletId;
  SELECT @SecondBalance=CurrentBalance,@SecondUser=LinkedUserId,@SecondActive=IsActive FROM dbo.Wallets WITH(UPDLOCK,HOLDLOCK) WHERE Id=@SecondWalletId;
  SELECT @FromBalance=IIF(@FromWalletId=@FirstWalletId,@FirstBalance,@SecondBalance),@FromUser=IIF(@FromWalletId=@FirstWalletId,@FirstUser,@SecondUser),@FromActive=IIF(@FromWalletId=@FirstWalletId,@FirstActive,@SecondActive),@ToBalance=IIF(@ToWalletId=@FirstWalletId,@FirstBalance,@SecondBalance),@ToUser=IIF(@ToWalletId=@FirstWalletId,@FirstUser,@SecondUser),@ToActive=IIF(@ToWalletId=@FirstWalletId,@FirstActive,@SecondActive);
  IF @FromBalance IS NULL OR @ToBalance IS NULL OR @FromActive=0 OR @ToActive=0 BEGIN ROLLBACK;SELECT 404 StatusCode,N'Source or destination wallet was not found or is inactive.' Message;RETURN;END;
  IF @CanAccessAllWallets=0 AND (@FromUser<>@CurrentUserId OR @ToUser<>@CurrentUserId) BEGIN ROLLBACK;SELECT 403 StatusCode,N'Both wallets must belong to the current user.' Message;RETURN;END;
  IF @FromBalance<@Amount BEGIN ROLLBACK;SELECT 409 StatusCode,N'Insufficient source wallet balance.' Message;RETURN;END;
  INSERT dbo.WalletTransfers(TransferNo,TransferDate,FromWalletId,ToWalletId,Amount,Description,ReferenceNo,Status,CreatedBy) VALUES(N'PENDING',@TransferDate,@FromWalletId,@ToWalletId,@Amount,@Description,@ReferenceNo,1,@CurrentUserId);
  DECLARE @Id BIGINT=SCOPE_IDENTITY(); UPDATE dbo.WalletTransfers SET TransferNo=CONCAT(N'WTR-',@Id) WHERE Id=@Id;
  UPDATE dbo.Wallets SET CurrentBalance=CurrentBalance-@Amount,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@CurrentUserId WHERE Id=@FromWalletId;
  UPDATE dbo.Wallets SET CurrentBalance=CurrentBalance+@Amount,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@CurrentUserId WHERE Id=@ToWalletId;
  INSERT dbo.WalletTransactions(TransactionNo,WalletId,TransactionDate,TransactionType,Amount,BalanceBefore,BalanceAfter,Description,ReferenceNo,RelatedTransferId,Status,CreatedBy) VALUES(N'PENDING',@FromWalletId,@TransferDate,4,@Amount,@FromBalance,@FromBalance-@Amount,@Description,@ReferenceNo,@Id,1,@CurrentUserId);
  DECLARE @OutId BIGINT=SCOPE_IDENTITY(); UPDATE dbo.WalletTransactions SET TransactionNo=CONCAT(N'WT-',@OutId) WHERE Id=@OutId;
  INSERT dbo.WalletTransactions(TransactionNo,WalletId,TransactionDate,TransactionType,Amount,BalanceBefore,BalanceAfter,Description,ReferenceNo,RelatedTransferId,Status,CreatedBy) VALUES(N'PENDING',@ToWalletId,@TransferDate,3,@Amount,@ToBalance,@ToBalance+@Amount,@Description,@ReferenceNo,@Id,1,@CurrentUserId);
  DECLARE @InId BIGINT=SCOPE_IDENTITY(); UPDATE dbo.WalletTransactions SET TransactionNo=CONCAT(N'WT-',@InId) WHERE Id=@InId;
  COMMIT; SELECT 201 StatusCode,N'Wallet transfer posted.' Message; EXEC dbo.usp_WalletTransfer_GetById @Id,@CurrentUserId,1;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_WalletTransfer_Cancel @Id BIGINT,@Reason NVARCHAR(1000),@CurrentUserId INT,@CanAccessAllWallets BIT=0 AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @FromWalletId BIGINT,@ToWalletId BIGINT,@Amount DECIMAL(18,2),@TransferDate DATE,@Status INT,@FromBalance DECIMAL(18,2),@ToBalance DECIMAL(18,2),@FromUser INT,@ToUser INT,@FirstWalletId BIGINT,@SecondWalletId BIGINT,@FirstBalance DECIMAL(18,2),@SecondBalance DECIMAL(18,2),@FirstUser INT,@SecondUser INT;
  SELECT @FromWalletId=FromWalletId,@ToWalletId=ToWalletId,@Amount=Amount,@TransferDate=TransferDate,@Status=Status FROM dbo.WalletTransfers WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0;
  IF @FromWalletId IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Wallet transfer was not found.' Message;RETURN;END;
  IF @Status<>1 OR EXISTS(SELECT 1 FROM dbo.WalletTransfers WHERE ReversalOfTransferId=@Id AND Status=1) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Only unreversed posted transfers can be cancelled.' Message;RETURN;END;
  SET @FirstWalletId=IIF(@FromWalletId<@ToWalletId,@FromWalletId,@ToWalletId); SET @SecondWalletId=IIF(@FromWalletId<@ToWalletId,@ToWalletId,@FromWalletId);
  SELECT @FirstBalance=CurrentBalance,@FirstUser=LinkedUserId FROM dbo.Wallets WITH(UPDLOCK,HOLDLOCK) WHERE Id=@FirstWalletId;
  SELECT @SecondBalance=CurrentBalance,@SecondUser=LinkedUserId FROM dbo.Wallets WITH(UPDLOCK,HOLDLOCK) WHERE Id=@SecondWalletId;
  SELECT @FromBalance=IIF(@FromWalletId=@FirstWalletId,@FirstBalance,@SecondBalance),@FromUser=IIF(@FromWalletId=@FirstWalletId,@FirstUser,@SecondUser),@ToBalance=IIF(@ToWalletId=@FirstWalletId,@FirstBalance,@SecondBalance),@ToUser=IIF(@ToWalletId=@FirstWalletId,@FirstUser,@SecondUser);
  IF @CanAccessAllWallets=0 AND (@FromUser<>@CurrentUserId OR @ToUser<>@CurrentUserId) BEGIN ROLLBACK;SELECT 403 StatusCode,N'Both wallets must belong to the current user.' Message;RETURN;END;
  IF @ToBalance<@Amount BEGIN ROLLBACK;SELECT 409 StatusCode,N'Cancellation would make the destination wallet balance negative.' Message;RETURN;END;
  UPDATE dbo.WalletTransfers SET Status=2,CancelledAt=SYSUTCDATETIME(),CancelledBy=@CurrentUserId,CancelReason=@Reason WHERE Id=@Id;
  UPDATE dbo.WalletTransactions SET Status=2,CancelledAt=SYSUTCDATETIME(),CancelledBy=@CurrentUserId,CancelReason=@Reason WHERE RelatedTransferId=@Id AND Status=1;
  INSERT dbo.WalletTransfers(TransferNo,TransferDate,FromWalletId,ToWalletId,Amount,Description,ReferenceNo,Status,ReversalOfTransferId,CreatedBy) VALUES(N'PENDING',CONVERT(DATE,SYSUTCDATETIME()),@ToWalletId,@FromWalletId,@Amount,CONCAT(N'Reversal of ',@Id,N': ',@Reason),NULL,1,@Id,@CurrentUserId);
  DECLARE @ReverseId BIGINT=SCOPE_IDENTITY(); UPDATE dbo.WalletTransfers SET TransferNo=CONCAT(N'WTR-',@ReverseId) WHERE Id=@ReverseId;
  UPDATE dbo.Wallets SET CurrentBalance=CurrentBalance+@Amount,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@CurrentUserId WHERE Id=@FromWalletId;
  UPDATE dbo.Wallets SET CurrentBalance=CurrentBalance-@Amount,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@CurrentUserId WHERE Id=@ToWalletId;
  INSERT dbo.WalletTransactions(TransactionNo,WalletId,TransactionDate,TransactionType,Amount,BalanceBefore,BalanceAfter,Description,RelatedTransferId,Status,CreatedBy) VALUES(N'PENDING',@ToWalletId,CONVERT(DATE,SYSUTCDATETIME()),4,@Amount,@ToBalance,@ToBalance-@Amount,CONCAT(N'Reversal of ',@Id,N': ',@Reason),@ReverseId,1,@CurrentUserId);
  DECLARE @OutId BIGINT=SCOPE_IDENTITY(); UPDATE dbo.WalletTransactions SET TransactionNo=CONCAT(N'WT-',@OutId) WHERE Id=@OutId;
  INSERT dbo.WalletTransactions(TransactionNo,WalletId,TransactionDate,TransactionType,Amount,BalanceBefore,BalanceAfter,Description,RelatedTransferId,Status,CreatedBy) VALUES(N'PENDING',@FromWalletId,CONVERT(DATE,SYSUTCDATETIME()),3,@Amount,@FromBalance,@FromBalance+@Amount,CONCAT(N'Reversal of ',@Id,N': ',@Reason),@ReverseId,1,@CurrentUserId);
  DECLARE @InId BIGINT=SCOPE_IDENTITY(); UPDATE dbo.WalletTransactions SET TransactionNo=CONCAT(N'WT-',@InId) WHERE Id=@InId;
  COMMIT; SELECT 200 StatusCode,N'Wallet transfer cancelled with linked reversal transfer.' Message;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_RojmelDashboard_Summary @FromDate DATE=NULL,@ToDate DATE=NULL,@CurrentUserId INT,@CanAccessAllWallets BIT=0 AS
BEGIN
 SET NOCOUNT ON; SET @FromDate=COALESCE(@FromDate,DATEFROMPARTS(YEAR(SYSUTCDATETIME()),MONTH(SYSUTCDATETIME()),1)); SET @ToDate=COALESCE(@ToDate,CONVERT(DATE,SYSUTCDATETIME()));
 ;WITH VisibleWallets AS (SELECT Id,CurrentBalance,IsCompanyWallet FROM dbo.Wallets WHERE IsDeleted=0 AND (@CanAccessAllWallets=1 OR LinkedUserId=@CurrentUserId)), VisibleTransactions AS
 (SELECT t.* FROM dbo.WalletTransactions t JOIN VisibleWallets w ON w.Id=t.WalletId WHERE t.IsDeleted=0 AND t.Status=1 AND t.TransactionDate BETWEEN @FromDate AND @ToDate), VisibleTransfers AS
 (SELECT x.* FROM dbo.WalletTransfers x WHERE x.IsDeleted=0 AND x.Status=1 AND x.ReversalOfTransferId IS NULL AND x.TransferDate BETWEEN @FromDate AND @ToDate AND EXISTS(SELECT 1 FROM VisibleWallets w WHERE w.Id=x.FromWalletId OR w.Id=x.ToWalletId))
 SELECT COALESCE((SELECT SUM(CurrentBalance) FROM VisibleWallets WHERE IsCompanyWallet=1),0) CompanyWalletBalance,COALESCE((SELECT SUM(CurrentBalance) FROM VisibleWallets),0) TotalWalletBalance,
 COALESCE((SELECT SUM(Amount) FROM VisibleTransactions WHERE TransactionType=1),0) TotalIncome,COALESCE((SELECT SUM(Amount) FROM VisibleTransactions WHERE TransactionType=2),0) TotalExpense,COALESCE((SELECT SUM(Amount) FROM VisibleTransfers),0) TotalTransfers,
 (SELECT COUNT(1) FROM VisibleWallets) ActiveWalletCount,@CanAccessAllWallets IsAllWalletView,@FromDate FromDate,@ToDate ToDate,SYSUTCDATETIME() GeneratedAtUtc;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_RojmelDashboard_WalletBalances @CurrentUserId INT,@CanAccessAllWallets BIT=0 AS
BEGIN
 SET NOCOUNT ON; SELECT w.Id WalletId,w.WalletCode,w.WalletName,w.WalletType,u.FullName LinkedUserName,w.CurrentBalance FROM dbo.Wallets w LEFT JOIN dbo.Users u ON u.Id=w.LinkedUserId WHERE w.IsDeleted=0 AND w.IsActive=1 AND (@CanAccessAllWallets=1 OR w.LinkedUserId=@CurrentUserId) ORDER BY w.IsCompanyWallet DESC,w.WalletName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_RojmelDashboard_RecentTransactions @Count INT=10,@CurrentUserId INT,@CanAccessAllWallets BIT=0 AS
BEGIN
 SET NOCOUNT ON; SET @Count=IIF(@Count<1,10,IIF(@Count>100,100,@Count));
 SELECT TOP(@Count) t.Id,t.TransactionNo,t.WalletId,w.WalletCode,w.WalletName,t.TransactionDate,t.TransactionType,t.CategoryId,c.Name CategoryName,t.Amount,t.BalanceBefore,t.BalanceAfter,t.PaymentMode,t.Description,t.ReferenceNo,t.RelatedTransferId,t.Status,t.CreatedAt,t.CreatedBy,t.CancelledAt,t.CancelledBy,t.CancelReason
 FROM dbo.WalletTransactions t JOIN dbo.Wallets w ON w.Id=t.WalletId LEFT JOIN dbo.WalletCategories c ON c.Id=t.CategoryId WHERE t.IsDeleted=0 AND w.IsDeleted=0 AND (@CanAccessAllWallets=1 OR w.LinkedUserId=@CurrentUserId) ORDER BY t.TransactionDate DESC,t.Id DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_RojmelReport_WalletLedger
 @FromDate DATE=NULL,@ToDate DATE=NULL,@WalletId BIGINT=NULL,@LinkedUserId INT=NULL,@CategoryId BIGINT=NULL,@TransactionType INT=NULL,@Status INT=NULL,@Search NVARCHAR(200)=NULL,@PageNumber INT=1,@PageSize INT=200,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=NULL,@CurrentUserId INT,@CanAccessAllWallets BIT=0
AS BEGIN EXEC dbo.usp_WalletTransaction_GetList @FromDate,@ToDate,@WalletId,@LinkedUserId,@CategoryId,@TransactionType,@Status,@Search,@PageNumber,@PageSize,@SortBy,@SortDirection,@CurrentUserId,@CanAccessAllWallets; END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_RojmelReport_AllTransactions
 @FromDate DATE=NULL,@ToDate DATE=NULL,@WalletId BIGINT=NULL,@LinkedUserId INT=NULL,@CategoryId BIGINT=NULL,@TransactionType INT=NULL,@Status INT=NULL,@Search NVARCHAR(200)=NULL,@PageNumber INT=1,@PageSize INT=200,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=NULL,@CurrentUserId INT,@CanAccessAllWallets BIT=0
AS BEGIN EXEC dbo.usp_WalletTransaction_GetList @FromDate,@ToDate,@WalletId,@LinkedUserId,@CategoryId,@TransactionType,@Status,@Search,@PageNumber,@PageSize,@SortBy,@SortDirection,@CurrentUserId,@CanAccessAllWallets; END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_RojmelReport_IncomeExpense
 @FromDate DATE=NULL,@ToDate DATE=NULL,@WalletId BIGINT=NULL,@LinkedUserId INT=NULL,@CategoryId BIGINT=NULL,@TransactionType INT=NULL,@Status INT=NULL,@Search NVARCHAR(200)=NULL,@PageNumber INT=1,@PageSize INT=200,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=NULL,@CurrentUserId INT,@CanAccessAllWallets BIT=0
AS
BEGIN
 SET NOCOUNT ON; SET @FromDate=COALESCE(@FromDate,DATEFROMPARTS(YEAR(SYSUTCDATETIME()),MONTH(SYSUTCDATETIME()),1)); SET @ToDate=COALESCE(@ToDate,CONVERT(DATE,SYSUTCDATETIME()));
 ;WITH Visible AS (SELECT t.* FROM dbo.WalletTransactions t JOIN dbo.Wallets w ON w.Id=t.WalletId WHERE t.IsDeleted=0 AND w.IsDeleted=0 AND t.Status=1 AND (@Status IS NULL OR t.Status=@Status) AND t.TransactionDate BETWEEN @FromDate AND @ToDate AND (@CanAccessAllWallets=1 OR w.LinkedUserId=@CurrentUserId) AND (@WalletId IS NULL OR t.WalletId=@WalletId) AND (@LinkedUserId IS NULL OR w.LinkedUserId=@LinkedUserId) AND (@CategoryId IS NULL OR t.CategoryId=@CategoryId))
 SELECT COALESCE(SUM(CASE WHEN TransactionType=1 THEN Amount ELSE 0 END),0) Income,COALESCE(SUM(CASE WHEN TransactionType=2 THEN Amount ELSE 0 END),0) Expense,COALESCE(SUM(CASE WHEN TransactionType=1 THEN Amount WHEN TransactionType=2 THEN -Amount ELSE 0 END),0) NetIncomeExpense,
 COALESCE((SELECT SUM(x.Amount) FROM dbo.WalletTransfers x JOIN dbo.Wallets fw ON fw.Id=x.FromWalletId JOIN dbo.Wallets tw ON tw.Id=x.ToWalletId WHERE x.IsDeleted=0 AND x.Status=1 AND x.ReversalOfTransferId IS NULL AND x.TransferDate BETWEEN @FromDate AND @ToDate AND (@CanAccessAllWallets=1 OR fw.LinkedUserId=@CurrentUserId OR tw.LinkedUserId=@CurrentUserId) AND (@WalletId IS NULL OR x.FromWalletId=@WalletId OR x.ToWalletId=@WalletId) AND (@LinkedUserId IS NULL OR fw.LinkedUserId=@LinkedUserId OR tw.LinkedUserId=@LinkedUserId)),0) TransfersExcluded,
 COALESCE(SUM(CASE WHEN TransactionType IN(6,7) THEN Amount ELSE 0 END),0) AdjustmentsExcluded,COALESCE(SUM(CASE WHEN TransactionType=5 THEN Amount ELSE 0 END),0) OpeningBalancesExcluded FROM Visible;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_RojmelReport_CategoryWiseExpense
 @FromDate DATE=NULL,@ToDate DATE=NULL,@WalletId BIGINT=NULL,@LinkedUserId INT=NULL,@CategoryId BIGINT=NULL,@TransactionType INT=NULL,@Status INT=NULL,@Search NVARCHAR(200)=NULL,@PageNumber INT=1,@PageSize INT=200,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=NULL,@CurrentUserId INT,@CanAccessAllWallets BIT=0
AS
BEGIN
 SET NOCOUNT ON; SET @FromDate=COALESCE(@FromDate,DATEFROMPARTS(YEAR(SYSUTCDATETIME()),MONTH(SYSUTCDATETIME()),1)); SET @ToDate=COALESCE(@ToDate,CONVERT(DATE,SYSUTCDATETIME()));
 SELECT t.CategoryId,COALESCE(c.Name,N'Uncategorized') CategoryName,SUM(t.Amount) ExpenseAmount,COUNT(1) TransactionCount FROM dbo.WalletTransactions t JOIN dbo.Wallets w ON w.Id=t.WalletId LEFT JOIN dbo.WalletCategories c ON c.Id=t.CategoryId
 WHERE t.IsDeleted=0 AND w.IsDeleted=0 AND t.Status=1 AND (@Status IS NULL OR t.Status=@Status) AND t.TransactionType=2 AND t.TransactionDate BETWEEN @FromDate AND @ToDate AND (@CanAccessAllWallets=1 OR w.LinkedUserId=@CurrentUserId) AND (@WalletId IS NULL OR t.WalletId=@WalletId) AND (@LinkedUserId IS NULL OR w.LinkedUserId=@LinkedUserId) AND (@CategoryId IS NULL OR t.CategoryId=@CategoryId) AND (NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL OR c.Name LIKE N'%'+LTRIM(RTRIM(@Search))+N'%') GROUP BY t.CategoryId,c.Name ORDER BY ExpenseAmount DESC,CategoryName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_RojmelReport_Transfers
 @FromDate DATE=NULL,@ToDate DATE=NULL,@WalletId BIGINT=NULL,@LinkedUserId INT=NULL,@CategoryId BIGINT=NULL,@TransactionType INT=NULL,@Status INT=NULL,@Search NVARCHAR(200)=NULL,@PageNumber INT=1,@PageSize INT=200,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=NULL,@CurrentUserId INT,@CanAccessAllWallets BIT=0
AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT x.Id,x.TransferNo,x.TransferDate,x.FromWalletId,fw.WalletName FromWalletName,x.ToWalletId,tw.WalletName ToWalletName,x.Amount,x.Description,x.ReferenceNo,x.Status,
 (SELECT TOP(1) Id FROM dbo.WalletTransactions WHERE RelatedTransferId=x.Id AND TransactionType=4 AND IsDeleted=0) TransferOutTransactionId,(SELECT TOP(1) Id FROM dbo.WalletTransactions WHERE RelatedTransferId=x.Id AND TransactionType=3 AND IsDeleted=0) TransferInTransactionId,x.CreatedAt,x.CreatedBy,x.CancelledAt,x.CancelledBy,x.CancelReason,COUNT(1) OVER() TotalCount
 FROM dbo.WalletTransfers x JOIN dbo.Wallets fw ON fw.Id=x.FromWalletId JOIN dbo.Wallets tw ON tw.Id=x.ToWalletId
 WHERE x.IsDeleted=0 AND (@CanAccessAllWallets=1 OR fw.LinkedUserId=@CurrentUserId OR tw.LinkedUserId=@CurrentUserId) AND (@FromDate IS NULL OR x.TransferDate>=@FromDate) AND (@ToDate IS NULL OR x.TransferDate<=@ToDate) AND (@WalletId IS NULL OR x.FromWalletId=@WalletId OR x.ToWalletId=@WalletId) AND (@LinkedUserId IS NULL OR fw.LinkedUserId=@LinkedUserId OR tw.LinkedUserId=@LinkedUserId) AND (@Status IS NULL OR x.Status=@Status) AND (NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL OR x.TransferNo LIKE N'%'+LTRIM(RTRIM(@Search))+N'%' OR x.Description LIKE N'%'+LTRIM(RTRIM(@Search))+N'%' OR x.ReferenceNo LIKE N'%'+LTRIM(RTRIM(@Search))+N'%') ORDER BY x.TransferDate DESC,x.Id DESC OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_RojmelReport_DailyCashFlow
 @FromDate DATE=NULL,@ToDate DATE=NULL,@WalletId BIGINT=NULL,@LinkedUserId INT=NULL,@CategoryId BIGINT=NULL,@TransactionType INT=NULL,@Status INT=NULL,@Search NVARCHAR(200)=NULL,@PageNumber INT=1,@PageSize INT=200,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=NULL,@CurrentUserId INT,@CanAccessAllWallets BIT=0
AS
BEGIN
 SET NOCOUNT ON; SET @FromDate=COALESCE(@FromDate,DATEFROMPARTS(YEAR(SYSUTCDATETIME()),MONTH(SYSUTCDATETIME()),1)); SET @ToDate=COALESCE(@ToDate,CONVERT(DATE,SYSUTCDATETIME()));
 SELECT t.TransactionDate,SUM(CASE WHEN t.TransactionType=1 THEN t.Amount ELSE 0 END) Income,SUM(CASE WHEN t.TransactionType=2 THEN t.Amount ELSE 0 END) Expense,SUM(CASE WHEN t.TransactionType=1 THEN t.Amount WHEN t.TransactionType=2 THEN -t.Amount ELSE 0 END) NetIncomeExpense FROM dbo.WalletTransactions t JOIN dbo.Wallets w ON w.Id=t.WalletId
 WHERE t.IsDeleted=0 AND w.IsDeleted=0 AND t.Status=1 AND (@Status IS NULL OR t.Status=@Status) AND t.TransactionType IN(1,2) AND t.TransactionDate BETWEEN @FromDate AND @ToDate AND (@CanAccessAllWallets=1 OR w.LinkedUserId=@CurrentUserId) AND (@WalletId IS NULL OR t.WalletId=@WalletId) AND (@LinkedUserId IS NULL OR w.LinkedUserId=@LinkedUserId) GROUP BY t.TransactionDate ORDER BY t.TransactionDate;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_RojmelReport_UserWalletBalances
 @FromDate DATE=NULL,@ToDate DATE=NULL,@WalletId BIGINT=NULL,@LinkedUserId INT=NULL,@CategoryId BIGINT=NULL,@TransactionType INT=NULL,@Status INT=NULL,@Search NVARCHAR(200)=NULL,@PageNumber INT=1,@PageSize INT=200,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=NULL,@CurrentUserId INT,@CanAccessAllWallets BIT=0
AS
BEGIN
 SET NOCOUNT ON; SELECT w.Id WalletId,w.LinkedUserId,w.WalletName,u.FullName LinkedUserName,w.CurrentBalance FROM dbo.Wallets w LEFT JOIN dbo.Users u ON u.Id=w.LinkedUserId WHERE w.IsDeleted=0 AND w.IsActive=1 AND (@CanAccessAllWallets=1 OR w.LinkedUserId=@CurrentUserId) AND (@WalletId IS NULL OR w.Id=@WalletId) AND (@LinkedUserId IS NULL OR w.LinkedUserId=@LinkedUserId) AND (NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL OR w.WalletName LIKE N'%'+LTRIM(RTRIM(@Search))+N'%' OR u.FullName LIKE N'%'+LTRIM(RTRIM(@Search))+N'%') ORDER BY u.FullName,w.WalletName;
END;
GO
