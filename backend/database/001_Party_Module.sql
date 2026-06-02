/*
    Cosmos ERP Party Management Module
    SQL Server 2022
    Safe to run more than once against the CosmosERP database.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.Parties', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Parties
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Parties_Id DEFAULT (NEWSEQUENTIALID()) CONSTRAINT PK_Parties PRIMARY KEY,
        PartyCode NVARCHAR(50) NOT NULL,
        PartyName NVARCHAR(200) NOT NULL,
        MobileNo NVARCHAR(20) NULL,
        Email NVARCHAR(200) NULL,
        GSTTreatment INT NOT NULL,
        GSTIN NVARCHAR(20) NULL,
        LegalName NVARCHAR(250) NULL,
        TradeName NVARCHAR(250) NULL,
        BillingAddressLine1 NVARCHAR(250) NULL,
        BillingAddressLine2 NVARCHAR(250) NULL,
        BillingCity NVARCHAR(100) NULL,
        BillingState NVARCHAR(100) NULL,
        BillingCountry NVARCHAR(100) NULL,
        BillingPincode NVARCHAR(20) NULL,
        ShippingAddressLine1 NVARCHAR(250) NULL,
        ShippingAddressLine2 NVARCHAR(250) NULL,
        ShippingCity NVARCHAR(100) NULL,
        ShippingState NVARCHAR(100) NULL,
        ShippingCountry NVARCHAR(100) NULL,
        ShippingPincode NVARCHAR(20) NULL,
        OpeningBalance DECIMAL(18,2) NOT NULL CONSTRAINT DF_Parties_OpeningBalance DEFAULT (0),
        OpeningBalanceType INT NOT NULL,
        CreditLimit DECIMAL(18,2) NOT NULL CONSTRAINT DF_Parties_CreditLimit DEFAULT (0),
        CreditPeriodDays INT NOT NULL CONSTRAINT DF_Parties_CreditPeriodDays DEFAULT (0),
        IsActive BIT NOT NULL CONSTRAINT DF_Parties_IsActive DEFAULT (1),
        CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_Parties_CreatedOn DEFAULT (SYSUTCDATETIME()),
        CreatedBy UNIQUEIDENTIFIER NULL,
        ModifiedOn DATETIME2(3) NULL,
        ModifiedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_Parties_IsDeleted DEFAULT (0),
        DeletedOn DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT UQ_Parties_PartyCode UNIQUE (PartyCode)
    );
END;
GO

IF OBJECT_ID(N'dbo.PartySettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PartySettings
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_PartySettings_Id DEFAULT (NEWSEQUENTIALID()) CONSTRAINT PK_PartySettings PRIMARY KEY,
        EnablePartyGrouping BIT NOT NULL CONSTRAINT DF_PartySettings_EnablePartyGrouping DEFAULT (0),
        EnableShippingAddress BIT NOT NULL CONSTRAINT DF_PartySettings_EnableShippingAddress DEFAULT (1),
        PrintShippingAddress BIT NOT NULL CONSTRAINT DF_PartySettings_PrintShippingAddress DEFAULT (0),
        EnablePartyStatus BIT NOT NULL CONSTRAINT DF_PartySettings_EnablePartyStatus DEFAULT (1),
        EnablePaymentReminder BIT NOT NULL CONSTRAINT DF_PartySettings_EnablePaymentReminder DEFAULT (0),
        ReminderDays INT NOT NULL CONSTRAINT DF_PartySettings_ReminderDays DEFAULT (0),
        ReminderMessage NVARCHAR(500) NULL,
        EnableLoyaltyPoints BIT NOT NULL CONSTRAINT DF_PartySettings_EnableLoyaltyPoints DEFAULT (0),
        AdditionalField1Name NVARCHAR(100) NULL,
        AdditionalField1Enabled BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField1Enabled DEFAULT (0),
        AdditionalField1ShowInPrint BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField1ShowInPrint DEFAULT (0),
        AdditionalField2Name NVARCHAR(100) NULL,
        AdditionalField2Enabled BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField2Enabled DEFAULT (0),
        AdditionalField2ShowInPrint BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField2ShowInPrint DEFAULT (0),
        AdditionalField3Name NVARCHAR(100) NULL,
        AdditionalField3Enabled BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField3Enabled DEFAULT (0),
        AdditionalField3ShowInPrint BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField3ShowInPrint DEFAULT (0),
        AdditionalField4Name NVARCHAR(100) NULL,
        AdditionalField4Enabled BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField4Enabled DEFAULT (0),
        AdditionalField4ShowInPrint BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField4ShowInPrint DEFAULT (0),
        AdditionalField4Type INT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField4Type DEFAULT (0),
        CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_PartySettings_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedOn DATETIME2(3) NULL
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Parties_PartyName' AND object_id = OBJECT_ID(N'dbo.Parties'))
    CREATE INDEX IX_Parties_PartyName ON dbo.Parties(PartyName);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Parties_MobileNo' AND object_id = OBJECT_ID(N'dbo.Parties'))
    CREATE INDEX IX_Parties_MobileNo ON dbo.Parties(MobileNo);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Parties_GSTIN' AND object_id = OBJECT_ID(N'dbo.Parties'))
    CREATE INDEX IX_Parties_GSTIN ON dbo.Parties(GSTIN);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Parties_IsDeleted' AND object_id = OBJECT_ID(N'dbo.Parties'))
    CREATE INDEX IX_Parties_IsDeleted ON dbo.Parties(IsDeleted);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.PartySettings)
BEGIN
    INSERT INTO dbo.PartySettings
    (
        EnablePartyGrouping, EnableShippingAddress, PrintShippingAddress, EnablePartyStatus,
        EnablePaymentReminder, ReminderDays, ReminderMessage, EnableLoyaltyPoints,
        AdditionalField1Name, AdditionalField1Enabled, AdditionalField1ShowInPrint,
        AdditionalField2Name, AdditionalField2Enabled, AdditionalField2ShowInPrint,
        AdditionalField3Name, AdditionalField3Enabled, AdditionalField3ShowInPrint,
        AdditionalField4Name, AdditionalField4Enabled, AdditionalField4ShowInPrint, AdditionalField4Type
    )
    VALUES
    (
        0, 1, 0, 1,
        0, 0, NULL, 0,
        NULL, 0, 0,
        NULL, 0, 0,
        NULL, 0, 0,
        NULL, 0, 0, 0
    );
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_GetById
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, PartyCode, PartyName, MobileNo, Email, GSTTreatment, GSTIN, LegalName, TradeName,
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
    @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SET @PageNumber = CASE WHEN @PageNumber < 1 THEN 1 ELSE @PageNumber END;
    SET @PageSize = CASE WHEN @PageSize < 1 THEN 20 WHEN @PageSize > 200 THEN 200 ELSE @PageSize END;
    SET @SortBy = CASE WHEN @SortBy IN (N'PartyCode', N'PartyName', N'MobileNo', N'GSTIN', N'CreatedOn') THEN @SortBy ELSE N'PartyName' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;

    DECLARE @Sql NVARCHAR(MAX) = N'
        SELECT Id, PartyCode, PartyName, MobileNo, Email, GSTTreatment, GSTIN, OpeningBalance, OpeningBalanceType,
               CreditLimit, CreditPeriodDays, IsActive, CreatedOn, ModifiedOn,
               COUNT(1) OVER() AS TotalCount
        FROM dbo.Parties
        WHERE IsDeleted = 0
          AND (@IsActive IS NULL OR IsActive = @IsActive)
          AND (@SearchPattern IS NULL OR PartyCode LIKE @SearchPattern OR PartyName LIKE @SearchPattern OR MobileNo LIKE @SearchPattern OR GSTIN LIKE @SearchPattern OR Email LIKE @SearchPattern)
        ORDER BY ' + QUOTENAME(@SortBy) + N' ' + @SortDirection + N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';

    EXEC sp_executesql
        @Sql,
        N'@Search NVARCHAR(200), @SearchPattern NVARCHAR(210), @IsActive BIT, @Offset INT, @PageSize INT',
        @Search = @Search,
        @SearchPattern = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END,
        @IsActive = @IsActive,
        @Offset = (@PageNumber - 1) * @PageSize,
        @PageSize = @PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_Create
    @PartyCode NVARCHAR(50),
    @PartyName NVARCHAR(200),
    @MobileNo NVARCHAR(20) = NULL,
    @Email NVARCHAR(200) = NULL,
    @GSTTreatment INT,
    @GSTIN NVARCHAR(20) = NULL,
    @LegalName NVARCHAR(250) = NULL,
    @TradeName NVARCHAR(250) = NULL,
    @BillingAddressLine1 NVARCHAR(250) = NULL,
    @BillingAddressLine2 NVARCHAR(250) = NULL,
    @BillingCity NVARCHAR(100) = NULL,
    @BillingState NVARCHAR(100) = NULL,
    @BillingCountry NVARCHAR(100) = NULL,
    @BillingPincode NVARCHAR(20) = NULL,
    @ShippingAddressLine1 NVARCHAR(250) = NULL,
    @ShippingAddressLine2 NVARCHAR(250) = NULL,
    @ShippingCity NVARCHAR(100) = NULL,
    @ShippingState NVARCHAR(100) = NULL,
    @ShippingCountry NVARCHAR(100) = NULL,
    @ShippingPincode NVARCHAR(20) = NULL,
    @OpeningBalance DECIMAL(18,2),
    @OpeningBalanceType INT,
    @CreditLimit DECIMAL(18,2),
    @CreditPeriodDays INT,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Parties WHERE PartyCode = @PartyCode AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Party code already exists.' AS [Message];
            RETURN;
        END;

        BEGIN TRANSACTION;
        DECLARE @Id UNIQUEIDENTIFIER = NEWID();
        INSERT INTO dbo.Parties
        (
            Id, PartyCode, PartyName, MobileNo, Email, GSTTreatment, GSTIN, LegalName, TradeName,
            BillingAddressLine1, BillingAddressLine2, BillingCity, BillingState, BillingCountry, BillingPincode,
            ShippingAddressLine1, ShippingAddressLine2, ShippingCity, ShippingState, ShippingCountry, ShippingPincode,
            OpeningBalance, OpeningBalanceType, CreditLimit, CreditPeriodDays, IsActive
        )
        VALUES
        (
            @Id, @PartyCode, @PartyName, @MobileNo, @Email, @GSTTreatment, @GSTIN, @LegalName, @TradeName,
            @BillingAddressLine1, @BillingAddressLine2, @BillingCity, @BillingState, @BillingCountry, @BillingPincode,
            @ShippingAddressLine1, @ShippingAddressLine2, @ShippingCity, @ShippingState, @ShippingCountry, @ShippingPincode,
            @OpeningBalance, @OpeningBalanceType, @CreditLimit, @CreditPeriodDays, @IsActive
        );
        COMMIT TRANSACTION;
        SELECT 201 AS StatusCode, N'Party created.' AS [Message];
        EXEC dbo.sp_Party_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_Update
    @Id UNIQUEIDENTIFIER,
    @PartyCode NVARCHAR(50),
    @PartyName NVARCHAR(200),
    @MobileNo NVARCHAR(20) = NULL,
    @Email NVARCHAR(200) = NULL,
    @GSTTreatment INT,
    @GSTIN NVARCHAR(20) = NULL,
    @LegalName NVARCHAR(250) = NULL,
    @TradeName NVARCHAR(250) = NULL,
    @BillingAddressLine1 NVARCHAR(250) = NULL,
    @BillingAddressLine2 NVARCHAR(250) = NULL,
    @BillingCity NVARCHAR(100) = NULL,
    @BillingState NVARCHAR(100) = NULL,
    @BillingCountry NVARCHAR(100) = NULL,
    @BillingPincode NVARCHAR(20) = NULL,
    @ShippingAddressLine1 NVARCHAR(250) = NULL,
    @ShippingAddressLine2 NVARCHAR(250) = NULL,
    @ShippingCity NVARCHAR(100) = NULL,
    @ShippingState NVARCHAR(100) = NULL,
    @ShippingCountry NVARCHAR(100) = NULL,
    @ShippingPincode NVARCHAR(20) = NULL,
    @OpeningBalance DECIMAL(18,2),
    @OpeningBalanceType INT,
    @CreditLimit DECIMAL(18,2),
    @CreditPeriodDays INT,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Parties WHERE PartyCode = @PartyCode AND Id <> @Id AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Party code already exists.' AS [Message];
            RETURN;
        END;

        BEGIN TRANSACTION;
        UPDATE dbo.Parties
        SET PartyCode = @PartyCode,
            PartyName = @PartyName,
            MobileNo = @MobileNo,
            Email = @Email,
            GSTTreatment = @GSTTreatment,
            GSTIN = @GSTIN,
            LegalName = @LegalName,
            TradeName = @TradeName,
            BillingAddressLine1 = @BillingAddressLine1,
            BillingAddressLine2 = @BillingAddressLine2,
            BillingCity = @BillingCity,
            BillingState = @BillingState,
            BillingCountry = @BillingCountry,
            BillingPincode = @BillingPincode,
            ShippingAddressLine1 = @ShippingAddressLine1,
            ShippingAddressLine2 = @ShippingAddressLine2,
            ShippingCity = @ShippingCity,
            ShippingState = @ShippingState,
            ShippingCountry = @ShippingCountry,
            ShippingPincode = @ShippingPincode,
            OpeningBalance = @OpeningBalance,
            OpeningBalanceType = @OpeningBalanceType,
            CreditLimit = @CreditLimit,
            CreditPeriodDays = @CreditPeriodDays,
            IsActive = @IsActive,
            ModifiedOn = SYSUTCDATETIME()
        WHERE Id = @Id AND IsDeleted = 0;

        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'Party was not found.' AS [Message];
            RETURN;
        END;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Party updated.' AS [Message];
        EXEC dbo.sp_Party_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_Delete
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.Parties
        SET IsDeleted = 1, IsActive = 0, DeletedOn = SYSUTCDATETIME(), ModifiedOn = SYSUTCDATETIME()
        WHERE Id = @Id AND IsDeleted = 0;
        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'Party was not found.' AS [Message];
            RETURN;
        END;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Party deleted.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_SetActive
    @Id UNIQUEIDENTIFIER,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.Parties SET IsActive = @IsActive, ModifiedOn = SYSUTCDATETIME() WHERE Id = @Id AND IsDeleted = 0;
        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'Party was not found.' AS [Message];
            RETURN;
        END;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, CASE WHEN @IsActive = 1 THEN N'Party activated.' ELSE N'Party deactivated.' END AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_PartySettings_Get
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.PartySettings)
    BEGIN
        INSERT INTO dbo.PartySettings DEFAULT VALUES;
    END;

    SELECT TOP (1) Id, EnablePartyGrouping, EnableShippingAddress, PrintShippingAddress, EnablePartyStatus,
           EnablePaymentReminder, ReminderDays, ReminderMessage, EnableLoyaltyPoints,
           AdditionalField1Name, AdditionalField1Enabled, AdditionalField1ShowInPrint,
           AdditionalField2Name, AdditionalField2Enabled, AdditionalField2ShowInPrint,
           AdditionalField3Name, AdditionalField3Enabled, AdditionalField3ShowInPrint,
           AdditionalField4Name, AdditionalField4Enabled, AdditionalField4ShowInPrint, AdditionalField4Type,
           CreatedOn, ModifiedOn
    FROM dbo.PartySettings
    ORDER BY CreatedOn;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_PartySettings_Update
    @EnablePartyGrouping BIT,
    @EnableShippingAddress BIT,
    @PrintShippingAddress BIT,
    @EnablePartyStatus BIT,
    @EnablePaymentReminder BIT,
    @ReminderDays INT,
    @ReminderMessage NVARCHAR(500) = NULL,
    @EnableLoyaltyPoints BIT,
    @AdditionalField1Name NVARCHAR(100) = NULL,
    @AdditionalField1Enabled BIT,
    @AdditionalField1ShowInPrint BIT,
    @AdditionalField2Name NVARCHAR(100) = NULL,
    @AdditionalField2Enabled BIT,
    @AdditionalField2ShowInPrint BIT,
    @AdditionalField3Name NVARCHAR(100) = NULL,
    @AdditionalField3Enabled BIT,
    @AdditionalField3ShowInPrint BIT,
    @AdditionalField4Name NVARCHAR(100) = NULL,
    @AdditionalField4Enabled BIT,
    @AdditionalField4ShowInPrint BIT,
    @AdditionalField4Type INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.PartySettings)
        BEGIN
            INSERT INTO dbo.PartySettings DEFAULT VALUES;
        END;

        DECLARE @Id UNIQUEIDENTIFIER = (SELECT TOP (1) Id FROM dbo.PartySettings ORDER BY CreatedOn);
        UPDATE dbo.PartySettings
        SET EnablePartyGrouping = @EnablePartyGrouping,
            EnableShippingAddress = @EnableShippingAddress,
            PrintShippingAddress = @PrintShippingAddress,
            EnablePartyStatus = @EnablePartyStatus,
            EnablePaymentReminder = @EnablePaymentReminder,
            ReminderDays = @ReminderDays,
            ReminderMessage = @ReminderMessage,
            EnableLoyaltyPoints = @EnableLoyaltyPoints,
            AdditionalField1Name = @AdditionalField1Name,
            AdditionalField1Enabled = @AdditionalField1Enabled,
            AdditionalField1ShowInPrint = @AdditionalField1ShowInPrint,
            AdditionalField2Name = @AdditionalField2Name,
            AdditionalField2Enabled = @AdditionalField2Enabled,
            AdditionalField2ShowInPrint = @AdditionalField2ShowInPrint,
            AdditionalField3Name = @AdditionalField3Name,
            AdditionalField3Enabled = @AdditionalField3Enabled,
            AdditionalField3ShowInPrint = @AdditionalField3ShowInPrint,
            AdditionalField4Name = @AdditionalField4Name,
            AdditionalField4Enabled = @AdditionalField4Enabled,
            AdditionalField4ShowInPrint = @AdditionalField4ShowInPrint,
            AdditionalField4Type = @AdditionalField4Type,
            ModifiedOn = SYSUTCDATETIME()
        WHERE Id = @Id;

        SELECT 200 AS StatusCode, N'Party settings updated.' AS [Message];
        EXEC dbo.sp_PartySettings_Get;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

IF OBJECT_ID(N'dbo.Pages', N'U') IS NOT NULL
BEGIN
    MERGE dbo.Pages AS target
    USING (VALUES (N'Party', N'Party Management', N'/parties', N'contact', 35)) AS source(Name, DisplayName, Route, Icon, SortOrder)
    ON target.Name = source.Name
    WHEN NOT MATCHED THEN
        INSERT(Name, DisplayName, Route, Icon, SortOrder, IsActive) VALUES(source.Name, source.DisplayName, source.Route, source.Icon, source.SortOrder, 1);
END;
GO

IF OBJECT_ID(N'dbo.Roles', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.Pages', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.RolePermissions', N'U') IS NOT NULL
BEGIN
    DECLARE @SuperAdminRoleId INT = (SELECT Id FROM dbo.Roles WHERE Name = N'SuperAdmin');
    DECLARE @PartyPageId INT = (SELECT Id FROM dbo.Pages WHERE Name = N'Party');

    IF @SuperAdminRoleId IS NOT NULL AND @PartyPageId IS NOT NULL
    BEGIN
        MERGE dbo.RolePermissions AS target
        USING (SELECT @SuperAdminRoleId AS RoleId, @PartyPageId AS PageId) AS source
        ON target.RoleId = source.RoleId AND target.PageId = source.PageId
        WHEN MATCHED THEN
            UPDATE SET CanView = 1, CanCreate = 1, CanEdit = 1, CanDelete = 1
        WHEN NOT MATCHED THEN
            INSERT(RoleId, PageId, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove)
            VALUES(source.RoleId, source.PageId, 1, 1, 1, 1, 0, 0);
    END;
END;
GO
