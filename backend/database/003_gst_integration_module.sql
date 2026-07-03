SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.CompanyGstRegistrations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompanyGstRegistrations
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CompanyGstRegistrations PRIMARY KEY,
        CompanyId BIGINT NULL,
        BranchId BIGINT NULL,
        Gstin NVARCHAR(15) NOT NULL,
        LegalName NVARCHAR(250) NULL,
        TradeName NVARCHAR(250) NULL,
        StateCode NVARCHAR(10) NULL,
        StateName NVARCHAR(100) NULL,
        BranchName NVARCHAR(150) NULL,
        AddressLine1 NVARCHAR(250) NULL,
        AddressLine2 NVARCHAR(250) NULL,
        City NVARCHAR(100) NULL,
        District NVARCHAR(100) NULL,
        Pincode NVARCHAR(20) NULL,
        AddressJson NVARCHAR(MAX) NULL,
        GstPortalUsername NVARCHAR(150) NULL,
        IsEInvoiceEnabled BIT NOT NULL CONSTRAINT DF_CompanyGstRegistrations_IsEInvoiceEnabled DEFAULT (0),
        IsEWayBillEnabled BIT NOT NULL CONSTRAINT DF_CompanyGstRegistrations_IsEWayBillEnabled DEFAULT (0),
        IsGstReturnEnabled BIT NOT NULL CONSTRAINT DF_CompanyGstRegistrations_IsGstReturnEnabled DEFAULT (0),
        IsDefault BIT NOT NULL CONSTRAINT DF_CompanyGstRegistrations_IsDefault DEFAULT (0),
        Status NVARCHAR(50) NOT NULL CONSTRAINT DF_CompanyGstRegistrations_Status DEFAULT (N'Active'),
        LastVerifiedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CompanyGstRegistrations_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_CompanyGstRegistrations_IsDeleted DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.CompanyGstSessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompanyGstSessions
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CompanyGstSessions PRIMARY KEY,
        CompanyGstRegistrationId BIGINT NOT NULL,
        ProviderName NVARCHAR(50) NOT NULL CONSTRAINT DF_CompanyGstSessions_ProviderName DEFAULT (N'GSTZen'),
        SessionType NVARCHAR(50) NULL,
        AuthToken NVARCHAR(MAX) NULL,
        RefreshToken NVARCHAR(MAX) NULL,
        TokenExpiresAt DATETIME2 NULL,
        OtpVerifiedAt DATETIME2 NULL,
        Status NVARCHAR(50) NOT NULL CONSTRAINT DF_CompanyGstSessions_Status DEFAULT (N'Active'),
        LastErrorMessage NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CompanyGstSessions_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_CompanyGstSessions_IsDeleted DEFAULT (0),
        CONSTRAINT FK_CompanyGstSessions_CompanyGstRegistrations FOREIGN KEY (CompanyGstRegistrationId) REFERENCES dbo.CompanyGstRegistrations(Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.GstVerificationLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.GstVerificationLogs
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GstVerificationLogs PRIMARY KEY,
        Gstin NVARCHAR(15) NOT NULL,
        LegalName NVARCHAR(250) NULL,
        TradeName NVARCHAR(250) NULL,
        Status NVARCHAR(50) NULL,
        TaxpayerType NVARCHAR(100) NULL,
        StateCode NVARCHAR(10) NULL,
        RegistrationDate DATETIME2 NULL,
        AddressJson NVARCHAR(MAX) NULL,
        NatureOfBusinessJson NVARCHAR(MAX) NULL,
        RawResponseJson NVARCHAR(MAX) NULL,
        ProviderName NVARCHAR(50) NOT NULL CONSTRAINT DF_GstVerificationLogs_ProviderName DEFAULT (N'GSTZen'),
        VerifiedAt DATETIME2 NOT NULL CONSTRAINT DF_GstVerificationLogs_VerifiedAt DEFAULT SYSUTCDATETIME(),
        CacheExpiresAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_GstVerificationLogs_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_GstVerificationLogs_IsDeleted DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.EWayBills', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EWayBills
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EWayBills PRIMARY KEY,
        CompanyGstRegistrationId BIGINT NOT NULL,
        SalesInvoiceId BIGINT NULL,
        PurchaseInvoiceId BIGINT NULL,
        EWayBillNumber NVARCHAR(100) NULL,
        Status NVARCHAR(50) NOT NULL CONSTRAINT DF_EWayBills_Status DEFAULT (N'Generated'),
        DocumentType NVARCHAR(50) NULL,
        DocumentNumber NVARCHAR(100) NULL,
        DocumentDate DATETIME2 NULL,
        SupplyType NVARCHAR(20) NULL,
        SubSupplyType NVARCHAR(20) NULL,
        FromGstin NVARCHAR(15) NULL,
        ToGstin NVARCHAR(15) NULL,
        TransporterId NVARCHAR(50) NULL,
        TransporterName NVARCHAR(250) NULL,
        TransportMode NVARCHAR(20) NULL,
        VehicleNumber NVARCHAR(50) NULL,
        VehicleType NVARCHAR(20) NULL,
        Distance DECIMAL(18,2) NULL,
        ValidUpTo DATETIME2 NULL,
        GeneratedRequestJson NVARCHAR(MAX) NULL,
        GeneratedResponseJson NVARCHAR(MAX) NULL,
        CancelledAt DATETIME2 NULL,
        CancelReasonCode NVARCHAR(50) NULL,
        CancelReason NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_EWayBills_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_EWayBills_IsDeleted DEFAULT (0),
        CONSTRAINT FK_EWayBills_CompanyGstRegistrations FOREIGN KEY (CompanyGstRegistrationId) REFERENCES dbo.CompanyGstRegistrations(Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.EInvoices', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EInvoices
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EInvoices PRIMARY KEY,
        CompanyGstRegistrationId BIGINT NOT NULL,
        SalesInvoiceId BIGINT NULL,
        Irn NVARCHAR(500) NULL,
        AckNumber NVARCHAR(100) NULL,
        AckDate DATETIME2 NULL,
        DocumentType NVARCHAR(50) NULL,
        DocumentNumber NVARCHAR(100) NULL,
        DocumentDate DATETIME2 NULL,
        SellerGstin NVARCHAR(15) NULL,
        BuyerGstin NVARCHAR(15) NULL,
        SignedQrCode NVARCHAR(MAX) NULL,
        SignedInvoice NVARCHAR(MAX) NULL,
        Status NVARCHAR(50) NOT NULL CONSTRAINT DF_EInvoices_Status DEFAULT (N'Generated'),
        GeneratedRequestJson NVARCHAR(MAX) NULL,
        GeneratedResponseJson NVARCHAR(MAX) NULL,
        CancelledAt DATETIME2 NULL,
        CancelReasonCode NVARCHAR(50) NULL,
        CancelReason NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_EInvoices_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_EInvoices_IsDeleted DEFAULT (0),
        CONSTRAINT FK_EInvoices_CompanyGstRegistrations FOREIGN KEY (CompanyGstRegistrationId) REFERENCES dbo.CompanyGstRegistrations(Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.GstApiLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.GstApiLogs
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GstApiLogs PRIMARY KEY,
        CompanyGstRegistrationId BIGINT NULL,
        ProviderName NVARCHAR(50) NOT NULL CONSTRAINT DF_GstApiLogs_ProviderName DEFAULT (N'GSTZen'),
        ApiType NVARCHAR(100) NOT NULL,
        Endpoint NVARCHAR(500) NULL,
        HttpMethod NVARCHAR(20) NULL,
        RequestPayload NVARCHAR(MAX) NULL,
        ResponsePayload NVARCHAR(MAX) NULL,
        StatusCode INT NULL,
        IsSuccess BIT NOT NULL,
        ErrorMessage NVARCHAR(MAX) NULL,
        DurationMs INT NULL,
        CorrelationId NVARCHAR(100) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_GstApiLogs_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        CONSTRAINT FK_GstApiLogs_CompanyGstRegistrations FOREIGN KEY (CompanyGstRegistrationId) REFERENCES dbo.CompanyGstRegistrations(Id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_CompanyGstRegistrations_Gstin_Active' AND object_id = OBJECT_ID(N'dbo.CompanyGstRegistrations'))
    CREATE UNIQUE INDEX UX_CompanyGstRegistrations_Gstin_Active ON dbo.CompanyGstRegistrations(Gstin) WHERE IsDeleted = 0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CompanyGstRegistrations_CompanyId' AND object_id = OBJECT_ID(N'dbo.CompanyGstRegistrations'))
    CREATE INDEX IX_CompanyGstRegistrations_CompanyId ON dbo.CompanyGstRegistrations(CompanyId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CompanyGstRegistrations_BranchId' AND object_id = OBJECT_ID(N'dbo.CompanyGstRegistrations'))
    CREATE INDEX IX_CompanyGstRegistrations_BranchId ON dbo.CompanyGstRegistrations(BranchId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CompanyGstRegistrations_StateCode' AND object_id = OBJECT_ID(N'dbo.CompanyGstRegistrations'))
    CREATE INDEX IX_CompanyGstRegistrations_StateCode ON dbo.CompanyGstRegistrations(StateCode);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CompanyGstRegistrations_Status' AND object_id = OBJECT_ID(N'dbo.CompanyGstRegistrations'))
    CREATE INDEX IX_CompanyGstRegistrations_Status ON dbo.CompanyGstRegistrations(Status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_GstVerificationLogs_Gstin' AND object_id = OBJECT_ID(N'dbo.GstVerificationLogs'))
    CREATE INDEX IX_GstVerificationLogs_Gstin ON dbo.GstVerificationLogs(Gstin);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_GstVerificationLogs_CacheExpiresAt' AND object_id = OBJECT_ID(N'dbo.GstVerificationLogs'))
    CREATE INDEX IX_GstVerificationLogs_CacheExpiresAt ON dbo.GstVerificationLogs(CacheExpiresAt);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_GstVerificationLogs_VerifiedAt' AND object_id = OBJECT_ID(N'dbo.GstVerificationLogs'))
    CREATE INDEX IX_GstVerificationLogs_VerifiedAt ON dbo.GstVerificationLogs(VerifiedAt);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EWayBills_CompanyGstRegistrationId' AND object_id = OBJECT_ID(N'dbo.EWayBills'))
    CREATE INDEX IX_EWayBills_CompanyGstRegistrationId ON dbo.EWayBills(CompanyGstRegistrationId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EWayBills_SalesInvoiceId' AND object_id = OBJECT_ID(N'dbo.EWayBills'))
    CREATE INDEX IX_EWayBills_SalesInvoiceId ON dbo.EWayBills(SalesInvoiceId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EWayBills_EWayBillNumber' AND object_id = OBJECT_ID(N'dbo.EWayBills'))
    CREATE INDEX IX_EWayBills_EWayBillNumber ON dbo.EWayBills(EWayBillNumber);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EWayBills_DocumentNumber' AND object_id = OBJECT_ID(N'dbo.EWayBills'))
    CREATE INDEX IX_EWayBills_DocumentNumber ON dbo.EWayBills(DocumentNumber);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EWayBills_Status' AND object_id = OBJECT_ID(N'dbo.EWayBills'))
    CREATE INDEX IX_EWayBills_Status ON dbo.EWayBills(Status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EInvoices_CompanyGstRegistrationId' AND object_id = OBJECT_ID(N'dbo.EInvoices'))
    CREATE INDEX IX_EInvoices_CompanyGstRegistrationId ON dbo.EInvoices(CompanyGstRegistrationId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EInvoices_SalesInvoiceId' AND object_id = OBJECT_ID(N'dbo.EInvoices'))
    CREATE INDEX IX_EInvoices_SalesInvoiceId ON dbo.EInvoices(SalesInvoiceId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EInvoices_Irn' AND object_id = OBJECT_ID(N'dbo.EInvoices'))
    CREATE INDEX IX_EInvoices_Irn ON dbo.EInvoices(Irn);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EInvoices_DocumentNumber' AND object_id = OBJECT_ID(N'dbo.EInvoices'))
    CREATE INDEX IX_EInvoices_DocumentNumber ON dbo.EInvoices(DocumentNumber);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EInvoices_Status' AND object_id = OBJECT_ID(N'dbo.EInvoices'))
    CREATE INDEX IX_EInvoices_Status ON dbo.EInvoices(Status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_GstApiLogs_CompanyGstRegistrationId' AND object_id = OBJECT_ID(N'dbo.GstApiLogs'))
    CREATE INDEX IX_GstApiLogs_CompanyGstRegistrationId ON dbo.GstApiLogs(CompanyGstRegistrationId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_GstApiLogs_ApiType' AND object_id = OBJECT_ID(N'dbo.GstApiLogs'))
    CREATE INDEX IX_GstApiLogs_ApiType ON dbo.GstApiLogs(ApiType);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_GstApiLogs_CreatedAt' AND object_id = OBJECT_ID(N'dbo.GstApiLogs'))
    CREATE INDEX IX_GstApiLogs_CreatedAt ON dbo.GstApiLogs(CreatedAt);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_GstApiLogs_IsSuccess' AND object_id = OBJECT_ID(N'dbo.GstApiLogs'))
    CREATE INDEX IX_GstApiLogs_IsSuccess ON dbo.GstApiLogs(IsSuccess);
GO

CREATE OR ALTER PROCEDURE dbo.sp_GstRegistration_GstinExists @Gstin NVARCHAR(15), @ExcludingId BIGINT = NULL AS
BEGIN
    SET NOCOUNT ON;
    SELECT CONVERT(BIT, IIF(EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations WHERE Gstin = @Gstin AND IsDeleted = 0 AND (@ExcludingId IS NULL OR Id <> @ExcludingId)), 1, 0));
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GstRegistration_GetById @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM dbo.CompanyGstRegistrations WHERE Id = @Id AND IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GstRegistration_GetList
    @Search NVARCHAR(200) = NULL, @CompanyId BIGINT = NULL, @BranchId BIGINT = NULL, @StateCode NVARCHAR(10) = NULL, @Status NVARCHAR(50) = NULL,
    @PageNumber INT = 1, @PageSize INT = 20, @SortBy NVARCHAR(50) = N'CreatedAt', @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;
    ;WITH rows AS
    (
        SELECT *, COUNT(1) OVER() AS TotalCount
        FROM dbo.CompanyGstRegistrations
        WHERE IsDeleted = 0
          AND (@Search IS NULL OR Gstin LIKE N'%' + @Search + N'%' OR LegalName LIKE N'%' + @Search + N'%' OR TradeName LIKE N'%' + @Search + N'%')
          AND (@CompanyId IS NULL OR CompanyId = @CompanyId)
          AND (@BranchId IS NULL OR BranchId = @BranchId)
          AND (@StateCode IS NULL OR StateCode = @StateCode)
          AND (@Status IS NULL OR Status = @Status)
    )
    SELECT *
    FROM rows
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'Gstin' THEN Gstin END ASC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'Gstin' THEN Gstin END DESC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'LegalName' THEN LegalName END ASC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'LegalName' THEN LegalName END DESC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'CreatedAt' THEN CreatedAt END ASC,
        CASE WHEN @SortDirection <> N'ASC' AND @SortBy = N'CreatedAt' THEN CreatedAt END DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GstRegistration_Create
    @CompanyId BIGINT = NULL, @BranchId BIGINT = NULL, @Gstin NVARCHAR(15), @LegalName NVARCHAR(250) = NULL, @TradeName NVARCHAR(250) = NULL,
    @StateCode NVARCHAR(10) = NULL, @StateName NVARCHAR(100) = NULL, @BranchName NVARCHAR(150) = NULL, @AddressLine1 NVARCHAR(250) = NULL,
    @AddressLine2 NVARCHAR(250) = NULL, @City NVARCHAR(100) = NULL, @District NVARCHAR(100) = NULL, @Pincode NVARCHAR(20) = NULL,
    @AddressJson NVARCHAR(MAX) = NULL, @GstPortalUsername NVARCHAR(150) = NULL, @IsEInvoiceEnabled BIT = 0, @IsEWayBillEnabled BIT = 0,
    @IsGstReturnEnabled BIT = 0, @IsDefault BIT = 0, @Status NVARCHAR(50) = N'Active', @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations WHERE Gstin = @Gstin AND IsDeleted = 0) BEGIN SELECT 409 StatusCode, N'GSTIN already exists.' Message; RETURN; END
        BEGIN TRANSACTION;
        IF @IsDefault = 1 UPDATE dbo.CompanyGstRegistrations SET IsDefault = 0, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UserId WHERE IsDeleted = 0 AND ((@CompanyId IS NULL AND CompanyId IS NULL) OR CompanyId = @CompanyId);
        INSERT dbo.CompanyGstRegistrations(CompanyId, BranchId, Gstin, LegalName, TradeName, StateCode, StateName, BranchName, AddressLine1, AddressLine2, City, District, Pincode, AddressJson, GstPortalUsername, IsEInvoiceEnabled, IsEWayBillEnabled, IsGstReturnEnabled, IsDefault, Status, CreatedBy)
        VALUES(@CompanyId, @BranchId, UPPER(@Gstin), @LegalName, @TradeName, @StateCode, @StateName, @BranchName, @AddressLine1, @AddressLine2, @City, @District, @Pincode, @AddressJson, @GstPortalUsername, @IsEInvoiceEnabled, @IsEWayBillEnabled, @IsGstReturnEnabled, @IsDefault, @Status, @UserId);
        DECLARE @Id BIGINT = SCOPE_IDENTITY();
        COMMIT; SELECT 201 StatusCode, N'GST registration created.' Message; EXEC dbo.sp_GstRegistration_GetById @Id;
    END TRY BEGIN CATCH IF XACT_STATE() <> 0 ROLLBACK; SELECT 500 StatusCode, ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GstRegistration_Update
    @Id BIGINT, @CompanyId BIGINT = NULL, @BranchId BIGINT = NULL, @Gstin NVARCHAR(15), @LegalName NVARCHAR(250) = NULL, @TradeName NVARCHAR(250) = NULL,
    @StateCode NVARCHAR(10) = NULL, @StateName NVARCHAR(100) = NULL, @BranchName NVARCHAR(150) = NULL, @AddressLine1 NVARCHAR(250) = NULL,
    @AddressLine2 NVARCHAR(250) = NULL, @City NVARCHAR(100) = NULL, @District NVARCHAR(100) = NULL, @Pincode NVARCHAR(20) = NULL,
    @AddressJson NVARCHAR(MAX) = NULL, @GstPortalUsername NVARCHAR(150) = NULL, @IsEInvoiceEnabled BIT = 0, @IsEWayBillEnabled BIT = 0,
    @IsGstReturnEnabled BIT = 0, @IsDefault BIT = 0, @Status NVARCHAR(50) = N'Active', @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations WHERE Id = @Id AND IsDeleted = 0) BEGIN SELECT 404 StatusCode, N'GST registration was not found.' Message; RETURN; END
        IF EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations WHERE Gstin = @Gstin AND IsDeleted = 0 AND Id <> @Id) BEGIN SELECT 409 StatusCode, N'GSTIN already exists.' Message; RETURN; END
        BEGIN TRANSACTION;
        IF @IsDefault = 1 UPDATE dbo.CompanyGstRegistrations SET IsDefault = 0, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UserId WHERE IsDeleted = 0 AND Id <> @Id AND ((@CompanyId IS NULL AND CompanyId IS NULL) OR CompanyId = @CompanyId);
        UPDATE dbo.CompanyGstRegistrations
        SET CompanyId = @CompanyId, BranchId = @BranchId, Gstin = UPPER(@Gstin), LegalName = @LegalName, TradeName = @TradeName, StateCode = @StateCode, StateName = @StateName,
            BranchName = @BranchName, AddressLine1 = @AddressLine1, AddressLine2 = @AddressLine2, City = @City, District = @District, Pincode = @Pincode, AddressJson = @AddressJson,
            GstPortalUsername = @GstPortalUsername, IsEInvoiceEnabled = @IsEInvoiceEnabled, IsEWayBillEnabled = @IsEWayBillEnabled, IsGstReturnEnabled = @IsGstReturnEnabled,
            IsDefault = @IsDefault, Status = @Status, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UserId
        WHERE Id = @Id AND IsDeleted = 0;
        COMMIT; SELECT 200 StatusCode, N'GST registration updated.' Message; EXEC dbo.sp_GstRegistration_GetById @Id;
    END TRY BEGIN CATCH IF XACT_STATE() <> 0 ROLLBACK; SELECT 500 StatusCode, ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GstRegistration_Delete @Id BIGINT, @UserId BIGINT = NULL AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.CompanyGstRegistrations SET IsDeleted = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UserId WHERE Id = @Id AND IsDeleted = 0;
    SELECT IIF(@@ROWCOUNT = 0, 404, 200) StatusCode, IIF(@@ROWCOUNT = 0, N'GST registration was not found.', N'GST registration deleted.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GstRegistration_SetDefault @Id BIGINT, @CompanyId BIGINT = NULL, @UserId BIGINT = NULL AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations WHERE Id = @Id AND IsDeleted = 0) BEGIN SELECT 404 StatusCode, N'GST registration was not found.' Message; RETURN; END
        BEGIN TRANSACTION;
        UPDATE dbo.CompanyGstRegistrations SET IsDefault = 0, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UserId WHERE IsDeleted = 0 AND ((@CompanyId IS NULL AND CompanyId IS NULL) OR CompanyId = @CompanyId);
        UPDATE dbo.CompanyGstRegistrations SET IsDefault = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UserId WHERE Id = @Id;
        COMMIT; SELECT 200 StatusCode, N'Default GST registration updated.' Message; EXEC dbo.sp_GstRegistration_GetById @Id;
    END TRY BEGIN CATCH IF XACT_STATE() <> 0 ROLLBACK; SELECT 500 StatusCode, ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GstRegistration_UpdateVerification @Id BIGINT, @LegalName NVARCHAR(250) = NULL, @TradeName NVARCHAR(250) = NULL, @StateCode NVARCHAR(10) = NULL, @AddressJson NVARCHAR(MAX) = NULL, @UserId BIGINT = NULL AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.CompanyGstRegistrations
    SET LegalName = COALESCE(@LegalName, LegalName), TradeName = COALESCE(@TradeName, TradeName), StateCode = COALESCE(@StateCode, StateCode), AddressJson = COALESCE(@AddressJson, AddressJson), LastVerifiedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UserId
    WHERE Id = @Id AND IsDeleted = 0;
    IF @@ROWCOUNT = 0 SELECT 404 StatusCode, N'GST registration was not found.' Message;
    ELSE BEGIN SELECT 200 StatusCode, N'GST registration verified.' Message; EXEC dbo.sp_GstRegistration_GetById @Id; END
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GstVerification_GetCached @Gstin NVARCHAR(15) AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (1) Gstin, LegalName, TradeName, Status, TaxpayerType, StateCode, RegistrationDate, AddressJson, NatureOfBusinessJson, RawResponseJson, ProviderName, VerifiedAt, CacheExpiresAt
    FROM dbo.GstVerificationLogs
    WHERE Gstin = @Gstin AND IsDeleted = 0 AND CacheExpiresAt > SYSUTCDATETIME()
    ORDER BY VerifiedAt DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GstVerificationLog_Create
    @Gstin NVARCHAR(15), @LegalName NVARCHAR(250) = NULL, @TradeName NVARCHAR(250) = NULL, @Status NVARCHAR(50) = NULL, @TaxpayerType NVARCHAR(100) = NULL,
    @StateCode NVARCHAR(10) = NULL, @RegistrationDate DATETIME2 = NULL, @AddressJson NVARCHAR(MAX) = NULL, @NatureOfBusinessJson NVARCHAR(MAX) = NULL,
    @RawResponseJson NVARCHAR(MAX) = NULL, @ProviderName NVARCHAR(50) = N'GSTZen', @CacheExpiresAt DATETIME2 = NULL, @CreatedBy BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT dbo.GstVerificationLogs(Gstin, LegalName, TradeName, Status, TaxpayerType, StateCode, RegistrationDate, AddressJson, NatureOfBusinessJson, RawResponseJson, ProviderName, CacheExpiresAt, CreatedBy)
    VALUES(UPPER(@Gstin), @LegalName, @TradeName, @Status, @TaxpayerType, @StateCode, @RegistrationDate, @AddressJson, @NatureOfBusinessJson, @RawResponseJson, @ProviderName, @CacheExpiresAt, @CreatedBy);
    SELECT 201 StatusCode, N'GST verification log created.' Message;
    SELECT TOP (1) Gstin, LegalName, TradeName, Status, TaxpayerType, StateCode, RegistrationDate, AddressJson, NatureOfBusinessJson, RawResponseJson, ProviderName, VerifiedAt, CacheExpiresAt FROM dbo.GstVerificationLogs WHERE Id = SCOPE_IDENTITY();
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_EWayBill_GetByNumber @EWayBillNumber NVARCHAR(100) AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (1) * FROM dbo.EWayBills WHERE EWayBillNumber = @EWayBillNumber AND IsDeleted = 0 ORDER BY CreatedAt DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_EWayBill_Create
    @CompanyGstRegistrationId BIGINT, @SalesInvoiceId BIGINT = NULL, @PurchaseInvoiceId BIGINT = NULL, @EWayBillNumber NVARCHAR(100) = NULL, @Status NVARCHAR(50) = N'Generated',
    @DocumentType NVARCHAR(50) = NULL, @DocumentNumber NVARCHAR(100) = NULL, @DocumentDate DATETIME2 = NULL, @SupplyType NVARCHAR(20) = NULL, @SubSupplyType NVARCHAR(20) = NULL,
    @FromGstin NVARCHAR(15) = NULL, @ToGstin NVARCHAR(15) = NULL, @TransporterId NVARCHAR(50) = NULL, @TransporterName NVARCHAR(250) = NULL, @TransportMode NVARCHAR(20) = NULL,
    @VehicleNumber NVARCHAR(50) = NULL, @VehicleType NVARCHAR(20) = NULL, @Distance DECIMAL(18,2) = NULL, @ValidUpTo DATETIME2 = NULL, @GeneratedRequestJson NVARCHAR(MAX) = NULL,
    @GeneratedResponseJson NVARCHAR(MAX) = NULL, @CreatedBy BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations WHERE Id = @CompanyGstRegistrationId AND IsDeleted = 0) BEGIN SELECT 404 StatusCode, N'GST registration was not found.' Message; RETURN; END
    INSERT dbo.EWayBills(CompanyGstRegistrationId, SalesInvoiceId, PurchaseInvoiceId, EWayBillNumber, Status, DocumentType, DocumentNumber, DocumentDate, SupplyType, SubSupplyType, FromGstin, ToGstin, TransporterId, TransporterName, TransportMode, VehicleNumber, VehicleType, Distance, ValidUpTo, GeneratedRequestJson, GeneratedResponseJson, CreatedBy)
    VALUES(@CompanyGstRegistrationId, @SalesInvoiceId, @PurchaseInvoiceId, @EWayBillNumber, @Status, @DocumentType, @DocumentNumber, @DocumentDate, @SupplyType, @SubSupplyType, @FromGstin, @ToGstin, @TransporterId, @TransporterName, @TransportMode, @VehicleNumber, @VehicleType, @Distance, @ValidUpTo, @GeneratedRequestJson, @GeneratedResponseJson, @CreatedBy);
    DECLARE @Id BIGINT = SCOPE_IDENTITY();
    SELECT 201 StatusCode, N'E-Way Bill created.' Message; SELECT * FROM dbo.EWayBills WHERE Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_EWayBill_Cancel @CompanyGstRegistrationId BIGINT, @EWayBillNumber NVARCHAR(100), @CancelReasonCode NVARCHAR(50), @CancelReason NVARCHAR(500), @ResponseJson NVARCHAR(MAX) = NULL, @UpdatedBy BIGINT = NULL AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.EWayBills
    SET Status = N'Cancelled', CancelledAt = SYSUTCDATETIME(), CancelReasonCode = @CancelReasonCode, CancelReason = @CancelReason, GeneratedResponseJson = COALESCE(@ResponseJson, GeneratedResponseJson), UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UpdatedBy
    WHERE CompanyGstRegistrationId = @CompanyGstRegistrationId AND EWayBillNumber = @EWayBillNumber AND IsDeleted = 0;
    IF @@ROWCOUNT = 0 SELECT 404 StatusCode, N'E-Way Bill was not found.' Message;
    ELSE BEGIN SELECT 200 StatusCode, N'E-Way Bill cancelled.' Message; EXEC dbo.sp_EWayBill_GetByNumber @EWayBillNumber; END
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_EInvoice_GetByIrn @Irn NVARCHAR(500) AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (1) * FROM dbo.EInvoices WHERE Irn = @Irn AND IsDeleted = 0 ORDER BY CreatedAt DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_EInvoice_Create
    @CompanyGstRegistrationId BIGINT, @SalesInvoiceId BIGINT = NULL, @Irn NVARCHAR(500) = NULL, @AckNumber NVARCHAR(100) = NULL, @AckDate DATETIME2 = NULL,
    @DocumentType NVARCHAR(50) = NULL, @DocumentNumber NVARCHAR(100) = NULL, @DocumentDate DATETIME2 = NULL, @SellerGstin NVARCHAR(15) = NULL, @BuyerGstin NVARCHAR(15) = NULL,
    @SignedQrCode NVARCHAR(MAX) = NULL, @SignedInvoice NVARCHAR(MAX) = NULL, @Status NVARCHAR(50) = N'Generated', @GeneratedRequestJson NVARCHAR(MAX) = NULL, @GeneratedResponseJson NVARCHAR(MAX) = NULL, @CreatedBy BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations WHERE Id = @CompanyGstRegistrationId AND IsDeleted = 0) BEGIN SELECT 404 StatusCode, N'GST registration was not found.' Message; RETURN; END
    INSERT dbo.EInvoices(CompanyGstRegistrationId, SalesInvoiceId, Irn, AckNumber, AckDate, DocumentType, DocumentNumber, DocumentDate, SellerGstin, BuyerGstin, SignedQrCode, SignedInvoice, Status, GeneratedRequestJson, GeneratedResponseJson, CreatedBy)
    VALUES(@CompanyGstRegistrationId, @SalesInvoiceId, @Irn, @AckNumber, @AckDate, @DocumentType, @DocumentNumber, @DocumentDate, @SellerGstin, @BuyerGstin, @SignedQrCode, @SignedInvoice, @Status, @GeneratedRequestJson, @GeneratedResponseJson, @CreatedBy);
    DECLARE @Id BIGINT = SCOPE_IDENTITY();
    SELECT 201 StatusCode, N'E-Invoice created.' Message; SELECT * FROM dbo.EInvoices WHERE Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_EInvoice_Cancel @CompanyGstRegistrationId BIGINT, @Irn NVARCHAR(500), @CancelReasonCode NVARCHAR(50), @CancelReason NVARCHAR(500), @ResponseJson NVARCHAR(MAX) = NULL, @UpdatedBy BIGINT = NULL AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.EInvoices
    SET Status = N'Cancelled', CancelledAt = SYSUTCDATETIME(), CancelReasonCode = @CancelReasonCode, CancelReason = @CancelReason, GeneratedResponseJson = COALESCE(@ResponseJson, GeneratedResponseJson), UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UpdatedBy
    WHERE CompanyGstRegistrationId = @CompanyGstRegistrationId AND Irn = @Irn AND IsDeleted = 0;
    IF @@ROWCOUNT = 0 SELECT 404 StatusCode, N'E-Invoice was not found.' Message;
    ELSE BEGIN SELECT 200 StatusCode, N'E-Invoice cancelled.' Message; EXEC dbo.sp_EInvoice_GetByIrn @Irn; END
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GstSession_GetStatus @CompanyGstRegistrationId BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (1) Id, CompanyGstRegistrationId, ProviderName, SessionType, TokenExpiresAt, OtpVerifiedAt, Status, LastErrorMessage, CreatedAt, UpdatedAt
    FROM dbo.CompanyGstSessions
    WHERE CompanyGstRegistrationId = @CompanyGstRegistrationId AND IsDeleted = 0
    ORDER BY UpdatedAt DESC, CreatedAt DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GstSession_Save
    @CompanyGstRegistrationId BIGINT, @ProviderName NVARCHAR(50) = N'GSTZen', @SessionType NVARCHAR(50) = NULL, @AuthToken NVARCHAR(MAX) = NULL, @RefreshToken NVARCHAR(MAX) = NULL,
    @TokenExpiresAt DATETIME2 = NULL, @OtpVerifiedAt DATETIME2 = NULL, @Status NVARCHAR(50) = N'Active', @LastErrorMessage NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations WHERE Id = @CompanyGstRegistrationId AND IsDeleted = 0) BEGIN SELECT 404 StatusCode, N'GST registration was not found.' Message; RETURN; END
    INSERT dbo.CompanyGstSessions(CompanyGstRegistrationId, ProviderName, SessionType, AuthToken, RefreshToken, TokenExpiresAt, OtpVerifiedAt, Status, LastErrorMessage, UpdatedAt)
    VALUES(@CompanyGstRegistrationId, @ProviderName, @SessionType, @AuthToken, @RefreshToken, @TokenExpiresAt, @OtpVerifiedAt, @Status, @LastErrorMessage, SYSUTCDATETIME());
    SELECT 201 StatusCode, N'GST session saved.' Message; EXEC dbo.sp_GstSession_GetStatus @CompanyGstRegistrationId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GstApiLog_GetList
    @Search NVARCHAR(200) = NULL, @CompanyGstRegistrationId BIGINT = NULL, @ApiType NVARCHAR(100) = NULL, @IsSuccess BIT = NULL, @FromDate DATETIME2 = NULL, @ToDate DATETIME2 = NULL,
    @PageNumber INT = 1, @PageSize INT = 20, @SortBy NVARCHAR(50) = N'CreatedAt', @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;
    ;WITH rows AS
    (
        SELECT *, COUNT(1) OVER() AS TotalCount
        FROM dbo.GstApiLogs
        WHERE (@Search IS NULL OR ApiType LIKE N'%' + @Search + N'%' OR Endpoint LIKE N'%' + @Search + N'%' OR ErrorMessage LIKE N'%' + @Search + N'%')
          AND (@CompanyGstRegistrationId IS NULL OR CompanyGstRegistrationId = @CompanyGstRegistrationId)
          AND (@ApiType IS NULL OR ApiType = @ApiType)
          AND (@IsSuccess IS NULL OR IsSuccess = @IsSuccess)
          AND (@FromDate IS NULL OR CreatedAt >= @FromDate)
          AND (@ToDate IS NULL OR CreatedAt <= @ToDate)
    )
    SELECT *
    FROM rows
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'ApiType' THEN ApiType END ASC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'ApiType' THEN ApiType END DESC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'CreatedAt' THEN CreatedAt END ASC,
        CASE WHEN @SortDirection <> N'ASC' AND @SortBy = N'CreatedAt' THEN CreatedAt END DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GstApiLog_Create
    @CompanyGstRegistrationId BIGINT = NULL, @ProviderName NVARCHAR(50), @ApiType NVARCHAR(100), @Endpoint NVARCHAR(500) = NULL, @HttpMethod NVARCHAR(20) = NULL,
    @RequestPayload NVARCHAR(MAX) = NULL, @ResponsePayload NVARCHAR(MAX) = NULL, @StatusCode INT = NULL, @IsSuccess BIT, @ErrorMessage NVARCHAR(MAX) = NULL,
    @DurationMs INT = NULL, @CorrelationId NVARCHAR(100) = NULL, @CreatedBy BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT dbo.GstApiLogs(CompanyGstRegistrationId, ProviderName, ApiType, Endpoint, HttpMethod, RequestPayload, ResponsePayload, StatusCode, IsSuccess, ErrorMessage, DurationMs, CorrelationId, CreatedBy)
    VALUES(@CompanyGstRegistrationId, @ProviderName, @ApiType, @Endpoint, @HttpMethod, @RequestPayload, @ResponsePayload, @StatusCode, @IsSuccess, @ErrorMessage, @DurationMs, @CorrelationId, @CreatedBy);
    SELECT 201 StatusCode, N'GST API log created.' Message;
END;
GO

DECLARE @GstParentId INT;
MERGE dbo.Pages AS target
USING (SELECT N'GST' Name, N'GST Integration' DisplayName, N'/gst' Route, N'receipt-text' Icon, 300 SortOrder) AS source
ON target.Name = source.Name
WHEN NOT MATCHED THEN INSERT(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive) VALUES(source.Name, source.DisplayName, source.Route, source.Icon, NULL, source.SortOrder, 1);

SELECT @GstParentId = Id FROM dbo.Pages WHERE Name = N'GST';

MERGE dbo.Pages AS target
USING (VALUES
    (N'GST.Configuration', N'GST Configuration', N'/gst/configuration', N'settings', @GstParentId, 301),
    (N'GST.Registration', N'GST Registrations', N'/gst/registrations', N'building-2', @GstParentId, 302),
    (N'GST.Verification', N'GSTIN Verification', N'/gst/verify-gstin', N'badge-check', @GstParentId, 303),
    (N'GST.EWayBill', N'E-Way Bills', N'/gst/eway-bills', N'truck', @GstParentId, 304),
    (N'GST.EInvoice', N'E-Invoices', N'/gst/e-invoices', N'file-check-2', @GstParentId, 305),
    (N'GST.Session', N'GST Sessions', N'/gst/sessions', N'key-round', @GstParentId, 306),
    (N'GST.Logs', N'GST API Logs', N'/gst/api-logs', N'list-checks', @GstParentId, 307)
) AS source(Name, DisplayName, Route, Icon, ParentPageId, SortOrder)
ON target.Name = source.Name
WHEN NOT MATCHED THEN INSERT(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive) VALUES(source.Name, source.DisplayName, source.Route, source.Icon, source.ParentPageId, source.SortOrder, 1)
WHEN MATCHED THEN UPDATE SET DisplayName = source.DisplayName, Route = source.Route, Icon = source.Icon, ParentPageId = source.ParentPageId, SortOrder = source.SortOrder, IsActive = 1;

INSERT INTO dbo.RolePermissions(RoleId, PageId, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove)
SELECT r.Id, p.Id, 1, 1, 1, 1, 1, 1
FROM dbo.Roles r
CROSS JOIN dbo.Pages p
WHERE r.Name IN (N'Super Admin', N'SuperAdmin', N'Administrator', N'Admin')
  AND p.Name LIKE N'GST%'
  AND NOT EXISTS(SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.Id AND rp.PageId = p.Id);
GO
