/*
  Forward-only hardening for the 20261024 GST snapshot foundation.
  It does not create, backfill, or modify any compliance snapshot. Apply only
  after resolving any existing active duplicate through an auditable process.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.GstComplianceSnapshots', N'U') IS NULL
    THROW 52011, N'GST compliance snapshot foundation migration must be applied first.', 1;

IF EXISTS
(
    SELECT SalesInvoiceId
    FROM dbo.GstComplianceSnapshots
    WHERE Status <> N'Superseded'
    GROUP BY SalesInvoiceId
    HAVING COUNT(*) > 1
)
    THROW 52012, N'Cannot apply GST active-snapshot uniqueness: duplicate non-superseded snapshots exist. Resolve them through the approved correction workflow before retrying.', 1;

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.GstComplianceSnapshots')
      AND name = N'UX_GstComplianceSnapshots_Invoice_Active'
)
BEGIN
    CREATE UNIQUE INDEX UX_GstComplianceSnapshots_Invoice_Active
        ON dbo.GstComplianceSnapshots(SalesInvoiceId)
        WHERE Status <> N'Superseded';
END;
GO
