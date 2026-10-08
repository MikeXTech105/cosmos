# Dispatch Planning implementation tracker

| Work item | Status | Evidence |
|---|---|---|
| Repository and foundation inspection | Implemented | Items, Supply Chain, Procurement, imports, permissions, reports, audit, and Swagger inspected before edits |
| Source workbook inspection | Blocked | Named workbook was not available in workspace or attachments; assumptions documented |
| Normalized SQL schema and rerunnable migration | Implemented | `20260728_dispatch_planning_module.sql` |
| SKU settings, effective dates, soft deletion | Implemented | Contracts, validator, repository, procedures, controller |
| Shared import-batch extension and snapshots | Implemented | Shared batch reuse plus `DispatchImportStagedRows` and committed snapshot tables |
| Pure calculation engine | Implemented | `DispatchCalculationService` plus unit tests |
| Warehouse/SKU snapshot identity repair | Implemented | `20261008_dispatch_planning_sku_snapshot_integrity.sql`; inbound grouping, calculation duplicate validation, and result uniqueness include `ChannelItemMappingId` |
| Pure allocation engine | Implemented | `DispatchAllocationService` plus priority/cap test; SQL validates persisted allocations |
| Run lifecycle, override, allocation, finalization/cancellation | Implemented | Procedures, controller, finalized-state database triggers |
| Reports and CSV export | Implemented | Report procedure and Export-permission endpoint |
| JWT/page-action permissions and Swagger group | Implemented | Controllers and `dispatch-planning` registration |
| Audit trail | Implemented | Explicit application audit entries plus existing audit middleware |
| Dapper materialization test | Implemented | `DispatchPlanningDapperMaterializationTests` |
| SQL verification script | Implemented | `verify_dispatch_planning.sql` |
| Backend/frontend integration documents | Implemented | This tracker and two Dispatch Planning docs |
| Migration applied to disposable SQL Server | Verified | Applied baseline, Procurement, Supply Chain, alignment, and Dispatch migrations to a temporary local database, then removed it |
| SQL verification executed | Verified | `verify_dispatch_planning.sql` passed against the migrated temporary database |
| Swagger JSON runtime inspection | Pending Runtime Verification | Requires API startup with a usable database/configuration |
| Role smoke tests | Pending Runtime Verification | Requires explicit permission-grant test users and an API runtime fixture |

Next recommended module: **Shipment Operations / Work List Conversion**. It must consume finalized dispatch recommendations and own actual inventory movement; it is not implemented here.
