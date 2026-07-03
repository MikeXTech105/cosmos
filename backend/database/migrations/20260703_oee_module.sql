/*
    Cosmos ERP OEE Module
    Simple OEE / Production Efficiency OEE based on the client's DASHBOARD OEE MASTER spreadsheet.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF TYPE_ID(N'dbo.OeeProductionEntryInput') IS NULL
    CREATE TYPE dbo.OeeProductionEntryInput AS TABLE
    (
        MachineId BIGINT NOT NULL,
        MachineOnTime NVARCHAR(5) NOT NULL,
        MouldId BIGINT NOT NULL,
        ShotCount INT NOT NULL,
        DowntimeReasonId BIGINT NOT NULL,
        Remarks NVARCHAR(500) NULL
    );
GO

IF OBJECT_ID(N'dbo.OeeMachines', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OeeMachines
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OeeMachines PRIMARY KEY,
        MachineCode NVARCHAR(50) NOT NULL,
        MachineName NVARCHAR(150) NOT NULL,
        Tonnage NVARCHAR(50) NULL,
        Location NVARCHAR(150) NULL,
        DisplayOrder INT NOT NULL CONSTRAINT DF_OeeMachines_DisplayOrder DEFAULT(0),
        IsActive BIT NOT NULL CONSTRAINT DF_OeeMachines_IsActive DEFAULT(1),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_OeeMachines_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAt DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_OeeMachines_IsDeleted DEFAULT(0)
    );
END;
GO

IF OBJECT_ID(N'dbo.OeeMoulds', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OeeMoulds
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OeeMoulds PRIMARY KEY,
        MouldName NVARCHAR(200) NOT NULL,
        TargetShotPerDay DECIMAL(18,2) NOT NULL,
        Cavity INT NULL,
        CycleTime DECIMAL(18,2) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_OeeMoulds_IsActive DEFAULT(1),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_OeeMoulds_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAt DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_OeeMoulds_IsDeleted DEFAULT(0),
        CONSTRAINT CK_OeeMoulds_Target CHECK(TargetShotPerDay >= 0),
        CONSTRAINT CK_OeeMoulds_Cavity CHECK(Cavity IS NULL OR Cavity > 0),
        CONSTRAINT CK_OeeMoulds_CycleTime CHECK(CycleTime IS NULL OR CycleTime >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.OeeDowntimeReasons', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OeeDowntimeReasons
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OeeDowntimeReasons PRIMARY KEY,
        ReasonName NVARCHAR(200) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_OeeDowntimeReasons_IsActive DEFAULT(1),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_OeeDowntimeReasons_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAt DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_OeeDowntimeReasons_IsDeleted DEFAULT(0)
    );
END;
GO

IF OBJECT_ID(N'dbo.OeeProductionEntries', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OeeProductionEntries
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OeeProductionEntries PRIMARY KEY,
        ProductionDate DATE NOT NULL,
        MachineId BIGINT NOT NULL,
        MouldId BIGINT NOT NULL,
        MachineOnTime NVARCHAR(5) NOT NULL,
        ShotCount INT NOT NULL,
        DowntimeReasonId BIGINT NOT NULL,
        Remarks NVARCHAR(500) NULL,
        CalculatedTargetShot DECIMAL(18,2) NOT NULL CONSTRAINT DF_OeeProductionEntries_Target DEFAULT(0),
        CalculatedOeePercentage DECIMAL(9,2) NOT NULL CONSTRAINT DF_OeeProductionEntries_Oee DEFAULT(0),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_OeeProductionEntries_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAt DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_OeeProductionEntries_IsDeleted DEFAULT(0),
        CONSTRAINT FK_OeeProductionEntries_Machines FOREIGN KEY(MachineId) REFERENCES dbo.OeeMachines(Id),
        CONSTRAINT FK_OeeProductionEntries_Moulds FOREIGN KEY(MouldId) REFERENCES dbo.OeeMoulds(Id),
        CONSTRAINT FK_OeeProductionEntries_DowntimeReasons FOREIGN KEY(DowntimeReasonId) REFERENCES dbo.OeeDowntimeReasons(Id),
        CONSTRAINT CK_OeeProductionEntries_MachineOnTime CHECK(MachineOnTime IN (N'24 HR', N'12 HR', N'0 HR')),
        CONSTRAINT CK_OeeProductionEntries_ShotCount CHECK(ShotCount >= 0),
        CONSTRAINT CK_OeeProductionEntries_Calculated CHECK(CalculatedTargetShot >= 0 AND CalculatedOeePercentage >= 0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_OeeMachines_Code_Active' AND object_id = OBJECT_ID(N'dbo.OeeMachines'))
    CREATE UNIQUE INDEX UX_OeeMachines_Code_Active ON dbo.OeeMachines(MachineCode) WHERE IsDeleted = 0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_OeeMoulds_Name_Active' AND object_id = OBJECT_ID(N'dbo.OeeMoulds'))
    CREATE UNIQUE INDEX UX_OeeMoulds_Name_Active ON dbo.OeeMoulds(MouldName) WHERE IsDeleted = 0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_OeeDowntimeReasons_Name_Active' AND object_id = OBJECT_ID(N'dbo.OeeDowntimeReasons'))
    CREATE UNIQUE INDEX UX_OeeDowntimeReasons_Name_Active ON dbo.OeeDowntimeReasons(ReasonName) WHERE IsDeleted = 0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_OeeProductionEntries_DateMachine_Active' AND object_id = OBJECT_ID(N'dbo.OeeProductionEntries'))
    CREATE UNIQUE INDEX UX_OeeProductionEntries_DateMachine_Active ON dbo.OeeProductionEntries(ProductionDate, MachineId) WHERE IsDeleted = 0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OeeProductionEntries_Date' AND object_id = OBJECT_ID(N'dbo.OeeProductionEntries'))
    CREATE INDEX IX_OeeProductionEntries_Date ON dbo.OeeProductionEntries(ProductionDate, IsDeleted);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OeeProductionEntries_MachineId' AND object_id = OBJECT_ID(N'dbo.OeeProductionEntries'))
    CREATE INDEX IX_OeeProductionEntries_MachineId ON dbo.OeeProductionEntries(MachineId, IsDeleted);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OeeProductionEntries_MouldId' AND object_id = OBJECT_ID(N'dbo.OeeProductionEntries'))
    CREATE INDEX IX_OeeProductionEntries_MouldId ON dbo.OeeProductionEntries(MouldId, IsDeleted);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OeeProductionEntries_DowntimeReasonId' AND object_id = OBJECT_ID(N'dbo.OeeProductionEntries'))
    CREATE INDEX IX_OeeProductionEntries_DowntimeReasonId ON dbo.OeeProductionEntries(DowntimeReasonId, IsDeleted);
GO

MERGE dbo.OeeMachines AS target
USING (VALUES
    (N'IM-01', N'M1', N'135T', N'First Floor', 1),
    (N'IM-02', N'M2', N'140T', N'Office Ground Floor', 2),
    (N'IM-03', N'M3', N'200T New', NULL, 3),
    (N'IM-04', N'M4', N'140T New', NULL, 4)
) AS source(MachineCode, MachineName, Tonnage, Location, DisplayOrder)
ON target.MachineCode = source.MachineCode
WHEN MATCHED THEN UPDATE SET MachineName = source.MachineName, Tonnage = source.Tonnage, Location = source.Location, DisplayOrder = source.DisplayOrder, IsActive = 1, IsDeleted = 0
WHEN NOT MATCHED THEN INSERT(MachineCode, MachineName, Tonnage, Location, DisplayOrder, IsActive) VALUES(source.MachineCode, source.MachineName, source.Tonnage, source.Location, source.DisplayOrder, 1);
GO

MERGE dbo.OeeDowntimeReasons AS target
USING (VALUES
    (N'NONE'), (N'MACHINE KHARAB HUA'), (N'MOULD KHARAB HUA'), (N'LIGHT CHALI GAYI'),
    (N'DANA GALAT BANA DIA'), (N'DANA NAHI THA'), (N'MOULD CHANGE HUA'), (N'OTHER'), (N'KARIGAR NAHI THA')
) AS source(ReasonName)
ON target.ReasonName = source.ReasonName
WHEN MATCHED THEN UPDATE SET IsActive = 1, IsDeleted = 0
WHEN NOT MATCHED THEN INSERT(ReasonName, IsActive) VALUES(source.ReasonName, 1);
GO

MERGE dbo.OeeMoulds AS target
USING (VALUES
    (N'FLEXI HANGER (2 CAVITY)', 5500, 2, NULL),
    (N'RAINBOW CLIP', 5000, 24, NULL),
    (N'STANDARD HANGER', 5000, 2, NULL),
    (N'STACKUP CONTAINER', 6000, 2, NULL),
    (N'STACKUP LID', 5000, 4, NULL),
    (N'ORA CLIP', 5000, 16, NULL),
    (N'RYNO CLIP', 5000, 16, NULL),
    (N'HAPPY HANGER', 5000, 2, NULL)
) AS source(MouldName, TargetShotPerDay, Cavity, CycleTime)
ON target.MouldName = source.MouldName
WHEN MATCHED THEN UPDATE SET TargetShotPerDay = source.TargetShotPerDay, Cavity = source.Cavity, CycleTime = source.CycleTime, IsActive = 1, IsDeleted = 0
WHEN NOT MATCHED THEN INSERT(MouldName, TargetShotPerDay, Cavity, CycleTime, IsActive) VALUES(source.MouldName, source.TargetShotPerDay, source.Cavity, source.CycleTime, 1);
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeMachine_Exists @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT CONVERT(BIT, IIF(EXISTS(SELECT 1 FROM dbo.OeeMachines WHERE Id = @Id AND IsDeleted = 0 AND IsActive = 1), 1, 0));
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeMould_Exists @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT CONVERT(BIT, IIF(EXISTS(SELECT 1 FROM dbo.OeeMoulds WHERE Id = @Id AND IsDeleted = 0 AND IsActive = 1), 1, 0));
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeDowntimeReason_Exists @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT CONVERT(BIT, IIF(EXISTS(SELECT 1 FROM dbo.OeeDowntimeReasons WHERE Id = @Id AND IsDeleted = 0 AND IsActive = 1), 1, 0));
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeMachine_GetById @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, MachineCode, MachineName, Tonnage, Location, DisplayOrder, IsActive, CreatedAt, UpdatedAt, 0 AS TotalCount
    FROM dbo.OeeMachines WHERE Id = @Id AND IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeMachine_GetList
    @Search NVARCHAR(200) = NULL, @IsActive BIT = NULL, @Page INT = 1, @PageSize INT = 50, @SortBy NVARCHAR(50) = N'DisplayOrder', @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;
    SET @Page = IIF(@Page < 1, 1, @Page);
    SET @PageSize = IIF(@PageSize < 1, 50, IIF(@PageSize > 200, 200, @PageSize));
    SET @SortBy = CASE WHEN @SortBy IN (N'MachineCode', N'MachineName', N'DisplayOrder', N'CreatedAt') THEN @SortBy ELSE N'DisplayOrder' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;
    DECLARE @Sql NVARCHAR(MAX) = N'
        SELECT Id, MachineCode, MachineName, Tonnage, Location, DisplayOrder, IsActive, CreatedAt, UpdatedAt, COUNT(1) OVER() TotalCount
        FROM dbo.OeeMachines
        WHERE IsDeleted = 0
          AND (@IsActive IS NULL OR IsActive = @IsActive)
          AND (@SearchPattern IS NULL OR MachineCode LIKE @SearchPattern OR MachineName LIKE @SearchPattern OR Location LIKE @SearchPattern)
        ORDER BY ' + QUOTENAME(@SortBy) + N' ' + @SortDirection + N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';
 DECLARE @SearchPattern NVARCHAR(210)=CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
 DECLARE @Offset INT;
 SET @Offset = (@Page - 1) * @PageSize;
    EXEC sp_executesql @Sql, N'@SearchPattern NVARCHAR(210), @IsActive BIT, @Offset INT, @PageSize INT',
        @SearchPattern = @SearchPattern,
        @IsActive = @IsActive, @Offset = @Offset, @PageSize = @PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeMachine_Save
    @Id BIGINT = NULL, @MachineCode NVARCHAR(50), @MachineName NVARCHAR(150), @Tonnage NVARCHAR(50) = NULL, @Location NVARCHAR(150) = NULL, @DisplayOrder INT = 0, @IsActive BIT = 1, @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM dbo.OeeMachines WHERE MachineCode = @MachineCode AND IsDeleted = 0 AND (@Id IS NULL OR Id <> @Id)) BEGIN SELECT 409 StatusCode, N'OEE machine code already exists.' Message; RETURN; END
    IF @Id IS NULL
    BEGIN
        INSERT dbo.OeeMachines(MachineCode, MachineName, Tonnage, Location, DisplayOrder, IsActive, CreatedBy)
        VALUES(@MachineCode, @MachineName, @Tonnage, @Location, @DisplayOrder, @IsActive, @UserId);
        SET @Id = SCOPE_IDENTITY();
        SELECT 201 StatusCode, N'OEE machine created.' Message;
    END
    ELSE
    BEGIN
        UPDATE dbo.OeeMachines SET MachineCode = @MachineCode, MachineName = @MachineName, Tonnage = @Tonnage, Location = @Location, DisplayOrder = @DisplayOrder, IsActive = @IsActive, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UserId WHERE Id = @Id AND IsDeleted = 0;
        IF @@ROWCOUNT = 0 BEGIN SELECT 404 StatusCode, N'OEE machine was not found.' Message; RETURN; END
        SELECT 200 StatusCode, N'OEE machine updated.' Message;
    END
    EXEC dbo.sp_OeeMachine_GetById @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeMachine_Delete @Id BIGINT, @UserId BIGINT = NULL AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OeeMachines SET IsDeleted = 1, IsActive = 0, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UserId WHERE Id = @Id AND IsDeleted = 0;
    SELECT IIF(@@ROWCOUNT = 0, 404, 200) StatusCode, IIF(@@ROWCOUNT = 0, N'OEE machine was not found.', N'OEE machine deleted.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeMould_GetById @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, MouldName, TargetShotPerDay, Cavity, CycleTime, IsActive, CreatedAt, UpdatedAt, 0 AS TotalCount
    FROM dbo.OeeMoulds WHERE Id = @Id AND IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeMould_GetList
    @Search NVARCHAR(200) = NULL, @IsActive BIT = NULL, @Page INT = 1, @PageSize INT = 50, @SortBy NVARCHAR(50) = N'MouldName', @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;
    SET @Page = IIF(@Page < 1, 1, @Page);
    SET @PageSize = IIF(@PageSize < 1, 50, IIF(@PageSize > 200, 200, @PageSize));
    SET @SortBy = CASE WHEN @SortBy IN (N'MouldName', N'TargetShotPerDay', N'Cavity', N'CreatedAt') THEN @SortBy ELSE N'MouldName' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;
    DECLARE @Sql NVARCHAR(MAX) = N'
        SELECT Id, MouldName, TargetShotPerDay, Cavity, CycleTime, IsActive, CreatedAt, UpdatedAt, COUNT(1) OVER() TotalCount
        FROM dbo.OeeMoulds
        WHERE IsDeleted = 0 AND (@IsActive IS NULL OR IsActive = @IsActive) AND (@SearchPattern IS NULL OR MouldName LIKE @SearchPattern)
        ORDER BY ' + QUOTENAME(@SortBy) + N' ' + @SortDirection + N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';
 
 DECLARE @SearchPattern NVARCHAR(210)=CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
 DECLARE @Offset INT;
 SET @Offset = (@Page - 1) * @PageSize;

    EXEC sp_executesql @Sql, N'@SearchPattern NVARCHAR(210), @IsActive BIT, @Offset INT, @PageSize INT',
        @SearchPattern = @SearchPattern,
        @IsActive = @IsActive, @Offset = @Offset, @PageSize = @PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeMould_Save
    @Id BIGINT = NULL, @MouldName NVARCHAR(200), @TargetShotPerDay DECIMAL(18,2), @Cavity INT = NULL, @CycleTime DECIMAL(18,2) = NULL, @IsActive BIT = 1, @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM dbo.OeeMoulds WHERE MouldName = @MouldName AND IsDeleted = 0 AND (@Id IS NULL OR Id <> @Id)) BEGIN SELECT 409 StatusCode, N'OEE mould already exists.' Message; RETURN; END
    IF @Id IS NULL
    BEGIN
        INSERT dbo.OeeMoulds(MouldName, TargetShotPerDay, Cavity, CycleTime, IsActive, CreatedBy) VALUES(@MouldName, @TargetShotPerDay, @Cavity, @CycleTime, @IsActive, @UserId);
        SET @Id = SCOPE_IDENTITY();
        SELECT 201 StatusCode, N'OEE mould created.' Message;
    END
    ELSE
    BEGIN
        UPDATE dbo.OeeMoulds SET MouldName = @MouldName, TargetShotPerDay = @TargetShotPerDay, Cavity = @Cavity, CycleTime = @CycleTime, IsActive = @IsActive, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UserId WHERE Id = @Id AND IsDeleted = 0;
        IF @@ROWCOUNT = 0 BEGIN SELECT 404 StatusCode, N'OEE mould was not found.' Message; RETURN; END
        SELECT 200 StatusCode, N'OEE mould updated.' Message;
    END
    EXEC dbo.sp_OeeMould_GetById @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeMould_Delete @Id BIGINT, @UserId BIGINT = NULL AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OeeMoulds SET IsDeleted = 1, IsActive = 0, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UserId WHERE Id = @Id AND IsDeleted = 0;
    SELECT IIF(@@ROWCOUNT = 0, 404, 200) StatusCode, IIF(@@ROWCOUNT = 0, N'OEE mould was not found.', N'OEE mould deleted.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeDowntimeReason_GetById @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, ReasonName, IsActive, CreatedAt, UpdatedAt, 0 AS TotalCount
    FROM dbo.OeeDowntimeReasons WHERE Id = @Id AND IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeDowntimeReason_GetList
    @Search NVARCHAR(200) = NULL, @IsActive BIT = NULL, @Page INT = 1, @PageSize INT = 50, @SortBy NVARCHAR(50) = N'ReasonName', @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;
    SET @Page = IIF(@Page < 1, 1, @Page);
    SET @PageSize = IIF(@PageSize < 1, 50, IIF(@PageSize > 200, 200, @PageSize));
    SET @SortBy = CASE WHEN @SortBy IN (N'ReasonName', N'CreatedAt') THEN @SortBy ELSE N'ReasonName' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;
    DECLARE @Sql NVARCHAR(MAX) = N'
        SELECT Id, ReasonName, IsActive, CreatedAt, UpdatedAt, COUNT(1) OVER() TotalCount
        FROM dbo.OeeDowntimeReasons
        WHERE IsDeleted = 0 AND (@IsActive IS NULL OR IsActive = @IsActive) AND (@SearchPattern IS NULL OR ReasonName LIKE @SearchPattern)
        ORDER BY ' + QUOTENAME(@SortBy) + N' ' + @SortDirection + N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';
    
 DECLARE @SearchPattern NVARCHAR(210)=CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
 DECLARE @Offset INT;
 SET @Offset = (@Page - 1) * @PageSize;
    EXEC sp_executesql @Sql, N'@SearchPattern NVARCHAR(210), @IsActive BIT, @Offset INT, @PageSize INT',
        @SearchPattern = @SearchPattern,
        @IsActive = @IsActive, @Offset = @Offset, @PageSize = @PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeDowntimeReason_Save
    @Id BIGINT = NULL, @ReasonName NVARCHAR(200), @IsActive BIT = 1, @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM dbo.OeeDowntimeReasons WHERE ReasonName = @ReasonName AND IsDeleted = 0 AND (@Id IS NULL OR Id <> @Id)) BEGIN SELECT 409 StatusCode, N'OEE downtime reason already exists.' Message; RETURN; END
    IF @Id IS NULL
    BEGIN
        INSERT dbo.OeeDowntimeReasons(ReasonName, IsActive, CreatedBy) VALUES(@ReasonName, @IsActive, @UserId);
        SET @Id = SCOPE_IDENTITY();
        SELECT 201 StatusCode, N'OEE downtime reason created.' Message;
    END
    ELSE
    BEGIN
        UPDATE dbo.OeeDowntimeReasons SET ReasonName = @ReasonName, IsActive = @IsActive, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UserId WHERE Id = @Id AND IsDeleted = 0;
        IF @@ROWCOUNT = 0 BEGIN SELECT 404 StatusCode, N'OEE downtime reason was not found.' Message; RETURN; END
        SELECT 200 StatusCode, N'OEE downtime reason updated.' Message;
    END
    EXEC dbo.sp_OeeDowntimeReason_GetById @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeDowntimeReason_Delete @Id BIGINT, @UserId BIGINT = NULL AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OeeDowntimeReasons SET IsDeleted = 1, IsActive = 0, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UserId WHERE Id = @Id AND IsDeleted = 0;
    SELECT IIF(@@ROWCOUNT = 0, 404, 200) StatusCode, IIF(@@ROWCOUNT = 0, N'OEE downtime reason was not found.', N'OEE downtime reason deleted.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeProductionEntry_GetById @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT e.Id, e.ProductionDate, e.MachineId, m.MachineCode, m.MachineName, e.MouldId, mo.MouldName, e.MachineOnTime, e.ShotCount,
           e.DowntimeReasonId, r.ReasonName AS DowntimeReasonName, e.Remarks, e.CalculatedTargetShot, e.CalculatedOeePercentage,
           e.CreatedAt, e.UpdatedAt, 0 AS TotalCount
    FROM dbo.OeeProductionEntries e
    JOIN dbo.OeeMachines m ON m.Id = e.MachineId
    JOIN dbo.OeeMoulds mo ON mo.Id = e.MouldId
    JOIN dbo.OeeDowntimeReasons r ON r.Id = e.DowntimeReasonId
    WHERE e.Id = @Id AND e.IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeProductionEntry_GetList
    @FromDate DATE = NULL, @ToDate DATE = NULL, @MachineId BIGINT = NULL, @MouldId BIGINT = NULL, @DowntimeReasonId BIGINT = NULL,
    @Page INT = 1, @PageSize INT = 20, @SortBy NVARCHAR(50) = N'ProductionDate', @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;
    SET @Page = IIF(@Page < 1, 1, @Page);
    SET @PageSize = IIF(@PageSize < 1, 20, IIF(@PageSize > 200, 200, @PageSize));
    SET @SortBy = CASE WHEN @SortBy IN (N'ProductionDate', N'MachineName', N'MouldName', N'ShotCount', N'CalculatedOeePercentage', N'CreatedAt') THEN @SortBy ELSE N'ProductionDate' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'ASC' THEN N'ASC' ELSE N'DESC' END;
    DECLARE @OrderBy NVARCHAR(100) = CASE @SortBy WHEN N'MachineName' THEN N'm.MachineName' WHEN N'MouldName' THEN N'mo.MouldName' ELSE N'e.' + QUOTENAME(@SortBy) END;
    DECLARE @Sql NVARCHAR(MAX) = N'
        SELECT e.Id, e.ProductionDate, e.MachineId, m.MachineCode, m.MachineName, e.MouldId, mo.MouldName, e.MachineOnTime, e.ShotCount,
               e.DowntimeReasonId, r.ReasonName AS DowntimeReasonName, e.Remarks, e.CalculatedTargetShot, e.CalculatedOeePercentage,
               e.CreatedAt, e.UpdatedAt, COUNT(1) OVER() TotalCount
        FROM dbo.OeeProductionEntries e
        JOIN dbo.OeeMachines m ON m.Id = e.MachineId
        JOIN dbo.OeeMoulds mo ON mo.Id = e.MouldId
        JOIN dbo.OeeDowntimeReasons r ON r.Id = e.DowntimeReasonId
        WHERE e.IsDeleted = 0
          AND (@FromDate IS NULL OR e.ProductionDate >= @FromDate)
          AND (@ToDate IS NULL OR e.ProductionDate <= @ToDate)
          AND (@MachineId IS NULL OR e.MachineId = @MachineId)
          AND (@MouldId IS NULL OR e.MouldId = @MouldId)
          AND (@DowntimeReasonId IS NULL OR e.DowntimeReasonId = @DowntimeReasonId)
        ORDER BY ' + @OrderBy + N' ' + @SortDirection + N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';
    

     
 DECLARE @Offset INT;
 SET @Offset = (@Page - 1) * @PageSize;
    EXEC sp_executesql @Sql, N'@FromDate DATE, @ToDate DATE, @MachineId BIGINT, @MouldId BIGINT, @DowntimeReasonId BIGINT, @Offset INT, @PageSize INT',
        @FromDate = @FromDate, @ToDate = @ToDate, @MachineId = @MachineId, @MouldId = @MouldId, @DowntimeReasonId = @DowntimeReasonId, @Offset = @Offset, @PageSize = @PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeProductionEntry_SaveBulk
    @ProductionDate DATE, @Entries dbo.OeeProductionEntryInput READONLY, @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        IF NOT EXISTS(SELECT 1 FROM @Entries) BEGIN SELECT 400 StatusCode, N'At least one OEE production entry is required.' Message; RETURN; END
        IF EXISTS(SELECT MachineId FROM @Entries GROUP BY MachineId HAVING COUNT(1) > 1) BEGIN SELECT 400 StatusCode, N'Duplicate machine entries are not allowed for the same production date.' Message; RETURN; END
        IF EXISTS(SELECT 1 FROM @Entries WHERE MachineOnTime NOT IN (N'24 HR', N'12 HR', N'0 HR') OR ShotCount < 0) BEGIN SELECT 400 StatusCode, N'OEE production entry values are invalid.' Message; RETURN; END
        IF EXISTS(SELECT 1 FROM @Entries x WHERE NOT EXISTS(SELECT 1 FROM dbo.OeeMachines m WHERE m.Id = x.MachineId AND m.IsDeleted = 0 AND m.IsActive = 1)) BEGIN SELECT 404 StatusCode, N'One or more OEE machines were not found.' Message; RETURN; END
        IF EXISTS(SELECT 1 FROM @Entries x WHERE NOT EXISTS(SELECT 1 FROM dbo.OeeMoulds m WHERE m.Id = x.MouldId AND m.IsDeleted = 0 AND m.IsActive = 1)) BEGIN SELECT 404 StatusCode, N'One or more OEE moulds were not found.' Message; RETURN; END
        IF EXISTS(SELECT 1 FROM @Entries x WHERE NOT EXISTS(SELECT 1 FROM dbo.OeeDowntimeReasons r WHERE r.Id = x.DowntimeReasonId AND r.IsDeleted = 0 AND r.IsActive = 1)) BEGIN SELECT 404 StatusCode, N'One or more OEE downtime reasons were not found.' Message; RETURN; END
        IF EXISTS(SELECT 1 FROM @Entries x JOIN dbo.OeeProductionEntries e ON e.ProductionDate = @ProductionDate AND e.MachineId = x.MachineId AND e.IsDeleted = 0) BEGIN SELECT 409 StatusCode, N'OEE production entry already exists for this date and machine.' Message; RETURN; END

        BEGIN TRAN;
        INSERT dbo.OeeProductionEntries(ProductionDate, MachineId, MouldId, MachineOnTime, ShotCount, DowntimeReasonId, Remarks, CalculatedTargetShot, CalculatedOeePercentage, CreatedBy)
        SELECT @ProductionDate, x.MachineId, x.MouldId, x.MachineOnTime, x.ShotCount, x.DowntimeReasonId, x.Remarks,
               CASE x.MachineOnTime WHEN N'24 HR' THEN mo.TargetShotPerDay WHEN N'12 HR' THEN mo.TargetShotPerDay / 2 ELSE 0 END AS CalculatedTargetShot,
               CASE WHEN CASE x.MachineOnTime WHEN N'24 HR' THEN mo.TargetShotPerDay WHEN N'12 HR' THEN mo.TargetShotPerDay / 2 ELSE 0 END > 0
                    THEN ROUND(x.ShotCount / CASE x.MachineOnTime WHEN N'24 HR' THEN mo.TargetShotPerDay WHEN N'12 HR' THEN mo.TargetShotPerDay / 2 ELSE 0 END * 100, 2)
                    ELSE 0 END AS CalculatedOeePercentage,
               @UserId
        FROM @Entries x
        JOIN dbo.OeeMoulds mo ON mo.Id = x.MouldId;
        COMMIT;

        SELECT 201 StatusCode, N'OEE production entries saved.' Message;
        SELECT e.Id, e.ProductionDate, e.MachineId, m.MachineCode, m.MachineName, e.MouldId, mo.MouldName, e.MachineOnTime, e.ShotCount,
               e.DowntimeReasonId, r.ReasonName AS DowntimeReasonName, e.Remarks, e.CalculatedTargetShot, e.CalculatedOeePercentage,
               e.CreatedAt, e.UpdatedAt, 0 AS TotalCount
        FROM dbo.OeeProductionEntries e
        JOIN dbo.OeeMachines m ON m.Id = e.MachineId
        JOIN dbo.OeeMoulds mo ON mo.Id = e.MouldId
        JOIN dbo.OeeDowntimeReasons r ON r.Id = e.DowntimeReasonId
        WHERE e.ProductionDate = @ProductionDate AND e.IsDeleted = 0 AND EXISTS(SELECT 1 FROM @Entries x WHERE x.MachineId = e.MachineId)
        ORDER BY m.DisplayOrder, e.Id;
    END TRY BEGIN CATCH IF XACT_STATE() <> 0 ROLLBACK; SELECT 500 StatusCode, ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeProductionEntry_Save
    @Id BIGINT, @ProductionDate DATE, @MachineId BIGINT, @MouldId BIGINT, @MachineOnTime NVARCHAR(5), @ShotCount INT, @DowntimeReasonId BIGINT, @Remarks NVARCHAR(500) = NULL, @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS(SELECT 1 FROM dbo.OeeProductionEntries WHERE Id = @Id AND IsDeleted = 0) BEGIN SELECT 404 StatusCode, N'OEE production entry was not found.' Message; RETURN; END
    IF EXISTS(SELECT 1 FROM dbo.OeeProductionEntries WHERE ProductionDate = @ProductionDate AND MachineId = @MachineId AND IsDeleted = 0 AND Id <> @Id) BEGIN SELECT 409 StatusCode, N'OEE production entry already exists for this date and machine.' Message; RETURN; END
    IF @MachineOnTime NOT IN (N'24 HR', N'12 HR', N'0 HR') OR @ShotCount < 0 BEGIN SELECT 400 StatusCode, N'OEE production entry values are invalid.' Message; RETURN; END
    IF NOT EXISTS(SELECT 1 FROM dbo.OeeMachines WHERE Id = @MachineId AND IsDeleted = 0 AND IsActive = 1) BEGIN SELECT 404 StatusCode, N'OEE machine was not found.' Message; RETURN; END
    IF NOT EXISTS(SELECT 1 FROM dbo.OeeMoulds WHERE Id = @MouldId AND IsDeleted = 0 AND IsActive = 1) BEGIN SELECT 404 StatusCode, N'OEE mould was not found.' Message; RETURN; END
    IF NOT EXISTS(SELECT 1 FROM dbo.OeeDowntimeReasons WHERE Id = @DowntimeReasonId AND IsDeleted = 0 AND IsActive = 1) BEGIN SELECT 404 StatusCode, N'OEE downtime reason was not found.' Message; RETURN; END

    DECLARE @Target DECIMAL(18,2) = (SELECT CASE @MachineOnTime WHEN N'24 HR' THEN TargetShotPerDay WHEN N'12 HR' THEN TargetShotPerDay / 2 ELSE 0 END FROM dbo.OeeMoulds WHERE Id = @MouldId);
    UPDATE dbo.OeeProductionEntries
    SET ProductionDate = @ProductionDate, MachineId = @MachineId, MouldId = @MouldId, MachineOnTime = @MachineOnTime, ShotCount = @ShotCount,
        DowntimeReasonId = @DowntimeReasonId, Remarks = @Remarks, CalculatedTargetShot = @Target,
        CalculatedOeePercentage = CASE WHEN @Target > 0 THEN ROUND(@ShotCount / @Target * 100, 2) ELSE 0 END,
        UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UserId
    WHERE Id = @Id AND IsDeleted = 0;

    SELECT 200 StatusCode, N'OEE production entry updated.' Message;
    EXEC dbo.sp_OeeProductionEntry_GetById @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeProductionEntry_Delete @Id BIGINT, @UserId BIGINT = NULL AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OeeProductionEntries SET IsDeleted = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @UserId WHERE Id = @Id AND IsDeleted = 0;
    SELECT IIF(@@ROWCOUNT = 0, 404, 200) StatusCode, IIF(@@ROWCOUNT = 0, N'OEE production entry was not found.', N'OEE production entry deleted.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeDashboard_Summary @LastDays INT = NULL, @FromDate DATE = NULL, @ToDate DATE = NULL AS
BEGIN
    SET NOCOUNT ON;
    IF @LastDays IS NOT NULL AND @FromDate IS NULL SET @FromDate = DATEADD(DAY, -@LastDays + 1, CONVERT(DATE, GETDATE()));
    IF @LastDays IS NOT NULL AND @ToDate IS NULL SET @ToDate = CONVERT(DATE, GETDATE());
    ;WITH f AS
    (
        SELECT e.*, m.MachineName, r.ReasonName
        FROM dbo.OeeProductionEntries e
        JOIN dbo.OeeMachines m ON m.Id = e.MachineId
        JOIN dbo.OeeDowntimeReasons r ON r.Id = e.DowntimeReasonId
        WHERE e.IsDeleted = 0 AND (@FromDate IS NULL OR e.ProductionDate >= @FromDate) AND (@ToDate IS NULL OR e.ProductionDate <= @ToDate)
    ),
    machine AS
    (
        SELECT MachineName, SUM(ShotCount) TotalShot, SUM(CalculatedTargetShot) TotalTarget,
               CASE WHEN SUM(CalculatedTargetShot) > 0 THEN ROUND(SUM(ShotCount) / SUM(CalculatedTargetShot) * 100, 2) ELSE 0 END Oee
        FROM f GROUP BY MachineId, MachineName
    )
    SELECT
        CASE WHEN SUM(CalculatedTargetShot) > 0 THEN ROUND(SUM(ShotCount) / SUM(CalculatedTargetShot) * 100, 2) ELSE 0 END AS AverageOeePercentage,
        COALESCE(SUM(ShotCount), 0) AS TotalShotCount,
        COALESCE(SUM(CalculatedTargetShot), 0) AS TotalTargetShot,
        (SELECT TOP(1) MachineName FROM machine WHERE TotalTarget > 0 ORDER BY Oee DESC, MachineName) AS BestMachine,
        (SELECT TOP(1) MachineName FROM machine WHERE TotalTarget > 0 ORDER BY Oee ASC, MachineName) AS WorstMachine,
        COUNT(DISTINCT ProductionDate) AS TotalProductionDays,
        COALESCE(SUM(CASE WHEN ReasonName <> N'NONE' THEN 1 ELSE 0 END), 0) AS TotalDowntimeCount
    FROM f;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeDashboard_MachineWise @LastDays INT = NULL, @FromDate DATE = NULL, @ToDate DATE = NULL AS
BEGIN
    SET NOCOUNT ON;
    IF @LastDays IS NOT NULL AND @FromDate IS NULL SET @FromDate = DATEADD(DAY, -@LastDays + 1, CONVERT(DATE, GETDATE()));
    IF @LastDays IS NOT NULL AND @ToDate IS NULL SET @ToDate = CONVERT(DATE, GETDATE());
    SELECT m.Id AS MachineId, m.MachineName, COALESCE(SUM(e.ShotCount), 0) AS TotalShot, COALESCE(SUM(e.CalculatedTargetShot), 0) AS TotalTarget,
           CASE WHEN SUM(e.CalculatedTargetShot) > 0 THEN ROUND(SUM(e.ShotCount) / SUM(e.CalculatedTargetShot) * 100, 2) ELSE 0 END AS AverageOeePercentage
    FROM dbo.OeeMachines m
    LEFT JOIN dbo.OeeProductionEntries e ON e.MachineId = m.Id AND e.IsDeleted = 0 AND (@FromDate IS NULL OR e.ProductionDate >= @FromDate) AND (@ToDate IS NULL OR e.ProductionDate <= @ToDate)
    WHERE m.IsDeleted = 0
    GROUP BY m.Id, m.MachineName, m.DisplayOrder
    ORDER BY m.DisplayOrder, m.MachineName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeDashboard_MouldWise @LastDays INT = NULL, @FromDate DATE = NULL, @ToDate DATE = NULL AS
BEGIN
    SET NOCOUNT ON;
    IF @LastDays IS NOT NULL AND @FromDate IS NULL SET @FromDate = DATEADD(DAY, -@LastDays + 1, CONVERT(DATE, GETDATE()));
    IF @LastDays IS NOT NULL AND @ToDate IS NULL SET @ToDate = CONVERT(DATE, GETDATE());
    SELECT mo.Id AS MouldId, mo.MouldName, SUM(e.ShotCount) AS TotalShot, SUM(e.CalculatedTargetShot) AS TotalTarget,
           CASE WHEN SUM(e.CalculatedTargetShot) > 0 THEN ROUND(SUM(e.ShotCount) / SUM(e.CalculatedTargetShot) * 100, 2) ELSE 0 END AS AverageOeePercentage
    FROM dbo.OeeProductionEntries e
    JOIN dbo.OeeMoulds mo ON mo.Id = e.MouldId
    WHERE e.IsDeleted = 0 AND (@FromDate IS NULL OR e.ProductionDate >= @FromDate) AND (@ToDate IS NULL OR e.ProductionDate <= @ToDate)
    GROUP BY mo.Id, mo.MouldName
    ORDER BY AverageOeePercentage DESC, mo.MouldName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeDashboard_TopDowntimeReasons @LastDays INT = NULL, @FromDate DATE = NULL, @ToDate DATE = NULL AS
BEGIN
    SET NOCOUNT ON;
    IF @LastDays IS NOT NULL AND @FromDate IS NULL SET @FromDate = DATEADD(DAY, -@LastDays + 1, CONVERT(DATE, GETDATE()));
    IF @LastDays IS NOT NULL AND @ToDate IS NULL SET @ToDate = CONVERT(DATE, GETDATE());
    ;WITH f AS
    (
        SELECT r.ReasonName
        FROM dbo.OeeProductionEntries e JOIN dbo.OeeDowntimeReasons r ON r.Id = e.DowntimeReasonId
        WHERE e.IsDeleted = 0 AND r.ReasonName <> N'NONE' AND (@FromDate IS NULL OR e.ProductionDate >= @FromDate) AND (@ToDate IS NULL OR e.ProductionDate <= @ToDate)
    )
    SELECT ReasonName, COUNT(1) AS Count, CASE WHEN (SELECT COUNT(1) FROM f) > 0 THEN ROUND(COUNT(1) * 100.0 / (SELECT COUNT(1) FROM f), 2) ELSE 0 END AS Percentage
    FROM f GROUP BY ReasonName ORDER BY Count DESC, ReasonName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeDashboard_DailyTrend @LastDays INT = NULL, @FromDate DATE = NULL, @ToDate DATE = NULL AS
BEGIN
    SET NOCOUNT ON;
    IF @LastDays IS NOT NULL AND @FromDate IS NULL SET @FromDate = DATEADD(DAY, -@LastDays + 1, CONVERT(DATE, GETDATE()));
    IF @LastDays IS NOT NULL AND @ToDate IS NULL SET @ToDate = CONVERT(DATE, GETDATE());
    SELECT ProductionDate, SUM(ShotCount) AS TotalShot, SUM(CalculatedTargetShot) AS TotalTarget,
           CASE WHEN SUM(CalculatedTargetShot) > 0 THEN ROUND(SUM(ShotCount) / SUM(CalculatedTargetShot) * 100, 2) ELSE 0 END AS AverageOeePercentage
    FROM dbo.OeeProductionEntries
    WHERE IsDeleted = 0 AND (@FromDate IS NULL OR ProductionDate >= @FromDate) AND (@ToDate IS NULL OR ProductionDate <= @ToDate)
    GROUP BY ProductionDate ORDER BY ProductionDate;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeReport_Daily
    @LastDays INT = NULL, @FromDate DATE = NULL, @ToDate DATE = NULL, @MachineId BIGINT = NULL, @MouldId BIGINT = NULL, @DowntimeReasonId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @LastDays IS NOT NULL AND @FromDate IS NULL SET @FromDate = DATEADD(DAY, -@LastDays + 1, CONVERT(DATE, GETDATE()));
    IF @LastDays IS NOT NULL AND @ToDate IS NULL SET @ToDate = CONVERT(DATE, GETDATE());
    SELECT e.ProductionDate, m.MachineCode, m.MachineName, mo.MouldName, e.MachineOnTime, e.ShotCount, e.CalculatedTargetShot, e.CalculatedOeePercentage, r.ReasonName AS DowntimeReasonName, e.Remarks
    FROM dbo.OeeProductionEntries e
    JOIN dbo.OeeMachines m ON m.Id = e.MachineId
    JOIN dbo.OeeMoulds mo ON mo.Id = e.MouldId
    JOIN dbo.OeeDowntimeReasons r ON r.Id = e.DowntimeReasonId
    WHERE e.IsDeleted = 0
      AND (@FromDate IS NULL OR e.ProductionDate >= @FromDate)
      AND (@ToDate IS NULL OR e.ProductionDate <= @ToDate)
      AND (@MachineId IS NULL OR e.MachineId = @MachineId)
      AND (@MouldId IS NULL OR e.MouldId = @MouldId)
      AND (@DowntimeReasonId IS NULL OR e.DowntimeReasonId = @DowntimeReasonId)
    ORDER BY e.ProductionDate DESC, m.DisplayOrder;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeReport_MachinePerformance
    @LastDays INT = NULL, @FromDate DATE = NULL, @ToDate DATE = NULL, @MachineId BIGINT = NULL, @MouldId BIGINT = NULL, @DowntimeReasonId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @LastDays IS NOT NULL AND @FromDate IS NULL SET @FromDate = DATEADD(DAY, -@LastDays + 1, CONVERT(DATE, GETDATE()));
    IF @LastDays IS NOT NULL AND @ToDate IS NULL SET @ToDate = CONVERT(DATE, GETDATE());
    SELECT m.Id AS MachineId, m.MachineName, SUM(e.ShotCount) AS TotalShot, SUM(e.CalculatedTargetShot) AS TotalTarget,
           CASE WHEN SUM(e.CalculatedTargetShot) > 0 THEN ROUND(SUM(e.ShotCount) / SUM(e.CalculatedTargetShot) * 100, 2) ELSE 0 END AS AverageOeePercentage
    FROM dbo.OeeProductionEntries e JOIN dbo.OeeMachines m ON m.Id = e.MachineId
    WHERE e.IsDeleted = 0 AND (@FromDate IS NULL OR e.ProductionDate >= @FromDate) AND (@ToDate IS NULL OR e.ProductionDate <= @ToDate)
      AND (@MachineId IS NULL OR e.MachineId = @MachineId) AND (@MouldId IS NULL OR e.MouldId = @MouldId) AND (@DowntimeReasonId IS NULL OR e.DowntimeReasonId = @DowntimeReasonId)
    GROUP BY m.Id, m.MachineName, m.DisplayOrder ORDER BY m.DisplayOrder;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeReport_MouldPerformance
    @LastDays INT = NULL, @FromDate DATE = NULL, @ToDate DATE = NULL, @MachineId BIGINT = NULL, @MouldId BIGINT = NULL, @DowntimeReasonId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @LastDays IS NOT NULL AND @FromDate IS NULL SET @FromDate = DATEADD(DAY, -@LastDays + 1, CONVERT(DATE, GETDATE()));
    IF @LastDays IS NOT NULL AND @ToDate IS NULL SET @ToDate = CONVERT(DATE, GETDATE());
    SELECT mo.Id AS MouldId, mo.MouldName, SUM(e.ShotCount) AS TotalShot, SUM(e.CalculatedTargetShot) AS TotalTarget,
           CASE WHEN SUM(e.CalculatedTargetShot) > 0 THEN ROUND(SUM(e.ShotCount) / SUM(e.CalculatedTargetShot) * 100, 2) ELSE 0 END AS AverageOeePercentage
    FROM dbo.OeeProductionEntries e JOIN dbo.OeeMoulds mo ON mo.Id = e.MouldId
    WHERE e.IsDeleted = 0 AND (@FromDate IS NULL OR e.ProductionDate >= @FromDate) AND (@ToDate IS NULL OR e.ProductionDate <= @ToDate)
      AND (@MachineId IS NULL OR e.MachineId = @MachineId) AND (@MouldId IS NULL OR e.MouldId = @MouldId) AND (@DowntimeReasonId IS NULL OR e.DowntimeReasonId = @DowntimeReasonId)
    GROUP BY mo.Id, mo.MouldName ORDER BY AverageOeePercentage DESC, mo.MouldName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_OeeReport_Downtime
    @LastDays INT = NULL, @FromDate DATE = NULL, @ToDate DATE = NULL, @MachineId BIGINT = NULL, @MouldId BIGINT = NULL, @DowntimeReasonId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @LastDays IS NOT NULL AND @FromDate IS NULL SET @FromDate = DATEADD(DAY, -@LastDays + 1, CONVERT(DATE, GETDATE()));
    IF @LastDays IS NOT NULL AND @ToDate IS NULL SET @ToDate = CONVERT(DATE, GETDATE());
    ;WITH f AS
    (
        SELECT r.ReasonName
        FROM dbo.OeeProductionEntries e JOIN dbo.OeeDowntimeReasons r ON r.Id = e.DowntimeReasonId
        WHERE e.IsDeleted = 0 AND r.ReasonName <> N'NONE'
          AND (@FromDate IS NULL OR e.ProductionDate >= @FromDate)
          AND (@ToDate IS NULL OR e.ProductionDate <= @ToDate)
          AND (@MachineId IS NULL OR e.MachineId = @MachineId)
          AND (@MouldId IS NULL OR e.MouldId = @MouldId)
          AND (@DowntimeReasonId IS NULL OR e.DowntimeReasonId = @DowntimeReasonId)
    )
    SELECT ReasonName, COUNT(1) AS Count, CASE WHEN (SELECT COUNT(1) FROM f) > 0 THEN ROUND(COUNT(1) * 100.0 / (SELECT COUNT(1) FROM f), 2) ELSE 0 END AS Percentage
    FROM f GROUP BY ReasonName ORDER BY Count DESC, ReasonName;
END;
GO

DECLARE @OeeParentId INT;
MERGE dbo.Pages AS target
USING (SELECT N'OEE' Name, N'OEE' DisplayName, N'/oee' Route, N'gauge' Icon, 400 SortOrder) AS source
ON target.Name = source.Name
WHEN NOT MATCHED THEN INSERT(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive) VALUES(source.Name, source.DisplayName, source.Route, source.Icon, NULL, source.SortOrder, 1)
WHEN MATCHED THEN UPDATE SET DisplayName = source.DisplayName, Route = source.Route, Icon = source.Icon, SortOrder = source.SortOrder, IsActive = 1;

SELECT @OeeParentId = Id FROM dbo.Pages WHERE Name = N'OEE';

MERGE dbo.Pages AS target
USING (VALUES
    (N'OEE.Dashboard', N'OEE Dashboard', N'/oee/dashboard', N'gauge', @OeeParentId, 401),
    (N'OEE.ProductionEntries', N'Daily Production Entry', N'/oee/production-entry', N'clipboard-list', @OeeParentId, 402),
    (N'OEE.Machines', N'OEE Machines', N'/oee/machines', N'factory', @OeeParentId, 403),
    (N'OEE.Moulds', N'OEE Moulds', N'/oee/moulds', N'box', @OeeParentId, 404),
    (N'OEE.DowntimeReasons', N'OEE Downtime Reasons', N'/oee/downtime-reasons', N'circle-alert', @OeeParentId, 405),
    (N'OEE.Reports', N'OEE Reports', N'/oee/reports', N'chart-column', @OeeParentId, 406)
) AS source(Name, DisplayName, Route, Icon, ParentPageId, SortOrder)
ON target.Name = source.Name
WHEN NOT MATCHED THEN INSERT(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive) VALUES(source.Name, source.DisplayName, source.Route, source.Icon, source.ParentPageId, source.SortOrder, 1)
WHEN MATCHED THEN UPDATE SET DisplayName = source.DisplayName, Route = source.Route, Icon = source.Icon, ParentPageId = source.ParentPageId, SortOrder = source.SortOrder, IsActive = 1;

INSERT INTO dbo.RolePermissions(RoleId, PageId, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove)
SELECT r.Id, p.Id, 1,
       CASE WHEN p.Name IN (N'OEE.Machines', N'OEE.Moulds', N'OEE.DowntimeReasons', N'OEE.ProductionEntries') THEN 1 ELSE 0 END,
       CASE WHEN p.Name IN (N'OEE.Machines', N'OEE.Moulds', N'OEE.DowntimeReasons', N'OEE.ProductionEntries') THEN 1 ELSE 0 END,
       CASE WHEN p.Name IN (N'OEE.Machines', N'OEE.Moulds', N'OEE.DowntimeReasons', N'OEE.ProductionEntries') THEN 1 ELSE 0 END,
       CASE WHEN p.Name = N'OEE.Reports' THEN 1 ELSE 0 END,
       0
FROM dbo.Roles r
CROSS JOIN dbo.Pages p
WHERE r.Name IN (N'Super Admin', N'SuperAdmin', N'Administrator', N'Admin')
  AND p.Name LIKE N'OEE%'
  AND NOT EXISTS(SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.Id AND rp.PageId = p.Id);
GO
