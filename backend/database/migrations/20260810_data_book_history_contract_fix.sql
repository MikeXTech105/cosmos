/*
    COSMOS ERP - Data Book history contract fix
    Corrects future update history to store the same scalar changed-field array
    used by create/delete. Existing append-only history is intentionally untouched.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
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
    DECLARE @ChangedFields TABLE(ChangeSequence TINYINT IDENTITY(1,1) NOT NULL, FieldName NVARCHAR(50) NOT NULL);

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
        IF @OldName<>@Name INSERT @ChangedFields(FieldName) VALUES(N'Name');
        IF @OldValue<>@Value INSERT @ChangedFields(FieldName) VALUES(N'Value');
        IF ISNULL(@OldDescription,N'')<>ISNULL(@Description,N'') INSERT @ChangedFields(FieldName) VALUES(N'Description');
        IF ISNULL(@OldCategory,N'')<>ISNULL(@Category,N'') INSERT @ChangedFields(FieldName) VALUES(N'Category');
        IF @ExistingIsPrivate<>@IsPrivate INSERT @ChangedFields(FieldName) VALUES(N'IsPrivate');
        IF @ExistingOwnerUserId<>@NewOwnerUserId INSERT @ChangedFields(FieldName) VALUES(N'OwnerUserId');
        SELECT @ChangedFieldsJson=N'['+COALESCE(STRING_AGG(N'"'+STRING_ESCAPE(FieldName,'json')+N'"',N',') WITHIN GROUP (ORDER BY ChangeSequence),N'')+N']'
        FROM @ChangedFields;
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
        VALUES(@Id, @ActionType, @CurrentUserId, @OldDataJson, @NewDataJson, @ChangedFieldsJson, @CorrelationId);
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
