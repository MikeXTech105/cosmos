/*
   COSMOS ERP centralized activity logs
   Extends the existing dbo.AuditLogs system; it does not create a parallel audit table.
   This script is additive and rerunnable against the established COSMOS schema.
*/
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NULL
    THROW 52400, N'dbo.AuditLogs is required before applying the activity logs module.', 1;
GO

IF COL_LENGTH(N'dbo.AuditLogs', N'Module') IS NULL ALTER TABLE dbo.AuditLogs ADD Module NVARCHAR(64) NULL;
IF COL_LENGTH(N'dbo.AuditLogs', N'EntityType') IS NULL ALTER TABLE dbo.AuditLogs ADD EntityType NVARCHAR(128) NULL;
IF COL_LENGTH(N'dbo.AuditLogs', N'EntityDisplayValue') IS NULL ALTER TABLE dbo.AuditLogs ADD EntityDisplayValue NVARCHAR(256) NULL;
IF COL_LENGTH(N'dbo.AuditLogs', N'Description') IS NULL ALTER TABLE dbo.AuditLogs ADD Description NVARCHAR(500) NULL;
IF COL_LENGTH(N'dbo.AuditLogs', N'ChangedFieldsJson') IS NULL ALTER TABLE dbo.AuditLogs ADD ChangedFieldsJson NVARCHAR(MAX) NULL;
IF COL_LENGTH(N'dbo.AuditLogs', N'RequestPath') IS NULL ALTER TABLE dbo.AuditLogs ADD RequestPath NVARCHAR(512) NULL;
IF COL_LENGTH(N'dbo.AuditLogs', N'HttpMethod') IS NULL ALTER TABLE dbo.AuditLogs ADD HttpMethod NVARCHAR(10) NULL;
IF COL_LENGTH(N'dbo.AuditLogs', N'HttpStatusCode') IS NULL ALTER TABLE dbo.AuditLogs ADD HttpStatusCode INT NULL;
IF COL_LENGTH(N'dbo.AuditLogs', N'CorrelationId') IS NULL ALTER TABLE dbo.AuditLogs ADD CorrelationId NVARCHAR(128) NULL;
IF COL_LENGTH(N'dbo.AuditLogs', N'IpAddress') IS NULL ALTER TABLE dbo.AuditLogs ADD IpAddress NVARCHAR(64) NULL;
IF COL_LENGTH(N'dbo.AuditLogs', N'UserAgent') IS NULL ALTER TABLE dbo.AuditLogs ADD UserAgent NVARCHAR(512) NULL;
IF COL_LENGTH(N'dbo.AuditLogs', N'Source') IS NULL ALTER TABLE dbo.AuditLogs ADD Source NVARCHAR(32) NULL;
IF COL_LENGTH(N'dbo.AuditLogs', N'UsernameSnapshot') IS NULL ALTER TABLE dbo.AuditLogs ADD UsernameSnapshot NVARCHAR(100) NULL;
IF COL_LENGTH(N'dbo.AuditLogs', N'UserDisplayNameSnapshot') IS NULL ALTER TABLE dbo.AuditLogs ADD UserDisplayNameSnapshot NVARCHAR(200) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.AuditLogs') AND name = N'IX_AuditLogs_CreatedOn_Id')
    CREATE INDEX IX_AuditLogs_CreatedOn_Id ON dbo.AuditLogs(CreatedOn DESC, Id DESC)
        INCLUDE(CreatedBy, Module, ActionType, EntityType, RecordId, EntityDisplayValue, Description, HttpStatusCode, CorrelationId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.AuditLogs') AND name = N'IX_AuditLogs_CreatedBy_CreatedOn')
    CREATE INDEX IX_AuditLogs_CreatedBy_CreatedOn ON dbo.AuditLogs(CreatedBy, CreatedOn DESC, Id DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.AuditLogs') AND name = N'IX_AuditLogs_Module_CreatedOn')
    CREATE INDEX IX_AuditLogs_Module_CreatedOn ON dbo.AuditLogs(Module, CreatedOn DESC, Id DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.AuditLogs') AND name = N'IX_AuditLogs_Entity')
    CREATE INDEX IX_AuditLogs_Entity ON dbo.AuditLogs(EntityType, RecordId, CreatedOn DESC, Id DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.AuditLogs') AND name = N'IX_AuditLogs_CorrelationId')
    CREATE INDEX IX_AuditLogs_CorrelationId ON dbo.AuditLogs(CorrelationId, CreatedOn DESC, Id DESC) WHERE CorrelationId IS NOT NULL;
GO

CREATE OR ALTER VIEW dbo.vw_ActivityLogs
AS
SELECT
    a.Id,
    a.TableName,
    a.CreatedOn AS TimestampUtc,
    a.CreatedBy AS UserId,
    COALESCE(NULLIF(a.UsernameSnapshot, N''), u.Username) AS Username,
    COALESCE(NULLIF(a.UserDisplayNameSnapshot, N''), u.FullName) AS UserDisplayName,
    CASE UPPER(a.ActionType)
        WHEN N'CREATE' THEN N'Created' WHEN N'UPDATE' THEN N'Updated' WHEN N'DELETE' THEN N'Deleted'
        WHEN N'SOFTDELETE' THEN N'SoftDeleted' WHEN N'ACTIVATE' THEN N'Activated' WHEN N'DEACTIVATE' THEN N'Deactivated'
        WHEN N'APPROVE' THEN N'Approved' WHEN N'REJECT' THEN N'Rejected' WHEN N'CONFIRM' THEN N'Confirmed'
        WHEN N'CANCEL' THEN N'Cancelled' WHEN N'FINALIZE' THEN N'Finalized' WHEN N'REOPEN' THEN N'Reopened'
        WHEN N'IMPORT' THEN N'Imported' WHEN N'EXPORT' THEN N'Exported' WHEN N'TRANSFER' THEN N'Transferred'
        WHEN N'RESIGN' THEN N'Resigned' WHEN N'REJOIN' THEN N'Rejoined' WHEN N'ASSIGN' THEN N'Assigned'
        WHEN N'UNASSIGN' THEN N'Unassigned' WHEN N'LOGOUT' THEN N'Logout'
        ELSE a.ActionType
    END AS Action,
    COALESCE(NULLIF(a.Module, N''),
        CASE
            WHEN a.TableName LIKE N'HR.%' THEN N'HR'
            WHEN a.TableName LIKE N'Dispatch%' THEN N'DispatchPlanning'
            WHEN a.TableName LIKE N'Shipment%' THEN N'ShipmentOperations'
            WHEN a.TableName LIKE N'Procurement%' THEN N'ProcurementPlanning'
            WHEN a.TableName LIKE N'SupplyChain%' OR a.TableName LIKE N'Channel%' THEN N'SupplyChain'
            WHEN a.TableName LIKE N'Oee%' THEN N'OEE'
            WHEN a.TableName IN (N'Categories', N'Units') THEN N'Masters'
            WHEN a.TableName = N'Items' THEN N'Items'
            WHEN a.TableName IN (N'Parties', N'PartySettings') THEN N'Parties'
            WHEN a.TableName IN (N'SalesInvoices', N'SalesInvoicePayments') THEN N'Sales'
            WHEN a.TableName IN (N'PurchaseBills', N'PurchaseOrders', N'PurchaseReturns', N'SupplierPayments', N'Expenses', N'ExpenseCategories') THEN N'Purchase'
            WHEN a.TableName IN (N'CompanyGstRegistrations', N'GstApiLogs') THEN N'GST'
            WHEN a.TableName IN (N'Wallets', N'WalletTransactions', N'WalletTransfers') THEN N'Rojmel'
            WHEN a.TableName = N'DataBookEntries' THEN N'DataBook'
            WHEN a.TableName IN (N'Users', N'Roles', N'UserRoles', N'RolePermissions', N'Pages', N'Authentication') THEN N'Security'
            ELSE N'General'
        END) AS Module,
    COALESCE(NULLIF(a.EntityType, N''), a.TableName) AS EntityType,
    a.RecordId AS EntityId,
    a.EntityDisplayValue,
    COALESCE(NULLIF(a.Description, N''), CONCAT(a.ActionType, N' ', COALESCE(NULLIF(a.EntityType, N''), a.TableName), N' ', a.RecordId)) AS Description,
    a.OldValues,
    a.NewValues,
    a.ChangedFieldsJson,
    a.HttpMethod,
    a.RequestPath,
    a.HttpStatusCode,
    a.CorrelationId,
    a.IpAddress,
    a.UserAgent,
    COALESCE(NULLIF(a.Source, N''), N'Legacy') AS Source
FROM dbo.AuditLogs a
LEFT JOIN dbo.Users u ON u.Id = a.CreatedBy;
GO

CREATE OR ALTER PROCEDURE dbo.sp_AuditLog_Create
    @TableName NVARCHAR(128),
    @RecordId NVARCHAR(100),
    @ActionType NVARCHAR(50),
    @OldValues NVARCHAR(MAX) = NULL,
    @NewValues NVARCHAR(MAX) = NULL,
    @CreatedBy INT = NULL,
    @Module NVARCHAR(64) = NULL,
    @EntityType NVARCHAR(128) = NULL,
    @EntityDisplayValue NVARCHAR(256) = NULL,
    @Description NVARCHAR(500) = NULL,
    @ChangedFieldsJson NVARCHAR(MAX) = NULL,
    @RequestPath NVARCHAR(512) = NULL,
    @HttpMethod NVARCHAR(10) = NULL,
    @HttpStatusCode INT = NULL,
    @CorrelationId NVARCHAR(128) = NULL,
    @IpAddress NVARCHAR(64) = NULL,
    @UserAgent NVARCHAR(512) = NULL,
    @Source NVARCHAR(32) = NULL,
    @ActorUsername NVARCHAR(100) = NULL,
    @ActorDisplayName NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @ChangedFieldsJson IS NOT NULL AND ISJSON(@ChangedFieldsJson) <> 1 SET @ChangedFieldsJson = NULL;
        INSERT INTO dbo.AuditLogs
        (
            TableName, RecordId, ActionType, OldValues, NewValues, CreatedBy, Module, EntityType, EntityDisplayValue, Description,
            ChangedFieldsJson, RequestPath, HttpMethod, HttpStatusCode, CorrelationId, IpAddress, UserAgent, Source,
            UsernameSnapshot, UserDisplayNameSnapshot
        )
        VALUES
        (
            @TableName, @RecordId, @ActionType, @OldValues, @NewValues, @CreatedBy, @Module, @EntityType, @EntityDisplayValue, @Description,
            @ChangedFieldsJson, @RequestPath, @HttpMethod, @HttpStatusCode, @CorrelationId, @IpAddress, @UserAgent, @Source,
            @ActorUsername, @ActorDisplayName
        );
        SELECT 201 AS StatusCode, N'Audit log created.' AS [Message];
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ActivityLog_GetList
    @Search NVARCHAR(200) = NULL,
    @UserId INT = NULL,
    @Username NVARCHAR(100) = NULL,
    @Module NVARCHAR(64) = NULL,
    @Action NVARCHAR(64) = NULL,
    @EntityType NVARCHAR(128) = NULL,
    @EntityId NVARCHAR(100) = NULL,
    @FromDate DATETIME2(3) = NULL,
    @ToDate DATETIME2(3) = NULL,
    @HttpMethod NVARCHAR(10) = NULL,
    @StatusCode INT = NULL,
    @CorrelationId NVARCHAR(128) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 50,
    @SortBy NVARCHAR(30) = N'TimestampUtc',
    @SortDirection NVARCHAR(4) = N'desc'
AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber = CASE WHEN @PageNumber < 1 THEN 1 ELSE @PageNumber END;
    SET @PageSize = CASE WHEN @PageSize < 1 THEN 50 WHEN @PageSize > 200 THEN 200 ELSE @PageSize END;
    SET @SortBy = CASE WHEN @SortBy IN (N'TimestampUtc', N'Username', N'Module', N'Action', N'EntityType', N'EntityId', N'HttpStatusCode') THEN @SortBy ELSE N'TimestampUtc' END;
    SET @SortDirection = CASE WHEN LOWER(@SortDirection) = N'asc' THEN N'asc' ELSE N'desc' END;

    SELECT v.Id, v.TimestampUtc, v.UserId, v.Username, v.UserDisplayName, v.Action, v.Module, v.EntityType, v.EntityId,
           v.EntityDisplayValue, v.Description, v.HttpMethod, v.RequestPath, v.HttpStatusCode, v.CorrelationId,
           COUNT(*) OVER() AS TotalCount
    FROM dbo.vw_ActivityLogs v
    WHERE v.TableName <> N'HttpRequests'
      AND (@Search IS NULL OR v.Username LIKE N'%' + @Search + N'%' OR v.UserDisplayName LIKE N'%' + @Search + N'%' OR v.Module LIKE N'%' + @Search + N'%' OR v.Action LIKE N'%' + @Search + N'%' OR v.EntityType LIKE N'%' + @Search + N'%' OR v.EntityId LIKE N'%' + @Search + N'%' OR v.EntityDisplayValue LIKE N'%' + @Search + N'%' OR v.Description LIKE N'%' + @Search + N'%')
      AND (@UserId IS NULL OR v.UserId = @UserId)
      AND (@Username IS NULL OR v.Username LIKE N'%' + @Username + N'%')
      AND (@Module IS NULL OR v.Module = @Module)
      AND (@Action IS NULL OR v.Action = @Action)
      AND (@EntityType IS NULL OR v.EntityType = @EntityType)
      AND (@EntityId IS NULL OR v.EntityId = @EntityId)
      AND (@FromDate IS NULL OR v.TimestampUtc >= @FromDate)
      AND (@ToDate IS NULL OR v.TimestampUtc <= @ToDate)
      AND (@HttpMethod IS NULL OR v.HttpMethod = @HttpMethod)
      AND (@StatusCode IS NULL OR v.HttpStatusCode = @StatusCode)
      AND (@CorrelationId IS NULL OR v.CorrelationId = @CorrelationId)
    ORDER BY
      CASE WHEN @SortBy = N'TimestampUtc' AND @SortDirection = N'asc' THEN v.TimestampUtc END ASC,
      CASE WHEN @SortBy = N'TimestampUtc' AND @SortDirection = N'desc' THEN v.TimestampUtc END DESC,
      CASE WHEN @SortBy = N'Username' AND @SortDirection = N'asc' THEN v.Username END ASC,
      CASE WHEN @SortBy = N'Username' AND @SortDirection = N'desc' THEN v.Username END DESC,
      CASE WHEN @SortBy = N'Module' AND @SortDirection = N'asc' THEN v.Module END ASC,
      CASE WHEN @SortBy = N'Module' AND @SortDirection = N'desc' THEN v.Module END DESC,
      CASE WHEN @SortBy = N'Action' AND @SortDirection = N'asc' THEN v.Action END ASC,
      CASE WHEN @SortBy = N'Action' AND @SortDirection = N'desc' THEN v.Action END DESC,
      CASE WHEN @SortBy = N'EntityType' AND @SortDirection = N'asc' THEN v.EntityType END ASC,
      CASE WHEN @SortBy = N'EntityType' AND @SortDirection = N'desc' THEN v.EntityType END DESC,
      CASE WHEN @SortBy = N'EntityId' AND @SortDirection = N'asc' THEN v.EntityId END ASC,
      CASE WHEN @SortBy = N'EntityId' AND @SortDirection = N'desc' THEN v.EntityId END DESC,
      CASE WHEN @SortBy = N'HttpStatusCode' AND @SortDirection = N'asc' THEN v.HttpStatusCode END ASC,
      CASE WHEN @SortBy = N'HttpStatusCode' AND @SortDirection = N'desc' THEN v.HttpStatusCode END DESC,
      v.Id DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ActivityLog_GetById @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT v.Id, v.TimestampUtc, v.UserId, v.Username, v.UserDisplayName, v.Action, v.Module, v.EntityType, v.EntityId,
           v.EntityDisplayValue, v.Description, v.OldValues, v.NewValues, v.ChangedFieldsJson, v.HttpMethod, v.RequestPath,
           v.HttpStatusCode, v.CorrelationId, v.IpAddress, v.UserAgent, v.Source
    FROM dbo.vw_ActivityLogs v
    WHERE v.Id = @Id AND v.TableName <> N'HttpRequests';
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ActivityLog_Export
    @Search NVARCHAR(200) = NULL,
    @UserId INT = NULL,
    @Username NVARCHAR(100) = NULL,
    @Module NVARCHAR(64) = NULL,
    @Action NVARCHAR(64) = NULL,
    @EntityType NVARCHAR(128) = NULL,
    @EntityId NVARCHAR(100) = NULL,
    @FromDate DATETIME2(3) = NULL,
    @ToDate DATETIME2(3) = NULL,
    @HttpMethod NVARCHAR(10) = NULL,
    @StatusCode INT = NULL,
    @CorrelationId NVARCHAR(128) = NULL,
    @SortBy NVARCHAR(30) = N'TimestampUtc',
    @SortDirection NVARCHAR(4) = N'desc',
    @MaxRows INT = 50000
AS
BEGIN
    SET NOCOUNT ON;
    SET @MaxRows = CASE WHEN @MaxRows < 1 THEN 1 WHEN @MaxRows > 50000 THEN 50000 ELSE @MaxRows END;
    SET @SortBy = CASE WHEN @SortBy IN (N'TimestampUtc', N'Username', N'Module', N'Action', N'EntityType', N'EntityId', N'HttpStatusCode') THEN @SortBy ELSE N'TimestampUtc' END;
    SET @SortDirection = CASE WHEN LOWER(@SortDirection) = N'asc' THEN N'asc' ELSE N'desc' END;

    SELECT TOP (@MaxRows) v.TimestampUtc, v.UserDisplayName, v.Username, v.Module, v.Action, v.EntityType, v.EntityId,
           v.EntityDisplayValue, v.Description, v.HttpMethod, v.RequestPath, v.HttpStatusCode, v.IpAddress, v.CorrelationId
    FROM dbo.vw_ActivityLogs v
    WHERE v.TableName <> N'HttpRequests'
      AND (@Search IS NULL OR v.Username LIKE N'%' + @Search + N'%' OR v.UserDisplayName LIKE N'%' + @Search + N'%' OR v.Module LIKE N'%' + @Search + N'%' OR v.Action LIKE N'%' + @Search + N'%' OR v.EntityType LIKE N'%' + @Search + N'%' OR v.EntityId LIKE N'%' + @Search + N'%' OR v.EntityDisplayValue LIKE N'%' + @Search + N'%' OR v.Description LIKE N'%' + @Search + N'%')
      AND (@UserId IS NULL OR v.UserId = @UserId)
      AND (@Username IS NULL OR v.Username LIKE N'%' + @Username + N'%')
      AND (@Module IS NULL OR v.Module = @Module)
      AND (@Action IS NULL OR v.Action = @Action)
      AND (@EntityType IS NULL OR v.EntityType = @EntityType)
      AND (@EntityId IS NULL OR v.EntityId = @EntityId)
      AND (@FromDate IS NULL OR v.TimestampUtc >= @FromDate)
      AND (@ToDate IS NULL OR v.TimestampUtc <= @ToDate)
      AND (@HttpMethod IS NULL OR v.HttpMethod = @HttpMethod)
      AND (@StatusCode IS NULL OR v.HttpStatusCode = @StatusCode)
      AND (@CorrelationId IS NULL OR v.CorrelationId = @CorrelationId)
    ORDER BY
      CASE WHEN @SortBy = N'TimestampUtc' AND @SortDirection = N'asc' THEN v.TimestampUtc END ASC,
      CASE WHEN @SortBy = N'TimestampUtc' AND @SortDirection = N'desc' THEN v.TimestampUtc END DESC,
      CASE WHEN @SortBy = N'Username' AND @SortDirection = N'asc' THEN v.Username END ASC,
      CASE WHEN @SortBy = N'Username' AND @SortDirection = N'desc' THEN v.Username END DESC,
      CASE WHEN @SortBy = N'Module' AND @SortDirection = N'asc' THEN v.Module END ASC,
      CASE WHEN @SortBy = N'Module' AND @SortDirection = N'desc' THEN v.Module END DESC,
      CASE WHEN @SortBy = N'Action' AND @SortDirection = N'asc' THEN v.Action END ASC,
      CASE WHEN @SortBy = N'Action' AND @SortDirection = N'desc' THEN v.Action END DESC,
      CASE WHEN @SortBy = N'EntityType' AND @SortDirection = N'asc' THEN v.EntityType END ASC,
      CASE WHEN @SortBy = N'EntityType' AND @SortDirection = N'desc' THEN v.EntityType END DESC,
      CASE WHEN @SortBy = N'EntityId' AND @SortDirection = N'asc' THEN v.EntityId END ASC,
      CASE WHEN @SortBy = N'EntityId' AND @SortDirection = N'desc' THEN v.EntityId END DESC,
      CASE WHEN @SortBy = N'HttpStatusCode' AND @SortDirection = N'asc' THEN v.HttpStatusCode END ASC,
      CASE WHEN @SortBy = N'HttpStatusCode' AND @SortDirection = N'desc' THEN v.HttpStatusCode END DESC,
      v.Id DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Dashboard_GetRecentActivity @Limit INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    SET @Limit = CASE WHEN @Limit < 1 THEN 1 WHEN @Limit > 50 THEN 50 ELSE @Limit END;
    SELECT TOP (@Limit) v.Id AS ActivityId, v.TimestampUtc, COALESCE(v.UserDisplayName, v.Username) AS UserName,
           v.Module, v.Action, v.Description
    FROM dbo.vw_ActivityLogs v
    WHERE v.TableName <> N'HttpRequests' AND v.Source <> N'TechnicalRequest'
    ORDER BY v.TimestampUtc DESC, v.Id DESC;
END;
GO

MERGE dbo.Pages AS target
USING (VALUES (N'ActivityLogs', N'Activity Logs', N'/activity-logs', N'clipboard-list', 140)) AS source(Name, DisplayName, Route, Icon, SortOrder)
ON target.Name = source.Name
WHEN MATCHED THEN UPDATE SET DisplayName = source.DisplayName, Route = source.Route, Icon = source.Icon, SortOrder = source.SortOrder, IsActive = 1
WHEN NOT MATCHED THEN INSERT(Name, DisplayName, Route, Icon, SortOrder, IsActive) VALUES(source.Name, source.DisplayName, source.Route, source.Icon, source.SortOrder, 1);
GO

DECLARE @ActivityLogsSuperAdminRoleId INT = (SELECT Id FROM dbo.Roles WHERE Name = N'SuperAdmin');
IF @ActivityLogsSuperAdminRoleId IS NOT NULL
BEGIN
    MERGE dbo.RolePermissions AS target
    USING (SELECT @ActivityLogsSuperAdminRoleId AS RoleId, Id AS PageId FROM dbo.Pages WHERE Name = N'ActivityLogs') AS source
    ON target.RoleId = source.RoleId AND target.PageId = source.PageId
    WHEN MATCHED THEN UPDATE SET CanView = 1, CanCreate = 0, CanEdit = 0, CanDelete = 0, CanExport = 1, CanApprove = 0
    WHEN NOT MATCHED THEN INSERT(RoleId, PageId, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove)
         VALUES(source.RoleId, source.PageId, 1, 0, 0, 0, 1, 0);
END;
GO
