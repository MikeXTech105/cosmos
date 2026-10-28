# HSN/GST consolidation implementation

Canonical defaults are `Items.HSNCode` (string, never converted to an integer) and `Items.GSTRate` (decimal). The Item form has a single Taxes card containing those fields. The sales invoice item lookup reads the selected item's HSN and GST rate and writes the HSN to the transaction line snapshot; a later item-master change does not rewrite an existing invoice line.

`20261027_consolidate_item_hsn_gst.sql` is safe by default. It records active item-override comparisons in `dbo.ItemHsnGstConsolidationRecovery`, reports conflicts, and only backfills an empty `Items.HSNCode` when its explicitly-disabled flag is enabled after backup and review. It never infers a GST rate from the legacy classification subsystem and never alters invoice snapshots.

The old tables are intentionally retained for recovery and for existing GST calculation snapshot foreign keys. A future approved archival migration must first prove that every historical dependency has been migrated or retained. No destructive database operation was run.
