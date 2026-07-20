/*
   Cosmos API compatibility migration.
   Safe to apply after 001_Full_Database_Setup.sql; all changes are additive or
   CREATE OR ALTER procedure replacements.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH(N'dbo.Parties', N'PartyType') IS NULL
BEGIN
    ALTER TABLE dbo.Parties
        ADD PartyType NVARCHAR(10) NOT NULL
            CONSTRAINT DF_Parties_PartyType DEFAULT (N'Both') WITH VALUES;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Parties_PartyType')
    ALTER TABLE dbo.Parties
        ADD CONSTRAINT CK_Parties_PartyType CHECK (PartyType IN (N'Customer', N'Supplier', N'Both'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Parties_ListFilters' AND object_id = OBJECT_ID(N'dbo.Parties'))
    CREATE INDEX IX_Parties_ListFilters ON dbo.Parties(IsDeleted, IsActive, PartyType) INCLUDE (GSTIN, CreditLimit, PartyCode, PartyName);
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_GetById
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, PartyCode, PartyName, PartyType, MobileNo, Email, GSTTreatment, GSTIN, LegalName, TradeName,
           BillingAddressLine1, BillingAddressLine2, BillingCity, BillingState, BillingCountry, BillingPincode,
           ShippingAddressLine1, ShippingAddressLine2, ShippingCity, ShippingState, ShippingCountry, ShippingPincode,
           OpeningBalance, OpeningBalanceType, CreditLimit, CreditPeriodDays, IsActive, CreatedOn, CreatedBy,
           ModifiedOn, ModifiedBy, IsDeleted, DeletedOn, RowVersion
    FROM dbo.Parties
    WHERE Id = @Id AND IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_GetList
    @Search NVARCHAR(200) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'PartyName',
    @SortDirection NVARCHAR(4) = N'ASC',
    @IsActive BIT = NULL,
    @PartyType NVARCHAR(10) = NULL,
    @HasGstin BIT = NULL,
    @HasCreditLimit BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber = CASE WHEN @PageNumber < 1 THEN 1 ELSE @PageNumber END;
    SET @PageSize = CASE WHEN @PageSize < 1 THEN 20 WHEN @PageSize > 200 THEN 200 ELSE @PageSize END;
    SET @SortBy = CASE WHEN @SortBy IN (N'PartyCode', N'PartyName', N'MobileNo', N'GSTIN', N'CreatedOn') THEN @SortBy ELSE N'PartyName' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;
    SET @PartyType = CASE LOWER(LTRIM(RTRIM(@PartyType)))
        WHEN N'customer' THEN N'Customer' WHEN N'supplier' THEN N'Supplier' WHEN N'both' THEN N'Both' ELSE NULL END;

    DECLARE @SearchPattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;

    DECLARE @Base TABLE
    (
        Id UNIQUEIDENTIFIER NOT NULL, PartyCode NVARCHAR(50) NOT NULL, PartyName NVARCHAR(200) NOT NULL,
        PartyType NVARCHAR(10) NOT NULL, MobileNo NVARCHAR(20) NULL, Email NVARCHAR(200) NULL, GSTTreatment INT NOT NULL,
        GSTIN NVARCHAR(20) NULL, OpeningBalance DECIMAL(18,2) NOT NULL, OpeningBalanceType INT NOT NULL,
        CreditLimit DECIMAL(18,2) NOT NULL, CreditPeriodDays INT NOT NULL, IsActive BIT NOT NULL,
        CreatedOn DATETIME2(3) NOT NULL, ModifiedOn DATETIME2(3) NULL
    );
    INSERT INTO @Base
    SELECT p.Id, p.PartyCode, p.PartyName, p.PartyType, p.MobileNo, p.Email, p.GSTTreatment, p.GSTIN,
           p.OpeningBalance, p.OpeningBalanceType, p.CreditLimit, p.CreditPeriodDays, p.IsActive, p.CreatedOn, p.ModifiedOn
    FROM dbo.Parties p
    WHERE p.IsDeleted = 0
      AND (@IsActive IS NULL OR p.IsActive = @IsActive)
      AND (@HasGstin IS NULL OR (@HasGstin = 1 AND NULLIF(LTRIM(RTRIM(p.GSTIN)), N'') IS NOT NULL) OR (@HasGstin = 0 AND NULLIF(LTRIM(RTRIM(p.GSTIN)), N'') IS NULL))
      AND (@HasCreditLimit IS NULL OR (@HasCreditLimit = 1 AND p.CreditLimit > 0) OR (@HasCreditLimit = 0 AND p.CreditLimit <= 0))
      AND (@SearchPattern IS NULL OR p.PartyCode LIKE @SearchPattern OR p.PartyName LIKE @SearchPattern OR p.MobileNo LIKE @SearchPattern OR p.GSTIN LIKE @SearchPattern OR p.Email LIKE @SearchPattern);

    DECLARE @Filtered TABLE
    (
        Id UNIQUEIDENTIFIER NOT NULL, PartyCode NVARCHAR(50) NOT NULL, PartyName NVARCHAR(200) NOT NULL,
        PartyType NVARCHAR(10) NOT NULL, MobileNo NVARCHAR(20) NULL, Email NVARCHAR(200) NULL, GSTTreatment INT NOT NULL,
        GSTIN NVARCHAR(20) NULL, OpeningBalance DECIMAL(18,2) NOT NULL, OpeningBalanceType INT NOT NULL,
        CreditLimit DECIMAL(18,2) NOT NULL, CreditPeriodDays INT NOT NULL, IsActive BIT NOT NULL,
        CreatedOn DATETIME2(3) NOT NULL, ModifiedOn DATETIME2(3) NULL
    );
    INSERT INTO @Filtered SELECT * FROM @Base WHERE @PartyType IS NULL OR PartyType = @PartyType;

    SELECT Id, PartyCode, PartyName, PartyType, MobileNo, Email, GSTTreatment, GSTIN, OpeningBalance, OpeningBalanceType,
           CreditLimit, CreditPeriodDays, IsActive, CreatedOn, ModifiedOn, COUNT(1) OVER() AS TotalCount
    FROM @Filtered
    ORDER BY
        CASE WHEN @SortBy = N'PartyCode' AND @SortDirection = N'ASC' THEN PartyCode END ASC,
        CASE WHEN @SortBy = N'PartyCode' AND @SortDirection = N'DESC' THEN PartyCode END DESC,
        CASE WHEN @SortBy = N'PartyName' AND @SortDirection = N'ASC' THEN PartyName END ASC,
        CASE WHEN @SortBy = N'PartyName' AND @SortDirection = N'DESC' THEN PartyName END DESC,
        CASE WHEN @SortBy = N'MobileNo' AND @SortDirection = N'ASC' THEN MobileNo END ASC,
        CASE WHEN @SortBy = N'MobileNo' AND @SortDirection = N'DESC' THEN MobileNo END DESC,
        CASE WHEN @SortBy = N'GSTIN' AND @SortDirection = N'ASC' THEN GSTIN END ASC,
        CASE WHEN @SortBy = N'GSTIN' AND @SortDirection = N'DESC' THEN GSTIN END DESC,
        CASE WHEN @SortBy = N'CreatedOn' AND @SortDirection = N'ASC' THEN CreatedOn END ASC,
        CASE WHEN @SortBy = N'CreatedOn' AND @SortDirection = N'DESC' THEN CreatedOn END DESC,
        PartyName ASC,
        Id ASC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(1) AS TotalCount FROM @Filtered;

    SELECT COUNT(1) AS AllCount,
           COALESCE(SUM(CASE WHEN PartyType = N'Customer' THEN 1 ELSE 0 END), 0) AS CustomerCount,
           COALESCE(SUM(CASE WHEN PartyType = N'Supplier' THEN 1 ELSE 0 END), 0) AS SupplierCount,
           COALESCE(SUM(CASE WHEN PartyType = N'Both' THEN 1 ELSE 0 END), 0) AS BothCount,
           COALESCE(SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END), 0) AS InactiveCount,
           COALESCE(SUM(CreditLimit), 0) AS TotalCreditLimit
    FROM @Base;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_Create
    @PartyCode NVARCHAR(50), @PartyName NVARCHAR(200), @MobileNo NVARCHAR(20) = NULL, @Email NVARCHAR(200) = NULL,
    @GSTTreatment INT, @GSTIN NVARCHAR(20) = NULL, @LegalName NVARCHAR(250) = NULL, @TradeName NVARCHAR(250) = NULL,
    @BillingAddressLine1 NVARCHAR(250) = NULL, @BillingAddressLine2 NVARCHAR(250) = NULL, @BillingCity NVARCHAR(100) = NULL,
    @BillingState NVARCHAR(100) = NULL, @BillingCountry NVARCHAR(100) = NULL, @BillingPincode NVARCHAR(20) = NULL,
    @ShippingAddressLine1 NVARCHAR(250) = NULL, @ShippingAddressLine2 NVARCHAR(250) = NULL, @ShippingCity NVARCHAR(100) = NULL,
    @ShippingState NVARCHAR(100) = NULL, @ShippingCountry NVARCHAR(100) = NULL, @ShippingPincode NVARCHAR(20) = NULL,
    @OpeningBalance DECIMAL(18,2), @OpeningBalanceType INT, @CreditLimit DECIMAL(18,2), @CreditPeriodDays INT,
    @IsActive BIT, @PartyType NVARCHAR(10) = N'Both'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET @PartyType = CASE LOWER(LTRIM(RTRIM(@PartyType))) WHEN N'customer' THEN N'Customer' WHEN N'supplier' THEN N'Supplier' WHEN N'both' THEN N'Both' ELSE NULL END;
    IF @PartyType IS NULL BEGIN SELECT 400 AS StatusCode, N'PartyType must be Customer, Supplier, or Both.' AS [Message]; RETURN; END;
    IF EXISTS (SELECT 1 FROM dbo.Parties WHERE PartyCode = @PartyCode AND IsDeleted = 0) BEGIN SELECT 409 AS StatusCode, N'Party code already exists.' AS [Message]; RETURN; END;
    BEGIN TRANSACTION;
    DECLARE @Id UNIQUEIDENTIFIER = NEWID();
    INSERT INTO dbo.Parties(Id, PartyCode, PartyName, PartyType, MobileNo, Email, GSTTreatment, GSTIN, LegalName, TradeName,
        BillingAddressLine1, BillingAddressLine2, BillingCity, BillingState, BillingCountry, BillingPincode,
        ShippingAddressLine1, ShippingAddressLine2, ShippingCity, ShippingState, ShippingCountry, ShippingPincode,
        OpeningBalance, OpeningBalanceType, CreditLimit, CreditPeriodDays, IsActive)
    VALUES(@Id, @PartyCode, @PartyName, @PartyType, @MobileNo, @Email, @GSTTreatment, @GSTIN, @LegalName, @TradeName,
        @BillingAddressLine1, @BillingAddressLine2, @BillingCity, @BillingState, @BillingCountry, @BillingPincode,
        @ShippingAddressLine1, @ShippingAddressLine2, @ShippingCity, @ShippingState, @ShippingCountry, @ShippingPincode,
        @OpeningBalance, @OpeningBalanceType, @CreditLimit, @CreditPeriodDays, @IsActive);
    COMMIT TRANSACTION;
    SELECT 201 AS StatusCode, N'Party created.' AS [Message];
    EXEC dbo.sp_Party_GetById @Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_Update
    @Id UNIQUEIDENTIFIER, @PartyCode NVARCHAR(50), @PartyName NVARCHAR(200), @MobileNo NVARCHAR(20) = NULL, @Email NVARCHAR(200) = NULL,
    @GSTTreatment INT, @GSTIN NVARCHAR(20) = NULL, @LegalName NVARCHAR(250) = NULL, @TradeName NVARCHAR(250) = NULL,
    @BillingAddressLine1 NVARCHAR(250) = NULL, @BillingAddressLine2 NVARCHAR(250) = NULL, @BillingCity NVARCHAR(100) = NULL,
    @BillingState NVARCHAR(100) = NULL, @BillingCountry NVARCHAR(100) = NULL, @BillingPincode NVARCHAR(20) = NULL,
    @ShippingAddressLine1 NVARCHAR(250) = NULL, @ShippingAddressLine2 NVARCHAR(250) = NULL, @ShippingCity NVARCHAR(100) = NULL,
    @ShippingState NVARCHAR(100) = NULL, @ShippingCountry NVARCHAR(100) = NULL, @ShippingPincode NVARCHAR(20) = NULL,
    @OpeningBalance DECIMAL(18,2), @OpeningBalanceType INT, @CreditLimit DECIMAL(18,2), @CreditPeriodDays INT,
    @IsActive BIT, @PartyType NVARCHAR(10) = N'Both'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET @PartyType = CASE LOWER(LTRIM(RTRIM(@PartyType))) WHEN N'customer' THEN N'Customer' WHEN N'supplier' THEN N'Supplier' WHEN N'both' THEN N'Both' ELSE NULL END;
    IF @PartyType IS NULL BEGIN SELECT 400 AS StatusCode, N'PartyType must be Customer, Supplier, or Both.' AS [Message]; RETURN; END;
    IF EXISTS (SELECT 1 FROM dbo.Parties WHERE PartyCode = @PartyCode AND Id <> @Id AND IsDeleted = 0) BEGIN SELECT 409 AS StatusCode, N'Party code already exists.' AS [Message]; RETURN; END;
    BEGIN TRANSACTION;
    UPDATE dbo.Parties SET PartyCode = @PartyCode, PartyName = @PartyName, PartyType = @PartyType, MobileNo = @MobileNo, Email = @Email,
        GSTTreatment = @GSTTreatment, GSTIN = @GSTIN, LegalName = @LegalName, TradeName = @TradeName,
        BillingAddressLine1 = @BillingAddressLine1, BillingAddressLine2 = @BillingAddressLine2, BillingCity = @BillingCity,
        BillingState = @BillingState, BillingCountry = @BillingCountry, BillingPincode = @BillingPincode,
        ShippingAddressLine1 = @ShippingAddressLine1, ShippingAddressLine2 = @ShippingAddressLine2, ShippingCity = @ShippingCity,
        ShippingState = @ShippingState, ShippingCountry = @ShippingCountry, ShippingPincode = @ShippingPincode,
        OpeningBalance = @OpeningBalance, OpeningBalanceType = @OpeningBalanceType, CreditLimit = @CreditLimit,
        CreditPeriodDays = @CreditPeriodDays, IsActive = @IsActive, ModifiedOn = SYSUTCDATETIME()
    WHERE Id = @Id AND IsDeleted = 0;
    IF @@ROWCOUNT = 0 BEGIN ROLLBACK TRANSACTION; SELECT 404 AS StatusCode, N'Party was not found.' AS [Message]; RETURN; END;
    COMMIT TRANSACTION;
    SELECT 200 AS StatusCode, N'Party updated.' AS [Message];
    EXEC dbo.sp_Party_GetById @Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_EmailExists
    @Email NVARCHAR(256),
    @ExcludingId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(CASE WHEN EXISTS (
        SELECT 1 FROM dbo.Users WHERE Email = LTRIM(RTRIM(@Email)) AND (@ExcludingId IS NULL OR Id <> @ExcludingId)
    ) THEN 1 ELSE 0 END AS BIT) AS EmailExists;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_UpdateSelf
    @Id INT,
    @Email NVARCHAR(256),
    @FullName NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF EXISTS (SELECT 1 FROM dbo.Users WHERE Email = LTRIM(RTRIM(@Email)) AND Id <> @Id)
    BEGIN
        SELECT 409 AS StatusCode, N'This email is already in use.' AS [Message];
        RETURN;
    END;
    BEGIN TRANSACTION;
    UPDATE dbo.Users
    SET Email = LTRIM(RTRIM(@Email)), FullName = LTRIM(RTRIM(@FullName)), UpdatedOn = SYSUTCDATETIME()
    WHERE Id = @Id AND IsDeleted = 0 AND IsActive = 1;
    IF @@ROWCOUNT = 0
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT 404 AS StatusCode, N'User was not found.' AS [Message];
        RETURN;
    END;
    COMMIT TRANSACTION;
    SELECT 200 AS StatusCode, N'Profile updated.' AS [Message];
    SELECT Id, Username, Email, FullName, IsActive, IsDeleted, CreatedOn, UpdatedOn
    FROM dbo.Users WHERE Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_Export
    @Search NVARCHAR(200) = NULL,
    @IsActive BIT = NULL,
    @RoleId INT = NULL,
    @SortBy NVARCHAR(50) = N'Username',
    @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;
    SET @SortBy = CASE WHEN @SortBy IN (N'FullName', N'Username', N'Email', N'CreatedOn', N'IsActive') THEN @SortBy ELSE N'Username' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;
    DECLARE @Pattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;

    SELECT u.FullName,
           u.Username,
           u.Email,
           COALESCE(STRING_AGG(r.Name, N', '), N'') AS Roles,
           CASE WHEN u.IsActive = 1 THEN N'Active' ELSE N'Inactive' END AS Status,
           u.CreatedOn AS CreatedAt
    FROM dbo.Users u
    LEFT JOIN dbo.UserRoles ur ON ur.UserId = u.Id
    LEFT JOIN dbo.Roles r ON r.Id = ur.RoleId
    WHERE u.IsDeleted = 0
      AND u.IsSystemUser = 0
      AND (@IsActive IS NULL OR u.IsActive = @IsActive)
      AND (@RoleId IS NULL OR EXISTS (SELECT 1 FROM dbo.UserRoles filterRoles WHERE filterRoles.UserId = u.Id AND filterRoles.RoleId = @RoleId))
      AND (@Pattern IS NULL OR u.Username LIKE @Pattern OR u.Email LIKE @Pattern OR u.FullName LIKE @Pattern)
    GROUP BY u.Id, u.FullName, u.Username, u.Email, u.IsActive, u.CreatedOn
    ORDER BY
        CASE WHEN @SortBy = N'FullName' AND @SortDirection = N'ASC' THEN u.FullName END ASC,
        CASE WHEN @SortBy = N'FullName' AND @SortDirection = N'DESC' THEN u.FullName END DESC,
        CASE WHEN @SortBy = N'Username' AND @SortDirection = N'ASC' THEN u.Username END ASC,
        CASE WHEN @SortBy = N'Username' AND @SortDirection = N'DESC' THEN u.Username END DESC,
        CASE WHEN @SortBy = N'Email' AND @SortDirection = N'ASC' THEN u.Email END ASC,
        CASE WHEN @SortBy = N'Email' AND @SortDirection = N'DESC' THEN u.Email END DESC,
        CASE WHEN @SortBy = N'CreatedOn' AND @SortDirection = N'ASC' THEN u.CreatedOn END ASC,
        CASE WHEN @SortBy = N'CreatedOn' AND @SortDirection = N'DESC' THEN u.CreatedOn END DESC,
        CASE WHEN @SortBy = N'IsActive' AND @SortDirection = N'ASC' THEN u.IsActive END ASC,
        CASE WHEN @SortBy = N'IsActive' AND @SortDirection = N'DESC' THEN u.IsActive END DESC,
        u.Id ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_IsPrivilegedAdministrator
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(CASE WHEN EXISTS
    (
        SELECT 1
        FROM dbo.Users u
        JOIN dbo.UserRoles ur ON ur.UserId = u.Id
        JOIN dbo.Roles r ON r.Id = ur.RoleId
        WHERE u.Id = @UserId
          AND u.IsActive = 1
          AND u.IsDeleted = 0
          AND r.IsActive = 1
          AND
          (
              (u.IsSystemUser = 1 AND r.IsSystemRole = 1)
              OR r.Name IN (N'SuperAdmin', N'Super Admin', N'System Owner', N'SystemOwner')
          )
    ) THEN 1 ELSE 0 END AS BIT) AS IsPrivilegedAdministrator;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_Export
    @Search NVARCHAR(200) = NULL,
    @SortBy NVARCHAR(50) = N'PartyName',
    @SortDirection NVARCHAR(4) = N'ASC',
    @IsActive BIT = NULL,
    @PartyType NVARCHAR(10) = NULL,
    @HasGstin BIT = NULL,
    @HasCreditLimit BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @SortBy = CASE WHEN @SortBy IN (N'PartyCode', N'PartyName', N'MobileNo', N'GSTIN', N'CreatedOn') THEN @SortBy ELSE N'PartyName' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;
    SET @PartyType = CASE LOWER(LTRIM(RTRIM(@PartyType)))
        WHEN N'customer' THEN N'Customer' WHEN N'supplier' THEN N'Supplier' WHEN N'both' THEN N'Both' ELSE NULL END;
    DECLARE @SearchPattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;

    SELECT PartyName, PartyType, GSTIN, MobileNo AS Mobile, Email, BillingCity, BillingState,
           CreditLimit, OpeningBalance, OpeningBalanceType,
           CASE WHEN IsActive = 1 THEN N'Active' ELSE N'Inactive' END AS Status
    FROM dbo.Parties
    WHERE IsDeleted = 0
      AND (@IsActive IS NULL OR IsActive = @IsActive)
      AND (@PartyType IS NULL OR PartyType = @PartyType)
      AND (@HasGstin IS NULL OR (@HasGstin = 1 AND NULLIF(LTRIM(RTRIM(GSTIN)), N'') IS NOT NULL) OR (@HasGstin = 0 AND NULLIF(LTRIM(RTRIM(GSTIN)), N'') IS NULL))
      AND (@HasCreditLimit IS NULL OR (@HasCreditLimit = 1 AND CreditLimit > 0) OR (@HasCreditLimit = 0 AND CreditLimit <= 0))
      AND (@SearchPattern IS NULL OR PartyCode LIKE @SearchPattern OR PartyName LIKE @SearchPattern OR MobileNo LIKE @SearchPattern OR GSTIN LIKE @SearchPattern OR Email LIKE @SearchPattern)
    ORDER BY
        CASE WHEN @SortBy = N'PartyCode' AND @SortDirection = N'ASC' THEN PartyCode END ASC,
        CASE WHEN @SortBy = N'PartyCode' AND @SortDirection = N'DESC' THEN PartyCode END DESC,
        CASE WHEN @SortBy = N'PartyName' AND @SortDirection = N'ASC' THEN PartyName END ASC,
        CASE WHEN @SortBy = N'PartyName' AND @SortDirection = N'DESC' THEN PartyName END DESC,
        CASE WHEN @SortBy = N'MobileNo' AND @SortDirection = N'ASC' THEN MobileNo END ASC,
        CASE WHEN @SortBy = N'MobileNo' AND @SortDirection = N'DESC' THEN MobileNo END DESC,
        CASE WHEN @SortBy = N'GSTIN' AND @SortDirection = N'ASC' THEN GSTIN END ASC,
        CASE WHEN @SortBy = N'GSTIN' AND @SortDirection = N'DESC' THEN GSTIN END DESC,
        CASE WHEN @SortBy = N'CreatedOn' AND @SortDirection = N'ASC' THEN CreatedOn END ASC,
        CASE WHEN @SortBy = N'CreatedOn' AND @SortDirection = N'DESC' THEN CreatedOn END DESC,
        PartyName ASC,
        Id ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_GetListSummary
    @Search NVARCHAR(200) = NULL,
    @Barcode NVARCHAR(100) = NULL,
    @ItemCode NVARCHAR(50) = NULL,
    @CategoryId BIGINT = NULL,
    @ProcurementClassification INT = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @SearchPattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    DECLARE @BarcodePattern NVARCHAR(110) = CASE WHEN @Barcode IS NULL OR LTRIM(RTRIM(@Barcode)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Barcode)) + N'%' END;
    DECLARE @ItemCodePattern NVARCHAR(60) = CASE WHEN @ItemCode IS NULL OR LTRIM(RTRIM(@ItemCode)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@ItemCode)) + N'%' END;

    SELECT COUNT(1) AS TotalCount,
           COALESCE(SUM(CASE WHEN i.ItemType = 1 THEN 1 ELSE 0 END), 0) AS ProductCount,
           COALESCE(SUM(CASE WHEN i.ItemType = 2 THEN 1 ELSE 0 END), 0) AS ServiceCount,
           COALESCE(SUM(CASE WHEN i.TrackInventory = 1 AND i.CurrentStock <= i.MinimumStock THEN 1 ELSE 0 END), 0) AS LowStockCount
    FROM dbo.Items i
    WHERE i.IsDeleted = 0
      AND (@IsActive IS NULL OR i.IsActive = @IsActive)
      AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
      AND (@ProcurementClassification IS NULL OR i.ProcurementClassification = @ProcurementClassification)
      AND (@BarcodePattern IS NULL OR i.Barcode LIKE @BarcodePattern)
      AND (@ItemCodePattern IS NULL OR i.ItemCode LIKE @ItemCodePattern)
      AND (@SearchPattern IS NULL OR i.Name LIKE @SearchPattern);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_GetListSummary
    @Search NVARCHAR(100) = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @SearchPattern NVARCHAR(110) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    SELECT COUNT(1) AS TotalCount,
           COALESCE(SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END), 0) AS ActiveCount,
           COALESCE(SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END), 0) AS InactiveCount
    FROM dbo.Categories
    WHERE IsDeleted = 0
      AND (@IsActive IS NULL OR IsActive = @IsActive)
      AND (@SearchPattern IS NULL OR Name LIKE @SearchPattern OR Description LIKE @SearchPattern);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Unit_GetListSummary
    @Search NVARCHAR(100) = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @SearchPattern NVARCHAR(110) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    SELECT COUNT(1) AS TotalCount,
           COALESCE(SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END), 0) AS ActiveCount,
           COALESCE(SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END), 0) AS InactiveCount
    FROM dbo.Units
    WHERE IsDeleted = 0
      AND (@IsActive IS NULL OR IsActive = @IsActive)
      AND (@SearchPattern IS NULL OR Name LIKE @SearchPattern OR ShortName LIKE @SearchPattern OR Description LIKE @SearchPattern);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Department_GetListSummary
    @Search NVARCHAR(200) = NULL, @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Pattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    SELECT COUNT(1) AS TotalCount,
           COALESCE(SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END), 0) AS ActiveCount,
           COALESCE(SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END), 0) AS InactiveCount
    FROM dbo.HR_Departments
    WHERE IsDeleted = 0 AND (@IsActive IS NULL OR IsActive = @IsActive)
      AND (@Pattern IS NULL OR DepartmentCode LIKE @Pattern OR DepartmentName LIKE @Pattern OR Description LIKE @Pattern);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Designation_GetListSummary
    @Search NVARCHAR(200) = NULL, @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Pattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    SELECT COUNT(1) AS TotalCount,
           COALESCE(SUM(CASE WHEN x.IsActive = 1 THEN 1 ELSE 0 END), 0) AS ActiveCount,
           COALESCE(SUM(CASE WHEN x.IsActive = 0 THEN 1 ELSE 0 END), 0) AS InactiveCount
    FROM dbo.HR_Designations x
    JOIN dbo.HR_Departments d ON d.Id = x.DepartmentId
    WHERE x.IsDeleted = 0 AND (@IsActive IS NULL OR x.IsActive = @IsActive)
      AND (@Pattern IS NULL OR x.DesignationCode LIKE @Pattern OR x.DesignationName LIKE @Pattern OR d.DepartmentName LIKE @Pattern);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Shift_GetListSummary
    @Search NVARCHAR(200) = NULL, @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Pattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    SELECT COUNT(1) AS TotalCount,
           COALESCE(SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END), 0) AS ActiveCount,
           COALESCE(SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END), 0) AS InactiveCount
    FROM dbo.HR_Shifts
    WHERE IsDeleted = 0 AND (@IsActive IS NULL OR IsActive = @IsActive)
      AND (@Pattern IS NULL OR ShiftCode LIKE @Pattern OR ShiftName LIKE @Pattern);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeMachine_GetListSummary
    @Search NVARCHAR(200) = NULL, @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Pattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    SELECT COUNT(1) AS TotalCount,
           COALESCE(SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END), 0) AS ActiveCount,
           COALESCE(SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END), 0) AS InactiveCount
    FROM dbo.OeeMachines
    WHERE IsDeleted = 0 AND (@IsActive IS NULL OR IsActive = @IsActive)
      AND (@Pattern IS NULL OR MachineCode LIKE @Pattern OR MachineName LIKE @Pattern OR Location LIKE @Pattern);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeMould_GetListSummary
    @Search NVARCHAR(200) = NULL, @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Pattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    SELECT COUNT(1) AS TotalCount,
           COALESCE(SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END), 0) AS ActiveCount,
           COALESCE(SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END), 0) AS InactiveCount
    FROM dbo.OeeMoulds
    WHERE IsDeleted = 0 AND (@IsActive IS NULL OR IsActive = @IsActive)
      AND (@Pattern IS NULL OR MouldName LIKE @Pattern);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeDowntimeReason_GetListSummary
    @Search NVARCHAR(200) = NULL, @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Pattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    SELECT COUNT(1) AS TotalCount,
           COALESCE(SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END), 0) AS ActiveCount,
           COALESCE(SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END), 0) AS InactiveCount
    FROM dbo.OeeDowntimeReasons
    WHERE IsDeleted = 0 AND (@IsActive IS NULL OR IsActive = @IsActive)
      AND (@Pattern IS NULL OR ReasonName LIKE @Pattern);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_GetListSummary
    @Search NVARCHAR(200) = NULL,
    @CustomerPartyId UNIQUEIDENTIFIER = NULL,
    @Status INT = NULL,
    @PaymentStatus INT = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @SearchPattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    SELECT COUNT(1) AS TotalInvoices,
           COALESCE(SUM(i.GrandTotal), 0) AS TotalSalesAmount,
           COALESCE(SUM(i.DueAmount), 0) AS UnpaidAmount,
           COALESCE(SUM(CASE WHEN i.DueAmount > 0 AND i.DueDate < CAST(SYSUTCDATETIME() AS DATE) AND i.Status <> 5 THEN 1 ELSE 0 END), 0) AS OverdueCount
    FROM dbo.SalesInvoices i
    JOIN dbo.Parties p ON p.Id = i.CustomerPartyId
    WHERE i.IsDeleted = 0
      AND (@CustomerPartyId IS NULL OR i.CustomerPartyId = @CustomerPartyId)
      AND (@Status IS NULL OR i.Status = @Status)
      AND (@PaymentStatus IS NULL OR i.PaymentStatus = @PaymentStatus)
      AND (@FromDate IS NULL OR i.InvoiceDate >= @FromDate)
      AND (@ToDate IS NULL OR i.InvoiceDate <= @ToDate)
      AND (@SearchPattern IS NULL OR i.InvoiceNumber LIKE @SearchPattern OR p.PartyName LIKE @SearchPattern);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_PurchaseBill_GetListSummary
    @Search NVARCHAR(200) = NULL,
    @SupplierId UNIQUEIDENTIFIER = NULL,
    @Status INT = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Pattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;

    SELECT COUNT(1) AS TotalCount,
           COALESCE(SUM(b.GrandTotal), 0) AS TotalAmount,
           COALESCE(SUM(b.PaidAmount), 0) AS PaidAmount,
           COALESCE(SUM(b.BalanceAmount), 0) AS BalanceAmount
    FROM dbo.PurchaseBills b
    JOIN dbo.Parties p ON p.Id = b.SupplierId
    WHERE b.IsDeleted = 0
      AND (@SupplierId IS NULL OR b.SupplierId = @SupplierId)
      AND (@Status IS NULL OR b.Status = @Status)
      AND (@FromDate IS NULL OR b.BillDate >= @FromDate)
      AND (@ToDate IS NULL OR b.BillDate <= @ToDate)
      AND (@Pattern IS NULL OR b.PurchaseBillNo LIKE @Pattern OR p.PartyName LIKE @Pattern);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SupplierPayment_GetListSummary
    @Search NVARCHAR(200) = NULL,
    @SupplierId UNIQUEIDENTIFIER = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Pattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;

    SELECT COUNT(1) AS TotalCount,
           COALESCE(SUM(s.Amount), 0) AS TotalPaidAmount
    FROM dbo.SupplierPayments s
    JOIN dbo.Parties p ON p.Id = s.SupplierId
    WHERE s.IsDeleted = 0
      AND (@SupplierId IS NULL OR s.SupplierId = @SupplierId)
      AND (@FromDate IS NULL OR s.PaymentDate >= @FromDate)
      AND (@ToDate IS NULL OR s.PaymentDate <= @ToDate)
      AND (@Pattern IS NULL OR s.PaymentOutNo LIKE @Pattern OR p.PartyName LIKE @Pattern);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ExpenseCategory_GetListSummary
    @Search NVARCHAR(200) = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Pattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;

    SELECT COUNT(1) AS TotalCount,
           COALESCE(SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END), 0) AS ActiveCount,
           COALESCE(SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END), 0) AS InactiveCount
    FROM dbo.ExpenseCategories
    WHERE IsDeleted = 0
      AND (@IsActive IS NULL OR IsActive = @IsActive)
      AND (@Pattern IS NULL OR Name LIKE @Pattern);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Expense_GetListSummary
    @Search NVARCHAR(200) = NULL,
    @CategoryId BIGINT = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Pattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    DECLARE @CurrentMonthStart DATE = DATEFROMPARTS(YEAR(CAST(SYSUTCDATETIME() AS DATE)), MONTH(CAST(SYSUTCDATETIME() AS DATE)), 1);
    DECLARE @NextMonthStart DATE = DATEADD(MONTH, 1, @CurrentMonthStart);

    SELECT COUNT(1) AS TotalCount,
           COALESCE(SUM(e.TotalAmount), 0) AS TotalAmount,
           COALESCE(SUM(CASE WHEN e.ExpenseDate >= @CurrentMonthStart AND e.ExpenseDate < @NextMonthStart THEN e.TotalAmount ELSE 0 END), 0) AS ThisMonthAmount
    FROM dbo.Expenses e
    JOIN dbo.ExpenseCategories c ON c.Id = e.CategoryId
    WHERE e.IsDeleted = 0
      AND (@CategoryId IS NULL OR e.CategoryId = @CategoryId)
      AND (@FromDate IS NULL OR e.ExpenseDate >= @FromDate)
      AND (@ToDate IS NULL OR e.ExpenseDate <= @ToDate)
      AND (@Pattern IS NULL OR e.ExpenseNo LIKE @Pattern OR c.Name LIKE @Pattern);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_PurchaseOrder_GetListSummary
    @Search NVARCHAR(200) = NULL,
    @SupplierId UNIQUEIDENTIFIER = NULL,
    @Status INT = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Pattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;

    SELECT COUNT(1) AS TotalCount,
           COALESCE(SUM(o.GrandTotal), 0) AS TotalAmount,
           CAST(0 AS DECIMAL(18, 2)) AS PaidAmount,
           COALESCE(SUM(o.GrandTotal), 0) AS BalanceAmount
    FROM dbo.PurchaseOrders o
    JOIN dbo.Parties p ON p.Id = o.SupplierId
    WHERE o.IsDeleted = 0
      AND (@SupplierId IS NULL OR o.SupplierId = @SupplierId)
      AND (@Status IS NULL OR o.Status = @Status)
      AND (@FromDate IS NULL OR o.OrderDate >= @FromDate)
      AND (@ToDate IS NULL OR o.OrderDate <= @ToDate)
      AND (@Pattern IS NULL OR o.PurchaseOrderNo LIKE @Pattern OR p.PartyName LIKE @Pattern);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_PurchaseReturn_GetListSummary
    @Search NVARCHAR(200) = NULL,
    @SupplierId UNIQUEIDENTIFIER = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Pattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;

    SELECT COUNT(1) AS TotalCount,
           COALESCE(SUM(r.GrandTotal), 0) AS TotalAmount,
           CAST(0 AS DECIMAL(18, 2)) AS PaidAmount,
           COALESCE(SUM(r.GrandTotal), 0) AS BalanceAmount
    FROM dbo.PurchaseReturns r
    JOIN dbo.Parties p ON p.Id = r.SupplierId
    WHERE r.IsDeleted = 0
      AND (@SupplierId IS NULL OR r.SupplierId = @SupplierId)
      AND (@FromDate IS NULL OR r.ReturnDate >= @FromDate)
      AND (@ToDate IS NULL OR r.ReturnDate <= @ToDate)
      AND (@Pattern IS NULL OR r.PurchaseReturnNo LIKE @Pattern OR p.PartyName LIKE @Pattern);
END;
GO
