/* Read-only deployment verification for 20260810_activity_logs_module.sql. */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NULL THROW 52410, N'dbo.AuditLogs is missing.', 1;
IF OBJECT_ID(N'dbo.vw_ActivityLogs', N'V') IS NULL THROW 52411, N'dbo.vw_ActivityLogs is missing.', 1;

DECLARE @RequiredColumns TABLE (Name SYSNAME NOT NULL, MaxLength SMALLINT NOT NULL);
INSERT @RequiredColumns(Name, MaxLength) VALUES
    (N'Module', 128), (N'EntityType', 256), (N'EntityDisplayValue', 512), (N'Description', 1000),
    (N'ChangedFieldsJson', -1), (N'RequestPath', 1024), (N'HttpMethod', 20), (N'HttpStatusCode', 4),
    (N'CorrelationId', 256), (N'IpAddress', 128), (N'UserAgent', 1024), (N'Source', 64),
    (N'UsernameSnapshot', 200), (N'UserDisplayNameSnapshot', 400);

IF EXISTS
(
    SELECT 1 FROM @RequiredColumns required
    LEFT JOIN sys.columns actual ON actual.object_id = OBJECT_ID(N'dbo.AuditLogs') AND actual.name = required.Name
    WHERE actual.column_id IS NULL OR actual.max_length <> required.MaxLength
)
    THROW 52412, N'dbo.AuditLogs activity column contract is incomplete or has an unexpected type.', 1;

IF EXISTS
(
    SELECT 1 FROM (VALUES
        (N'IX_AuditLogs_CreatedOn_Id'), (N'IX_AuditLogs_CreatedBy_CreatedOn'), (N'IX_AuditLogs_Module_CreatedOn'),
        (N'IX_AuditLogs_Entity'), (N'IX_AuditLogs_CorrelationId')) required(Name)
    WHERE NOT EXISTS (SELECT 1 FROM sys.indexes actual WHERE actual.object_id = OBJECT_ID(N'dbo.AuditLogs') AND actual.name = required.Name)
)
    THROW 52413, N'dbo.AuditLogs activity indexes are incomplete.', 1;

IF EXISTS
(
    SELECT 1 FROM (VALUES
        (N'sp_AuditLog_Create'), (N'usp_ActivityLog_GetList'), (N'usp_ActivityLog_GetById'),
        (N'usp_ActivityLog_Export'), (N'usp_Dashboard_GetRecentActivity')) required(Name)
    WHERE OBJECT_ID(N'dbo.' + required.Name, N'P') IS NULL
)
    THROW 52414, N'Activity log stored procedure contract is incomplete.', 1;

IF (SELECT COUNT(*) FROM dbo.Pages WHERE Name = N'ActivityLogs') <> 1
    THROW 52415, N'ActivityLogs page must exist exactly once.', 1;

DECLARE @SuperAdminRoleId INT = (SELECT Id FROM dbo.Roles WHERE Name = N'SuperAdmin');
DECLARE @ActivityLogsPageId INT = (SELECT Id FROM dbo.Pages WHERE Name = N'ActivityLogs');
IF @SuperAdminRoleId IS NULL OR NOT EXISTS
(
    SELECT 1 FROM dbo.RolePermissions
    WHERE RoleId = @SuperAdminRoleId AND PageId = @ActivityLogsPageId
      AND CanView = 1 AND CanExport = 1 AND CanCreate = 0 AND CanEdit = 0 AND CanDelete = 0 AND CanApprove = 0
)
    THROW 52416, N'SuperAdmin ActivityLogs read/export permission is missing or over-granted.', 1;

SELECT
    (SELECT COUNT(*) FROM dbo.AuditLogs) AS AuditLogCount,
    (SELECT COUNT(*) FROM dbo.AuditLogs WHERE TableName = N'HttpRequests') AS LegacyTechnicalRequestRowsExcludedFromActivityApi,
    (SELECT COUNT(*) FROM dbo.AuditLogs WHERE CreatedBy IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.Id = dbo.AuditLogs.CreatedBy)) AS HistoricalMissingActorReferences,
    (SELECT COUNT(*) FROM dbo.AuditLogs WHERE Module IS NULL OR ActionType IS NULL OR EntityType IS NULL) AS LegacyRowsUsingViewFallbacks;
GO
