/* Read-only verification. Run manually in the intended database after the migration. */
SET NOCOUNT ON;
SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DatabaseName;
IF OBJECT_ID(N'dbo.GstComplianceSnapshots', N'U') IS NULL OR OBJECT_ID(N'dbo.GstGenerationRequests', N'U') IS NULL OR OBJECT_ID(N'dbo.GstGenerationAttempts', N'U') IS NULL
    THROW 52010, N'GST compliance foundation tables are missing.', 1;
IF OBJECT_ID(N'dbo.trg_GstComplianceSnapshots_PreventMutation', N'TR') IS NULL
   OR OBJECT_ID(N'dbo.usp_GstGenerationRequest_Reserve', N'P') IS NULL
   OR OBJECT_ID(N'dbo.usp_GstGenerationRequest_RecordAttempt', N'P') IS NULL
    THROW 52011, N'GST generation immutability or request-lifecycle objects are missing.', 1;
SELECT OBJECT_SCHEMA_NAME(c.object_id) AS SchemaName, OBJECT_NAME(c.object_id) AS TableName, c.name AS ColumnName, TYPE_NAME(c.user_type_id) AS TypeName, c.max_length, c.is_nullable
FROM sys.columns c WHERE c.object_id IN(OBJECT_ID(N'dbo.GstComplianceSnapshots'),OBJECT_ID(N'dbo.GstGenerationRequests'),OBJECT_ID(N'dbo.GstGenerationAttempts')) ORDER BY TableName, c.column_id;
SELECT i.name AS IndexName, OBJECT_NAME(i.object_id) AS TableName, i.is_unique, i.filter_definition
FROM sys.indexes i WHERE (i.object_id IN(OBJECT_ID(N'dbo.GstComplianceSnapshots'),OBJECT_ID(N'dbo.GstGenerationRequests'),OBJECT_ID(N'dbo.EInvoices'),OBJECT_ID(N'dbo.EWayBills')) AND i.name LIKE N'%Gst%') OR i.name IN(N'UX_EInvoices_Irn_Active',N'UX_EWayBills_Number_Active') ORDER BY TableName, IndexName;
SELECT N'Duplicate active IRN' AS Diagnostic, Irn AS Identifier, COUNT(*) AS DuplicateCount FROM dbo.EInvoices WHERE IsDeleted=0 AND Irn IS NOT NULL GROUP BY Irn HAVING COUNT(*)>1
UNION ALL
SELECT N'Duplicate active E-Way Bill', EWayBillNumber, COUNT(*) FROM dbo.EWayBills WHERE IsDeleted=0 AND EWayBillNumber IS NOT NULL GROUP BY EWayBillNumber HAVING COUNT(*)>1;
SELECT N'Historical invoices without snapshot' AS Diagnostic, COUNT(*) AS CountValue FROM dbo.SalesInvoices i WHERE i.IsDeleted=0 AND NOT EXISTS(SELECT 1 FROM dbo.GstComplianceSnapshots s WHERE s.SalesInvoiceId=i.Id);
SELECT N'Generation remains intentionally blocked until snapshot construction, GSTZen contract validation, and durable request processing are deployed.' AS SafetyStatus;
SELECT o.type_desc AS ObjectType, SCHEMA_NAME(o.schema_id) AS SchemaName, o.name AS ObjectName FROM sys.objects o WHERE o.object_id IN(OBJECT_ID(N'dbo.trg_GstComplianceSnapshots_PreventMutation'),OBJECT_ID(N'dbo.usp_GstGenerationRequest_Reserve'),OBJECT_ID(N'dbo.usp_GstGenerationRequest_RecordAttempt'));
