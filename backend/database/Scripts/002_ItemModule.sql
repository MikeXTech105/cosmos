/*
    Cosmos ERP Item Management Module
    SQL Server
    Safe to run more than once.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.Units', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Units
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Units PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        ShortName NVARCHAR(20) NOT NULL,
        Description NVARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Units_IsActive DEFAULT (1),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Units_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_Units_IsDeleted DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.Categories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categories
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Categories PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Categories_IsActive DEFAULT (1),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Categories_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_Categories_IsDeleted DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.Items', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Items
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Items PRIMARY KEY,
        Name NVARCHAR(200) NOT NULL,
        ItemCode NVARCHAR(50) NOT NULL,
        Barcode NVARCHAR(100) NULL,
        CategoryId BIGINT NOT NULL,
        UnitId BIGINT NOT NULL,
        ItemType INT NOT NULL,
        PurchasePrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_Items_PurchasePrice DEFAULT (0),
        SalesPrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_Items_SalesPrice DEFAULT (0),
        HSNCode NVARCHAR(50) NULL,
        GSTRate DECIMAL(5,2) NOT NULL CONSTRAINT DF_Items_GSTRate DEFAULT (0),
        TrackInventory BIT NOT NULL CONSTRAINT DF_Items_TrackInventory DEFAULT (1),
        OpeningStock DECIMAL(18,2) NOT NULL CONSTRAINT DF_Items_OpeningStock DEFAULT (0),
        OpeningStockValue DECIMAL(18,2) NOT NULL CONSTRAINT DF_Items_OpeningStockValue DEFAULT (0),
        CurrentStock DECIMAL(18,2) NOT NULL CONSTRAINT DF_Items_CurrentStock DEFAULT (0),
        ReservedStock DECIMAL(18,2) NOT NULL CONSTRAINT DF_Items_ReservedStock DEFAULT (0),
        MinimumStock DECIMAL(18,2) NOT NULL CONSTRAINT DF_Items_MinimumStock DEFAULT (0),
        Description NVARCHAR(1000) NULL,
        ImageUrl NVARCHAR(1000) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Items_IsActive DEFAULT (1),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Items_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_Items_IsDeleted DEFAULT (0),
        CONSTRAINT FK_Items_Categories FOREIGN KEY (CategoryId) REFERENCES dbo.Categories(Id),
        CONSTRAINT FK_Items_Units FOREIGN KEY (UnitId) REFERENCES dbo.Units(Id),
        CONSTRAINT CK_Items_ItemType CHECK (ItemType IN (1, 2)),
        CONSTRAINT CK_Items_GSTRate CHECK (GSTRate >= 0 AND GSTRate <= 100),
        CONSTRAINT CK_Items_NonNegativeAmounts CHECK (
            PurchasePrice >= 0 AND SalesPrice >= 0 AND OpeningStock >= 0 AND OpeningStockValue >= 0
            AND CurrentStock >= 0 AND ReservedStock >= 0 AND MinimumStock >= 0
        )
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Units_Name' AND object_id = OBJECT_ID(N'dbo.Units'))
    CREATE UNIQUE INDEX UX_Units_Name ON dbo.Units(Name) WHERE IsDeleted = 0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Categories_Name' AND object_id = OBJECT_ID(N'dbo.Categories'))
    CREATE UNIQUE INDEX UX_Categories_Name ON dbo.Categories(Name) WHERE IsDeleted = 0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Items_ItemCode' AND object_id = OBJECT_ID(N'dbo.Items'))
    CREATE UNIQUE INDEX UX_Items_ItemCode ON dbo.Items(ItemCode) WHERE IsDeleted = 0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Items_Barcode' AND object_id = OBJECT_ID(N'dbo.Items'))
    CREATE INDEX IX_Items_Barcode ON dbo.Items(Barcode);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Items_Name' AND object_id = OBJECT_ID(N'dbo.Items'))
    CREATE INDEX IX_Items_Name ON dbo.Items(Name);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Items_CategoryId' AND object_id = OBJECT_ID(N'dbo.Items'))
    CREATE INDEX IX_Items_CategoryId ON dbo.Items(CategoryId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Items_UnitId' AND object_id = OBJECT_ID(N'dbo.Items'))
    CREATE INDEX IX_Items_UnitId ON dbo.Items(UnitId);
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_GetById
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Description, IsActive, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy, IsDeleted
    FROM dbo.Categories
    WHERE Id = @Id AND IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_GetList
    @Search NVARCHAR(100) = NULL,
    @IsActive BIT = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'Name',
    @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber = CASE WHEN @PageNumber < 1 THEN 1 ELSE @PageNumber END;
    SET @PageSize = CASE WHEN @PageSize < 1 THEN 20 WHEN @PageSize > 200 THEN 200 ELSE @PageSize END;
    SET @SortBy = CASE WHEN @SortBy IN (N'Name', N'CreatedAt', N'ModifiedAt') THEN @SortBy ELSE N'Name' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;

    DECLARE @Sql NVARCHAR(MAX) = N'
        SELECT Id, Name, Description, IsActive, CreatedAt, ModifiedAt, COUNT(1) OVER() AS TotalCount
        FROM dbo.Categories
        WHERE IsDeleted = 0
          AND (@IsActive IS NULL OR IsActive = @IsActive)
          AND (@SearchPattern IS NULL OR Name LIKE @SearchPattern OR Description LIKE @SearchPattern)
        ORDER BY ' + QUOTENAME(@SortBy) + N' ' + @SortDirection + N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';
    
    DECLARE @SearchPattern NVARCHAR(110);
    SET @SearchPattern = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    DECLARE @Offset INT;
    SET @Offset = (@PageNumber - 1) * @PageSize;

    EXEC sp_executesql
        @Sql,
        N'@SearchPattern NVARCHAR(110), @IsActive BIT, @Offset INT, @PageSize INT',
        @SearchPattern = @SearchPattern,
        @IsActive = @IsActive,
        @Offset = @Offset,
        @PageSize = @PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_NameExists
    @Name NVARCHAR(100),
    @ExcludingId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(CASE WHEN EXISTS (
        SELECT 1 FROM dbo.Categories
        WHERE Name = LTRIM(RTRIM(@Name)) AND IsDeleted = 0 AND (@ExcludingId IS NULL OR Id <> @ExcludingId)
    ) THEN 1 ELSE 0 END AS BIT);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_Exists
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.Categories WHERE Id = @Id AND IsDeleted = 0) THEN 1 ELSE 0 END AS BIT);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_Create
    @Name NVARCHAR(100),
    @Description NVARCHAR(500) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = @Name AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Category name already exists.' AS [Message];
            RETURN;
        END;

        INSERT INTO dbo.Categories(Name, Description, IsActive)
        VALUES (LTRIM(RTRIM(@Name)), @Description, @IsActive);

        DECLARE @Id BIGINT = CAST(SCOPE_IDENTITY() AS BIGINT);
        SELECT 201 AS StatusCode, N'Category created.' AS [Message];
        EXEC dbo.sp_Category_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_Update
    @Id BIGINT,
    @Name NVARCHAR(100),
    @Description NVARCHAR(500) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE Id = @Id AND IsDeleted = 0)
        BEGIN
            SELECT 404 AS StatusCode, N'Category was not found.' AS [Message];
            RETURN;
        END;
        IF EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = @Name AND Id <> @Id AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Category name already exists.' AS [Message];
            RETURN;
        END;

        UPDATE dbo.Categories
        SET Name = LTRIM(RTRIM(@Name)), Description = @Description, IsActive = @IsActive, ModifiedAt = SYSUTCDATETIME()
        WHERE Id = @Id AND IsDeleted = 0;

        SELECT 200 AS StatusCode, N'Category updated.' AS [Message];
        EXEC dbo.sp_Category_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_Delete
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Categories SET IsDeleted = 1, IsActive = 0, ModifiedAt = SYSUTCDATETIME()
    WHERE Id = @Id AND IsDeleted = 0;
    IF @@ROWCOUNT = 0 SELECT 404 AS StatusCode, N'Category was not found.' AS [Message];
    ELSE SELECT 200 AS StatusCode, N'Category deleted.' AS [Message];
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Unit_GetById
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, ShortName, Description, IsActive, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy, IsDeleted
    FROM dbo.Units
    WHERE Id = @Id AND IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Unit_GetList
    @Search NVARCHAR(100) = NULL,
    @IsActive BIT = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'Name',
    @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber = CASE WHEN @PageNumber < 1 THEN 1 ELSE @PageNumber END;
    SET @PageSize = CASE WHEN @PageSize < 1 THEN 20 WHEN @PageSize > 200 THEN 200 ELSE @PageSize END;
    SET @SortBy = CASE WHEN @SortBy IN (N'Name', N'ShortName', N'CreatedAt', N'ModifiedAt') THEN @SortBy ELSE N'Name' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;

    DECLARE @Sql NVARCHAR(MAX) = N'
        SELECT Id, Name, ShortName, Description, IsActive, CreatedAt, ModifiedAt, COUNT(1) OVER() AS TotalCount
        FROM dbo.Units
        WHERE IsDeleted = 0
          AND (@IsActive IS NULL OR IsActive = @IsActive)
          AND (@SearchPattern IS NULL OR Name LIKE @SearchPattern OR ShortName LIKE @SearchPattern OR Description LIKE @SearchPattern)
        ORDER BY ' + QUOTENAME(@SortBy) + N' ' + @SortDirection + N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';
    
    DECLARE @SearchPattern NVARCHAR(110);
    SET @SearchPattern =CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    DECLARE @Offset INT;
    SET @Offset = (@PageNumber - 1) * @PageSize;
    
    EXEC sp_executesql
        @Sql,
        N'@SearchPattern NVARCHAR(110), @IsActive BIT, @Offset INT, @PageSize INT',
        @SearchPattern = @SearchPattern,
        @IsActive = @IsActive,
        @Offset = @Offset,
        @PageSize = @PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Unit_NameExists
    @Name NVARCHAR(100),
    @ExcludingId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(CASE WHEN EXISTS (
        SELECT 1 FROM dbo.Units
        WHERE Name = LTRIM(RTRIM(@Name)) AND IsDeleted = 0 AND (@ExcludingId IS NULL OR Id <> @ExcludingId)
    ) THEN 1 ELSE 0 END AS BIT);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Unit_Exists
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.Units WHERE Id = @Id AND IsDeleted = 0) THEN 1 ELSE 0 END AS BIT);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Unit_Create
    @Name NVARCHAR(100),
    @ShortName NVARCHAR(20),
    @Description NVARCHAR(500) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Units WHERE Name = @Name AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Unit name already exists.' AS [Message];
            RETURN;
        END;

        INSERT INTO dbo.Units(Name, ShortName, Description, IsActive)
        VALUES (LTRIM(RTRIM(@Name)), LTRIM(RTRIM(@ShortName)), @Description, @IsActive);

        DECLARE @Id BIGINT = CAST(SCOPE_IDENTITY() AS BIGINT);
        SELECT 201 AS StatusCode, N'Unit created.' AS [Message];
        EXEC dbo.sp_Unit_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Unit_Update
    @Id BIGINT,
    @Name NVARCHAR(100),
    @ShortName NVARCHAR(20),
    @Description NVARCHAR(500) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Units WHERE Id = @Id AND IsDeleted = 0)
        BEGIN
            SELECT 404 AS StatusCode, N'Unit was not found.' AS [Message];
            RETURN;
        END;
        IF EXISTS (SELECT 1 FROM dbo.Units WHERE Name = @Name AND Id <> @Id AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Unit name already exists.' AS [Message];
            RETURN;
        END;

        UPDATE dbo.Units
        SET Name = LTRIM(RTRIM(@Name)), ShortName = LTRIM(RTRIM(@ShortName)), Description = @Description, IsActive = @IsActive, ModifiedAt = SYSUTCDATETIME()
        WHERE Id = @Id AND IsDeleted = 0;

        SELECT 200 AS StatusCode, N'Unit updated.' AS [Message];
        EXEC dbo.sp_Unit_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Unit_Delete
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Units SET IsDeleted = 1, IsActive = 0, ModifiedAt = SYSUTCDATETIME()
    WHERE Id = @Id AND IsDeleted = 0;
    IF @@ROWCOUNT = 0 SELECT 404 AS StatusCode, N'Unit was not found.' AS [Message];
    ELSE SELECT 200 AS StatusCode, N'Unit deleted.' AS [Message];
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_GetById
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.Id, i.Name, i.ItemCode, i.Barcode, i.CategoryId, c.Name AS CategoryName,
           i.UnitId, u.Name AS UnitName, u.ShortName AS UnitShortName, i.ItemType,
           i.PurchasePrice, i.SalesPrice, i.HSNCode, i.GSTRate, i.TrackInventory,
           i.OpeningStock, i.OpeningStockValue, i.CurrentStock, i.ReservedStock, i.MinimumStock,
           i.Description, i.ImageUrl, i.IsActive, i.CreatedAt, i.CreatedBy, i.ModifiedAt, i.ModifiedBy, i.IsDeleted
    FROM dbo.Items i
    JOIN dbo.Categories c ON c.Id = i.CategoryId
    JOIN dbo.Units u ON u.Id = i.UnitId
    WHERE i.Id = @Id AND i.IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_GetList
    @Search NVARCHAR(200) = NULL,
    @Barcode NVARCHAR(100) = NULL,
    @ItemCode NVARCHAR(50) = NULL,
    @CategoryId BIGINT = NULL,
    @IsActive BIT = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'Name',
    @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber = CASE WHEN @PageNumber < 1 THEN 1 ELSE @PageNumber END;
    SET @PageSize = CASE WHEN @PageSize < 1 THEN 20 WHEN @PageSize > 200 THEN 200 ELSE @PageSize END;
    SET @SortBy = CASE WHEN @SortBy IN (N'Name', N'ItemCode', N'Barcode', N'SalesPrice', N'PurchasePrice', N'CurrentStock', N'CreatedAt') THEN @SortBy ELSE N'Name' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;

    DECLARE @Sql NVARCHAR(MAX) = N'
        SELECT i.Id, i.Name, i.ItemCode, i.Barcode, i.CategoryId, c.Name AS CategoryName,
               i.UnitId, u.Name AS UnitName, u.ShortName AS UnitShortName, i.ItemType,
               i.SalesPrice, i.PurchasePrice, i.CurrentStock, i.ReservedStock, i.MinimumStock,
               i.TrackInventory, i.IsActive, i.CreatedAt, i.ModifiedAt, COUNT(1) OVER() AS TotalCount
        FROM dbo.Items i
        JOIN dbo.Categories c ON c.Id = i.CategoryId
        JOIN dbo.Units u ON u.Id = i.UnitId
        WHERE i.IsDeleted = 0
          AND (@IsActive IS NULL OR i.IsActive = @IsActive)
          AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
          AND (@BarcodePattern IS NULL OR i.Barcode LIKE @BarcodePattern)
          AND (@ItemCodePattern IS NULL OR i.ItemCode LIKE @ItemCodePattern)
          AND (@SearchPattern IS NULL OR i.Name LIKE @SearchPattern)
        ORDER BY i.' + QUOTENAME(@SortBy) + N' ' + @SortDirection + N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';
    
    DECLARE @SearchPattern NVARCHAR(210);
    DECLARE @BarcodePattern NVARCHAR(110);
    DECLARE @ItemCodePattern NVARCHAR(60);

    SET @SearchPattern = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    SET @BarcodePattern = CASE WHEN @Barcode IS NULL OR LTRIM(RTRIM(@Barcode)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Barcode)) + N'%' END;
    SET @ItemCodePattern = CASE WHEN @ItemCode IS NULL OR LTRIM(RTRIM(@ItemCode)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@ItemCode)) + N'%' END;

    DECLARE @Offset INT;
    SET @Offset = (@PageNumber - 1) * @PageSize;
    
    EXEC sp_executesql
        @Sql,
        N'@SearchPattern NVARCHAR(210), @BarcodePattern NVARCHAR(110), @ItemCodePattern NVARCHAR(60), @CategoryId BIGINT, @IsActive BIT, @Offset INT, @PageSize INT',
        @SearchPattern = @SearchPattern,
        @BarcodePattern = @BarcodePattern,
        @ItemCodePattern = @ItemCodePattern,
        @CategoryId = @CategoryId,
        @IsActive = @IsActive,
        @Offset = @Offset,
        @PageSize = @PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_ItemCodeExists
    @ItemCode NVARCHAR(50),
    @ExcludingId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(CASE WHEN EXISTS (
        SELECT 1 FROM dbo.Items
        WHERE ItemCode = LTRIM(RTRIM(@ItemCode)) AND IsDeleted = 0 AND (@ExcludingId IS NULL OR Id <> @ExcludingId)
    ) THEN 1 ELSE 0 END AS BIT);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_Create
    @Name NVARCHAR(200),
    @ItemCode NVARCHAR(50),
    @Barcode NVARCHAR(100) = NULL,
    @CategoryId BIGINT,
    @UnitId BIGINT,
    @ItemType INT,
    @PurchasePrice DECIMAL(18,2),
    @SalesPrice DECIMAL(18,2),
    @HSNCode NVARCHAR(50) = NULL,
    @GSTRate DECIMAL(5,2),
    @TrackInventory BIT,
    @OpeningStock DECIMAL(18,2),
    @OpeningStockValue DECIMAL(18,2),
    @CurrentStock DECIMAL(18,2),
    @ReservedStock DECIMAL(18,2),
    @MinimumStock DECIMAL(18,2),
    @Description NVARCHAR(1000) = NULL,
    @ImageUrl NVARCHAR(1000) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Items WHERE ItemCode = @ItemCode AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Item code already exists.' AS [Message];
            RETURN;
        END;
        IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE Id = @CategoryId AND IsDeleted = 0)
        BEGIN
            SELECT 404 AS StatusCode, N'Category was not found.' AS [Message];
            RETURN;
        END;
        IF NOT EXISTS (SELECT 1 FROM dbo.Units WHERE Id = @UnitId AND IsDeleted = 0)
        BEGIN
            SELECT 404 AS StatusCode, N'Unit was not found.' AS [Message];
            RETURN;
        END;

        INSERT INTO dbo.Items
        (
            Name, ItemCode, Barcode, CategoryId, UnitId, ItemType, PurchasePrice, SalesPrice,
            HSNCode, GSTRate, TrackInventory, OpeningStock, OpeningStockValue, CurrentStock,
            ReservedStock, MinimumStock, Description, ImageUrl, IsActive
        )
        VALUES
        (
            LTRIM(RTRIM(@Name)), LTRIM(RTRIM(@ItemCode)), @Barcode, @CategoryId, @UnitId, @ItemType, @PurchasePrice, @SalesPrice,
            @HSNCode, @GSTRate, @TrackInventory, @OpeningStock, @OpeningStockValue, @CurrentStock,
            @ReservedStock, @MinimumStock, @Description, @ImageUrl, @IsActive
        );

        DECLARE @Id BIGINT = CAST(SCOPE_IDENTITY() AS BIGINT);
        SELECT 201 AS StatusCode, N'Item created.' AS [Message];
        EXEC dbo.sp_Item_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_Update
    @Id BIGINT,
    @Name NVARCHAR(200),
    @ItemCode NVARCHAR(50),
    @Barcode NVARCHAR(100) = NULL,
    @CategoryId BIGINT,
    @UnitId BIGINT,
    @ItemType INT,
    @PurchasePrice DECIMAL(18,2),
    @SalesPrice DECIMAL(18,2),
    @HSNCode NVARCHAR(50) = NULL,
    @GSTRate DECIMAL(5,2),
    @TrackInventory BIT,
    @OpeningStock DECIMAL(18,2),
    @OpeningStockValue DECIMAL(18,2),
    @CurrentStock DECIMAL(18,2),
    @ReservedStock DECIMAL(18,2),
    @MinimumStock DECIMAL(18,2),
    @Description NVARCHAR(1000) = NULL,
    @ImageUrl NVARCHAR(1000) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Items WHERE Id = @Id AND IsDeleted = 0)
        BEGIN
            SELECT 404 AS StatusCode, N'Item was not found.' AS [Message];
            RETURN;
        END;
        IF EXISTS (SELECT 1 FROM dbo.Items WHERE ItemCode = @ItemCode AND Id <> @Id AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Item code already exists.' AS [Message];
            RETURN;
        END;

        UPDATE dbo.Items
        SET Name = LTRIM(RTRIM(@Name)),
            ItemCode = LTRIM(RTRIM(@ItemCode)),
            Barcode = @Barcode,
            CategoryId = @CategoryId,
            UnitId = @UnitId,
            ItemType = @ItemType,
            PurchasePrice = @PurchasePrice,
            SalesPrice = @SalesPrice,
            HSNCode = @HSNCode,
            GSTRate = @GSTRate,
            TrackInventory = @TrackInventory,
            OpeningStock = @OpeningStock,
            OpeningStockValue = @OpeningStockValue,
            CurrentStock = @CurrentStock,
            ReservedStock = @ReservedStock,
            MinimumStock = @MinimumStock,
            Description = @Description,
            ImageUrl = @ImageUrl,
            IsActive = @IsActive,
            ModifiedAt = SYSUTCDATETIME()
        WHERE Id = @Id AND IsDeleted = 0;

        SELECT 200 AS StatusCode, N'Item updated.' AS [Message];
        EXEC dbo.sp_Item_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_Delete
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Items SET IsDeleted = 1, IsActive = 0, ModifiedAt = SYSUTCDATETIME()
    WHERE Id = @Id AND IsDeleted = 0;
    IF @@ROWCOUNT = 0 SELECT 404 AS StatusCode, N'Item was not found.' AS [Message];
    ELSE SELECT 200 AS StatusCode, N'Item deleted.' AS [Message];
END;
GO

IF OBJECT_ID(N'dbo.Pages', N'U') IS NOT NULL
BEGIN
    MERGE dbo.Pages AS target
    USING (VALUES
        (N'Items', N'Items', N'/items', N'package', 40),
        (N'Categories', N'Categories', N'/categories', N'tags', 41),
        (N'Units', N'Units', N'/units', N'ruler', 42)
    ) AS source(Name, DisplayName, Route, Icon, SortOrder)
    ON target.Name = source.Name
    WHEN MATCHED THEN
        UPDATE SET DisplayName = source.DisplayName, Route = source.Route, Icon = source.Icon, SortOrder = source.SortOrder, IsActive = 1
    WHEN NOT MATCHED THEN
        INSERT(Name, DisplayName, Route, Icon, SortOrder, IsActive)
        VALUES(source.Name, source.DisplayName, source.Route, source.Icon, source.SortOrder, 1);
END;
GO

IF OBJECT_ID(N'dbo.Roles', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.Pages', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.RolePermissions', N'U') IS NOT NULL
BEGIN
    DECLARE @SuperAdminRoleId INT = (SELECT Id FROM dbo.Roles WHERE Name = N'SuperAdmin');

    IF @SuperAdminRoleId IS NOT NULL
    BEGIN
        MERGE dbo.RolePermissions AS target
        USING (
            SELECT @SuperAdminRoleId AS RoleId, Id AS PageId
            FROM dbo.Pages
            WHERE Name IN (N'Items', N'Categories', N'Units')
        ) AS source
        ON target.RoleId = source.RoleId AND target.PageId = source.PageId
        WHEN MATCHED THEN
            UPDATE SET CanView = 1, CanCreate = 1, CanEdit = 1, CanDelete = 1
        WHEN NOT MATCHED THEN
            INSERT(RoleId, PageId, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove)
            VALUES(source.RoleId, source.PageId, 1, 1, 1, 1, 0, 0);
    END;
END;
GO
