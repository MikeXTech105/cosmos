# Shipment Operations Implementation

## Repository-first design record

Date: 2026-07-29

### Reused foundation

| Capability | Reused component | Decision |
|---|---|---|
| Channels | `dbo.SalesChannels` | Shipment stores `ChannelId`; no channel-specific shipment table exists. |
| Destination warehouses | `dbo.ChannelWarehouses` | Shipment stores `WarehouseId` and retains code/name snapshots. |
| Items and SKUs | `dbo.Items`, `dbo.ChannelSkuMappings` | Shipment items retain item/code/name/channel-SKU snapshots. Imports never create Items. |
| Packaging | `dbo.ItemPackagingProfiles` | Shipment items and packages retain the packaging inputs used at execution time. |
| Dispatch Planning | `dbo.DispatchPlanningRuns`, `dbo.DispatchAllocations`, `dbo.DispatchRecommendationResults` | A shipment can consume remaining quantity from a finalized allocation only. |
| Inventory | `dbo.Items.CurrentStock`, `dbo.StockMovements` | Stock changes only at confirmed dispatch and restockable-return receipt. |
| Parties | `dbo.Parties` | A small role extension marks an existing Party as a `Transporter`; no transporter master is added. |
| Rojmel | `dbo.WalletTransactions` and `IRojmelTransactionService` | Freight approval never posts a wallet transaction. An explicit, idempotency-guarded hand-off may do so. |
| Imports and audit | `dbo.SupplyChainImportBatches`, `dbo.AuditLogs`, request audit middleware | Historical Work List rows are staged and auditable; historical imports do not alter current stock. |

### New records

The module adds normalized shipment headers/items, package and package-item allocation, docket history, appointment history, append-only tracking events, delivery attempts, receipts and receipt lines, returns and return lines, freight charges, historical import staging, and a Party-role association.

### Integration risks and resolution

1. Inventory is global rather than warehouse-scoped. Dispatch and restockable return update the existing global `Items.CurrentStock`; destination warehouse stock is intentionally not represented as company on-hand stock.
2. Existing `StockMovements` has no source-line uniqueness constraint. Shipment operations adds a filtered unique source/item index and transactionally inserts movements, so a dispatch or return-receipt cannot create duplicate stock effects.
3. Dispatch allocation is a recommendation allocation, not a stock reservation. Shipment conversion locks the selected allocation and subtracts active pre-dispatch conversion quantities; a subsequent dispatch still verifies current stock.
4. Party types do not contain a logistics role. `PartyRoles` provides an additive Transporter role without changing Customer/Supplier/Both contracts.
5. There is no generic attachment table. Proof references are retained as externally-managed attachment URLs/paths; attachment-upload integration can be added once a shared document service exists.
6. Rojmel posting is not automatically transactionally coupled to freight approval. A freight-specific reservation token prevents duplicate explicit hand-offs; failed hand-offs release that reservation.

### Implementation plan

1. Add rerunnable SQL schema, constraints, page/action seeds, stored procedures, inventory idempotency, and verification SQL.
2. Add shipment domain enums/entities, request/response contracts, validators, packing and status-transition services.
3. Add repository abstraction/Dapper repository, application service/auditing, DI registration, JWT/permission-protected controllers, and Swagger group.
4. Add unit and materialization tests, frontend integration notes, progress updates, then run build/tests and all locally feasible verification.

### Workbook availability

`Copy of WORK LIST.xlsx` was not available in the workspace or supplied attachments. The historical import contract therefore accepts normalized rows inferred from the written brief. Sheet-specific headers, dashboard formulas, source status values, unit conventions, and historical document grouping remain client confirmations.

### Delivered backend surface

- Rerunnable migration: `database/migrations/20260729_shipment_operations_module.sql`.
- Read-only structural verification: `database/verify_shipment_operations_module.sql`.
- Transactional SQL smoke test: `database/shipment_operations_smoke_tests.sql`.
- Protected API routes under `/api/v1/shipment-operations`, in the `shipment-operations` Swagger group.
- Dapper repository, application service, validators, packing suggestion service, central status-transition service, audit events, and permission seeds.
- Tests for packing/status behavior, validators, and Dapper materialization.

### Operational invariants

| Event | Inventory effect |
|---|---|
| Manual or Dispatch Planning shipment creation | None |
| Packing, docket, appointments, tracking, receipt, freight | None |
| Confirmed dispatch (`ReadyForDispatch` to `Dispatched`) | Decreases `Items.CurrentStock` once and records `ShipmentDispatch` stock movement. |
| Return receive | Increases `Items.CurrentStock` only by declared restockable quantity and records `ShipmentReturnRestock`. |
| Historical import | None |

Freight approval intentionally does not post to Rojmel. The explicit freight Rojmel endpoint reserves a freight-specific token, invokes the existing Rojmel service, and either completes or releases that reservation to prevent duplicate ledger entries.

### Deployment order

Apply the base schema and the existing Procurement, Rojmel, Supply Chain common-foundation, and Dispatch Planning migrations first. Then apply this Shipment Operations migration, run `verify_shipment_operations_module.sql`, deploy the API, and verify the `shipment-operations` Swagger document and role permissions in the target environment. The migration depends on the existing Rojmel `WalletTransactions` table.

### Verification completed locally

On a disposable LocalDB database, the full dependency migration chain, this migration, the structural verification script, and the transactional shipment smoke test completed successfully. The smoke test covers manual creation, packing, dispatch stock movement, partial receipt, restockable return, the freight/Rojmel approval boundary, and no-stock historical import. A locally started API also served the Shipment Operations Swagger document: all 30 expected paths were present without duplicates, Bearer security was declared, and `ShipmentStatus` was published as 16 named string values.

### Remaining confirmations and limitations

- The workbook itself remains unavailable; import column mapping, historical status equivalence, grouping, currency conventions, and formula/dashboard parity need client confirmation. The current historical import assumes INR where a freight amount is staged.
- Inventory is globally tracked. Warehouse/bin/batch/serial on-hand inventory is not present in the existing model.
- Proof references are URLs/paths until a shared attachment service exists.
- A return item supports one receive action; represent split physical arrivals as separate return lines until return-receipt history is added.
