/*
Dispatch mapping-identity audit — READ ONLY

Contains only SET, DECLARE, IF/THROW, CTE, and SELECT statements.
No DML, DDL, procedure execution, temporary objects, or transaction control.
Set the approved UTC range before execution. Do not run on production for this task.

This is plain Transact-SQL: it contains no SQLCMD commands and can be run in
SSMS standard query mode or SQLCMD mode. For command-line failure exit codes,
invoke it with sqlcmd -b as described in the execution guide.
*/
SET NOCOUNT ON;
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

DECLARE @AuditStartUtc DATETIME2(3) = '2026-09-01T00:00:00';
DECLARE @AuditEndUtc   DATETIME2(3) = '2026-10-01T00:00:00';
DECLARE @ChannelId     BIGINT = NULL;
DECLARE @AuditScope    NVARCHAR(32) = N'SNAPSHOT_CREATED_UTC';
DECLARE @AuditStartDate DATE = NULL;
DECLARE @AuditEndDate   DATE = NULL;


IF @AuditScope IS NULL OR @AuditScope NOT IN (N'SNAPSHOT_CREATED_UTC', N'BATCH_UPLOADED_UTC', N'BUSINESS_EFFECTIVE_DATE')
BEGIN
    ;THROW 51000, 'Set @AuditScope to SNAPSHOT_CREATED_UTC, BATCH_UPLOADED_UTC, or BUSINESS_EFFECTIVE_DATE.', 1;
END;
IF @AuditScope IN (N'SNAPSHOT_CREATED_UTC', N'BATCH_UPLOADED_UTC')
   AND (@AuditStartUtc IS NULL OR @AuditEndUtc IS NULL OR @AuditEndUtc <= @AuditStartUtc)
BEGIN
    ;THROW 51001, 'Timestamp scopes require a valid inclusive @AuditStartUtc and exclusive @AuditEndUtc.', 1;
END;
IF @AuditScope = N'BUSINESS_EFFECTIVE_DATE'
   AND (@AuditStartDate IS NULL OR @AuditEndDate IS NULL OR @AuditEndDate <= @AuditStartDate)
BEGIN
    ;THROW 51002, 'BUSINESS_EFFECTIVE_DATE requires a valid inclusive @AuditStartDate and exclusive @AuditEndDate.', 1;
END;

/* ============================================================================
   BATCH 1: Schema preflight. Run first. RequiredMissingCount must be zero.
   Verified against repository migrations only; it does not prove live parity.
   ============================================================================ */
;WITH RequiredObjects AS
(
    SELECT N'dbo.DispatchWarehouseSalesSnapshots' AS ObjectName, N'Id' AS ColumnName UNION ALL
    SELECT N'dbo.DispatchWarehouseSalesSnapshots', N'ImportBatchId' UNION ALL
    SELECT N'dbo.DispatchWarehouseSalesSnapshots', N'ChannelId' UNION ALL
    SELECT N'dbo.DispatchWarehouseSalesSnapshots', N'WarehouseId' UNION ALL
    SELECT N'dbo.DispatchWarehouseSalesSnapshots', N'ItemId' UNION ALL
    SELECT N'dbo.DispatchWarehouseSalesSnapshots', N'ChannelItemMappingId' UNION ALL
    SELECT N'dbo.DispatchWarehouseSalesSnapshots', N'PeriodFrom' UNION ALL
    SELECT N'dbo.DispatchWarehouseSalesSnapshots', N'PeriodTo' UNION ALL
    SELECT N'dbo.DispatchWarehouseSalesSnapshots', N'SalesQuantity' UNION ALL
    SELECT N'dbo.DispatchWarehouseSalesSnapshots', N'SourceReference' UNION ALL
    SELECT N'dbo.DispatchWarehouseSalesSnapshots', N'CreatedAtUtc' UNION ALL
    SELECT N'dbo.DispatchWarehouseStockSnapshots', N'Id' UNION ALL
    SELECT N'dbo.DispatchWarehouseStockSnapshots', N'ImportBatchId' UNION ALL
    SELECT N'dbo.DispatchWarehouseStockSnapshots', N'ChannelId' UNION ALL
    SELECT N'dbo.DispatchWarehouseStockSnapshots', N'WarehouseId' UNION ALL
    SELECT N'dbo.DispatchWarehouseStockSnapshots', N'ItemId' UNION ALL
    SELECT N'dbo.DispatchWarehouseStockSnapshots', N'ChannelItemMappingId' UNION ALL
    SELECT N'dbo.DispatchWarehouseStockSnapshots', N'SnapshotDate' UNION ALL
    SELECT N'dbo.DispatchWarehouseStockSnapshots', N'SellableQuantity' UNION ALL
    SELECT N'dbo.DispatchWarehouseStockSnapshots', N'SourceReference' UNION ALL
    SELECT N'dbo.DispatchWarehouseStockSnapshots', N'CreatedAtUtc' UNION ALL
    SELECT N'dbo.DispatchWarehouseInboundSnapshots', N'Id' UNION ALL
    SELECT N'dbo.DispatchWarehouseInboundSnapshots', N'ImportBatchId' UNION ALL
    SELECT N'dbo.DispatchWarehouseInboundSnapshots', N'ChannelId' UNION ALL
    SELECT N'dbo.DispatchWarehouseInboundSnapshots', N'WarehouseId' UNION ALL
    SELECT N'dbo.DispatchWarehouseInboundSnapshots', N'ItemId' UNION ALL
    SELECT N'dbo.DispatchWarehouseInboundSnapshots', N'ChannelItemMappingId' UNION ALL
    SELECT N'dbo.DispatchWarehouseInboundSnapshots', N'SnapshotDate' UNION ALL
    SELECT N'dbo.DispatchWarehouseInboundSnapshots', N'InboundQuantity' UNION ALL
    SELECT N'dbo.DispatchWarehouseInboundSnapshots', N'ExpectedArrivalDate' UNION ALL
    SELECT N'dbo.DispatchWarehouseInboundSnapshots', N'ReferenceNumber' UNION ALL
    SELECT N'dbo.DispatchWarehouseInboundSnapshots', N'InboundStatus' UNION ALL
    SELECT N'dbo.DispatchWarehouseInboundSnapshots', N'SourceReference' UNION ALL
    SELECT N'dbo.DispatchWarehouseInboundSnapshots', N'CreatedAtUtc' UNION ALL
    SELECT N'dbo.SupplyChainImportBatches', N'Id' UNION ALL
    SELECT N'dbo.SupplyChainImportBatches', N'ModuleType' UNION ALL
    SELECT N'dbo.SupplyChainImportBatches', N'ImportType' UNION ALL
    SELECT N'dbo.SupplyChainImportBatches', N'ChannelId' UNION ALL
    SELECT N'dbo.SupplyChainImportBatches', N'Status' UNION ALL
    SELECT N'dbo.SupplyChainImportBatches', N'UploadedAtUtc' UNION ALL
    SELECT N'dbo.SupplyChainImportBatches', N'CommittedAtUtc' UNION ALL
    SELECT N'dbo.SupplyChainImportBatches', N'TotalRows' UNION ALL
    SELECT N'dbo.SupplyChainImportBatches', N'ValidRows' UNION ALL
    SELECT N'dbo.SupplyChainImportBatches', N'InvalidRows' UNION ALL
    SELECT N'dbo.SupplyChainImportBatches', N'DuplicateRows' UNION ALL
    SELECT N'dbo.SupplyChainImportBatches', N'CommittedRows' UNION ALL
    SELECT N'dbo.ChannelSkuMappings', N'Id' UNION ALL
    SELECT N'dbo.ChannelSkuMappings', N'SalesChannelId' UNION ALL
    SELECT N'dbo.ChannelSkuMappings', N'ItemId' UNION ALL
    SELECT N'dbo.ChannelSkuMappings', N'ChannelSku' UNION ALL
    SELECT N'dbo.ChannelSkuMappings', N'IsActive' UNION ALL
    SELECT N'dbo.ChannelSkuMappings', N'IsDeleted' UNION ALL
    SELECT N'dbo.ChannelWarehouses', N'Id' UNION ALL
    SELECT N'dbo.ChannelWarehouses', N'ChannelId' UNION ALL
    SELECT N'dbo.ChannelWarehouses', N'WarehouseCode' UNION ALL
    SELECT N'dbo.ChannelWarehouses', N'IsActive' UNION ALL
    SELECT N'dbo.ChannelWarehouses', N'IsDeleted'
)
SELECT r.ObjectName, r.ColumnName
FROM RequiredObjects AS r
CROSS APPLY (SELECT PARSENAME(r.ObjectName, 2) AS SchemaName, PARSENAME(r.ObjectName, 1) AS TableName) AS p
LEFT JOIN sys.schemas AS sc ON sc.name = p.SchemaName
LEFT JOIN sys.tables AS t ON t.schema_id = sc.schema_id AND t.name = p.TableName
LEFT JOIN sys.columns AS c ON c.object_id = t.object_id AND c.name = r.ColumnName
WHERE c.column_id IS NULL
ORDER BY r.ObjectName, r.ColumnName;

/* A schema failure throws in this same submitted batch; do not run later selections manually. */
IF OBJECT_ID(N'dbo.DispatchWarehouseSalesSnapshots', N'U') IS NULL
 OR OBJECT_ID(N'dbo.DispatchWarehouseStockSnapshots', N'U') IS NULL
 OR OBJECT_ID(N'dbo.DispatchWarehouseInboundSnapshots', N'U') IS NULL
 OR OBJECT_ID(N'dbo.SupplyChainImportBatches', N'U') IS NULL
 OR OBJECT_ID(N'dbo.ChannelSkuMappings', N'U') IS NULL
 OR OBJECT_ID(N'dbo.ChannelWarehouses', N'U') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseSalesSnapshots', N'Id') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseSalesSnapshots', N'ImportBatchId') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseSalesSnapshots', N'ChannelId') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseSalesSnapshots', N'WarehouseId') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseSalesSnapshots', N'ItemId') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseSalesSnapshots', N'ChannelItemMappingId') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseSalesSnapshots', N'PeriodFrom') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseSalesSnapshots', N'PeriodTo') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseSalesSnapshots', N'SalesQuantity') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseSalesSnapshots', N'SourceReference') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseSalesSnapshots', N'CreatedAtUtc') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseStockSnapshots', N'Id') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseStockSnapshots', N'ImportBatchId') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseStockSnapshots', N'ChannelId') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseStockSnapshots', N'WarehouseId') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseStockSnapshots', N'ItemId') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseStockSnapshots', N'ChannelItemMappingId') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseStockSnapshots', N'SnapshotDate') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseStockSnapshots', N'SellableQuantity') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseStockSnapshots', N'SourceReference') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseStockSnapshots', N'CreatedAtUtc') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseInboundSnapshots', N'Id') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseInboundSnapshots', N'ImportBatchId') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseInboundSnapshots', N'ChannelId') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseInboundSnapshots', N'WarehouseId') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseInboundSnapshots', N'ItemId') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseInboundSnapshots', N'ChannelItemMappingId') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseInboundSnapshots', N'SnapshotDate') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseInboundSnapshots', N'InboundQuantity') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseInboundSnapshots', N'ExpectedArrivalDate') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseInboundSnapshots', N'ReferenceNumber') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseInboundSnapshots', N'InboundStatus') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseInboundSnapshots', N'SourceReference') IS NULL
 OR COL_LENGTH(N'dbo.DispatchWarehouseInboundSnapshots', N'CreatedAtUtc') IS NULL
 OR COL_LENGTH(N'dbo.SupplyChainImportBatches', N'Id') IS NULL
 OR COL_LENGTH(N'dbo.SupplyChainImportBatches', N'ModuleType') IS NULL
 OR COL_LENGTH(N'dbo.SupplyChainImportBatches', N'ImportType') IS NULL
 OR COL_LENGTH(N'dbo.SupplyChainImportBatches', N'ChannelId') IS NULL
 OR COL_LENGTH(N'dbo.SupplyChainImportBatches', N'Status') IS NULL
 OR COL_LENGTH(N'dbo.SupplyChainImportBatches', N'UploadedAtUtc') IS NULL
 OR COL_LENGTH(N'dbo.SupplyChainImportBatches', N'CommittedAtUtc') IS NULL
 OR COL_LENGTH(N'dbo.SupplyChainImportBatches', N'TotalRows') IS NULL
 OR COL_LENGTH(N'dbo.SupplyChainImportBatches', N'ValidRows') IS NULL
 OR COL_LENGTH(N'dbo.SupplyChainImportBatches', N'InvalidRows') IS NULL
 OR COL_LENGTH(N'dbo.SupplyChainImportBatches', N'DuplicateRows') IS NULL
 OR COL_LENGTH(N'dbo.SupplyChainImportBatches', N'CommittedRows') IS NULL
 OR COL_LENGTH(N'dbo.ChannelSkuMappings', N'Id') IS NULL
 OR COL_LENGTH(N'dbo.ChannelSkuMappings', N'SalesChannelId') IS NULL
 OR COL_LENGTH(N'dbo.ChannelSkuMappings', N'ItemId') IS NULL
 OR COL_LENGTH(N'dbo.ChannelSkuMappings', N'ChannelSku') IS NULL
 OR COL_LENGTH(N'dbo.ChannelSkuMappings', N'IsActive') IS NULL
 OR COL_LENGTH(N'dbo.ChannelSkuMappings', N'IsDeleted') IS NULL
 OR COL_LENGTH(N'dbo.ChannelWarehouses', N'Id') IS NULL
 OR COL_LENGTH(N'dbo.ChannelWarehouses', N'ChannelId') IS NULL
 OR COL_LENGTH(N'dbo.ChannelWarehouses', N'WarehouseCode') IS NULL
 OR COL_LENGTH(N'dbo.ChannelWarehouses', N'IsActive') IS NULL
 OR COL_LENGTH(N'dbo.ChannelWarehouses', N'IsDeleted') IS NULL
BEGIN
    ;THROW 51003, 'Required Dispatch audit schema is incomplete. Stop and resolve the preflight result before running audit batches.', 1;
END;

/* ============================================================================
   BATCH 1A: Scope diagnostics. Always returns one row after schema preflight.
   A zero count means no source records matched this scope; it does not validate
   mappings, warehouses, batches, or exception-free data.
   ============================================================================ */
;WITH InScopeRows AS
(
    SELECT N'Sales' AS SourceType, s.ImportBatchId
    FROM dbo.DispatchWarehouseSalesSnapshots AS s
    LEFT JOIN dbo.SupplyChainImportBatches AS b ON b.Id=s.ImportBatchId
    WHERE ((@AuditScope=N'SNAPSHOT_CREATED_UTC' AND s.CreatedAtUtc>=@AuditStartUtc AND s.CreatedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BATCH_UPLOADED_UTC' AND b.UploadedAtUtc>=@AuditStartUtc AND b.UploadedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BUSINESS_EFFECTIVE_DATE' AND s.PeriodFrom<@AuditEndDate AND s.PeriodTo>=@AuditStartDate))
      AND (@ChannelId IS NULL OR s.ChannelId=@ChannelId)
    UNION ALL
    SELECT N'Stock', s.ImportBatchId
    FROM dbo.DispatchWarehouseStockSnapshots AS s
    LEFT JOIN dbo.SupplyChainImportBatches AS b ON b.Id=s.ImportBatchId
    WHERE ((@AuditScope=N'SNAPSHOT_CREATED_UTC' AND s.CreatedAtUtc>=@AuditStartUtc AND s.CreatedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BATCH_UPLOADED_UTC' AND b.UploadedAtUtc>=@AuditStartUtc AND b.UploadedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BUSINESS_EFFECTIVE_DATE' AND s.SnapshotDate>=@AuditStartDate AND s.SnapshotDate<@AuditEndDate))
      AND (@ChannelId IS NULL OR s.ChannelId=@ChannelId)
    UNION ALL
    SELECT N'Inbound', s.ImportBatchId
    FROM dbo.DispatchWarehouseInboundSnapshots AS s
    LEFT JOIN dbo.SupplyChainImportBatches AS b ON b.Id=s.ImportBatchId
    WHERE ((@AuditScope=N'SNAPSHOT_CREATED_UTC' AND s.CreatedAtUtc>=@AuditStartUtc AND s.CreatedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BATCH_UPLOADED_UTC' AND b.UploadedAtUtc>=@AuditStartUtc AND b.UploadedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BUSINESS_EFFECTIVE_DATE' AND s.SnapshotDate>=@AuditStartDate AND s.SnapshotDate<@AuditEndDate))
      AND (@ChannelId IS NULL OR s.ChannelId=@ChannelId)
)
SELECT @AuditScope AS SelectedAuditScope,
       @AuditStartUtc AS SelectedAuditStartUtc,
       @AuditEndUtc AS SelectedAuditEndUtc,
       @AuditStartDate AS SelectedAuditStartDate,
       @AuditEndDate AS SelectedAuditEndDate,
       @ChannelId AS SelectedChannelId,
       COUNT_BIG(CASE WHEN SourceType=N'Sales' THEN 1 END) AS InScopeSalesRecordCount,
       COUNT_BIG(CASE WHEN SourceType=N'Stock' THEN 1 END) AS InScopeStockRecordCount,
       COUNT_BIG(CASE WHEN SourceType=N'Inbound' THEN 1 END) AS InScopeInboundRecordCount,
       COUNT_BIG(*) AS InScopeTotalRecordCount,
       COUNT_BIG(DISTINCT ImportBatchId) AS InScopeKnownImportBatchCount,
       CASE WHEN COUNT_BIG(*)=0 THEN N'NO_SOURCE_RECORDS_MATCHED_SCOPE'
            ELSE N'SOURCE_RECORDS_MATCHED_SCOPE' END AS ScopeDiagnostic
FROM InScopeRows;

/* In-scope batch evidence derives from the selected source rows, not a different clock. */
;WITH ScopeBatches AS
(
    SELECT s.ImportBatchId
    FROM dbo.DispatchWarehouseSalesSnapshots AS s
    LEFT JOIN dbo.SupplyChainImportBatches AS b ON b.Id=s.ImportBatchId
    WHERE ((@AuditScope=N'SNAPSHOT_CREATED_UTC' AND s.CreatedAtUtc>=@AuditStartUtc AND s.CreatedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BATCH_UPLOADED_UTC' AND b.UploadedAtUtc>=@AuditStartUtc AND b.UploadedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BUSINESS_EFFECTIVE_DATE' AND s.PeriodFrom<@AuditEndDate AND s.PeriodTo>=@AuditStartDate))
      AND (@ChannelId IS NULL OR s.ChannelId=@ChannelId)
    UNION
    SELECT s.ImportBatchId
    FROM dbo.DispatchWarehouseStockSnapshots AS s
    LEFT JOIN dbo.SupplyChainImportBatches AS b ON b.Id=s.ImportBatchId
    WHERE ((@AuditScope=N'SNAPSHOT_CREATED_UTC' AND s.CreatedAtUtc>=@AuditStartUtc AND s.CreatedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BATCH_UPLOADED_UTC' AND b.UploadedAtUtc>=@AuditStartUtc AND b.UploadedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BUSINESS_EFFECTIVE_DATE' AND s.SnapshotDate>=@AuditStartDate AND s.SnapshotDate<@AuditEndDate))
      AND (@ChannelId IS NULL OR s.ChannelId=@ChannelId)
    UNION
    SELECT s.ImportBatchId
    FROM dbo.DispatchWarehouseInboundSnapshots AS s
    LEFT JOIN dbo.SupplyChainImportBatches AS b ON b.Id=s.ImportBatchId
    WHERE ((@AuditScope=N'SNAPSHOT_CREATED_UTC' AND s.CreatedAtUtc>=@AuditStartUtc AND s.CreatedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BATCH_UPLOADED_UTC' AND b.UploadedAtUtc>=@AuditStartUtc AND b.UploadedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BUSINESS_EFFECTIVE_DATE' AND s.SnapshotDate>=@AuditStartDate AND s.SnapshotDate<@AuditEndDate))
      AND (@ChannelId IS NULL OR s.ChannelId=@ChannelId)
)
SELECT b.Id AS ImportBatchId, b.ModuleType, b.ImportType, b.ChannelId, b.Status,
       b.UploadedAtUtc, b.CommittedAtUtc, b.TotalRows, b.ValidRows,
       b.InvalidRows, b.DuplicateRows, b.CommittedRows
FROM dbo.SupplyChainImportBatches AS b
JOIN ScopeBatches AS sb ON sb.ImportBatchId=b.Id
ORDER BY b.UploadedAtUtc, b.Id;

/* ============================================================================
   BATCH 2: Summary counts.
   "Legitimate multiple mappings" means all current relations agree; it is a
   mapping-aware-identity design finding, not a claim that records are invalid.
   ============================================================================ */
;WITH SourceRows AS
(
    SELECT N'Sales' AS SourceType, s.Id AS SnapshotId, s.ImportBatchId, s.ChannelId,
           s.WarehouseId, s.ItemId, s.ChannelItemMappingId, s.PeriodFrom, s.PeriodTo,
           CAST(NULL AS DATE) AS SnapshotDate, s.SalesQuantity AS Quantity,
           CAST(NULL AS DATE) AS ExpectedArrivalDate, CAST(NULL AS INT) AS InboundStatus,
           CAST(NULL AS NVARCHAR(100)) AS ReferenceNumber, s.SourceReference, s.CreatedAtUtc,
           b.ModuleType, b.ImportType, b.ChannelId AS BatchChannelId, b.Status AS BatchStatus,
           m.Id AS MappingExists, m.SalesChannelId AS MappingChannelId, m.ItemId AS MappingItemId,
           m.IsActive AS MappingIsActive, m.IsDeleted AS MappingIsDeleted,
           w.Id AS WarehouseExists, w.ChannelId AS WarehouseChannelId,
           w.IsActive AS WarehouseIsActive, w.IsDeleted AS WarehouseIsDeleted
    FROM dbo.DispatchWarehouseSalesSnapshots AS s
    LEFT JOIN dbo.SupplyChainImportBatches AS b ON b.Id = s.ImportBatchId
    LEFT JOIN dbo.ChannelSkuMappings AS m ON m.Id = s.ChannelItemMappingId
    LEFT JOIN dbo.ChannelWarehouses AS w ON w.Id = s.WarehouseId
    WHERE ((@AuditScope=N'SNAPSHOT_CREATED_UTC' AND s.CreatedAtUtc>=@AuditStartUtc AND s.CreatedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BATCH_UPLOADED_UTC' AND b.UploadedAtUtc>=@AuditStartUtc AND b.UploadedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BUSINESS_EFFECTIVE_DATE' AND s.PeriodFrom<@AuditEndDate AND s.PeriodTo>=@AuditStartDate))
      AND (@ChannelId IS NULL OR s.ChannelId = @ChannelId)
    UNION ALL
    SELECT N'Stock', s.Id, s.ImportBatchId, s.ChannelId, s.WarehouseId, s.ItemId,
           s.ChannelItemMappingId, CAST(NULL AS DATE), CAST(NULL AS DATE), s.SnapshotDate,
           s.SellableQuantity, CAST(NULL AS DATE), CAST(NULL AS INT), CAST(NULL AS NVARCHAR(100)),
           s.SourceReference, s.CreatedAtUtc,
           b.ModuleType, b.ImportType, b.ChannelId, b.Status,
           m.Id, m.SalesChannelId, m.ItemId, m.IsActive, m.IsDeleted,
           w.Id, w.ChannelId, w.IsActive, w.IsDeleted
    FROM dbo.DispatchWarehouseStockSnapshots AS s
    LEFT JOIN dbo.SupplyChainImportBatches AS b ON b.Id = s.ImportBatchId
    LEFT JOIN dbo.ChannelSkuMappings AS m ON m.Id = s.ChannelItemMappingId
    LEFT JOIN dbo.ChannelWarehouses AS w ON w.Id = s.WarehouseId
    WHERE ((@AuditScope=N'SNAPSHOT_CREATED_UTC' AND s.CreatedAtUtc>=@AuditStartUtc AND s.CreatedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BATCH_UPLOADED_UTC' AND b.UploadedAtUtc>=@AuditStartUtc AND b.UploadedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BUSINESS_EFFECTIVE_DATE' AND s.SnapshotDate>=@AuditStartDate AND s.SnapshotDate<@AuditEndDate))
      AND (@ChannelId IS NULL OR s.ChannelId = @ChannelId)
    UNION ALL
    SELECT N'Inbound', s.Id, s.ImportBatchId, s.ChannelId, s.WarehouseId, s.ItemId,
           s.ChannelItemMappingId, CAST(NULL AS DATE), CAST(NULL AS DATE), s.SnapshotDate,
           s.InboundQuantity, s.ExpectedArrivalDate, s.InboundStatus, s.ReferenceNumber,
           s.SourceReference, s.CreatedAtUtc,
           b.ModuleType, b.ImportType, b.ChannelId, b.Status,
           m.Id, m.SalesChannelId, m.ItemId, m.IsActive, m.IsDeleted,
           w.Id, w.ChannelId, w.IsActive, w.IsDeleted
    FROM dbo.DispatchWarehouseInboundSnapshots AS s
    LEFT JOIN dbo.SupplyChainImportBatches AS b ON b.Id = s.ImportBatchId
    LEFT JOIN dbo.ChannelSkuMappings AS m ON m.Id = s.ChannelItemMappingId
    LEFT JOIN dbo.ChannelWarehouses AS w ON w.Id = s.WarehouseId
    WHERE ((@AuditScope=N'SNAPSHOT_CREATED_UTC' AND s.CreatedAtUtc>=@AuditStartUtc AND s.CreatedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BATCH_UPLOADED_UTC' AND b.UploadedAtUtc>=@AuditStartUtc AND b.UploadedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BUSINESS_EFFECTIVE_DATE' AND s.SnapshotDate>=@AuditStartDate AND s.SnapshotDate<@AuditEndDate))
      AND (@ChannelId IS NULL OR s.ChannelId = @ChannelId)
),
IssueRows AS
(
    SELECT sr.SourceType, issue.Finding, sr.SnapshotId
    FROM SourceRows AS sr
    CROSS APPLY (VALUES
        (N'Missing import batch', IIF(sr.ModuleType IS NULL, 1, 0)),
        (N'Invalid batch module/type/status/channel',
            IIF(sr.ModuleType IS NULL OR sr.ModuleType <> N'DispatchPlanning' OR sr.BatchStatus <> 5
                OR sr.BatchChannelId <> sr.ChannelId
                OR (sr.SourceType = N'Sales' AND sr.ImportType <> N'DispatchWarehouseSales')
                OR (sr.SourceType = N'Stock' AND sr.ImportType <> N'DispatchWarehouseStock')
                OR (sr.SourceType = N'Inbound' AND sr.ImportType <> N'DispatchWarehouseInbound'), 1, 0)),
        (N'NULL mapping ID', IIF(sr.ChannelItemMappingId IS NULL, 1, 0)),
        (N'Missing mapping', IIF(sr.MappingExists IS NULL, 1, 0)),
        (N'Inactive/deleted mapping', IIF(sr.MappingExists IS NOT NULL AND (sr.MappingIsActive = 0 OR sr.MappingIsDeleted = 1), 1, 0)),
        (N'Mapping item/channel mismatch', IIF(sr.MappingExists IS NOT NULL AND (sr.MappingItemId <> sr.ItemId OR sr.MappingChannelId <> sr.ChannelId), 1, 0)),
        (N'Missing/inactive/deleted warehouse or channel mismatch', IIF(sr.WarehouseExists IS NULL OR sr.WarehouseIsActive = 0 OR sr.WarehouseIsDeleted = 1 OR sr.WarehouseChannelId <> sr.ChannelId, 1, 0))
    ) AS issue(Finding, IsFinding)
    WHERE issue.IsFinding = 1
),
IdentityGroups AS
(
    SELECT SourceType, ImportBatchId, ChannelId, WarehouseId, ItemId, PeriodFrom, PeriodTo, SnapshotDate,
           COUNT(*) AS RowCountValue,
           COUNT(DISTINCT ChannelItemMappingId) AS MappingCount,
           COUNT(DISTINCT CASE
               WHEN MappingExists IS NOT NULL AND MappingIsActive = 1 AND MappingIsDeleted = 0
                AND MappingItemId = ItemId AND MappingChannelId = ChannelId
                AND WarehouseExists IS NOT NULL AND WarehouseIsActive = 1 AND WarehouseIsDeleted = 0
                AND WarehouseChannelId = ChannelId
               THEN ChannelItemMappingId END) AS ValidMappingCount
    FROM SourceRows
    GROUP BY SourceType, ImportBatchId, ChannelId, WarehouseId, ItemId, PeriodFrom, PeriodTo, SnapshotDate
),
SourceWithDuplicateCounts AS
(
    SELECT sr.*,
           COUNT(*) OVER
           (
               PARTITION BY SourceType, ImportBatchId, ChannelId, WarehouseId, ItemId, ChannelItemMappingId,
                            PeriodFrom, PeriodTo, SnapshotDate,
                            CASE WHEN SourceType=N'Inbound' THEN ExpectedArrivalDate END,
                            CASE WHEN SourceType=N'Inbound' THEN InboundStatus END,
                            CASE WHEN SourceType=N'Inbound' THEN ReferenceNumber END,
                            CASE WHEN SourceType=N'Inbound' THEN Quantity END
           ) AS DuplicateCandidateRowCount
    FROM SourceRows AS sr
),
SourceTypes AS
(
    SELECT N'Sales' AS SourceType
    UNION ALL SELECT N'Stock'
    UNION ALL SELECT N'Inbound'
),
SourceCounts AS
(
    SELECT SourceType, COUNT_BIG(*) AS RowCountValue
    FROM SourceRows
    GROUP BY SourceType
),
ExceptionCounts AS
(
    SELECT SourceType, COUNT_BIG(*) AS ExceptionCount
    FROM IssueRows
    GROUP BY SourceType
),
LegitimateMultipleMappingCounts AS
(
    SELECT SourceType, COUNT_BIG(*) AS FindingCount
    FROM IdentityGroups
    WHERE MappingCount > 1 AND MappingCount = ValidMappingCount
    GROUP BY SourceType
),
AmbiguousMultipleMappingCounts AS
(
    SELECT SourceType, COUNT_BIG(*) AS FindingCount
    FROM IdentityGroups
    WHERE MappingCount > 1 AND MappingCount <> ValidMappingCount
    GROUP BY SourceType
),
DuplicateCandidateCounts AS
(
    SELECT SourceType, COUNT_BIG(*) AS FindingCount
    FROM SourceWithDuplicateCounts
    WHERE ChannelItemMappingId IS NOT NULL AND DuplicateCandidateRowCount > 1
    GROUP BY SourceType
),
Summary AS
(
    SELECT st.SourceType, N'Rows audited' AS Finding, COALESCE(sc.RowCountValue, CONVERT(BIGINT, 0)) AS FindingCount
    FROM SourceTypes AS st
    LEFT JOIN SourceCounts AS sc ON sc.SourceType=st.SourceType
    UNION ALL
    SELECT st.SourceType, N'Relationship exception rows', COALESCE(ec.ExceptionCount, CONVERT(BIGINT, 0))
    FROM SourceTypes AS st
    LEFT JOIN ExceptionCounts AS ec ON ec.SourceType=st.SourceType
    UNION ALL
    SELECT st.SourceType, N'Legitimate multiple mappings under legacy identity', COALESCE(mc.FindingCount, CONVERT(BIGINT, 0))
    FROM SourceTypes AS st
    LEFT JOIN LegitimateMultipleMappingCounts AS mc ON mc.SourceType=st.SourceType
    UNION ALL
    SELECT st.SourceType, N'Ambiguous multiple mappings under legacy identity', COALESCE(mc.FindingCount, CONVERT(BIGINT, 0))
    FROM SourceTypes AS st
    LEFT JOIN AmbiguousMultipleMappingCounts AS mc ON mc.SourceType=st.SourceType
    UNION ALL
    SELECT st.SourceType, N'Duplicate candidate source rows at mapping-aware identity', COALESCE(dc.FindingCount, CONVERT(BIGINT, 0))
    FROM SourceTypes AS st
    LEFT JOIN DuplicateCandidateCounts AS dc ON dc.SourceType=st.SourceType
    UNION ALL
    SELECT SourceType, Finding, COUNT_BIG(*)
    FROM IssueRows
    GROUP BY SourceType, Finding
)
SELECT SourceType, Finding, FindingCount
FROM Summary
ORDER BY SourceType, Finding;

/* ============================================================================
   BATCH 3: Detailed exception rows with immutable snapshot IDs.
   One snapshot can appear more than once when multiple relationship findings
   are true; that is intentional and preserves all evidence.
   ============================================================================ */
;WITH SourceRows AS
(
    SELECT N'Sales' AS SourceType, s.Id AS SnapshotId, s.ImportBatchId, s.ChannelId,
           s.WarehouseId, s.ItemId, s.ChannelItemMappingId, s.PeriodFrom, s.PeriodTo,
           CAST(NULL AS DATE) AS SnapshotDate, s.SalesQuantity AS Quantity,
           CAST(NULL AS DATE) AS ExpectedArrivalDate, CAST(NULL AS INT) AS InboundStatus,
           CAST(NULL AS NVARCHAR(100)) AS ReferenceNumber, s.SourceReference, s.CreatedAtUtc,
           b.ModuleType, b.ImportType, b.ChannelId AS BatchChannelId, b.Status AS BatchStatus,
           m.Id AS MappingExists, m.SalesChannelId AS MappingChannelId, m.ItemId AS MappingItemId,
           m.ChannelSku, m.IsActive AS MappingIsActive, m.IsDeleted AS MappingIsDeleted,
           w.Id AS WarehouseExists, w.ChannelId AS WarehouseChannelId, w.WarehouseCode,
           w.IsActive AS WarehouseIsActive, w.IsDeleted AS WarehouseIsDeleted
    FROM dbo.DispatchWarehouseSalesSnapshots AS s
    LEFT JOIN dbo.SupplyChainImportBatches AS b ON b.Id=s.ImportBatchId
    LEFT JOIN dbo.ChannelSkuMappings AS m ON m.Id=s.ChannelItemMappingId
    LEFT JOIN dbo.ChannelWarehouses AS w ON w.Id=s.WarehouseId
    WHERE ((@AuditScope=N'SNAPSHOT_CREATED_UTC' AND s.CreatedAtUtc>=@AuditStartUtc AND s.CreatedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BATCH_UPLOADED_UTC' AND b.UploadedAtUtc>=@AuditStartUtc AND b.UploadedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BUSINESS_EFFECTIVE_DATE' AND s.PeriodFrom<@AuditEndDate AND s.PeriodTo>=@AuditStartDate))
      AND (@ChannelId IS NULL OR s.ChannelId=@ChannelId)
    UNION ALL
    SELECT N'Stock', s.Id, s.ImportBatchId, s.ChannelId, s.WarehouseId, s.ItemId, s.ChannelItemMappingId,
           CAST(NULL AS DATE), CAST(NULL AS DATE), s.SnapshotDate, s.SellableQuantity,
           CAST(NULL AS DATE), CAST(NULL AS INT), CAST(NULL AS NVARCHAR(100)), s.SourceReference, s.CreatedAtUtc,
           b.ModuleType, b.ImportType, b.ChannelId, b.Status,
           m.Id, m.SalesChannelId, m.ItemId, m.ChannelSku, m.IsActive, m.IsDeleted,
           w.Id, w.ChannelId, w.WarehouseCode, w.IsActive, w.IsDeleted
    FROM dbo.DispatchWarehouseStockSnapshots AS s
    LEFT JOIN dbo.SupplyChainImportBatches AS b ON b.Id=s.ImportBatchId
    LEFT JOIN dbo.ChannelSkuMappings AS m ON m.Id=s.ChannelItemMappingId
    LEFT JOIN dbo.ChannelWarehouses AS w ON w.Id=s.WarehouseId
    WHERE ((@AuditScope=N'SNAPSHOT_CREATED_UTC' AND s.CreatedAtUtc>=@AuditStartUtc AND s.CreatedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BATCH_UPLOADED_UTC' AND b.UploadedAtUtc>=@AuditStartUtc AND b.UploadedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BUSINESS_EFFECTIVE_DATE' AND s.SnapshotDate>=@AuditStartDate AND s.SnapshotDate<@AuditEndDate))
      AND (@ChannelId IS NULL OR s.ChannelId=@ChannelId)
    UNION ALL
    SELECT N'Inbound', s.Id, s.ImportBatchId, s.ChannelId, s.WarehouseId, s.ItemId, s.ChannelItemMappingId,
           CAST(NULL AS DATE), CAST(NULL AS DATE), s.SnapshotDate, s.InboundQuantity,
           s.ExpectedArrivalDate, s.InboundStatus, s.ReferenceNumber, s.SourceReference, s.CreatedAtUtc,
           b.ModuleType, b.ImportType, b.ChannelId, b.Status,
           m.Id, m.SalesChannelId, m.ItemId, m.ChannelSku, m.IsActive, m.IsDeleted,
           w.Id, w.ChannelId, w.WarehouseCode, w.IsActive, w.IsDeleted
    FROM dbo.DispatchWarehouseInboundSnapshots AS s
    LEFT JOIN dbo.SupplyChainImportBatches AS b ON b.Id=s.ImportBatchId
    LEFT JOIN dbo.ChannelSkuMappings AS m ON m.Id=s.ChannelItemMappingId
    LEFT JOIN dbo.ChannelWarehouses AS w ON w.Id=s.WarehouseId
    WHERE ((@AuditScope=N'SNAPSHOT_CREATED_UTC' AND s.CreatedAtUtc>=@AuditStartUtc AND s.CreatedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BATCH_UPLOADED_UTC' AND b.UploadedAtUtc>=@AuditStartUtc AND b.UploadedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BUSINESS_EFFECTIVE_DATE' AND s.SnapshotDate>=@AuditStartDate AND s.SnapshotDate<@AuditEndDate))
      AND (@ChannelId IS NULL OR s.ChannelId=@ChannelId)
)
SELECT issue.ExceptionType, sr.SourceType, sr.SnapshotId, sr.ImportBatchId,
       sr.ChannelId AS SourceChannelId, sr.BatchChannelId, sr.ModuleType, sr.ImportType, sr.BatchStatus,
       sr.WarehouseId, sr.WarehouseCode, sr.WarehouseChannelId, sr.ItemId, sr.ChannelItemMappingId,
       sr.MappingChannelId, sr.MappingItemId, sr.ChannelSku, sr.MappingIsActive, sr.MappingIsDeleted,
       sr.PeriodFrom, sr.PeriodTo, sr.SnapshotDate, sr.Quantity, sr.ExpectedArrivalDate,
       sr.InboundStatus, sr.ReferenceNumber, sr.SourceReference, sr.CreatedAtUtc
FROM SourceRows AS sr
CROSS APPLY (VALUES
    (N'MISSING_IMPORT_BATCH', IIF(sr.ModuleType IS NULL, 1, 0)),
    (N'INVALID_BATCH_MODULE_TYPE_STATUS_OR_CHANNEL',
        IIF(sr.ModuleType IS NULL OR sr.ModuleType <> N'DispatchPlanning' OR sr.BatchStatus <> 5
            OR sr.BatchChannelId <> sr.ChannelId
            OR (sr.SourceType=N'Sales' AND sr.ImportType<>N'DispatchWarehouseSales')
            OR (sr.SourceType=N'Stock' AND sr.ImportType<>N'DispatchWarehouseStock')
            OR (sr.SourceType=N'Inbound' AND sr.ImportType<>N'DispatchWarehouseInbound'), 1, 0)),
    (N'NULL_MAPPING_ID', IIF(sr.ChannelItemMappingId IS NULL, 1, 0)),
    (N'MISSING_MAPPING', IIF(sr.MappingExists IS NULL, 1, 0)),
    (N'INACTIVE_OR_DELETED_MAPPING', IIF(sr.MappingExists IS NOT NULL AND (sr.MappingIsActive=0 OR sr.MappingIsDeleted=1), 1, 0)),
    (N'MAPPING_ITEM_MISMATCH', IIF(sr.MappingExists IS NOT NULL AND sr.MappingItemId<>sr.ItemId, 1, 0)),
    (N'MAPPING_CHANNEL_MISMATCH', IIF(sr.MappingExists IS NOT NULL AND sr.MappingChannelId<>sr.ChannelId, 1, 0)),
    (N'MISSING_WAREHOUSE', IIF(sr.WarehouseExists IS NULL, 1, 0)),
    (N'INACTIVE_OR_DELETED_WAREHOUSE', IIF(sr.WarehouseExists IS NOT NULL AND (sr.WarehouseIsActive=0 OR sr.WarehouseIsDeleted=1), 1, 0)),
    (N'WAREHOUSE_CHANNEL_MISMATCH', IIF(sr.WarehouseExists IS NOT NULL AND sr.WarehouseChannelId<>sr.ChannelId, 1, 0))
) AS issue(ExceptionType, IsFinding)
WHERE issue.IsFinding=1
ORDER BY issue.ExceptionType, sr.SourceType, sr.ImportBatchId, sr.SnapshotId;

/* ============================================================================
   BATCH 4: Detailed multiple-mapping and duplicate-candidate evidence.
   SnapshotId is always an immutable source record ID.
   ============================================================================ */
;WITH SourceRows AS
(
    SELECT N'Sales' AS SourceType, s.Id AS SnapshotId, s.ImportBatchId, s.ChannelId, s.WarehouseId, s.ItemId, s.ChannelItemMappingId,
           s.PeriodFrom, s.PeriodTo, CAST(NULL AS DATE) AS SnapshotDate, s.SalesQuantity AS Quantity,
           CAST(NULL AS DATE) AS ExpectedArrivalDate, CAST(NULL AS INT) AS InboundStatus, CAST(NULL AS NVARCHAR(100)) AS ReferenceNumber,
           s.SourceReference, s.CreatedAtUtc, m.Id AS MappingExists, m.SalesChannelId AS MappingChannelId, m.ItemId AS MappingItemId,
           m.IsActive AS MappingIsActive, m.IsDeleted AS MappingIsDeleted, w.Id AS WarehouseExists, w.ChannelId AS WarehouseChannelId,
           w.IsActive AS WarehouseIsActive, w.IsDeleted AS WarehouseIsDeleted
    FROM dbo.DispatchWarehouseSalesSnapshots AS s
    LEFT JOIN dbo.SupplyChainImportBatches AS b ON b.Id=s.ImportBatchId
    LEFT JOIN dbo.ChannelSkuMappings AS m ON m.Id=s.ChannelItemMappingId
    LEFT JOIN dbo.ChannelWarehouses AS w ON w.Id=s.WarehouseId
    WHERE ((@AuditScope=N'SNAPSHOT_CREATED_UTC' AND s.CreatedAtUtc>=@AuditStartUtc AND s.CreatedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BATCH_UPLOADED_UTC' AND b.UploadedAtUtc>=@AuditStartUtc AND b.UploadedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BUSINESS_EFFECTIVE_DATE' AND s.PeriodFrom<@AuditEndDate AND s.PeriodTo>=@AuditStartDate))
      AND (@ChannelId IS NULL OR s.ChannelId=@ChannelId)
    UNION ALL
    SELECT N'Stock', s.Id, s.ImportBatchId, s.ChannelId, s.WarehouseId, s.ItemId, s.ChannelItemMappingId,
           CAST(NULL AS DATE), CAST(NULL AS DATE), s.SnapshotDate, s.SellableQuantity,
           CAST(NULL AS DATE), CAST(NULL AS INT), CAST(NULL AS NVARCHAR(100)), s.SourceReference, s.CreatedAtUtc,
           m.Id, m.SalesChannelId, m.ItemId, m.IsActive, m.IsDeleted, w.Id, w.ChannelId, w.IsActive, w.IsDeleted
    FROM dbo.DispatchWarehouseStockSnapshots AS s
    LEFT JOIN dbo.SupplyChainImportBatches AS b ON b.Id=s.ImportBatchId
    LEFT JOIN dbo.ChannelSkuMappings AS m ON m.Id=s.ChannelItemMappingId
    LEFT JOIN dbo.ChannelWarehouses AS w ON w.Id=s.WarehouseId
    WHERE ((@AuditScope=N'SNAPSHOT_CREATED_UTC' AND s.CreatedAtUtc>=@AuditStartUtc AND s.CreatedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BATCH_UPLOADED_UTC' AND b.UploadedAtUtc>=@AuditStartUtc AND b.UploadedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BUSINESS_EFFECTIVE_DATE' AND s.SnapshotDate>=@AuditStartDate AND s.SnapshotDate<@AuditEndDate))
      AND (@ChannelId IS NULL OR s.ChannelId=@ChannelId)
    UNION ALL
    SELECT N'Inbound', s.Id, s.ImportBatchId, s.ChannelId, s.WarehouseId, s.ItemId, s.ChannelItemMappingId,
           CAST(NULL AS DATE), CAST(NULL AS DATE), s.SnapshotDate, s.InboundQuantity,
           s.ExpectedArrivalDate, s.InboundStatus, s.ReferenceNumber, s.SourceReference, s.CreatedAtUtc,
           m.Id, m.SalesChannelId, m.ItemId, m.IsActive, m.IsDeleted, w.Id, w.ChannelId, w.IsActive, w.IsDeleted
    FROM dbo.DispatchWarehouseInboundSnapshots AS s
    LEFT JOIN dbo.SupplyChainImportBatches AS b ON b.Id=s.ImportBatchId
    LEFT JOIN dbo.ChannelSkuMappings AS m ON m.Id=s.ChannelItemMappingId
    LEFT JOIN dbo.ChannelWarehouses AS w ON w.Id=s.WarehouseId
    WHERE ((@AuditScope=N'SNAPSHOT_CREATED_UTC' AND s.CreatedAtUtc>=@AuditStartUtc AND s.CreatedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BATCH_UPLOADED_UTC' AND b.UploadedAtUtc>=@AuditStartUtc AND b.UploadedAtUtc<@AuditEndUtc)
        OR (@AuditScope=N'BUSINESS_EFFECTIVE_DATE' AND s.SnapshotDate>=@AuditStartDate AND s.SnapshotDate<@AuditEndDate))
      AND (@ChannelId IS NULL OR s.ChannelId=@ChannelId)
),
IdentityGroups AS
(
    SELECT SourceType, ImportBatchId, ChannelId, WarehouseId, ItemId, PeriodFrom, PeriodTo, SnapshotDate,
           COUNT(*) AS RowCountValue,
           COUNT(DISTINCT ChannelItemMappingId) AS MappingCount,
           COUNT(DISTINCT CASE WHEN MappingExists IS NOT NULL AND MappingIsActive=1 AND MappingIsDeleted=0
                                AND MappingItemId=ItemId AND MappingChannelId=ChannelId
                                AND WarehouseExists IS NOT NULL AND WarehouseIsActive=1 AND WarehouseIsDeleted=0 AND WarehouseChannelId=ChannelId
                               THEN ChannelItemMappingId END) AS ValidMappingCount
    FROM SourceRows
    GROUP BY SourceType, ImportBatchId, ChannelId, WarehouseId, ItemId, PeriodFrom, PeriodTo, SnapshotDate
),
SourceWithDuplicateCounts AS
(
    SELECT sr.*,
           COUNT(*) OVER
           (
               PARTITION BY SourceType, ImportBatchId, ChannelId, WarehouseId, ItemId, ChannelItemMappingId,
                            PeriodFrom, PeriodTo, SnapshotDate,
                            CASE WHEN SourceType=N'Inbound' THEN ExpectedArrivalDate END,
                            CASE WHEN SourceType=N'Inbound' THEN InboundStatus END,
                            CASE WHEN SourceType=N'Inbound' THEN ReferenceNumber END,
                            CASE WHEN SourceType=N'Inbound' THEN Quantity END
           ) AS DuplicateCandidateRowCount
    FROM SourceRows AS sr
)
SELECT classification.Classification,
       s.SourceType, s.SnapshotId, s.ImportBatchId, s.ChannelId, s.WarehouseId, s.ItemId, s.ChannelItemMappingId,
       s.PeriodFrom, s.PeriodTo, s.SnapshotDate, s.Quantity, s.ExpectedArrivalDate, s.InboundStatus, s.ReferenceNumber,
       g.RowCountValue, s.DuplicateCandidateRowCount, g.MappingCount, g.ValidMappingCount, s.SourceReference, s.CreatedAtUtc
FROM SourceWithDuplicateCounts AS s
JOIN IdentityGroups AS g ON g.SourceType=s.SourceType AND g.ImportBatchId=s.ImportBatchId AND g.ChannelId=s.ChannelId
 AND g.WarehouseId=s.WarehouseId AND g.ItemId=s.ItemId
 AND ((g.PeriodFrom=s.PeriodFrom) OR (g.PeriodFrom IS NULL AND s.PeriodFrom IS NULL))
 AND ((g.PeriodTo=s.PeriodTo) OR (g.PeriodTo IS NULL AND s.PeriodTo IS NULL))
 AND ((g.SnapshotDate=s.SnapshotDate) OR (g.SnapshotDate IS NULL AND s.SnapshotDate IS NULL))
CROSS APPLY (VALUES
    (N'LEGITIMATE_MULTIPLE_MAPPINGS_REQUIRES_MAPPING_AWARE_IDENTITY', IIF(g.MappingCount>1 AND g.MappingCount=g.ValidMappingCount, 1, 0)),
    (N'AMBIGUOUS_MULTIPLE_MAPPING_ATTRIBUTION', IIF(g.MappingCount>1 AND g.MappingCount<>g.ValidMappingCount, 1, 0)),
    (N'DUPLICATE_CANDIDATE_AT_MAPPING_AWARE_IDENTITY', IIF(s.ChannelItemMappingId IS NOT NULL AND s.DuplicateCandidateRowCount>1, 1, 0))
) AS classification(Classification, IsFinding)
WHERE classification.IsFinding=1
ORDER BY classification.Classification, s.SourceType, s.ImportBatchId, s.WarehouseId, s.ItemId, s.SnapshotId;

/*
Interpretation:
- Legitimate multiple mappings are not invalid rows; they demonstrate that source
  identity must retain ChannelItemMappingId.
- Duplicate candidates are not automatically duplicates, particularly inbound
  rows with a NULL ReferenceNumber. Escalate to source/correction policy.
*/
