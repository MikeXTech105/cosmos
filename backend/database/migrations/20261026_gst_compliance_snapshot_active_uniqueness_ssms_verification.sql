/* Read-only post-deployment checks for 20261026_gst_compliance_snapshot_active_uniqueness.sql. */
SELECT name, is_unique, has_filter, filter_definition
FROM sys.indexes
WHERE object_id = OBJECT_ID(N'dbo.GstComplianceSnapshots')
  AND name = N'UX_GstComplianceSnapshots_Invoice_Active';

SELECT SalesInvoiceId, COUNT(*) AS ActiveSnapshotCount
FROM dbo.GstComplianceSnapshots
WHERE Status <> N'Superseded'
GROUP BY SalesInvoiceId
HAVING COUNT(*) > 1;
GO
