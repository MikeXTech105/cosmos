/*
    Transactional Data Book behavioural smoke tests.
    Prerequisite: at least two active COSMOS users. All permanent changes roll back.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @OwnerUserId INT=(SELECT TOP(1) Id FROM dbo.Users WHERE IsActive=1 ORDER BY Id);
    DECLARE @OtherUserId INT=(SELECT TOP(1) Id FROM dbo.Users WHERE IsActive=1 AND Id<>@OwnerUserId ORDER BY Id);
    IF @OwnerUserId IS NULL OR @OtherUserId IS NULL
        THROW 52400, N'Data Book smoke tests require two active users.', 1;

    DECLARE @Token NVARCHAR(36)=CONVERT(NVARCHAR(36),NEWID());
    DECLARE @PublicId BIGINT, @PrivateId BIGINT, @ExpectedRowVersion VARBINARY(8), @ActualOwnerUserId INT, @UpdatedBy INT;
    CREATE TABLE #DataBookSmokeDetail
    (
        Id BIGINT, Name NVARCHAR(200), Value NVARCHAR(MAX), Description NVARCHAR(1000), Category NVARCHAR(100), IsPrivate BIT,
        OwnerUserId INT, OwnerUserName NVARCHAR(200), CreatedBy INT, CreatedByName NVARCHAR(200), CreatedAtUtc DATETIME2(3),
        UpdatedBy INT NULL, UpdatedByName NVARCHAR(200) NULL, UpdatedAtUtc DATETIME2(3) NULL, RowVersion VARBINARY(8)
    );

    EXEC dbo.usp_DataBookEntry_Create @Name=N'Data Book public '+@Token, @Value=N'public smoke value', @Description=N'Smoke test', @Category=N'Smoke', @IsPrivate=0, @CurrentUserId=@OwnerUserId, @CorrelationId=N'data-book-smoke';
    SELECT @PublicId=Id, @ExpectedRowVersion=CONVERT(VARBINARY(8),RowVersion) FROM dbo.DataBookEntries WHERE Name=N'Data Book public '+@Token;
    IF @PublicId IS NULL THROW 52401, N'Public Data Book create did not persist.', 1;

    INSERT #DataBookSmokeDetail EXEC dbo.usp_DataBookEntry_GetById @Id=@PublicId,@CurrentUserId=@OtherUserId;
    IF NOT EXISTS (SELECT 1 FROM #DataBookSmokeDetail) THROW 52402, N'Other user cannot read a public entry.', 1;
    TRUNCATE TABLE #DataBookSmokeDetail;

    EXEC dbo.usp_DataBookEntry_Update @Id=@PublicId,@Name=N'Data Book public '+@Token,@Value=N'public smoke value updated',@Description=N'Smoke test',@Category=N'Smoke',@IsPrivate=0,@ExpectedRowVersion=@ExpectedRowVersion,@CurrentUserId=@OtherUserId,@CorrelationId=N'data-book-smoke';
    SELECT @UpdatedBy=UpdatedBy, @ExpectedRowVersion=CONVERT(VARBINARY(8),RowVersion) FROM dbo.DataBookEntries WHERE Id=@PublicId;
    IF @UpdatedBy<>@OtherUserId OR NOT EXISTS
       (
           SELECT 1
           FROM dbo.DataBookEntryHistory
           WHERE DataBookEntryId=@PublicId AND ActionType=N'Updated' AND ChangedByUserId=@OtherUserId
             AND ChangedFieldsJson=N'["Value"]' AND ISJSON(OldDataJson)=1 AND ISJSON(NewDataJson)=1
       )
        THROW 52403, N'Public update or history verification failed.', 1;

    EXEC dbo.usp_DataBookEntry_Create @Name=N'Data Book private '+@Token, @Value=N'private smoke value', @Description=N'Private smoke test', @Category=N'Smoke', @IsPrivate=1, @CurrentUserId=@OwnerUserId, @CorrelationId=N'data-book-smoke';
    SELECT @PrivateId=Id FROM dbo.DataBookEntries WHERE Name=N'Data Book private '+@Token;
    INSERT #DataBookSmokeDetail EXEC dbo.usp_DataBookEntry_GetById @Id=@PrivateId,@CurrentUserId=@OwnerUserId;
    IF NOT EXISTS (SELECT 1 FROM #DataBookSmokeDetail) THROW 52404, N'Owner cannot read own private entry.', 1;
    TRUNCATE TABLE #DataBookSmokeDetail;
    INSERT #DataBookSmokeDetail EXEC dbo.usp_DataBookEntry_GetById @Id=@PrivateId,@CurrentUserId=@OtherUserId;
    IF EXISTS (SELECT 1 FROM #DataBookSmokeDetail) THROW 52405, N'Other user can read a private entry.', 1;

    EXEC dbo.usp_DataBookEntry_Update @Id=@PublicId,@Name=N'Data Book public '+@Token,@Value=N'now private',@Description=N'Public to private',@Category=N'Smoke',@IsPrivate=1,@ExpectedRowVersion=@ExpectedRowVersion,@CurrentUserId=@OtherUserId,@CorrelationId=N'data-book-smoke';
    SELECT @ActualOwnerUserId=OwnerUserId, @ExpectedRowVersion=CONVERT(VARBINARY(8),RowVersion) FROM dbo.DataBookEntries WHERE Id=@PublicId;
    IF @ActualOwnerUserId<>@OtherUserId OR NOT EXISTS (SELECT 1 FROM dbo.DataBookEntryHistory WHERE DataBookEntryId=@PublicId AND ActionType=N'VisibilityChanged')
        THROW 52406, N'Public-to-private ownership transition failed.', 1;

    EXEC dbo.usp_DataBookEntry_Update @Id=@PublicId,@Name=N'Data Book public '+@Token,@Value=N'public again',@Description=N'Private to public',@Category=N'Smoke',@IsPrivate=0,@ExpectedRowVersion=@ExpectedRowVersion,@CurrentUserId=@OtherUserId,@CorrelationId=N'data-book-smoke';
    SELECT @ExpectedRowVersion=CONVERT(VARBINARY(8),RowVersion) FROM dbo.DataBookEntries WHERE Id=@PublicId;
    EXEC dbo.usp_DataBookEntry_Delete @Id=@PublicId,@ExpectedRowVersion=@ExpectedRowVersion,@CurrentUserId=@OtherUserId,@CorrelationId=N'data-book-smoke';
    IF NOT EXISTS (SELECT 1 FROM dbo.DataBookEntries WHERE Id=@PublicId AND IsDeleted=1 AND DeletedBy=@OtherUserId)
       OR NOT EXISTS (SELECT 1 FROM dbo.DataBookEntryHistory WHERE DataBookEntryId=@PublicId AND ActionType=N'Deleted')
        THROW 52407, N'Soft-delete or deletion-history verification failed.', 1;

    ROLLBACK TRANSACTION;
    PRINT N'Data Book smoke tests passed; all test data was rolled back.';
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
