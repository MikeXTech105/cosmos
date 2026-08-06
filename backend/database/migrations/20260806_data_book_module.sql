/*
    COSMOS ERP - Data Book Module
    Additive, rerunnable migration. Private visibility is enforced in every
    Data Book procedure; page permissions never bypass entry ownership.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.DataBookEntries', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DataBookEntries
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DataBookEntries PRIMARY KEY,
        Name NVARCHAR(200) NOT NULL,
        Value NVARCHAR(MAX) NOT NULL,
        Description NVARCHAR(1000) NULL,
        Category NVARCHAR(100) NULL,
        IsPrivate BIT NOT NULL CONSTRAINT DF_DataBookEntries_IsPrivate DEFAULT (0),
        OwnerUserId INT NOT NULL,
        CreatedBy INT NOT NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_DataBookEntries_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedBy INT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        DeletedBy INT NULL,
        DeletedAtUtc DATETIME2(3) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_DataBookEntries_IsDeleted DEFAULT (0),
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT CK_DataBookEntries_Name CHECK (LEN(LTRIM(RTRIM(Name))) > 0),
        CONSTRAINT CK_DataBookEntries_Value CHECK (LEN(LTRIM(RTRIM(Value))) > 0),
        CONSTRAINT CK_DataBookEntries_DeleteAudit CHECK
        (
            (IsDeleted = 0 AND DeletedBy IS NULL AND DeletedAtUtc IS NULL)
            OR
            (IsDeleted = 1 AND DeletedBy IS NOT NULL AND DeletedAtUtc IS NOT NULL)
        ),
        CONSTRAINT FK_DataBookEntries_OwnerUser FOREIGN KEY (OwnerUserId) REFERENCES dbo.Users(Id),
        CONSTRAINT FK_DataBookEntries_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(Id),
        CONSTRAINT FK_DataBookEntries_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES dbo.Users(Id),
        CONSTRAINT FK_DataBookEntries_DeletedBy FOREIGN KEY (DeletedBy) REFERENCES dbo.Users(Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.DataBookEntryHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DataBookEntryHistory
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DataBookEntryHistory PRIMARY KEY,
        DataBookEntryId BIGINT NOT NULL,
        ActionType NVARCHAR(30) NOT NULL,
        ChangedByUserId INT NOT NULL,
        ChangedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_DataBookEntryHistory_ChangedAtUtc DEFAULT (SYSUTCDATETIME()),
        OldDataJson NVARCHAR(MAX) NULL,
        NewDataJson NVARCHAR(MAX) NULL,
        ChangedFieldsJson NVARCHAR(MAX) NOT NULL,
        CorrelationId NVARCHAR(128) NULL,
        CONSTRAINT CK_DataBookEntryHistory_ActionType CHECK (ActionType IN (N'Created', N'Updated', N'VisibilityChanged', N'Deleted', N'Restored')),
        CONSTRAINT CK_DataBookEntryHistory_OldDataJson CHECK (OldDataJson IS NULL OR ISJSON(OldDataJson) = 1),
        CONSTRAINT CK_DataBookEntryHistory_NewDataJson CHECK (NewDataJson IS NULL OR ISJSON(NewDataJson) = 1),
        CONSTRAINT CK_DataBookEntryHistory_ChangedFieldsJson CHECK (ISJSON(ChangedFieldsJson) = 1),
        CONSTRAINT FK_DataBookEntryHistory_Entry FOREIGN KEY (DataBookEntryId) REFERENCES dbo.DataBookEntries(Id),
        CONSTRAINT FK_DataBookEntryHistory_ChangedBy FOREIGN KEY (ChangedByUserId) REFERENCES dbo.Users(Id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.DataBookEntries') AND name=N'IX_DataBookEntries_PublicActive')
    CREATE INDEX IX_DataBookEntries_PublicActive ON dbo.DataBookEntries(Category, CreatedAtUtc DESC, Id DESC)
        INCLUDE(Name, Description, UpdatedAtUtc, CreatedBy, UpdatedBy) WHERE IsDeleted=0 AND IsPrivate=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.DataBookEntries') AND name=N'IX_DataBookEntries_OwnerPrivateActive')
    CREATE INDEX IX_DataBookEntries_OwnerPrivateActive ON dbo.DataBookEntries(OwnerUserId, Category, CreatedAtUtc DESC, Id DESC)
        INCLUDE(Name, Description, UpdatedAtUtc, CreatedBy, UpdatedBy) WHERE IsDeleted=0 AND IsPrivate=1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.DataBookEntries') AND name=N'IX_DataBookEntries_ActorFilters')
    CREATE INDEX IX_DataBookEntries_ActorFilters ON dbo.DataBookEntries(CreatedBy, UpdatedBy, IsDeleted, IsPrivate)
        INCLUDE(OwnerUserId, Category, CreatedAtUtc, UpdatedAtUtc, Name);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.DataBookEntryHistory') AND name=N'IX_DataBookEntryHistory_EntryChangedAtUtc')
    CREATE INDEX IX_DataBookEntryHistory_EntryChangedAtUtc ON dbo.DataBookEntryHistory(DataBookEntryId, ChangedAtUtc DESC, Id DESC)
        INCLUDE(ActionType, ChangedByUserId, CorrelationId);
GO

/* The business-history table is append-only. Only Data Book mutation procedures insert rows. */
CREATE OR ALTER TRIGGER dbo.TR_DataBookEntryHistory_AppendOnly
ON dbo.DataBookEntryHistory
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 52220, N'Data Book history is append-only.', 1;
END;
GO

MERGE dbo.Pages AS target
USING (VALUES (N'DataBook.Entries', N'Data Book', N'/data-book/entries', N'book-open', 98)) AS source(Name, DisplayName, Route, Icon, SortOrder)
ON target.Name=source.Name
WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName, Route=source.Route, Icon=source.Icon, SortOrder=source.SortOrder, IsActive=1
WHEN NOT MATCHED THEN INSERT(Name, DisplayName, Route, Icon, SortOrder, IsActive) VALUES(source.Name, source.DisplayName, source.Route, source.Icon, source.SortOrder, 1);
GO

DECLARE @DataBookSuperAdminRoleId INT=(SELECT Id FROM dbo.Roles WHERE Name=N'SuperAdmin');
IF @DataBookSuperAdminRoleId IS NOT NULL
BEGIN
    MERGE dbo.RolePermissions AS target
    USING (SELECT @DataBookSuperAdminRoleId RoleId, Id PageId FROM dbo.Pages WHERE Name=N'DataBook.Entries') AS source
    ON target.RoleId=source.RoleId AND target.PageId=source.PageId
    WHEN MATCHED THEN UPDATE SET CanView=1, CanCreate=1, CanEdit=1, CanDelete=1, CanExport=1, CanApprove=0
    WHEN NOT MATCHED THEN INSERT(RoleId, PageId, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove)
         VALUES(source.RoleId, source.PageId, 1, 1, 1, 1, 1, 0);
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DataBookEntry_GetById
    @Id BIGINT,
    @CurrentUserId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT e.Id, e.Name, e.Value, e.Description, e.Category, e.IsPrivate, e.OwnerUserId, ownerUser.FullName AS OwnerUserName,
           e.CreatedBy, creator.FullName AS CreatedByName, e.CreatedAtUtc,
           e.UpdatedBy, updater.FullName AS UpdatedByName, e.UpdatedAtUtc, CONVERT(VARBINARY(8), e.RowVersion) AS RowVersion
    FROM dbo.DataBookEntries e
    INNER JOIN dbo.Users ownerUser ON ownerUser.Id=e.OwnerUserId
    INNER JOIN dbo.Users creator ON creator.Id=e.CreatedBy
    LEFT JOIN dbo.Users updater ON updater.Id=e.UpdatedBy
    WHERE e.Id=@Id
      AND e.IsDeleted=0
      AND (e.IsPrivate=0 OR e.OwnerUserId=@CurrentUserId);
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DataBookEntry_GetList
    @Search NVARCHAR(200)=NULL,
    @Category NVARCHAR(100)=NULL,
    @Visibility NVARCHAR(20)=N'all',
    @CreatedByUserId INT=NULL,
    @UpdatedByUserId INT=NULL,
    @FromDate DATETIME2(3)=NULL,
    @ToDate DATETIME2(3)=NULL,
    @PageNumber INT=1,
    @PageSize INT=20,
    @SortBy NVARCHAR(30)=NULL,
    @SortDirection NVARCHAR(4)=NULL,
    @CurrentUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);
    SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
    SET @Visibility=LOWER(ISNULL(NULLIF(LTRIM(RTRIM(@Visibility)),N''),N'all'));
    SET @SortBy=LOWER(NULLIF(LTRIM(RTRIM(@SortBy)),N''));
    SET @SortDirection=LOWER(NULLIF(LTRIM(RTRIM(@SortDirection)),N''));
    SET @Search=NULLIF(LTRIM(RTRIM(@Search)),N'');
    SET @Category=NULLIF(LTRIM(RTRIM(@Category)),N'');

    SELECT e.Id, e.Name,
           CASE WHEN LEN(e.Value)>500 THEN LEFT(e.Value,500)+N'...' ELSE e.Value END AS ValuePreview,
           e.Description, e.Category, e.IsPrivate, e.OwnerUserId, ownerUser.FullName AS OwnerUserName,
           creator.FullName AS CreatedByName, e.CreatedAtUtc, updater.FullName AS UpdatedByName, e.UpdatedAtUtc,
           CONVERT(VARBINARY(8), e.RowVersion) AS RowVersion, COUNT(1) OVER() AS TotalCount
    FROM dbo.DataBookEntries e
    INNER JOIN dbo.Users ownerUser ON ownerUser.Id=e.OwnerUserId
    INNER JOIN dbo.Users creator ON creator.Id=e.CreatedBy
    LEFT JOIN dbo.Users updater ON updater.Id=e.UpdatedBy
    WHERE e.IsDeleted=0
      AND (e.IsPrivate=0 OR e.OwnerUserId=@CurrentUserId)
      AND (@Visibility=N'all' OR (@Visibility=N'public' AND e.IsPrivate=0) OR (@Visibility=N'my-private' AND e.IsPrivate=1 AND e.OwnerUserId=@CurrentUserId))
      AND (@Category IS NULL OR e.Category=@Category)
      AND (@CreatedByUserId IS NULL OR e.CreatedBy=@CreatedByUserId)
      AND (@UpdatedByUserId IS NULL OR e.UpdatedBy=@UpdatedByUserId)
      AND (@FromDate IS NULL OR e.CreatedAtUtc>=@FromDate)
      AND (@ToDate IS NULL OR e.CreatedAtUtc<DATEADD(DAY,1,CONVERT(DATE,@ToDate)))
      AND (@Search IS NULL OR e.Name LIKE N'%'+@Search+N'%' OR e.Value LIKE N'%'+@Search+N'%' OR e.Description LIKE N'%'+@Search+N'%' OR e.Category LIKE N'%'+@Search+N'%')
    ORDER BY
      CASE WHEN @SortBy=N'name' AND @SortDirection=N'asc' THEN e.Name END ASC,
      CASE WHEN @SortBy=N'name' AND @SortDirection=N'desc' THEN e.Name END DESC,
      CASE WHEN @SortBy=N'category' AND @SortDirection=N'asc' THEN e.Category END ASC,
      CASE WHEN @SortBy=N'category' AND @SortDirection=N'desc' THEN e.Category END DESC,
      CASE WHEN @SortBy=N'createdatutc' AND @SortDirection=N'asc' THEN e.CreatedAtUtc END ASC,
      CASE WHEN @SortBy=N'createdatutc' AND @SortDirection=N'desc' THEN e.CreatedAtUtc END DESC,
      CASE WHEN @SortBy=N'updatedatutc' AND @SortDirection=N'asc' THEN e.UpdatedAtUtc END ASC,
      CASE WHEN @SortBy=N'updatedatutc' AND @SortDirection=N'desc' THEN e.UpdatedAtUtc END DESC,
      CASE WHEN @SortBy IS NULL THEN e.UpdatedAtUtc END DESC,
      CASE WHEN @SortBy IS NULL THEN e.CreatedAtUtc END DESC,
      e.Id DESC
    OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DataBookEntry_Create
    @Name NVARCHAR(200),
    @Value NVARCHAR(MAX),
    @Description NVARCHAR(1000)=NULL,
    @Category NVARCHAR(100)=NULL,
    @IsPrivate BIT,
    @CurrentUserId INT,
    @CorrelationId NVARCHAR(128)=NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @Id BIGINT, @NewDataJson NVARCHAR(MAX);

    BEGIN TRY
        BEGIN TRANSACTION;
        INSERT dbo.DataBookEntries(Name, Value, Description, Category, IsPrivate, OwnerUserId, CreatedBy)
        VALUES(@Name, @Value, @Description, @Category, @IsPrivate, @CurrentUserId, @CurrentUserId);
        SET @Id=CONVERT(BIGINT,SCOPE_IDENTITY());

        SELECT @NewDataJson=(SELECT Name, Value, Description, Category, IsPrivate, OwnerUserId, CreatedBy, CreatedAtUtc,
                                     UpdatedBy, UpdatedAtUtc, DeletedBy, DeletedAtUtc, IsDeleted
                              FROM dbo.DataBookEntries WHERE Id=@Id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);
        INSERT dbo.DataBookEntryHistory(DataBookEntryId, ActionType, ChangedByUserId, OldDataJson, NewDataJson, ChangedFieldsJson, CorrelationId)
        VALUES(@Id, N'Created', @CurrentUserId, NULL, @NewDataJson, N'["Name","Value","Description","Category","IsPrivate","OwnerUserId"]', @CorrelationId);
        COMMIT TRANSACTION;

        SELECT 201 AS StatusCode, N'Data Book entry created.' AS [Message];
        EXEC dbo.usp_DataBookEntry_GetById @Id=@Id, @CurrentUserId=@CurrentUserId;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DataBookEntry_Update
    @Id BIGINT,
    @Name NVARCHAR(200),
    @Value NVARCHAR(MAX),
    @Description NVARCHAR(1000)=NULL,
    @Category NVARCHAR(100)=NULL,
    @IsPrivate BIT,
    @ExpectedRowVersion VARBINARY(8),
    @CurrentUserId INT,
    @CorrelationId NVARCHAR(128)=NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @ExistingIsPrivate BIT, @ExistingOwnerUserId INT, @ActualRowVersion VARBINARY(8),
            @OldName NVARCHAR(200), @OldValue NVARCHAR(MAX), @OldDescription NVARCHAR(1000), @OldCategory NVARCHAR(100),
            @NewOwnerUserId INT, @OldDataJson NVARCHAR(MAX), @NewDataJson NVARCHAR(MAX), @ChangedFieldsJson NVARCHAR(MAX), @ActionType NVARCHAR(30);
    DECLARE @ChangedFields TABLE(FieldName NVARCHAR(50) NOT NULL);

    BEGIN TRY
        BEGIN TRANSACTION;
        SELECT @ExistingIsPrivate=e.IsPrivate, @ExistingOwnerUserId=e.OwnerUserId, @ActualRowVersion=CONVERT(VARBINARY(8),e.RowVersion),
               @OldName=e.Name, @OldValue=e.Value, @OldDescription=e.Description, @OldCategory=e.Category,
               @OldDataJson=(SELECT Name, Value, Description, Category, IsPrivate, OwnerUserId, CreatedBy, CreatedAtUtc,
                                    UpdatedBy, UpdatedAtUtc, DeletedBy, DeletedAtUtc, IsDeleted
                             FROM dbo.DataBookEntries WHERE Id=e.Id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)
        FROM dbo.DataBookEntries e WITH (UPDLOCK,HOLDLOCK)
        WHERE e.Id=@Id AND e.IsDeleted=0;

        IF @ActualRowVersion IS NULL
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'Data Book entry was not found.' AS [Message];
            RETURN;
        END;
        IF @ExistingIsPrivate=1 AND @ExistingOwnerUserId<>@CurrentUserId
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'Data Book entry was not found.' AS [Message];
            RETURN;
        END;
        IF @ActualRowVersion<>@ExpectedRowVersion
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 409 AS StatusCode, N'Data Book entry has changed.' AS [Message];
            RETURN;
        END;

        SET @NewOwnerUserId=CASE WHEN @ExistingIsPrivate=0 AND @IsPrivate=1 THEN @CurrentUserId ELSE @ExistingOwnerUserId END;
        IF @OldName<>@Name INSERT @ChangedFields VALUES(N'Name');
        IF @OldValue<>@Value INSERT @ChangedFields VALUES(N'Value');
        IF ISNULL(@OldDescription,N'')<>ISNULL(@Description,N'') INSERT @ChangedFields VALUES(N'Description');
        IF ISNULL(@OldCategory,N'')<>ISNULL(@Category,N'') INSERT @ChangedFields VALUES(N'Category');
        IF @ExistingIsPrivate<>@IsPrivate INSERT @ChangedFields VALUES(N'IsPrivate');
        IF @ExistingOwnerUserId<>@NewOwnerUserId INSERT @ChangedFields VALUES(N'OwnerUserId');
        SELECT @ChangedFieldsJson=(SELECT FieldName FROM @ChangedFields FOR JSON PATH);
        SET @ActionType=CASE WHEN @ExistingIsPrivate<>@IsPrivate THEN N'VisibilityChanged' ELSE N'Updated' END;

        UPDATE dbo.DataBookEntries
        SET Name=@Name, Value=@Value, Description=@Description, Category=@Category, IsPrivate=@IsPrivate, OwnerUserId=@NewOwnerUserId,
            UpdatedBy=@CurrentUserId, UpdatedAtUtc=SYSUTCDATETIME()
        WHERE Id=@Id AND IsDeleted=0 AND RowVersion=@ExpectedRowVersion;

        IF @@ROWCOUNT<>1
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 409 AS StatusCode, N'Data Book entry has changed.' AS [Message];
            RETURN;
        END;

        SELECT @NewDataJson=(SELECT Name, Value, Description, Category, IsPrivate, OwnerUserId, CreatedBy, CreatedAtUtc,
                                     UpdatedBy, UpdatedAtUtc, DeletedBy, DeletedAtUtc, IsDeleted
                              FROM dbo.DataBookEntries WHERE Id=@Id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);
        INSERT dbo.DataBookEntryHistory(DataBookEntryId, ActionType, ChangedByUserId, OldDataJson, NewDataJson, ChangedFieldsJson, CorrelationId)
        VALUES(@Id, @ActionType, @CurrentUserId, @OldDataJson, @NewDataJson, ISNULL(@ChangedFieldsJson,N'[]'), @CorrelationId);
        COMMIT TRANSACTION;

        SELECT 200 AS StatusCode, N'Data Book entry updated.' AS [Message];
        EXEC dbo.usp_DataBookEntry_GetById @Id=@Id, @CurrentUserId=@CurrentUserId;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DataBookEntry_Delete
    @Id BIGINT,
    @ExpectedRowVersion VARBINARY(8),
    @CurrentUserId INT,
    @CorrelationId NVARCHAR(128)=NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @ExistingIsPrivate BIT, @ExistingOwnerUserId INT, @ActualRowVersion VARBINARY(8), @OldDataJson NVARCHAR(MAX), @NewDataJson NVARCHAR(MAX);

    BEGIN TRY
        BEGIN TRANSACTION;
        SELECT @ExistingIsPrivate=e.IsPrivate, @ExistingOwnerUserId=e.OwnerUserId, @ActualRowVersion=CONVERT(VARBINARY(8),e.RowVersion),
               @OldDataJson=(SELECT Name, Value, Description, Category, IsPrivate, OwnerUserId, CreatedBy, CreatedAtUtc,
                                    UpdatedBy, UpdatedAtUtc, DeletedBy, DeletedAtUtc, IsDeleted
                             FROM dbo.DataBookEntries WHERE Id=e.Id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)
        FROM dbo.DataBookEntries e WITH (UPDLOCK,HOLDLOCK)
        WHERE e.Id=@Id AND e.IsDeleted=0;

        IF @ActualRowVersion IS NULL
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'Data Book entry was not found.' AS [Message];
            RETURN;
        END;
        IF @ExistingIsPrivate=1 AND @ExistingOwnerUserId<>@CurrentUserId
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'Data Book entry was not found.' AS [Message];
            RETURN;
        END;
        IF @ActualRowVersion<>@ExpectedRowVersion
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 409 AS StatusCode, N'Data Book entry has changed.' AS [Message];
            RETURN;
        END;

        UPDATE dbo.DataBookEntries
        SET IsDeleted=1, DeletedBy=@CurrentUserId, DeletedAtUtc=SYSUTCDATETIME(), UpdatedBy=@CurrentUserId, UpdatedAtUtc=SYSUTCDATETIME()
        WHERE Id=@Id AND IsDeleted=0 AND RowVersion=@ExpectedRowVersion;

        IF @@ROWCOUNT<>1
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 409 AS StatusCode, N'Data Book entry has changed.' AS [Message];
            RETURN;
        END;

        SELECT @NewDataJson=(SELECT Name, Value, Description, Category, IsPrivate, OwnerUserId, CreatedBy, CreatedAtUtc,
                                     UpdatedBy, UpdatedAtUtc, DeletedBy, DeletedAtUtc, IsDeleted
                              FROM dbo.DataBookEntries WHERE Id=@Id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);
        INSERT dbo.DataBookEntryHistory(DataBookEntryId, ActionType, ChangedByUserId, OldDataJson, NewDataJson, ChangedFieldsJson, CorrelationId)
        VALUES(@Id, N'Deleted', @CurrentUserId, @OldDataJson, @NewDataJson, N'["IsDeleted","DeletedBy","DeletedAtUtc"]', @CorrelationId);
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Data Book entry deleted.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DataBookEntry_GetHistory
    @Id BIGINT,
    @CurrentUserId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT h.Id, h.DataBookEntryId AS EntryId, h.ActionType, h.ChangedByUserId, changedBy.FullName AS ChangedByName,
           h.ChangedAtUtc, h.ChangedFieldsJson, h.OldDataJson, h.NewDataJson, h.CorrelationId
    FROM dbo.DataBookEntryHistory h
    INNER JOIN dbo.DataBookEntries e ON e.Id=h.DataBookEntryId
    INNER JOIN dbo.Users changedBy ON changedBy.Id=h.ChangedByUserId
    WHERE h.DataBookEntryId=@Id
      AND e.IsDeleted=0
      AND (e.IsPrivate=0 OR e.OwnerUserId=@CurrentUserId)
    ORDER BY h.ChangedAtUtc DESC, h.Id DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DataBookEntry_Export
    @Search NVARCHAR(200)=NULL,
    @Category NVARCHAR(100)=NULL,
    @Visibility NVARCHAR(20)=N'all',
    @CreatedByUserId INT=NULL,
    @UpdatedByUserId INT=NULL,
    @FromDate DATETIME2(3)=NULL,
    @ToDate DATETIME2(3)=NULL,
    @SortBy NVARCHAR(30)=NULL,
    @SortDirection NVARCHAR(4)=NULL,
    @CurrentUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET @Visibility=LOWER(ISNULL(NULLIF(LTRIM(RTRIM(@Visibility)),N''),N'all'));
    SET @SortBy=LOWER(NULLIF(LTRIM(RTRIM(@SortBy)),N''));
    SET @SortDirection=LOWER(NULLIF(LTRIM(RTRIM(@SortDirection)),N''));
    SET @Search=NULLIF(LTRIM(RTRIM(@Search)),N'');
    SET @Category=NULLIF(LTRIM(RTRIM(@Category)),N'');

    SELECT e.Name, e.Value, e.Description, e.Category,
           CASE WHEN e.IsPrivate=1 THEN N'Private' ELSE N'Public' END AS Visibility,
           creator.FullName AS CreatedByName, e.CreatedAtUtc, updater.FullName AS UpdatedByName, e.UpdatedAtUtc
    FROM dbo.DataBookEntries e
    INNER JOIN dbo.Users creator ON creator.Id=e.CreatedBy
    LEFT JOIN dbo.Users updater ON updater.Id=e.UpdatedBy
    WHERE e.IsDeleted=0
      AND (e.IsPrivate=0 OR e.OwnerUserId=@CurrentUserId)
      AND (@Visibility=N'all' OR (@Visibility=N'public' AND e.IsPrivate=0) OR (@Visibility=N'my-private' AND e.IsPrivate=1 AND e.OwnerUserId=@CurrentUserId))
      AND (@Category IS NULL OR e.Category=@Category)
      AND (@CreatedByUserId IS NULL OR e.CreatedBy=@CreatedByUserId)
      AND (@UpdatedByUserId IS NULL OR e.UpdatedBy=@UpdatedByUserId)
      AND (@FromDate IS NULL OR e.CreatedAtUtc>=@FromDate)
      AND (@ToDate IS NULL OR e.CreatedAtUtc<DATEADD(DAY,1,CONVERT(DATE,@ToDate)))
      AND (@Search IS NULL OR e.Name LIKE N'%'+@Search+N'%' OR e.Value LIKE N'%'+@Search+N'%' OR e.Description LIKE N'%'+@Search+N'%' OR e.Category LIKE N'%'+@Search+N'%')
    ORDER BY
      CASE WHEN @SortBy=N'name' AND @SortDirection=N'asc' THEN e.Name END ASC,
      CASE WHEN @SortBy=N'name' AND @SortDirection=N'desc' THEN e.Name END DESC,
      CASE WHEN @SortBy=N'category' AND @SortDirection=N'asc' THEN e.Category END ASC,
      CASE WHEN @SortBy=N'category' AND @SortDirection=N'desc' THEN e.Category END DESC,
      CASE WHEN @SortBy=N'createdatutc' AND @SortDirection=N'asc' THEN e.CreatedAtUtc END ASC,
      CASE WHEN @SortBy=N'createdatutc' AND @SortDirection=N'desc' THEN e.CreatedAtUtc END DESC,
      CASE WHEN @SortBy=N'updatedatutc' AND @SortDirection=N'asc' THEN e.UpdatedAtUtc END ASC,
      CASE WHEN @SortBy=N'updatedatutc' AND @SortDirection=N'desc' THEN e.UpdatedAtUtc END DESC,
      CASE WHEN @SortBy IS NULL THEN e.UpdatedAtUtc END DESC,
      CASE WHEN @SortBy IS NULL THEN e.CreatedAtUtc END DESC,
      e.Id DESC;
END;
GO
