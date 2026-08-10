/*
   Transactional smoke test for the activity-log module.
   Run only in a disposable/non-production database after the migration. It always rolls back.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @ActorId INT = (SELECT TOP (1) Id FROM dbo.Users WHERE IsActive = 1 AND IsDeleted = 0 ORDER BY Id);
    IF @ActorId IS NULL THROW 52420, N'An active user is required for the activity-log smoke test.', 1;

    DECLARE @CorrelationId NVARCHAR(128) = N'activity-smoke-' + CONVERT(NVARCHAR(36), NEWID());
    DECLARE @Status TABLE (StatusCode INT, [Message] NVARCHAR(4000));
    INSERT @Status
    EXEC dbo.sp_AuditLog_Create
        @TableName = N'ActivityLogSmoke', @RecordId = N'activity-smoke-record', @ActionType = N'Updated',
        @OldValues = N'{"Name":"Before"}',
        @NewValues = N'{"Name":"After"}', @CreatedBy = @ActorId,
        @Module = N'General', @EntityType = N'ActivityLogSmoke', @EntityDisplayValue = N'activity-smoke-record',
        @Description = N'Updated smoke-test record', @ChangedFieldsJson = N'["Name"]',
        @RequestPath = N'/api/v1/activity-logs/smoke', @HttpMethod = N'PUT', @HttpStatusCode = 200,
        @CorrelationId = @CorrelationId, @IpAddress = N'127.0.0.1', @UserAgent = N'COSMOS activity smoke test', @Source = N'SmokeTest',
        @ActorUsername = N'smoke-user', @ActorDisplayName = N'Smoke User';

    IF NOT EXISTS (SELECT 1 FROM @Status WHERE StatusCode = 201) THROW 52421, N'sp_AuditLog_Create did not report success.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.vw_ActivityLogs WHERE CorrelationId = @CorrelationId AND Module = N'General' AND Action = N'Updated' AND ChangedFieldsJson = N'["Name"]')
        THROW 52422, N'Activity-log view did not expose the inserted business activity.', 1;
    EXEC dbo.usp_ActivityLog_GetList @CorrelationId = @CorrelationId, @PageNumber = 1, @PageSize = 20, @SortBy = N'TimestampUtc', @SortDirection = N'desc';
    EXEC dbo.usp_ActivityLog_GetById @Id = (SELECT TOP (1) Id FROM dbo.vw_ActivityLogs WHERE CorrelationId = @CorrelationId ORDER BY Id DESC);
    EXEC dbo.usp_ActivityLog_Export @CorrelationId = @CorrelationId, @MaxRows = 10;
    EXEC dbo.usp_Dashboard_GetRecentActivity @Limit = 10;

    ROLLBACK TRANSACTION;
    PRINT N'Activity-log smoke test passed and was rolled back.';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
