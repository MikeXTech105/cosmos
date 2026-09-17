# Database Required Fields

## Scope and live-data status

This is a static reconstruction of SQL table declarations in `database/**/*.sql`. It is **not** a live-schema assertion: the staging connection could not authenticate. A later `ALTER TABLE`, procedure rewrite or deployment can supersede a listed creation declaration. The matrix deliberately retains a file-and-line pointer for every parsed column so a planned change can be checked against the exact SQL source.

**DATABASE DATA CHECK: NOT AVAILABLE.** No successful database connection was available to count NULL/empty/default values or orphaned FKs.

## Script-declared column matrix

Columns indexed: 1,775. Tables indexed: 116. SQL `NOT NULL` token occurrences: 1,548. `NO` means the parsed CREATE TABLE column declares `NOT NULL`; `YES` means it declares `NULL`; `SYSTEM` is a `ROWVERSION`/timestamp column. FK targets are parsed only when a same-table create block exposes a single-column FK. Constraints added later must be read at the linked source as well.

| Table | Column | SQL type | Nullable | PK | FK target | Default | Create-table source |
|---|---|---|---|---|---|---|---|
| AuditLogs | ActionType | NVARCHAR(50) | NO | NO | — | — | database/001_Full_Database_Setup.sql:156 |
| AuditLogs | CreatedBy | INT | YES | NO | — | — | database/001_Full_Database_Setup.sql:156 |
| AuditLogs | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:156 |
| AuditLogs | Id | BIGINT | NO | YES | — | — | database/001_Full_Database_Setup.sql:156 |
| AuditLogs | NewValues | NVARCHAR(MAX) | YES | NO | — | — | database/001_Full_Database_Setup.sql:156 |
| AuditLogs | OldValues | NVARCHAR(MAX) | YES | NO | — | — | database/001_Full_Database_Setup.sql:156 |
| AuditLogs | RecordId | NVARCHAR(100) | NO | NO | — | — | database/001_Full_Database_Setup.sql:156 |
| AuditLogs | TableName | NVARCHAR(128) | NO | NO | — | — | database/001_Full_Database_Setup.sql:156 |
| Categories | CreatedAt | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1416 |
| Categories | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:1416 |
| Categories | Description | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:1416 |
| Categories | Id | BIGINT | NO | YES | — | — | database/001_Full_Database_Setup.sql:1416 |
| Categories | IsActive | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1416 |
| Categories | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1416 |
| Categories | ModifiedAt | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:1416 |
| Categories | ModifiedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:1416 |
| Categories | Name | NVARCHAR(100) | NO | NO | — | — | database/001_Full_Database_Setup.sql:1416 |
| ChannelSkuMappings | ChannelProductName | NVARCHAR(300) | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:51 |
| ChannelSkuMappings | ChannelSku | NVARCHAR(150) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:51 |
| ChannelSkuMappings | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:51 |
| ChannelSkuMappings | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:51 |
| ChannelSkuMappings | Id | BIGINT | NO | YES | — | — | database/migrations/20260715_procurement_planning_module.sql:51 |
| ChannelSkuMappings | IsActive | BIT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:51 |
| ChannelSkuMappings | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:51 |
| ChannelSkuMappings | ItemId | BIGINT | NO | NO | Items | — | database/migrations/20260715_procurement_planning_module.sql:51 |
| ChannelSkuMappings | ModifiedAt | DATETIME | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:51 |
| ChannelSkuMappings | ModifiedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:51 |
| ChannelSkuMappings | SalesChannelId | BIGINT | NO | NO | SalesChannels | — | database/migrations/20260715_procurement_planning_module.sql:51 |
| ChannelWarehouses | AddressLine1 | NVARCHAR(250) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | AddressLine2 | NVARCHAR(250) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | ChannelId | BIGINT | NO | NO | SalesChannels | — | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | City | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | DeletedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | DeletedBy | BIGINT | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | Id | BIGINT | NO | YES | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | IsActive | BIT | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | PostalCode | NVARCHAR(20) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | Priority | INT | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | Region | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | SortOrder | INT | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | State | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | WarehouseCode | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| ChannelWarehouses | WarehouseName | NVARCHAR(200) | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| CompanyGstRegistrations | AddressJson | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | AddressLine1 | NVARCHAR(250) | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | AddressLine2 | NVARCHAR(250) | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | BranchId | BIGINT | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | BranchName | NVARCHAR(150) | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | City | NVARCHAR(100) | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | CompanyId | BIGINT | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | CreatedAt | DATETIME | NO | NO | — | YES | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | CreatedBy | BIGINT | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | District | NVARCHAR(100) | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | Gstin | NVARCHAR(15) | NO | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | GstPortalUsername | NVARCHAR(150) | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | Id | BIGINT | NO | YES | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | IsDefault | BIT | NO | NO | — | YES | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | IsDeleted | BIT | NO | NO | — | YES | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | IsEInvoiceEnabled | BIT | NO | NO | — | YES | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | IsEWayBillEnabled | BIT | NO | NO | — | YES | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | IsGstReturnEnabled | BIT | NO | NO | — | YES | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | LastVerifiedAt | DATETIME | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | LegalName | NVARCHAR(250) | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | Pincode | NVARCHAR(20) | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | StateCode | NVARCHAR(10) | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | StateName | NVARCHAR(100) | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | Status | NVARCHAR(50) | NO | NO | — | YES | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | TradeName | NVARCHAR(250) | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | UpdatedAt | DATETIME | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstRegistrations | UpdatedBy | BIGINT | YES | NO | — | — | database/003_gst_integration_module.sql:7 |
| CompanyGstSessions | AuthToken | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:42 |
| CompanyGstSessions | CompanyGstRegistrationId | BIGINT | NO | NO | CompanyGstRegistrations | — | database/003_gst_integration_module.sql:42 |
| CompanyGstSessions | CreatedAt | DATETIME | NO | NO | — | YES | database/003_gst_integration_module.sql:42 |
| CompanyGstSessions | Id | BIGINT | NO | YES | — | — | database/003_gst_integration_module.sql:42 |
| CompanyGstSessions | IsDeleted | BIT | NO | NO | — | YES | database/003_gst_integration_module.sql:42 |
| CompanyGstSessions | LastErrorMessage | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:42 |
| CompanyGstSessions | OtpVerifiedAt | DATETIME | YES | NO | — | — | database/003_gst_integration_module.sql:42 |
| CompanyGstSessions | ProviderName | NVARCHAR(50) | NO | NO | — | YES | database/003_gst_integration_module.sql:42 |
| CompanyGstSessions | RefreshToken | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:42 |
| CompanyGstSessions | SessionType | NVARCHAR(50) | YES | NO | — | — | database/003_gst_integration_module.sql:42 |
| CompanyGstSessions | Status | NVARCHAR(50) | NO | NO | — | YES | database/003_gst_integration_module.sql:42 |
| CompanyGstSessions | TokenExpiresAt | DATETIME | YES | NO | — | — | database/003_gst_integration_module.sql:42 |
| CompanyGstSessions | UpdatedAt | DATETIME | YES | NO | — | — | database/003_gst_integration_module.sql:42 |
| DataBookEntries | Category | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntries | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntries | CreatedBy | INT | NO | NO | Users | — | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntries | DeletedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntries | DeletedBy | INT | YES | NO | Users | — | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntries | Description | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntries | Id | BIGINT | NO | YES | — | — | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntries | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntries | IsPrivate | BIT | NO | NO | — | YES | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntries | Name | NVARCHAR(200) | NO | NO | — | — | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntries | OwnerUserId | INT | NO | NO | Users | — | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntries | RowVersion | ROWVERSION | NO | NO | — | — | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntries | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntries | UpdatedBy | INT | YES | NO | Users | — | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntries | Value | NVARCHAR(MAX) | NO | NO | — | — | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntryHistory | ActionType | NVARCHAR(30) | NO | NO | — | — | database/migrations/20260806_data_book_module.sql:48 |
| DataBookEntryHistory | ChangedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260806_data_book_module.sql:48 |
| DataBookEntryHistory | ChangedByUserId | INT | NO | NO | Users | — | database/migrations/20260806_data_book_module.sql:48 |
| DataBookEntryHistory | ChangedFieldsJson | NVARCHAR(MAX) | NO | NO | — | — | database/migrations/20260806_data_book_module.sql:48 |
| DataBookEntryHistory | CorrelationId | NVARCHAR(128) | YES | NO | — | — | database/migrations/20260806_data_book_module.sql:48 |
| DataBookEntryHistory | DataBookEntryId | BIGINT | NO | NO | DataBookEntries | — | database/migrations/20260806_data_book_module.sql:48 |
| DataBookEntryHistory | Id | BIGINT | NO | YES | — | — | database/migrations/20260806_data_book_module.sql:48 |
| DataBookEntryHistory | NewDataJson | NVARCHAR(MAX) | YES | NO | — | — | database/migrations/20260806_data_book_module.sql:48 |
| DataBookEntryHistory | OldDataJson | NVARCHAR(MAX) | YES | NO | — | — | database/migrations/20260806_data_book_module.sql:48 |
| DispatchAllocations | AllocatedQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:277 |
| DispatchAllocations | CompanyStockSnapshotId | BIGINT | NO | NO | DispatchCompanyStockSnapshots | — | database/migrations/20260728_dispatch_planning_module.sql:277 |
| DispatchAllocations | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:277 |
| DispatchAllocations | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:277 |
| DispatchAllocations | Id | BIGINT | NO | YES | — | — | database/migrations/20260728_dispatch_planning_module.sql:277 |
| DispatchAllocations | PlanningRunId | BIGINT | NO | NO | DispatchPlanningRuns | — | database/migrations/20260728_dispatch_planning_module.sql:277 |
| DispatchAllocations | RecommendationId | BIGINT | NO | NO | DispatchRecommendationResults | — | database/migrations/20260728_dispatch_planning_module.sql:277 |
| DispatchCompanyStockSnapshots | AllocatableQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:210 |
| DispatchCompanyStockSnapshots | AvailableQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:210 |
| DispatchCompanyStockSnapshots | CapturedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:210 |
| DispatchCompanyStockSnapshots | CapturedBy | BIGINT | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:210 |
| DispatchCompanyStockSnapshots | Id | BIGINT | NO | YES | — | — | database/migrations/20260728_dispatch_planning_module.sql:210 |
| DispatchCompanyStockSnapshots | ItemId | BIGINT | NO | NO | Items | — | database/migrations/20260728_dispatch_planning_module.sql:210 |
| DispatchCompanyStockSnapshots | PlanningRunId | BIGINT | NO | NO | DispatchPlanningRuns | — | database/migrations/20260728_dispatch_planning_module.sql:210 |
| DispatchCompanyStockSnapshots | ReservedForOtherOperations | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:210 |
| DispatchCompanyStockSnapshots | SourceReference | NVARCHAR(500) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:210 |
| DispatchCompanyStockSnapshots | SourceType | INT | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:210 |
| DispatchImportStagedRows | AvailableQuantity | DECIMAL(19,6) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | ChannelItemMappingId | BIGINT | YES | NO | ChannelSkuMappings | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | ChannelSku | NVARCHAR(150) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | DamagedQuantity | DECIMAL(19,6) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | ExpectedArrivalDate | DATE | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | Id | BIGINT | NO | YES | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | ImportBatchId | BIGINT | NO | NO | SupplyChainImportBatches | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | InboundQuantity | DECIMAL(19,6) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | InboundStatus | INT | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | IsDuplicate | BIT | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | IsValid | BIT | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | ItemId | BIGINT | YES | NO | Items | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | PeriodFrom | DATE | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | PeriodTo | DATE | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | ReferenceNumber | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | ReservedQuantity | DECIMAL(19,6) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | RowNumber | INT | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | SalesQuantity | DECIMAL(19,6) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | SnapshotDate | DATE | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | SourceReference | NVARCHAR(500) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | SourceRowJson | NVARCHAR(MAX) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | ValidationField | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | ValidationMessage | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchImportStagedRows | WarehouseId | BIGINT | YES | NO | ChannelWarehouses | — | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchPlanningRuns | AllocatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | AllocatedBy | BIGINT | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | AllocationNotes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | CalculatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | CalculatedBy | BIGINT | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | CalculationVersion | NVARCHAR(100) | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | CancellationReason | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | CancelledAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | CancelledBy | BIGINT | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | ChannelId | BIGINT | NO | NO | SalesChannels | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | CompanyStockSourceType | INT | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | FinalizedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | FinalizedBy | BIGINT | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | Id | BIGINT | NO | YES | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | Notes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | PlanningDate | DATE | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | RunNumber | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | SalesImportBatchId | BIGINT | NO | NO | SupplyChainImportBatches | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | Status | INT | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | WarehouseInboundImportBatchId | BIGINT | YES | NO | SupplyChainImportBatches | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchPlanningRuns | WarehouseStockImportBatchId | BIGINT | NO | NO | SupplyChainImportBatches | — | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchRecommendationResults | AllocatedQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | AllocationPriority | INT | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | AllowLooseQuantity | BIT | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | BoxCount | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | CalculatedRecommendationQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | CalculationExplanation | NVARCHAR(4000) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | ChannelItemMappingId | BIGINT | NO | NO | ChannelSkuMappings | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | CurrentSellableQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | DispatchSkuSettingId | BIGINT | NO | NO | DispatchSkuSettings | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | EligibleInboundQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | FinalRecommendationQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | Id | BIGINT | NO | YES | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | ItemId | BIGINT | NO | NO | Items | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | OverriddenAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | OverriddenBy | BIGINT | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | OverrideReason | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | PackagingProfileId | BIGINT | NO | NO | ItemPackagingProfiles | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | PlanningRunId | BIGINT | NO | NO | DispatchPlanningRuns | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | RawShortage | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | RecurringDemand | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | ReorderPoint | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | RoundingMode | INT | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | SafetyStock | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | SalesQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | Tier | INT | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | TotalWarehouseStock | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | UnitsPerBox | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchRecommendationResults | WarehouseId | BIGINT | NO | NO | ChannelWarehouses | — | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchSkuSettings | AllocationPriority | INT | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | AllowLooseQuantity | BIT | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | ChannelId | BIGINT | YES | NO | SalesChannels | — | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | DeletedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | DeletedBy | BIGINT | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | EffectiveFrom | DATE | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | EffectiveTo | DATE | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | Id | BIGINT | NO | YES | — | — | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | IsActive | BIT | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | ItemId | BIGINT | NO | NO | Items | — | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | MinimumDispatchQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | PackagingProfileId | BIGINT | YES | NO | ItemPackagingProfiles | — | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | RecurringDemandFactor | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | RoundingMode | INT | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | SafetyStockFactor | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | Tier | INT | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchSkuSettings | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchWarehouseInboundSnapshots | ChannelId | BIGINT | NO | NO | SalesChannels | — | database/migrations/20260728_dispatch_planning_module.sql:144 |
| DispatchWarehouseInboundSnapshots | ChannelItemMappingId | BIGINT | NO | NO | ChannelSkuMappings | — | database/migrations/20260728_dispatch_planning_module.sql:144 |
| DispatchWarehouseInboundSnapshots | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:144 |
| DispatchWarehouseInboundSnapshots | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:144 |
| DispatchWarehouseInboundSnapshots | ExpectedArrivalDate | DATE | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:144 |
| DispatchWarehouseInboundSnapshots | Id | BIGINT | NO | YES | — | — | database/migrations/20260728_dispatch_planning_module.sql:144 |
| DispatchWarehouseInboundSnapshots | ImportBatchId | BIGINT | NO | NO | SupplyChainImportBatches | — | database/migrations/20260728_dispatch_planning_module.sql:144 |
| DispatchWarehouseInboundSnapshots | InboundQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:144 |
| DispatchWarehouseInboundSnapshots | InboundStatus | INT | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:144 |
| DispatchWarehouseInboundSnapshots | ItemId | BIGINT | NO | NO | Items | — | database/migrations/20260728_dispatch_planning_module.sql:144 |
| DispatchWarehouseInboundSnapshots | ReferenceNumber | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:144 |
| DispatchWarehouseInboundSnapshots | SnapshotDate | DATE | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:144 |
| DispatchWarehouseInboundSnapshots | SourceReference | NVARCHAR(500) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:144 |
| DispatchWarehouseInboundSnapshots | WarehouseId | BIGINT | NO | NO | ChannelWarehouses | — | database/migrations/20260728_dispatch_planning_module.sql:144 |
| DispatchWarehouseSalesSnapshots | ChannelId | BIGINT | NO | NO | SalesChannels | — | database/migrations/20260728_dispatch_planning_module.sql:88 |
| DispatchWarehouseSalesSnapshots | ChannelItemMappingId | BIGINT | NO | NO | ChannelSkuMappings | — | database/migrations/20260728_dispatch_planning_module.sql:88 |
| DispatchWarehouseSalesSnapshots | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:88 |
| DispatchWarehouseSalesSnapshots | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:88 |
| DispatchWarehouseSalesSnapshots | Id | BIGINT | NO | YES | — | — | database/migrations/20260728_dispatch_planning_module.sql:88 |
| DispatchWarehouseSalesSnapshots | ImportBatchId | BIGINT | NO | NO | SupplyChainImportBatches | — | database/migrations/20260728_dispatch_planning_module.sql:88 |
| DispatchWarehouseSalesSnapshots | ItemId | BIGINT | NO | NO | Items | — | database/migrations/20260728_dispatch_planning_module.sql:88 |
| DispatchWarehouseSalesSnapshots | PeriodFrom | DATE | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:88 |
| DispatchWarehouseSalesSnapshots | PeriodTo | DATE | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:88 |
| DispatchWarehouseSalesSnapshots | SalesQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:88 |
| DispatchWarehouseSalesSnapshots | SourceReference | NVARCHAR(500) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:88 |
| DispatchWarehouseSalesSnapshots | WarehouseId | BIGINT | NO | NO | ChannelWarehouses | — | database/migrations/20260728_dispatch_planning_module.sql:88 |
| DispatchWarehouseStockSnapshots | AvailableQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:115 |
| DispatchWarehouseStockSnapshots | ChannelId | BIGINT | NO | NO | SalesChannels | — | database/migrations/20260728_dispatch_planning_module.sql:115 |
| DispatchWarehouseStockSnapshots | ChannelItemMappingId | BIGINT | NO | NO | ChannelSkuMappings | — | database/migrations/20260728_dispatch_planning_module.sql:115 |
| DispatchWarehouseStockSnapshots | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:115 |
| DispatchWarehouseStockSnapshots | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:115 |
| DispatchWarehouseStockSnapshots | DamagedQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:115 |
| DispatchWarehouseStockSnapshots | Id | BIGINT | NO | YES | — | — | database/migrations/20260728_dispatch_planning_module.sql:115 |
| DispatchWarehouseStockSnapshots | ImportBatchId | BIGINT | NO | NO | SupplyChainImportBatches | — | database/migrations/20260728_dispatch_planning_module.sql:115 |
| DispatchWarehouseStockSnapshots | ItemId | BIGINT | NO | NO | Items | — | database/migrations/20260728_dispatch_planning_module.sql:115 |
| DispatchWarehouseStockSnapshots | ReservedQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260728_dispatch_planning_module.sql:115 |
| DispatchWarehouseStockSnapshots | SellableQuantity | AS (CASE WHEN AvailableQuantity-ReservedQuantity-DamagedQuantity<0 THEN CONVERT(DECIMAL(19,6) | UNSPECIFIED | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:115 |
| DispatchWarehouseStockSnapshots | SnapshotDate | DATE | NO | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:115 |
| DispatchWarehouseStockSnapshots | SourceReference | NVARCHAR(500) | YES | NO | — | — | database/migrations/20260728_dispatch_planning_module.sql:115 |
| DispatchWarehouseStockSnapshots | WarehouseId | BIGINT | NO | NO | ChannelWarehouses | — | database/migrations/20260728_dispatch_planning_module.sql:115 |
| EInvoices | AckDate | DATETIME | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | AckNumber | NVARCHAR(100) | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | BuyerGstin | NVARCHAR(15) | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | CancelledAt | DATETIME | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | CancelReason | NVARCHAR(500) | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | CancelReasonCode | NVARCHAR(50) | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | CompanyGstRegistrationId | BIGINT | NO | NO | CompanyGstRegistrations | — | database/003_gst_integration_module.sql:128 |
| EInvoices | CreatedAt | DATETIME | NO | NO | — | YES | database/003_gst_integration_module.sql:128 |
| EInvoices | CreatedBy | BIGINT | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | DocumentDate | DATETIME | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | DocumentNumber | NVARCHAR(100) | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | DocumentType | NVARCHAR(50) | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | GeneratedRequestJson | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | GeneratedResponseJson | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | Id | BIGINT | NO | YES | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | Irn | NVARCHAR(500) | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | IsDeleted | BIT | NO | NO | — | YES | database/003_gst_integration_module.sql:128 |
| EInvoices | SalesInvoiceId | BIGINT | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | SellerGstin | NVARCHAR(15) | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | SignedInvoice | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | SignedQrCode | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | Status | NVARCHAR(50) | NO | NO | — | YES | database/003_gst_integration_module.sql:128 |
| EInvoices | UpdatedAt | DATETIME | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EInvoices | UpdatedBy | BIGINT | YES | NO | — | — | database/003_gst_integration_module.sql:128 |
| EWayBills | CancelledAt | DATETIME | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | CancelReason | NVARCHAR(500) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | CancelReasonCode | NVARCHAR(50) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | CompanyGstRegistrationId | BIGINT | NO | NO | CompanyGstRegistrations | — | database/003_gst_integration_module.sql:89 |
| EWayBills | CreatedAt | DATETIME | NO | NO | — | YES | database/003_gst_integration_module.sql:89 |
| EWayBills | CreatedBy | BIGINT | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | Distance | DECIMAL(18,2) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | DocumentDate | DATETIME | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | DocumentNumber | NVARCHAR(100) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | DocumentType | NVARCHAR(50) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | EWayBillNumber | NVARCHAR(100) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | FromGstin | NVARCHAR(15) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | GeneratedRequestJson | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | GeneratedResponseJson | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | Id | BIGINT | NO | YES | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | IsDeleted | BIT | NO | NO | — | YES | database/003_gst_integration_module.sql:89 |
| EWayBills | PurchaseInvoiceId | BIGINT | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | SalesInvoiceId | BIGINT | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | Status | NVARCHAR(50) | NO | NO | — | YES | database/003_gst_integration_module.sql:89 |
| EWayBills | SubSupplyType | NVARCHAR(20) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | SupplyType | NVARCHAR(20) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | ToGstin | NVARCHAR(15) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | TransporterId | NVARCHAR(50) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | TransporterName | NVARCHAR(250) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | TransportMode | NVARCHAR(20) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | UpdatedAt | DATETIME | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | UpdatedBy | BIGINT | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | ValidUpTo | DATETIME | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | VehicleNumber | NVARCHAR(50) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| EWayBills | VehicleType | NVARCHAR(20) | YES | NO | — | — | database/003_gst_integration_module.sql:89 |
| ExpenseCategories | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3654 |
| ExpenseCategories | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3654 |
| ExpenseCategories | Description | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3654 |
| ExpenseCategories | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3654 |
| ExpenseCategories | IsActive | BIT | NO | NO | — | — | database/001_Full_Database_Setup.sql:3654 |
| ExpenseCategories | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3654 |
| ExpenseCategories | Name | NVARCHAR(150) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3654 |
| ExpenseCategories | RowVersion | ROWVERSION | SYSTEM | NO | — | — | database/001_Full_Database_Setup.sql:3654 |
| ExpenseCategories | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:3654 |
| ExpenseCategories | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3654 |
| Expenses | Amount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3655 |
| Expenses | AttachmentPath | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3655 |
| Expenses | CategoryId | BIGINT | NO | NO | ExpenseCategories | — | database/001_Full_Database_Setup.sql:3655 |
| Expenses | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3655 |
| Expenses | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3655 |
| Expenses | ExpenseDate | DATE | NO | NO | — | — | database/001_Full_Database_Setup.sql:3655 |
| Expenses | ExpenseNo | NVARCHAR(50) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3655 |
| Expenses | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3655 |
| Expenses | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3655 |
| Expenses | Notes | NVARCHAR(1000) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3655 |
| Expenses | PaidToPartyId | UNIQUEIDENTIFIER | YES | NO | Parties | — | database/001_Full_Database_Setup.sql:3655 |
| Expenses | PaymentMode | INT | NO | NO | PaymentModes | — | database/001_Full_Database_Setup.sql:3655 |
| Expenses | ReferenceNo | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3655 |
| Expenses | RowVersion | ROWVERSION | SYSTEM | NO | — | — | database/001_Full_Database_Setup.sql:3655 |
| Expenses | TaxAmount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3655 |
| Expenses | TotalAmount | AS (Amount+TaxAmount) | UNSPECIFIED | NO | — | — | database/001_Full_Database_Setup.sql:3655 |
| Expenses | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:3655 |
| Expenses | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3655 |
| GstApiLogs | ApiType | NVARCHAR(100) | NO | NO | — | — | database/003_gst_integration_module.sql:161 |
| GstApiLogs | CompanyGstRegistrationId | BIGINT | YES | NO | CompanyGstRegistrations | — | database/003_gst_integration_module.sql:161 |
| GstApiLogs | CorrelationId | NVARCHAR(100) | YES | NO | — | — | database/003_gst_integration_module.sql:161 |
| GstApiLogs | CreatedAt | DATETIME | NO | NO | — | YES | database/003_gst_integration_module.sql:161 |
| GstApiLogs | CreatedBy | BIGINT | YES | NO | — | — | database/003_gst_integration_module.sql:161 |
| GstApiLogs | DurationMs | INT | YES | NO | — | — | database/003_gst_integration_module.sql:161 |
| GstApiLogs | Endpoint | NVARCHAR(500) | YES | NO | — | — | database/003_gst_integration_module.sql:161 |
| GstApiLogs | ErrorMessage | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:161 |
| GstApiLogs | HttpMethod | NVARCHAR(20) | YES | NO | — | — | database/003_gst_integration_module.sql:161 |
| GstApiLogs | Id | BIGINT | NO | YES | — | — | database/003_gst_integration_module.sql:161 |
| GstApiLogs | IsSuccess | BIT | NO | NO | — | — | database/003_gst_integration_module.sql:161 |
| GstApiLogs | ProviderName | NVARCHAR(50) | NO | NO | — | YES | database/003_gst_integration_module.sql:161 |
| GstApiLogs | RequestPayload | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:161 |
| GstApiLogs | ResponsePayload | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:161 |
| GstApiLogs | StatusCode | INT | YES | NO | — | — | database/003_gst_integration_module.sql:161 |
| GstVerificationLogs | AddressJson | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | CacheExpiresAt | DATETIME | YES | NO | — | — | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | CreatedAt | DATETIME | NO | NO | — | YES | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | CreatedBy | BIGINT | YES | NO | — | — | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | Gstin | NVARCHAR(15) | NO | NO | — | — | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | Id | BIGINT | NO | YES | — | — | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | IsDeleted | BIT | NO | NO | — | YES | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | LegalName | NVARCHAR(250) | YES | NO | — | — | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | NatureOfBusinessJson | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | ProviderName | NVARCHAR(50) | NO | NO | — | YES | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | RawResponseJson | NVARCHAR(MAX) | YES | NO | — | — | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | RegistrationDate | DATETIME | YES | NO | — | — | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | StateCode | NVARCHAR(10) | YES | NO | — | — | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | Status | NVARCHAR(50) | YES | NO | — | — | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | TaxpayerType | NVARCHAR(100) | YES | NO | — | — | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | TradeName | NVARCHAR(250) | YES | NO | — | — | database/003_gst_integration_module.sql:64 |
| GstVerificationLogs | VerifiedAt | DATETIME | NO | NO | — | YES | database/003_gst_integration_module.sql:64 |
| HR_Attendance | AttendanceDate | DATE | NO | NO | — | — | database/001_Full_Database_Setup.sql:2187 |
| HR_Attendance | AttendanceStatus | INT | NO | NO | — | — | database/001_Full_Database_Setup.sql:2187 |
| HR_Attendance | CheckInTime | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2187 |
| HR_Attendance | CheckOutTime | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2187 |
| HR_Attendance | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2187 |
| HR_Attendance | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2187 |
| HR_Attendance | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2187 |
| HR_Attendance | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2187 |
| HR_Attendance | EmployeeId | BIGINT | NO | NO | HR_Employees | — | database/001_Full_Database_Setup.sql:2187 |
| HR_Attendance | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2187 |
| HR_Attendance | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2187 |
| HR_Attendance | OvertimeMinutes | INT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2187 |
| HR_Attendance | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2187 |
| HR_Attendance | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2187 |
| HR_Attendance | WorkingMinutes | INT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2187 |
| HR_AttendanceAdjustments | ApprovedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2206 |
| HR_AttendanceAdjustments | ApprovedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2206 |
| HR_AttendanceAdjustments | AttendanceId | BIGINT | NO | NO | HR_Attendance | — | database/001_Full_Database_Setup.sql:2206 |
| HR_AttendanceAdjustments | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2206 |
| HR_AttendanceAdjustments | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2206 |
| HR_AttendanceAdjustments | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2206 |
| HR_AttendanceAdjustments | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2206 |
| HR_AttendanceAdjustments | EmployeeId | BIGINT | NO | NO | HR_Employees | — | database/001_Full_Database_Setup.sql:2206 |
| HR_AttendanceAdjustments | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2206 |
| HR_AttendanceAdjustments | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2206 |
| HR_AttendanceAdjustments | Reason | NVARCHAR(500) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2206 |
| HR_AttendanceAdjustments | Remarks | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2206 |
| HR_AttendanceAdjustments | Status | INT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2206 |
| HR_AttendanceAdjustments | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2206 |
| HR_AttendanceAdjustments | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2206 |
| HR_Departments | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2064 |
| HR_Departments | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2064 |
| HR_Departments | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2064 |
| HR_Departments | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2064 |
| HR_Departments | DepartmentCode | NVARCHAR(20) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2064 |
| HR_Departments | DepartmentName | NVARCHAR(200) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2064 |
| HR_Departments | Description | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2064 |
| HR_Departments | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2064 |
| HR_Departments | IsActive | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2064 |
| HR_Departments | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2064 |
| HR_Departments | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2064 |
| HR_Departments | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2064 |
| HR_Designations | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2079 |
| HR_Designations | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2079 |
| HR_Designations | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2079 |
| HR_Designations | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2079 |
| HR_Designations | DepartmentId | BIGINT | NO | NO | HR_Departments | — | database/001_Full_Database_Setup.sql:2079 |
| HR_Designations | Description | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2079 |
| HR_Designations | DesignationCode | NVARCHAR(20) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2079 |
| HR_Designations | DesignationName | NVARCHAR(200) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2079 |
| HR_Designations | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2079 |
| HR_Designations | IsActive | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2079 |
| HR_Designations | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2079 |
| HR_Designations | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2079 |
| HR_Designations | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2079 |
| HR_EmployeeAddresses | AddressLine1 | NVARCHAR(250) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeAddresses | AddressLine2 | NVARCHAR(250) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeAddresses | AddressType | NVARCHAR(30) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeAddresses | City | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeAddresses | Country | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeAddresses | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeAddresses | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeAddresses | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeAddresses | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeAddresses | EmployeeId | BIGINT | NO | NO | HR_Employees | — | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeAddresses | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeAddresses | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeAddresses | Pincode | NVARCHAR(20) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeAddresses | State | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeAddresses | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeAddresses | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeBankAccounts | AccountNumber | NVARCHAR(50) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2158 |
| HR_EmployeeBankAccounts | BankName | NVARCHAR(150) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2158 |
| HR_EmployeeBankAccounts | BranchName | NVARCHAR(150) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2158 |
| HR_EmployeeBankAccounts | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2158 |
| HR_EmployeeBankAccounts | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2158 |
| HR_EmployeeBankAccounts | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2158 |
| HR_EmployeeBankAccounts | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2158 |
| HR_EmployeeBankAccounts | EmployeeId | BIGINT | NO | NO | HR_Employees | — | database/001_Full_Database_Setup.sql:2158 |
| HR_EmployeeBankAccounts | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2158 |
| HR_EmployeeBankAccounts | IFSCCode | NVARCHAR(20) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2158 |
| HR_EmployeeBankAccounts | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2158 |
| HR_EmployeeBankAccounts | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2158 |
| HR_EmployeeBankAccounts | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2158 |
| HR_EmployeeBankAccounts | UPIId | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2158 |
| HR_EmployeeDocuments | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2173 |
| HR_EmployeeDocuments | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2173 |
| HR_EmployeeDocuments | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2173 |
| HR_EmployeeDocuments | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2173 |
| HR_EmployeeDocuments | DocumentType | NVARCHAR(50) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2173 |
| HR_EmployeeDocuments | EmployeeId | BIGINT | NO | NO | HR_Employees | — | database/001_Full_Database_Setup.sql:2173 |
| HR_EmployeeDocuments | ExpiryDate | DATE | YES | NO | — | — | database/001_Full_Database_Setup.sql:2173 |
| HR_EmployeeDocuments | FileName | NVARCHAR(255) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2173 |
| HR_EmployeeDocuments | FilePath | NVARCHAR(1000) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2173 |
| HR_EmployeeDocuments | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2173 |
| HR_EmployeeDocuments | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2173 |
| HR_EmployeeDocuments | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2173 |
| HR_EmployeeDocuments | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2173 |
| HR_Employees | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | DateOfBirth | DATE | YES | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | DepartmentId | BIGINT | NO | NO | HR_Departments | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | DesignationId | BIGINT | NO | NO | HR_Designations | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | Email | NVARCHAR(200) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | EmployeeCode | NVARCHAR(30) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | EmploymentType | INT | NO | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | FirstName | NVARCHAR(100) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | Gender | INT | NO | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | IsActive | AS | UNSPECIFIED | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | JoiningDate | DATE | NO | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | LastName | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | LastWorkingDate | DATE | YES | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | Mobile | NVARCHAR(20) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | ProfilePhotoUrl | NVARCHAR(1000) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | RejoinedDate | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | RejoinRemarks | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | ReportingManagerId | BIGINT | YES | NO | HR_Employees | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | ResignationReason | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | ResignedDate | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | ShiftId | BIGINT | NO | NO | HR_Shifts | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | Status | INT | NO | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_Employees | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2115 |
| HR_EmployeeSalaryStructures | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2315 |
| HR_EmployeeSalaryStructures | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2315 |
| HR_EmployeeSalaryStructures | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2315 |
| HR_EmployeeSalaryStructures | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2315 |
| HR_EmployeeSalaryStructures | EffectiveDate | DATE | NO | NO | — | — | database/001_Full_Database_Setup.sql:2315 |
| HR_EmployeeSalaryStructures | EmployeeId | BIGINT | NO | NO | HR_Employees | — | database/001_Full_Database_Setup.sql:2315 |
| HR_EmployeeSalaryStructures | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2315 |
| HR_EmployeeSalaryStructures | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2315 |
| HR_EmployeeSalaryStructures | SalaryStructureId | BIGINT | NO | NO | HR_SalaryStructures | — | database/001_Full_Database_Setup.sql:2315 |
| HR_EmployeeSalaryStructures | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2315 |
| HR_EmployeeSalaryStructures | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2315 |
| HR_LeaveApplications | ApprovedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | ApprovedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | EmployeeId | BIGINT | NO | NO | HR_Employees | — | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | EndDate | DATE | NO | NO | — | — | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | LeaveDays | AS | UNSPECIFIED | NO | — | — | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | LeaveTypeId | BIGINT | NO | NO | HR_LeaveTypes | — | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | Reason | NVARCHAR(500) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | Remarks | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | StartDate | DATE | NO | NO | — | — | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | Status | INT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveApplications | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveBalances | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2238 |
| HR_LeaveBalances | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2238 |
| HR_LeaveBalances | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2238 |
| HR_LeaveBalances | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2238 |
| HR_LeaveBalances | EmployeeId | BIGINT | NO | NO | HR_Employees | — | database/001_Full_Database_Setup.sql:2238 |
| HR_LeaveBalances | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2238 |
| HR_LeaveBalances | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2238 |
| HR_LeaveBalances | LeaveTypeId | BIGINT | NO | NO | HR_LeaveTypes | — | database/001_Full_Database_Setup.sql:2238 |
| HR_LeaveBalances | OpeningBalance | DECIMAL(8,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2238 |
| HR_LeaveBalances | RemainingBalance | DECIMAL(8,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2238 |
| HR_LeaveBalances | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2238 |
| HR_LeaveBalances | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2238 |
| HR_LeaveBalances | UsedBalance | DECIMAL(8,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2238 |
| HR_LeaveTypes | AnnualQuota | DECIMAL(8,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2224 |
| HR_LeaveTypes | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2224 |
| HR_LeaveTypes | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2224 |
| HR_LeaveTypes | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2224 |
| HR_LeaveTypes | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2224 |
| HR_LeaveTypes | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2224 |
| HR_LeaveTypes | IsActive | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2224 |
| HR_LeaveTypes | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2224 |
| HR_LeaveTypes | IsPaidLeave | BIT | NO | NO | — | — | database/001_Full_Database_Setup.sql:2224 |
| HR_LeaveTypes | LeaveCode | NVARCHAR(20) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2224 |
| HR_LeaveTypes | LeaveName | NVARCHAR(100) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2224 |
| HR_LeaveTypes | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2224 |
| HR_LeaveTypes | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2224 |
| HR_PayrollDetails | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2343 |
| HR_PayrollDetails | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2343 |
| HR_PayrollDetails | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2343 |
| HR_PayrollDetails | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2343 |
| HR_PayrollDetails | EmployeeId | BIGINT | NO | NO | HR_Employees | — | database/001_Full_Database_Setup.sql:2343 |
| HR_PayrollDetails | GrossSalary | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2343 |
| HR_PayrollDetails | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2343 |
| HR_PayrollDetails | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2343 |
| HR_PayrollDetails | NetSalary | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2343 |
| HR_PayrollDetails | PayableDays | DECIMAL(8,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2343 |
| HR_PayrollDetails | PayrollRunId | BIGINT | NO | NO | HR_PayrollRuns | — | database/001_Full_Database_Setup.sql:2343 |
| HR_PayrollDetails | TotalDeduction | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2343 |
| HR_PayrollDetails | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2343 |
| HR_PayrollDetails | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2343 |
| HR_PayrollRuns | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2329 |
| HR_PayrollRuns | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2329 |
| HR_PayrollRuns | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2329 |
| HR_PayrollRuns | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2329 |
| HR_PayrollRuns | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2329 |
| HR_PayrollRuns | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2329 |
| HR_PayrollRuns | PayrollMonth | INT | NO | NO | — | — | database/001_Full_Database_Setup.sql:2329 |
| HR_PayrollRuns | PayrollYear | INT | NO | NO | — | — | database/001_Full_Database_Setup.sql:2329 |
| HR_PayrollRuns | Status | INT | NO | NO | — | — | database/001_Full_Database_Setup.sql:2329 |
| HR_PayrollRuns | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2329 |
| HR_PayrollRuns | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2329 |
| HR_SalaryComponents | ComponentName | NVARCHAR(150) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2287 |
| HR_SalaryComponents | ComponentType | INT | NO | NO | — | — | database/001_Full_Database_Setup.sql:2287 |
| HR_SalaryComponents | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2287 |
| HR_SalaryComponents | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2287 |
| HR_SalaryComponents | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2287 |
| HR_SalaryComponents | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2287 |
| HR_SalaryComponents | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2287 |
| HR_SalaryComponents | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2287 |
| HR_SalaryComponents | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2287 |
| HR_SalaryComponents | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2287 |
| HR_SalaryStructureComponents | Amount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2301 |
| HR_SalaryStructureComponents | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2301 |
| HR_SalaryStructureComponents | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2301 |
| HR_SalaryStructureComponents | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2301 |
| HR_SalaryStructureComponents | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2301 |
| HR_SalaryStructureComponents | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2301 |
| HR_SalaryStructureComponents | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2301 |
| HR_SalaryStructureComponents | SalaryComponentId | BIGINT | NO | NO | HR_SalaryComponents | — | database/001_Full_Database_Setup.sql:2301 |
| HR_SalaryStructureComponents | SalaryStructureId | BIGINT | NO | NO | HR_SalaryStructures | — | database/001_Full_Database_Setup.sql:2301 |
| HR_SalaryStructureComponents | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2301 |
| HR_SalaryStructureComponents | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2301 |
| HR_SalaryStructures | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2275 |
| HR_SalaryStructures | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2275 |
| HR_SalaryStructures | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2275 |
| HR_SalaryStructures | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2275 |
| HR_SalaryStructures | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2275 |
| HR_SalaryStructures | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2275 |
| HR_SalaryStructures | Name | NVARCHAR(150) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2275 |
| HR_SalaryStructures | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2275 |
| HR_SalaryStructures | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2275 |
| HR_Shifts | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2096 |
| HR_Shifts | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2096 |
| HR_Shifts | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2096 |
| HR_Shifts | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2096 |
| HR_Shifts | EndTime | TIME(0) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2096 |
| HR_Shifts | GraceMinutes | INT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2096 |
| HR_Shifts | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:2096 |
| HR_Shifts | IsActive | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2096 |
| HR_Shifts | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2096 |
| HR_Shifts | IsNightShift | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2096 |
| HR_Shifts | ShiftCode | NVARCHAR(20) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2096 |
| HR_Shifts | ShiftName | NVARCHAR(200) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2096 |
| HR_Shifts | StartTime | TIME(0) | NO | NO | — | — | database/001_Full_Database_Setup.sql:2096 |
| HR_Shifts | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:2096 |
| HR_Shifts | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:2096 |
| HR_Shifts | WeeklyHours | DECIMAL(6,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:2096 |
| ItemPackagingProfiles | CalculatedVolumetricWeight | AS (CASE WHEN VolumetricDivisor IS NULL OR VolumetricDivisor=0 THEN NULL ELSE (Length*Width*Height) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | ChannelId | BIGINT | YES | NO | SalesChannels | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | DeletedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | DeletedBy | BIGINT | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | DimensionUnit | NVARCHAR(5) | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | EffectiveFrom | DATE | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | EffectiveTo | DATE | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | GrossWeight | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | Height | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | Id | BIGINT | NO | YES | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | IsActive | BIT | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | IsDefault | BIT | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | ItemId | BIGINT | NO | NO | Items | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | Length | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | NetWeight | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | PackagingCode | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | PackagingName | NVARCHAR(150) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | UnitsPerBox | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | VolumetricDivisor | DECIMAL(19,6) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | WeightUnit | NVARCHAR(5) | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| ItemPackagingProfiles | Width | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| Items | Barcode | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:1433 |
| Items | CategoryId | BIGINT | NO | NO | Categories | — | database/001_Full_Database_Setup.sql:1433 |
| Items | CreatedAt | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1433 |
| Items | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:1433 |
| Items | CurrentStock | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1433 |
| Items | Description | NVARCHAR(1000) | YES | NO | — | — | database/001_Full_Database_Setup.sql:1433 |
| Items | GSTRate | DECIMAL(5,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1433 |
| Items | HSNCode | NVARCHAR(50) | YES | NO | — | — | database/001_Full_Database_Setup.sql:1433 |
| Items | Id | BIGINT | NO | YES | — | — | database/001_Full_Database_Setup.sql:1433 |
| Items | ImageUrl | NVARCHAR(1000) | YES | NO | — | — | database/001_Full_Database_Setup.sql:1433 |
| Items | IsActive | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1433 |
| Items | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1433 |
| Items | ItemCode | NVARCHAR(50) | NO | NO | — | — | database/001_Full_Database_Setup.sql:1433 |
| Items | ItemType | INT | NO | NO | — | — | database/001_Full_Database_Setup.sql:1433 |
| Items | MinimumStock | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1433 |
| Items | ModifiedAt | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:1433 |
| Items | ModifiedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:1433 |
| Items | Name | NVARCHAR(200) | NO | NO | — | — | database/001_Full_Database_Setup.sql:1433 |
| Items | OpeningStock | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1433 |
| Items | OpeningStockValue | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1433 |
| Items | PurchasePrice | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1433 |
| Items | ReservedStock | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1433 |
| Items | SalesPrice | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1433 |
| Items | TrackInventory | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1433 |
| Items | UnitId | BIGINT | NO | NO | Units | — | database/001_Full_Database_Setup.sql:1433 |
| NumberSequences | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3098 |
| NumberSequences | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3098 |
| NumberSequences | ModuleName | NVARCHAR(100) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3098 |
| NumberSequences | NextNumber | BIGINT | NO | NO | — | — | database/001_Full_Database_Setup.sql:3098 |
| NumberSequences | PaddingLength | INT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3098 |
| NumberSequences | Prefix | NVARCHAR(20) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3098 |
| NumberSequences | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:3098 |
| OeeDowntimeReasons | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260703_oee_module.sql:66 |
| OeeDowntimeReasons | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260703_oee_module.sql:66 |
| OeeDowntimeReasons | Id | BIGINT | NO | YES | — | — | database/migrations/20260703_oee_module.sql:66 |
| OeeDowntimeReasons | IsActive | BIT | NO | NO | — | YES | database/migrations/20260703_oee_module.sql:66 |
| OeeDowntimeReasons | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260703_oee_module.sql:66 |
| OeeDowntimeReasons | ReasonName | NVARCHAR(200) | NO | NO | — | — | database/migrations/20260703_oee_module.sql:66 |
| OeeDowntimeReasons | UpdatedAt | DATETIME | YES | NO | — | — | database/migrations/20260703_oee_module.sql:66 |
| OeeDowntimeReasons | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260703_oee_module.sql:66 |
| OeeMachines | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260703_oee_module.sql:24 |
| OeeMachines | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260703_oee_module.sql:24 |
| OeeMachines | DisplayOrder | INT | NO | NO | — | YES | database/migrations/20260703_oee_module.sql:24 |
| OeeMachines | Id | BIGINT | NO | YES | — | — | database/migrations/20260703_oee_module.sql:24 |
| OeeMachines | IsActive | BIT | NO | NO | — | YES | database/migrations/20260703_oee_module.sql:24 |
| OeeMachines | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260703_oee_module.sql:24 |
| OeeMachines | Location | NVARCHAR(150) | YES | NO | — | — | database/migrations/20260703_oee_module.sql:24 |
| OeeMachines | MachineCode | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260703_oee_module.sql:24 |
| OeeMachines | MachineName | NVARCHAR(150) | NO | NO | — | — | database/migrations/20260703_oee_module.sql:24 |
| OeeMachines | Tonnage | NVARCHAR(50) | YES | NO | — | — | database/migrations/20260703_oee_module.sql:24 |
| OeeMachines | UpdatedAt | DATETIME | YES | NO | — | — | database/migrations/20260703_oee_module.sql:24 |
| OeeMachines | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260703_oee_module.sql:24 |
| OeeMoulds | Cavity | INT | YES | NO | — | — | database/migrations/20260703_oee_module.sql:44 |
| OeeMoulds | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260703_oee_module.sql:44 |
| OeeMoulds | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260703_oee_module.sql:44 |
| OeeMoulds | CycleTime | DECIMAL(18,2) | YES | NO | — | — | database/migrations/20260703_oee_module.sql:44 |
| OeeMoulds | Id | BIGINT | NO | YES | — | — | database/migrations/20260703_oee_module.sql:44 |
| OeeMoulds | IsActive | BIT | NO | NO | — | YES | database/migrations/20260703_oee_module.sql:44 |
| OeeMoulds | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260703_oee_module.sql:44 |
| OeeMoulds | MouldName | NVARCHAR(200) | NO | NO | — | — | database/migrations/20260703_oee_module.sql:44 |
| OeeMoulds | TargetShotPerDay | DECIMAL(18,2) | NO | NO | — | — | database/migrations/20260703_oee_module.sql:44 |
| OeeMoulds | UpdatedAt | DATETIME | YES | NO | — | — | database/migrations/20260703_oee_module.sql:44 |
| OeeMoulds | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260703_oee_module.sql:44 |
| OeeProductionEntries | CalculatedOeePercentage | DECIMAL(9,2) | NO | NO | — | YES | database/migrations/20260703_oee_module.sql:82 |
| OeeProductionEntries | CalculatedTargetShot | DECIMAL(18,2) | NO | NO | — | YES | database/migrations/20260703_oee_module.sql:82 |
| OeeProductionEntries | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260703_oee_module.sql:82 |
| OeeProductionEntries | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260703_oee_module.sql:82 |
| OeeProductionEntries | DowntimeReasonId | BIGINT | NO | NO | OeeDowntimeReasons | — | database/migrations/20260703_oee_module.sql:82 |
| OeeProductionEntries | Id | BIGINT | NO | YES | — | — | database/migrations/20260703_oee_module.sql:82 |
| OeeProductionEntries | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260703_oee_module.sql:82 |
| OeeProductionEntries | MachineId | BIGINT | NO | NO | OeeMachines | — | database/migrations/20260703_oee_module.sql:82 |
| OeeProductionEntries | MachineOnTime | NVARCHAR(5) | NO | NO | — | — | database/migrations/20260703_oee_module.sql:82 |
| OeeProductionEntries | MouldId | BIGINT | NO | NO | OeeMoulds | — | database/migrations/20260703_oee_module.sql:82 |
| OeeProductionEntries | ProductionDate | DATE | NO | NO | — | — | database/migrations/20260703_oee_module.sql:82 |
| OeeProductionEntries | Remarks | NVARCHAR(500) | YES | NO | — | — | database/migrations/20260703_oee_module.sql:82 |
| OeeProductionEntries | ShotCount | INT | NO | NO | — | — | database/migrations/20260703_oee_module.sql:82 |
| OeeProductionEntries | UpdatedAt | DATETIME | YES | NO | — | — | database/migrations/20260703_oee_module.sql:82 |
| OeeProductionEntries | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260703_oee_module.sql:82 |
| Pages | DisplayName | NVARCHAR(150) | NO | NO | — | — | database/001_Full_Database_Setup.sql:87 |
| Pages | Icon | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:87 |
| Pages | Id | INT | NO | YES | — | — | database/001_Full_Database_Setup.sql:87 |
| Pages | IsActive | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:87 |
| Pages | Name | NVARCHAR(100) | NO | NO | — | — | database/001_Full_Database_Setup.sql:87 |
| Pages | ParentPageId | INT | YES | NO | Pages | — | database/001_Full_Database_Setup.sql:87 |
| Pages | Route | NVARCHAR(300) | NO | NO | — | — | database/001_Full_Database_Setup.sql:87 |
| Pages | SortOrder | INT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:87 |
| Parties | BillingAddressLine1 | NVARCHAR(250) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | BillingAddressLine2 | NVARCHAR(250) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | BillingCity | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | BillingCountry | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | BillingPincode | NVARCHAR(20) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | BillingState | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | CreatedBy | UNIQUEIDENTIFIER | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:904 |
| Parties | CreditLimit | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:904 |
| Parties | CreditPeriodDays | INT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:904 |
| Parties | DeletedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | Email | NVARCHAR(200) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | GSTIN | NVARCHAR(20) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | GSTTreatment | INT | NO | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | Id | UNIQUEIDENTIFIER | NO | YES | — | YES | database/001_Full_Database_Setup.sql:904 |
| Parties | IsActive | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:904 |
| Parties | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:904 |
| Parties | LegalName | NVARCHAR(250) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | MobileNo | NVARCHAR(20) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | ModifiedBy | UNIQUEIDENTIFIER | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | ModifiedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | OpeningBalance | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:904 |
| Parties | OpeningBalanceType | INT | NO | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | PartyCode | NVARCHAR(50) | NO | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | PartyName | NVARCHAR(200) | NO | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | RowVersion | ROWVERSION | NO | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | ShippingAddressLine1 | NVARCHAR(250) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | ShippingAddressLine2 | NVARCHAR(250) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | ShippingCity | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | ShippingCountry | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | ShippingPincode | NVARCHAR(20) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | ShippingState | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| Parties | TradeName | NVARCHAR(250) | YES | NO | — | — | database/001_Full_Database_Setup.sql:904 |
| PartyLedgerEntries | Amount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3660 |
| PartyLedgerEntries | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3660 |
| PartyLedgerEntries | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3660 |
| PartyLedgerEntries | EntryDate | DATE | NO | NO | — | — | database/001_Full_Database_Setup.sql:3660 |
| PartyLedgerEntries | EntryType | NVARCHAR(50) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3660 |
| PartyLedgerEntries | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3660 |
| PartyLedgerEntries | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3660 |
| PartyLedgerEntries | Notes | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3660 |
| PartyLedgerEntries | PartyId | UNIQUEIDENTIFIER | NO | NO | Parties | — | database/001_Full_Database_Setup.sql:3660 |
| PartyLedgerEntries | SourceId | BIGINT | NO | NO | — | — | database/001_Full_Database_Setup.sql:3660 |
| PartyLedgerEntries | SourceType | NVARCHAR(50) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3660 |
| PartyRoles | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:14 |
| PartyRoles | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:14 |
| PartyRoles | PartyId | UNIQUEIDENTIFIER | NO | NO | Parties | — | database/migrations/20260729_shipment_operations_module.sql:14 |
| PartyRoles | RoleCode | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:14 |
| PartySettings | AdditionalField1Enabled | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | AdditionalField1Name | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:946 |
| PartySettings | AdditionalField1ShowInPrint | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | AdditionalField2Enabled | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | AdditionalField2Name | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:946 |
| PartySettings | AdditionalField2ShowInPrint | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | AdditionalField3Enabled | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | AdditionalField3Name | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:946 |
| PartySettings | AdditionalField3ShowInPrint | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | AdditionalField4Enabled | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | AdditionalField4Name | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:946 |
| PartySettings | AdditionalField4ShowInPrint | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | AdditionalField4Type | INT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | EnableLoyaltyPoints | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | EnablePartyGrouping | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | EnablePartyStatus | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | EnablePaymentReminder | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | EnableShippingAddress | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | Id | UNIQUEIDENTIFIER | NO | YES | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | ModifiedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:946 |
| PartySettings | PrintShippingAddress | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | ReminderDays | INT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:946 |
| PartySettings | ReminderMessage | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:946 |
| PasswordResetTokens | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:140 |
| PasswordResetTokens | ExpiryDate | DATETIME | NO | NO | — | — | database/001_Full_Database_Setup.sql:140 |
| PasswordResetTokens | Id | BIGINT | NO | YES | — | — | database/001_Full_Database_Setup.sql:140 |
| PasswordResetTokens | IsUsed | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:140 |
| PasswordResetTokens | Token | NVARCHAR(500) | NO | NO | — | — | database/001_Full_Database_Setup.sql:140 |
| PasswordResetTokens | UserId | INT | NO | NO | Users | — | database/001_Full_Database_Setup.sql:140 |
| PaymentModes | Id | INT | NO | YES | — | — | database/001_Full_Database_Setup.sql:3118 |
| PaymentModes | IsActive | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3118 |
| PaymentModes | Name | NVARCHAR(100) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3118 |
| ProcurementInboundStockSnapshots | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260727_procurement_shared_foundation_alignment.sql:15 |
| ProcurementInboundStockSnapshots | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260727_procurement_shared_foundation_alignment.sql:15 |
| ProcurementInboundStockSnapshots | DeletedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260727_procurement_shared_foundation_alignment.sql:15 |
| ProcurementInboundStockSnapshots | DeletedBy | BIGINT | YES | NO | — | — | database/migrations/20260727_procurement_shared_foundation_alignment.sql:15 |
| ProcurementInboundStockSnapshots | Id | BIGINT | NO | YES | — | — | database/migrations/20260727_procurement_shared_foundation_alignment.sql:15 |
| ProcurementInboundStockSnapshots | InboundQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260727_procurement_shared_foundation_alignment.sql:15 |
| ProcurementInboundStockSnapshots | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260727_procurement_shared_foundation_alignment.sql:15 |
| ProcurementInboundStockSnapshots | IsValid | BIT | NO | NO | — | YES | database/migrations/20260727_procurement_shared_foundation_alignment.sql:15 |
| ProcurementInboundStockSnapshots | ItemId | BIGINT | NO | NO | Items | — | database/migrations/20260727_procurement_shared_foundation_alignment.sql:15 |
| ProcurementInboundStockSnapshots | Notes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260727_procurement_shared_foundation_alignment.sql:15 |
| ProcurementInboundStockSnapshots | Reference | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260727_procurement_shared_foundation_alignment.sql:15 |
| ProcurementInboundStockSnapshots | SnapshotDate | DATE | NO | NO | — | — | database/migrations/20260727_procurement_shared_foundation_alignment.sql:15 |
| ProcurementInboundStockSnapshots | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260727_procurement_shared_foundation_alignment.sql:15 |
| ProcurementInboundStockSnapshots | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260727_procurement_shared_foundation_alignment.sql:15 |
| ProcurementLeadTimeHistory | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:207 |
| ProcurementLeadTimeHistory | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:207 |
| ProcurementLeadTimeHistory | Id | BIGINT | NO | YES | — | — | database/migrations/20260715_procurement_planning_module.sql:207 |
| ProcurementLeadTimeHistory | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:207 |
| ProcurementLeadTimeHistory | ItemId | BIGINT | NO | NO | Items | — | database/migrations/20260715_procurement_planning_module.sql:207 |
| ProcurementLeadTimeHistory | LeadTimeDays | AS | UNSPECIFIED | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:207 |
| ProcurementLeadTimeHistory | Notes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:207 |
| ProcurementLeadTimeHistory | OrderedDate | DATE | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:207 |
| ProcurementLeadTimeHistory | ReceivedDate | DATE | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:207 |
| ProcurementLeadTimeHistory | Reference | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:207 |
| ProcurementPlanningRunLines | AdjustmentReason | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | AutomaticCalculationEnabled | BIT | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | AverageDailyUsage | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | CalculatedSuggestedQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | CalculationExplanation | NVARCHAR(4000) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | FinalQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | Id | BIGINT | NO | YES | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | LeadTimeDays | DECIMAL(9,3) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | LeadTimeDemand | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | LeadTimeSource | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | ManualPlanning | BIT | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | MaterialItemCode | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | MaterialItemId | BIGINT | NO | NO | Items | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | MaterialItemName | NVARCHAR(200) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | MaterialRequirement | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | MinimumOrderQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | ModifiedAt | DATETIME | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | ModifiedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | OrderMultiple | DECIMAL(19,6) | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | PhysicalStock | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | PlanningRunId | BIGINT | NO | NO | ProcurementPlanningRuns | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | ReorderPoint | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | RoundingRule | INT | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | SafetyFactor | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | SafetyStock | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | Shortage | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | UnitId | BIGINT | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | UnitName | NVARCHAR(100) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | UnitShortName | NVARCHAR(20) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRunLines | WarningState | NVARCHAR(2000) | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRuns | CalculatedAtUtc | DATETIME | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementPlanningRuns | CalculationVersion | NVARCHAR(100) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementPlanningRuns | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementPlanningRuns | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementPlanningRuns | FinalizedAt | DATETIME | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementPlanningRuns | FinalizedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementPlanningRuns | FromDate | DATE | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementPlanningRuns | Id | BIGINT | NO | YES | — | — | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementPlanningRuns | InventoryBasis | NVARCHAR(300) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementPlanningRuns | Notes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementPlanningRuns | NumberOfDays | INT | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementPlanningRuns | RowVersion | ROWVERSION | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementPlanningRuns | RunNumber | NVARCHAR(30) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementPlanningRuns | Status | INT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementPlanningRuns | ToDate | DATE | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementSalesHistory | ChannelProductName | NVARCHAR(300) | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | ChannelSku | NVARCHAR(150) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | Id | BIGINT | NO | YES | — | — | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | ImportBatchId | BIGINT | YES | NO | ProcurementSalesImportBatches | — | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | IsManual | BIT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | ItemId | BIGINT | YES | NO | Items | — | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | ModifiedAt | DATETIME | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | ModifiedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | Notes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | Quantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | SalesChannelId | BIGINT | NO | NO | SalesChannels | — | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | SalesDate | DATE | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | SourceRowJson | NVARCHAR(MAX) | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesHistory | SourceRowNumber | INT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesImportBatches | BatchNumber | NVARCHAR(30) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:78 |
| ProcurementSalesImportBatches | CorrectionReason | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:78 |
| ProcurementSalesImportBatches | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:78 |
| ProcurementSalesImportBatches | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:78 |
| ProcurementSalesImportBatches | FileHash | CHAR(64) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:78 |
| ProcurementSalesImportBatches | Id | BIGINT | NO | YES | — | — | database/migrations/20260715_procurement_planning_module.sql:78 |
| ProcurementSalesImportBatches | ImportedRows | INT | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:78 |
| ProcurementSalesImportBatches | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:78 |
| ProcurementSalesImportBatches | ModifiedAt | DATETIME | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:78 |
| ProcurementSalesImportBatches | ModifiedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:78 |
| ProcurementSalesImportBatches | OriginalFileName | NVARCHAR(260) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:78 |
| ProcurementSalesImportBatches | Status | INT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:78 |
| ProcurementSalesImportBatches | TotalRows | INT | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:78 |
| ProcurementSalesImportBatches | UnmappedRows | INT | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:78 |
| ProcurementSettings | AutomaticCalculationEnabled | BIT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProcurementSettings | ConfiguredLeadTimeDays | DECIMAL(9,3) | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProcurementSettings | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProcurementSettings | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProcurementSettings | Id | BIGINT | NO | YES | — | — | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProcurementSettings | IsActive | BIT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProcurementSettings | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProcurementSettings | ItemId | BIGINT | NO | NO | Items | — | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProcurementSettings | LeadTimeOverrideDays | DECIMAL(9,3) | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProcurementSettings | ManualPlanning | BIT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProcurementSettings | MinimumOrderQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProcurementSettings | ModifiedAt | DATETIME | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProcurementSettings | ModifiedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProcurementSettings | OrderMultiple | DECIMAL(19,6) | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProcurementSettings | RoundingRule | INT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProcurementSettings | SafetyFactor | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProductBomComponents | ComponentItemId | BIGINT | NO | NO | Items | — | database/migrations/20260715_procurement_planning_module.sql:145 |
| ProductBomComponents | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:145 |
| ProductBomComponents | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:145 |
| ProductBomComponents | FinishedProductItemId | BIGINT | NO | NO | Items | — | database/migrations/20260715_procurement_planning_module.sql:145 |
| ProductBomComponents | Id | BIGINT | NO | YES | — | — | database/migrations/20260715_procurement_planning_module.sql:145 |
| ProductBomComponents | IsActive | BIT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:145 |
| ProductBomComponents | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:145 |
| ProductBomComponents | ModifiedAt | DATETIME | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:145 |
| ProductBomComponents | ModifiedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:145 |
| ProductBomComponents | QuantityRequired | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:145 |
| ProductBomComponents | UnitId | BIGINT | NO | NO | Units | — | database/migrations/20260715_procurement_planning_module.sql:145 |
| PurchaseBillItems | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | DiscountAmount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | DiscountPercentage | DECIMAL(9,4) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | ItemId | BIGINT | NO | NO | Items | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | ItemNameSnapshot | NVARCHAR(200) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | LineTotal | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | PurchaseBillId | BIGINT | NO | NO | PurchaseBills | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | PurchasePrice | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | Quantity | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | RowVersion | ROWVERSION | SYSTEM | NO | — | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | TaxAmount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | TaxPercentage | DECIMAL(9,4) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | UnitId | BIGINT | YES | NO | Units | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | UnitNameSnapshot | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBillItems | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBills | BalanceAmount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | BillDate | DATE | NO | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | DiscountAmount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | DueDate | DATE | YES | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | GrandTotal | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | Notes | NVARCHAR(1000) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | PaidAmount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | PaymentStatus | INT | NO | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | PaymentType | INT | NO | NO | PaymentModes | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | PurchaseBillNo | NVARCHAR(50) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | RoundOff | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | RowVersion | ROWVERSION | SYSTEM | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | Status | INT | NO | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | SubTotal | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | SupplierId | UNIQUEIDENTIFIER | NO | NO | Parties | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | SupplierInvoiceNo | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | TaxAmount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseBills | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3645 |
| PurchaseOrderItems | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | DiscountAmount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | DiscountPercentage | DECIMAL(9,4) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | ItemId | BIGINT | NO | NO | Items | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | ItemNameSnapshot | NVARCHAR(200) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | LineTotal | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | PurchaseOrderId | BIGINT | NO | NO | PurchaseOrders | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | PurchasePrice | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | Quantity | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | RowVersion | ROWVERSION | SYSTEM | NO | — | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | TaxAmount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | TaxPercentage | DECIMAL(9,4) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | UnitId | BIGINT | YES | NO | Units | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | UnitNameSnapshot | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrderItems | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrders | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | DiscountAmount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | ExpectedDeliveryDate | DATE | YES | NO | — | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | GrandTotal | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | Notes | NVARCHAR(1000) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | OrderDate | DATE | NO | NO | — | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | PurchaseOrderNo | NVARCHAR(50) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | RowVersion | ROWVERSION | SYSTEM | NO | — | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | Status | INT | NO | NO | — | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | SubTotal | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | SupplierId | UNIQUEIDENTIFIER | NO | NO | Parties | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | TaxAmount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | TermsAndConditions | NVARCHAR(2000) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseOrders | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3656 |
| PurchaseReturnItems | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | DiscountAmount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | DiscountPercentage | DECIMAL(9,4) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | ItemId | BIGINT | NO | NO | Items | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | ItemNameSnapshot | NVARCHAR(200) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | LineTotal | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | PurchaseBillItemId | BIGINT | YES | NO | PurchaseBillItems | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | PurchasePrice | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | PurchaseReturnId | BIGINT | NO | NO | PurchaseReturns | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | Quantity | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | RowVersion | ROWVERSION | SYSTEM | NO | — | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | TaxAmount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | TaxPercentage | DECIMAL(9,4) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | UnitId | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | UnitNameSnapshot | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturnItems | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturns | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3658 |
| PurchaseReturns | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3658 |
| PurchaseReturns | GrandTotal | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3658 |
| PurchaseReturns | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3658 |
| PurchaseReturns | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3658 |
| PurchaseReturns | Notes | NVARCHAR(1000) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3658 |
| PurchaseReturns | PurchaseBillId | BIGINT | YES | NO | PurchaseBills | — | database/001_Full_Database_Setup.sql:3658 |
| PurchaseReturns | PurchaseReturnNo | NVARCHAR(50) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3658 |
| PurchaseReturns | Reason | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3658 |
| PurchaseReturns | ReturnDate | DATE | NO | NO | — | — | database/001_Full_Database_Setup.sql:3658 |
| PurchaseReturns | RowVersion | ROWVERSION | SYSTEM | NO | — | — | database/001_Full_Database_Setup.sql:3658 |
| PurchaseReturns | SubTotal | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3658 |
| PurchaseReturns | SupplierId | UNIQUEIDENTIFIER | NO | NO | Parties | — | database/001_Full_Database_Setup.sql:3658 |
| PurchaseReturns | TaxAmount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3658 |
| PurchaseReturns | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:3658 |
| PurchaseReturns | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3658 |
| RefreshTokens | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:124 |
| RefreshTokens | ExpiryDate | DATETIME | NO | NO | — | — | database/001_Full_Database_Setup.sql:124 |
| RefreshTokens | Id | BIGINT | NO | YES | — | — | database/001_Full_Database_Setup.sql:124 |
| RefreshTokens | IsRevoked | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:124 |
| RefreshTokens | Token | NVARCHAR(500) | NO | NO | — | — | database/001_Full_Database_Setup.sql:124 |
| RefreshTokens | UserId | INT | NO | NO | Users | — | database/001_Full_Database_Setup.sql:124 |
| RolePermissions | CanApprove | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:105 |
| RolePermissions | CanCreate | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:105 |
| RolePermissions | CanDelete | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:105 |
| RolePermissions | CanEdit | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:105 |
| RolePermissions | CanExport | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:105 |
| RolePermissions | CanView | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:105 |
| RolePermissions | PageId | INT | NO | NO | Pages | — | database/001_Full_Database_Setup.sql:105 |
| RolePermissions | RoleId | INT | NO | NO | Roles | — | database/001_Full_Database_Setup.sql:105 |
| Roles | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:60 |
| Roles | Description | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:60 |
| Roles | Id | INT | NO | YES | — | — | database/001_Full_Database_Setup.sql:60 |
| Roles | IsActive | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:60 |
| Roles | Name | NVARCHAR(100) | NO | NO | — | — | database/001_Full_Database_Setup.sql:60 |
| SalesChannels | Code | NVARCHAR(20) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:28 |
| SalesChannels | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:28 |
| SalesChannels | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:28 |
| SalesChannels | DisplayOrder | INT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:28 |
| SalesChannels | Id | BIGINT | NO | YES | — | — | database/migrations/20260715_procurement_planning_module.sql:28 |
| SalesChannels | IsActive | BIT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:28 |
| SalesChannels | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260715_procurement_planning_module.sql:28 |
| SalesChannels | ModifiedAt | DATETIME | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:28 |
| SalesChannels | ModifiedBy | BIGINT | YES | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:28 |
| SalesChannels | Name | NVARCHAR(100) | NO | NO | — | — | database/migrations/20260715_procurement_planning_module.sql:28 |
| SalesInvoiceItems | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | DiscountAmount | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | DiscountPercentage | DECIMAL(5,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | HsnSacCodeSnapshot | NVARCHAR(50) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | ItemId | BIGINT | NO | NO | Items | — | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | ItemNameSnapshot | NVARCHAR(200) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | LineTotal | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | Quantity | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | Rate | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | SalesInvoiceId | BIGINT | NO | NO | SalesInvoices | — | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | TaxAmount | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | TaxPercentageSnapshot | DECIMAL(5,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | TaxRateId | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | UnitId | BIGINT | YES | NO | Units | — | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | UnitNameSnapshot | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoiceItems | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoicePayments | Amount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3211 |
| SalesInvoicePayments | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3211 |
| SalesInvoicePayments | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3211 |
| SalesInvoicePayments | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3211 |
| SalesInvoicePayments | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3211 |
| SalesInvoicePayments | Notes | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3211 |
| SalesInvoicePayments | PaymentDate | DATE | NO | NO | — | — | database/001_Full_Database_Setup.sql:3211 |
| SalesInvoicePayments | PaymentMode | INT | NO | NO | PaymentModes | — | database/001_Full_Database_Setup.sql:3211 |
| SalesInvoicePayments | ReferenceNumber | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3211 |
| SalesInvoicePayments | SalesInvoiceId | BIGINT | NO | NO | SalesInvoices | — | database/001_Full_Database_Setup.sql:3211 |
| SalesInvoicePayments | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:3211 |
| SalesInvoicePayments | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3211 |
| SalesInvoices | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | CustomerPartyId | UNIQUEIDENTIFIER | NO | NO | Parties | — | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | DeletedAtUtc | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | DeletedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | DiscountAmount | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | DueAmount | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | DueDate | DATE | YES | NO | — | — | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | GrandTotal | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | InvoiceDate | DATE | NO | NO | — | — | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | InvoiceNumber | NVARCHAR(50) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | Notes | NVARCHAR(1000) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | PaidAmount | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | PaymentStatus | INT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | RowVersion | ROWVERSION | NO | NO | — | — | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | Status | INT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | SubTotal | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | TaxAmount | DECIMAL(18,2) | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | TermsAndConditions | NVARCHAR(2000) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:3143 |
| SalesInvoices | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3143 |
| ShipmentAppointments | AppointmentDate | DATE | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | AppointmentReference | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | AppointmentStatus | INT | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | AttemptNumber | INT | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | BookedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | BookedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | CancellationReason | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | CancelledAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | CompletedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | Id | BIGINT | NO | YES | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | Remarks | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | RequestedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | RequestedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | ShipmentId | BIGINT | NO | NO | Shipments | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | TimeFrom | TIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | TimeTo | TIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentAppointments | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentDeliveryAttempts | AttemptDateTimeUtc | DATETIME | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:298 |
| ShipmentDeliveryAttempts | AttemptNumber | INT | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:298 |
| ShipmentDeliveryAttempts | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:298 |
| ShipmentDeliveryAttempts | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:298 |
| ShipmentDeliveryAttempts | Id | BIGINT | NO | YES | — | — | database/migrations/20260729_shipment_operations_module.sql:298 |
| ShipmentDeliveryAttempts | NextAttemptDate | DATE | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:298 |
| ShipmentDeliveryAttempts | Outcome | INT | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:298 |
| ShipmentDeliveryAttempts | ReasonCode | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:298 |
| ShipmentDeliveryAttempts | Remarks | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:298 |
| ShipmentDeliveryAttempts | ShipmentId | BIGINT | NO | NO | Shipments | — | database/migrations/20260729_shipment_operations_module.sql:298 |
| ShipmentDockets | ActualPickupDateUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | DeletedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | DeletedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | DispatchMode | INT | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | DocketDate | DATE | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | DocketNumber | NVARCHAR(100) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | DriverMobile | NVARCHAR(30) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | DriverName | NVARCHAR(150) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | EstimatedDeliveryDate | DATE | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | Id | BIGINT | NO | YES | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | Notes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | PickupReference | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | ShipmentId | BIGINT | NO | NO | Shipments | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | TrackingUrl | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | TransporterPartyId | UNIQUEIDENTIFIER | NO | NO | Parties | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentDockets | VehicleNumber | NVARCHAR(50) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentFreightCharges | ActualWeight | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | AppointmentCharge | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | ApprovalNotes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | ApprovedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | ApprovedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | BaseFreight | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | ChargeableWeight | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | ChargeType | INT | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | CurrencyCode | CHAR(3) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | DeletedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | DeletedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | DiscountAmount | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | FuelSurcharge | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | HandlingCharge | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | Id | BIGINT | NO | YES | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | LoadingCharge | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | OtherCharge | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | PaidAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | PaidBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | PaymentReference | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | RatePerWeightUnit | DECIMAL(19,6) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | ReturnFreight | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | RojmelExportStatus | INT | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | RojmelReservationToken | UNIQUEIDENTIFIER | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | RojmelTransactionId | BIGINT | YES | NO | WalletTransactions | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | ShipmentId | BIGINT | NO | NO | Shipments | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | Status | INT | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | TaxAmount | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | TotalCharge | AS (CONVERT(DECIMAL(19,6) | UNSPECIFIED | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | TransporterInvoiceDate | DATE | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | TransporterInvoiceNumber | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | TransporterPartyId | UNIQUEIDENTIFIER | YES | NO | Parties | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | UnloadingCharge | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentFreightCharges | VolumetricWeight | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentImportStagedRows | BatchId | BIGINT | NO | NO | SupplyChainImportBatches | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | ChannelCode | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | ChannelId | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | ChannelItemMappingId | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | ChannelSku | NVARCHAR(150) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | DocketNumber | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | ErrorsJson | NVARCHAR(MAX) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | FreightAmount | DECIMAL(19,6) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | Id | BIGINT | NO | YES | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | InvoiceNumber | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | IsDuplicate | BIT | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | ItemId | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | Notes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | Quantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | RowNumber | INT | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | ShipmentDate | DATE | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | ShipmentStatus | INT | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | SourceShipmentReference | NVARCHAR(150) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | StoNumber | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | TransporterPartyCode | NVARCHAR(50) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | WarehouseCode | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentImportStagedRows | WarehouseId | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentItems | ChannelItemMappingId | BIGINT | YES | NO | ChannelSkuMappings | — | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | ChannelSkuSnapshot | NVARCHAR(150) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | DamagedQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | DispatchedQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | DispatchPlanningAllocationId | BIGINT | YES | NO | DispatchAllocations | — | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | DispatchPlanningAllocationKey | AS | UNSPECIFIED | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | Id | BIGINT | NO | YES | — | — | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | ItemCodeSnapshot | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | ItemId | BIGINT | NO | NO | Items | — | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | ItemNameSnapshot | NVARCHAR(200) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | NonRestockableReturnQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | Notes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | PackagingProfileId | BIGINT | YES | NO | ItemPackagingProfiles | — | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | PackedQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | PlannedQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | ReceivedQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | RejectedQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | RestockableReturnQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | ReturnedQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | ShipmentId | BIGINT | NO | NO | Shipments | — | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | ShortQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | UnitsPerBoxSnapshot | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentItems | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentPackageItems | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:183 |
| ShipmentPackageItems | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:183 |
| ShipmentPackageItems | Id | BIGINT | NO | YES | — | — | database/migrations/20260729_shipment_operations_module.sql:183 |
| ShipmentPackageItems | Quantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:183 |
| ShipmentPackageItems | ShipmentItemId | BIGINT | NO | NO | ShipmentItems | — | database/migrations/20260729_shipment_operations_module.sql:183 |
| ShipmentPackageItems | ShipmentPackageId | BIGINT | NO | NO | ShipmentPackages | — | database/migrations/20260729_shipment_operations_module.sql:183 |
| ShipmentPackageItems | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:183 |
| ShipmentPackageItems | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:183 |
| ShipmentPackages | Barcode | NVARCHAR(200) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | ChargeableWeight | AS (CONVERT(DECIMAL(19,6) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | DeletedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | DeletedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | DimensionUnit | NVARCHAR(5) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | GrossWeight | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | Height | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | Id | BIGINT | NO | YES | — | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | IsMixedPackage | BIT | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | Length | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | NetWeight | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | Notes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | PackageNumber | NVARCHAR(100) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | PackageType | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | PackagingProfileId | BIGINT | YES | NO | ItemPackagingProfiles | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | SealNumber | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | ShipmentId | BIGINT | NO | NO | Shipments | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | TrackingLabel | NVARCHAR(200) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | VolumetricDivisor | DECIMAL(19,6) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | VolumetricWeight | AS (CONVERT(DECIMAL(19,6) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | WeightUnit | NVARCHAR(5) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentPackages | Width | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentReceiptItems | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:341 |
| ShipmentReceiptItems | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:341 |
| ShipmentReceiptItems | DamagedQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:341 |
| ShipmentReceiptItems | Id | BIGINT | NO | YES | — | — | database/migrations/20260729_shipment_operations_module.sql:341 |
| ShipmentReceiptItems | Notes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:341 |
| ShipmentReceiptItems | ReasonCode | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:341 |
| ShipmentReceiptItems | ReceivedQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:341 |
| ShipmentReceiptItems | RejectedQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:341 |
| ShipmentReceiptItems | ShipmentItemId | BIGINT | NO | NO | ShipmentItems | — | database/migrations/20260729_shipment_operations_module.sql:341 |
| ShipmentReceiptItems | ShipmentReceiptId | BIGINT | NO | NO | ShipmentReceipts | — | database/migrations/20260729_shipment_operations_module.sql:341 |
| ShipmentReceiptItems | ShortQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:341 |
| ShipmentReceipts | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:319 |
| ShipmentReceipts | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:319 |
| ShipmentReceipts | Id | BIGINT | NO | YES | — | — | database/migrations/20260729_shipment_operations_module.sql:319 |
| ShipmentReceipts | MarketplaceReceiptReference | NVARCHAR(150) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:319 |
| ShipmentReceipts | Notes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:319 |
| ShipmentReceipts | ProofAttachmentUrl | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:319 |
| ShipmentReceipts | ReceiptDate | DATE | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:319 |
| ShipmentReceipts | ReceiptNumber | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:319 |
| ShipmentReceipts | ReceivedByName | NVARCHAR(150) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:319 |
| ShipmentReceipts | ShipmentId | BIGINT | NO | NO | Shipments | — | database/migrations/20260729_shipment_operations_module.sql:319 |
| ShipmentReceipts | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:319 |
| ShipmentReceipts | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:319 |
| ShipmentReturnItems | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:397 |
| ShipmentReturnItems | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:397 |
| ShipmentReturnItems | DamagedQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:397 |
| ShipmentReturnItems | Id | BIGINT | NO | YES | — | — | database/migrations/20260729_shipment_operations_module.sql:397 |
| ShipmentReturnItems | NonRestockableQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:397 |
| ShipmentReturnItems | Notes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:397 |
| ShipmentReturnItems | ReasonCode | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:397 |
| ShipmentReturnItems | ReceivedBackQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:397 |
| ShipmentReturnItems | RestockableQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:397 |
| ShipmentReturnItems | ReturnQuantity | DECIMAL(19,6) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:397 |
| ShipmentReturnItems | ShipmentItemId | BIGINT | NO | NO | ShipmentItems | — | database/migrations/20260729_shipment_operations_module.sql:397 |
| ShipmentReturnItems | ShipmentReturnId | BIGINT | NO | NO | ShipmentReturns | — | database/migrations/20260729_shipment_operations_module.sql:397 |
| ShipmentReturnItems | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:397 |
| ShipmentReturnItems | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:397 |
| ShipmentReturns | CancellationReason | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | CancelledAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | CancelledBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | ClosedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | ClosedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | DocketNumber | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | ExpectedReturnDate | DATE | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | Id | BIGINT | NO | YES | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | Notes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | ReceivedBackDate | DATE | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | ReturnDate | DATE | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | ReturnNumber | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | ReturnReason | NVARCHAR(1000) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | ShipmentId | BIGINT | NO | NO | Shipments | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | Status | INT | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | TransporterPartyId | UNIQUEIDENTIFIER | YES | NO | Parties | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| ShipmentReturns | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:364 |
| Shipments | CancellationReason | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | CancelledAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | CancelledBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | ChannelCodeSnapshot | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | ChannelId | BIGINT | NO | NO | SalesChannels | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | ClosedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | ClosedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | DeletedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | DeletedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | DeliveredAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | DeliveredBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | DispatchedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | DispatchedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | DispatchMode | INT | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | DispatchPlanningRunId | BIGINT | YES | NO | DispatchPlanningRuns | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | ExpectedDeliveryDate | DATE | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | ExternalShipmentReference | NVARCHAR(150) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | Id | BIGINT | NO | YES | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | InvoiceId | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | InvoiceNumber | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | ManualReason | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | MarketplaceReference | NVARCHAR(150) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | Notes | NVARCHAR(2000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | PackedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | PackedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | Priority | INT | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | RowVersion | ROWVERSION | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | ShipmentDate | DATE | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | ShipmentNumber | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | SourceType | INT | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | Status | INT | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | StoNumber | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | TotalChargeableWeight | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | TotalDispatchedQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | TotalGrossWeight | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | TotalPackages | INT | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | TotalPackedQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | TotalPlannedQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | TotalReceivedQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | TotalReturnedQuantity | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | TotalVolumetricWeight | DECIMAL(19,6) | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | TransporterPartyId | UNIQUEIDENTIFIER | YES | NO | Parties | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | UpdatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | WarehouseCodeSnapshot | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | WarehouseId | BIGINT | NO | NO | ChannelWarehouses | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| Shipments | WarehouseNameSnapshot | NVARCHAR(200) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:29 |
| ShipmentTrackingEvents | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260729_shipment_operations_module.sql:270 |
| ShipmentTrackingEvents | CreatedBy | BIGINT | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:270 |
| ShipmentTrackingEvents | EventDateTimeUtc | DATETIME | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:270 |
| ShipmentTrackingEvents | EventStatus | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:270 |
| ShipmentTrackingEvents | EventType | INT | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:270 |
| ShipmentTrackingEvents | Id | BIGINT | NO | YES | — | — | database/migrations/20260729_shipment_operations_module.sql:270 |
| ShipmentTrackingEvents | Location | NVARCHAR(250) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:270 |
| ShipmentTrackingEvents | ReferenceNumber | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:270 |
| ShipmentTrackingEvents | Remarks | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:270 |
| ShipmentTrackingEvents | ShipmentId | BIGINT | NO | NO | Shipments | — | database/migrations/20260729_shipment_operations_module.sql:270 |
| ShipmentTrackingEvents | Source | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260729_shipment_operations_module.sql:270 |
| StockMovements | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3234 |
| StockMovements | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3234 |
| StockMovements | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3234 |
| StockMovements | ItemId | BIGINT | NO | NO | Items | — | database/001_Full_Database_Setup.sql:3234 |
| StockMovements | MovementType | INT | NO | NO | — | — | database/001_Full_Database_Setup.sql:3234 |
| StockMovements | Quantity | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3234 |
| StockMovements | SourceId | BIGINT | NO | NO | — | — | database/001_Full_Database_Setup.sql:3234 |
| StockMovements | SourceType | NVARCHAR(50) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3234 |
| SupplierPaymentAllocations | AllocatedAmount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3653 |
| SupplierPaymentAllocations | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3653 |
| SupplierPaymentAllocations | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3653 |
| SupplierPaymentAllocations | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3653 |
| SupplierPaymentAllocations | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3653 |
| SupplierPaymentAllocations | PurchaseBillId | BIGINT | NO | NO | PurchaseBills | — | database/001_Full_Database_Setup.sql:3653 |
| SupplierPaymentAllocations | RowVersion | ROWVERSION | SYSTEM | NO | — | — | database/001_Full_Database_Setup.sql:3653 |
| SupplierPaymentAllocations | SupplierPaymentId | BIGINT | NO | NO | SupplierPayments | — | database/001_Full_Database_Setup.sql:3653 |
| SupplierPaymentAllocations | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:3653 |
| SupplierPaymentAllocations | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3653 |
| SupplierPayments | Amount | DECIMAL(18,2) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3651 |
| SupplierPayments | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3651 |
| SupplierPayments | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3651 |
| SupplierPayments | Id | BIGINT | UNSPECIFIED | YES | — | — | database/001_Full_Database_Setup.sql:3651 |
| SupplierPayments | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:3651 |
| SupplierPayments | Notes | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3651 |
| SupplierPayments | PaymentDate | DATE | NO | NO | — | — | database/001_Full_Database_Setup.sql:3651 |
| SupplierPayments | PaymentMode | INT | NO | NO | PaymentModes | — | database/001_Full_Database_Setup.sql:3651 |
| SupplierPayments | PaymentOutNo | NVARCHAR(50) | NO | NO | — | — | database/001_Full_Database_Setup.sql:3651 |
| SupplierPayments | ReferenceNo | NVARCHAR(100) | YES | NO | — | — | database/001_Full_Database_Setup.sql:3651 |
| SupplierPayments | RowVersion | ROWVERSION | SYSTEM | NO | — | — | database/001_Full_Database_Setup.sql:3651 |
| SupplierPayments | SupplierId | UNIQUEIDENTIFIER | NO | NO | Parties | — | database/001_Full_Database_Setup.sql:3651 |
| SupplierPayments | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:3651 |
| SupplierPayments | UpdatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:3651 |
| SupplyChainImportBatches | CancellationReason | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | CancelledAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | CancelledBy | BIGINT | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | ChannelId | BIGINT | YES | NO | SalesChannels | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | CommittedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | CommittedBy | BIGINT | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | CommittedRows | INT | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | CorrelationId | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | DuplicateRows | INT | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | FileHash | CHAR(64) | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | Id | BIGINT | NO | YES | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | ImportType | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | InvalidRows | INT | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | LegacyProcurementBatchId | BIGINT | YES | NO | ProcurementSalesImportBatches | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | ModuleType | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | OriginalFileName | NVARCHAR(260) | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | PeriodFrom | DATE | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | PeriodTo | DATE | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | SnapshotDate | DATE | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | Status | INT | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | StoredFileName | NVARCHAR(260) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | TotalRows | INT | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | UploadedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | UploadedBy | BIGINT | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | ValidationSummaryJson | NVARCHAR(MAX) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportBatches | ValidRows | INT | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportRows | BatchId | BIGINT | NO | NO | SupplyChainImportBatches | — | database/migrations/20260727_supply_chain_common_foundation.sql:158 |
| SupplyChainImportRows | ChannelCode | NVARCHAR(20) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:158 |
| SupplyChainImportRows | ChannelId | BIGINT | YES | NO | SalesChannels | — | database/migrations/20260727_supply_chain_common_foundation.sql:158 |
| SupplyChainImportRows | ChannelProductName | NVARCHAR(300) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:158 |
| SupplyChainImportRows | ChannelSku | NVARCHAR(150) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:158 |
| SupplyChainImportRows | ErrorsJson | NVARCHAR(MAX) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:158 |
| SupplyChainImportRows | Id | BIGINT | NO | YES | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:158 |
| SupplyChainImportRows | IsDuplicate | BIT | NO | NO | — | YES | database/migrations/20260727_supply_chain_common_foundation.sql:158 |
| SupplyChainImportRows | ItemId | BIGINT | YES | NO | Items | — | database/migrations/20260727_supply_chain_common_foundation.sql:158 |
| SupplyChainImportRows | Quantity | DECIMAL(19,6) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:158 |
| SupplyChainImportRows | RowNumber | INT | NO | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:158 |
| SupplyChainImportRows | SalesDate | DATE | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:158 |
| SupplyChainImportRows | SourceRowJson | NVARCHAR(MAX) | YES | NO | — | — | database/migrations/20260727_supply_chain_common_foundation.sql:158 |
| Units | CreatedAt | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1399 |
| Units | CreatedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:1399 |
| Units | Description | NVARCHAR(500) | YES | NO | — | — | database/001_Full_Database_Setup.sql:1399 |
| Units | Id | BIGINT | NO | YES | — | — | database/001_Full_Database_Setup.sql:1399 |
| Units | IsActive | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1399 |
| Units | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:1399 |
| Units | ModifiedAt | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:1399 |
| Units | ModifiedBy | BIGINT | YES | NO | — | — | database/001_Full_Database_Setup.sql:1399 |
| Units | Name | NVARCHAR(100) | NO | NO | — | — | database/001_Full_Database_Setup.sql:1399 |
| Units | ShortName | NVARCHAR(20) | NO | NO | — | — | database/001_Full_Database_Setup.sql:1399 |
| UserRoles | RoleId | INT | NO | NO | Roles | — | database/001_Full_Database_Setup.sql:74 |
| UserRoles | UserId | INT | NO | NO | Users | — | database/001_Full_Database_Setup.sql:74 |
| Users | CreatedOn | DATETIME | NO | NO | — | YES | database/001_Full_Database_Setup.sql:41 |
| Users | Email | NVARCHAR(256) | NO | NO | — | — | database/001_Full_Database_Setup.sql:41 |
| Users | FullName | NVARCHAR(200) | NO | NO | — | — | database/001_Full_Database_Setup.sql:41 |
| Users | Id | INT | NO | YES | — | — | database/001_Full_Database_Setup.sql:41 |
| Users | IsActive | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:41 |
| Users | IsDeleted | BIT | NO | NO | — | YES | database/001_Full_Database_Setup.sql:41 |
| Users | PasswordHash | NVARCHAR(500) | NO | NO | — | — | database/001_Full_Database_Setup.sql:41 |
| Users | UpdatedOn | DATETIME | YES | NO | — | — | database/001_Full_Database_Setup.sql:41 |
| Users | Username | NVARCHAR(100) | NO | NO | — | — | database/001_Full_Database_Setup.sql:41 |
| WalletCategories | CategoryType | INT | NO | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:43 |
| WalletCategories | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:43 |
| WalletCategories | CreatedBy | INT | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:43 |
| WalletCategories | DeletedAt | DATETIME | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:43 |
| WalletCategories | DeletedBy | INT | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:43 |
| WalletCategories | Id | BIGINT | NO | YES | — | — | database/migrations/20260720_rojmel_wallet_module.sql:43 |
| WalletCategories | IsActive | BIT | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:43 |
| WalletCategories | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:43 |
| WalletCategories | IsSystemCategory | BIT | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:43 |
| WalletCategories | ModifiedAt | DATETIME | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:43 |
| WalletCategories | ModifiedBy | INT | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:43 |
| WalletCategories | Name | NVARCHAR(150) | NO | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:43 |
| Wallets | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | CreatedBy | INT | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | CurrentBalance | DECIMAL(18,2) | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | DeletedAt | DATETIME | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | DeletedBy | INT | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | Id | BIGINT | NO | YES | — | — | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | IsActive | BIT | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | IsCompanyWallet | BIT | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | IsDefault | BIT | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | LinkedUserId | INT | YES | NO | Users | — | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | ModifiedAt | DATETIME | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | ModifiedBy | INT | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | Notes | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | OpeningBalance | DECIMAL(18,2) | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | WalletCode | NVARCHAR(30) | NO | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | WalletName | NVARCHAR(150) | NO | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| Wallets | WalletType | INT | NO | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| WalletTransactions | Amount | DECIMAL(18,2) | NO | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | BalanceAfter | DECIMAL(18,2) | NO | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | BalanceBefore | DECIMAL(18,2) | NO | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | CancelledAt | DATETIME | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | CancelledBy | INT | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | CancelReason | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | CategoryId | BIGINT | YES | NO | WalletCategories | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | CreatedBy | INT | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | Description | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | Id | BIGINT | NO | YES | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | ModifiedAt | DATETIME | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | ModifiedBy | INT | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | PaymentMode | NVARCHAR(50) | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | ReferenceNo | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | RelatedTransferId | BIGINT | YES | NO | WalletTransfers | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | ReversalOfTransactionId | BIGINT | YES | NO | WalletTransactions | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | Status | INT | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | TransactionDate | DATE | NO | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | TransactionNo | NVARCHAR(40) | NO | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | TransactionType | INT | NO | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransactions | WalletId | BIGINT | NO | NO | Wallets | — | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransfers | Amount | DECIMAL(18,2) | NO | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WalletTransfers | CancelledAt | DATETIME | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WalletTransfers | CancelledBy | INT | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WalletTransfers | CancelReason | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WalletTransfers | CreatedAt | DATETIME | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WalletTransfers | CreatedBy | INT | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WalletTransfers | Description | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WalletTransfers | FromWalletId | BIGINT | NO | NO | Wallets | — | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WalletTransfers | Id | BIGINT | NO | YES | — | — | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WalletTransfers | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WalletTransfers | ReferenceNo | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WalletTransfers | ReversalOfTransferId | BIGINT | YES | NO | WalletTransfers | — | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WalletTransfers | Status | INT | NO | NO | — | YES | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WalletTransfers | ToWalletId | BIGINT | NO | NO | Wallets | — | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WalletTransfers | TransferDate | DATE | NO | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WalletTransfers | TransferNo | NVARCHAR(40) | NO | NO | — | — | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WebsiteAnnouncements | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | CreatedBy | INT | NO | NO | Users | — | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | CtaLabel | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | CtaUrl | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | DeletedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | DeletedBy | INT | YES | NO | Users | — | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | DismissalVersion | NVARCHAR(50) | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | EndsAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | Id | BIGINT | NO | YES | — | — | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | IsActive | BIT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | Message | NVARCHAR(1000) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | Placement | NVARCHAR(30) | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | Priority | INT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | RowVersion | ROWVERSION | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | SortOrder | INT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | StartsAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | Title | NVARCHAR(200) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteAnnouncements | UpdatedBy | INT | YES | NO | Users | — | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteBlogCategories | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:47 |
| WebsiteBlogCategories | CreatedBy | INT | NO | NO | Users | — | database/migrations/20260813_website_management_module.sql:47 |
| WebsiteBlogCategories | DeletedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:47 |
| WebsiteBlogCategories | DeletedBy | INT | YES | NO | Users | — | database/migrations/20260813_website_management_module.sql:47 |
| WebsiteBlogCategories | Description | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:47 |
| WebsiteBlogCategories | Id | BIGINT | NO | YES | — | — | database/migrations/20260813_website_management_module.sql:47 |
| WebsiteBlogCategories | IsActive | BIT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:47 |
| WebsiteBlogCategories | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:47 |
| WebsiteBlogCategories | Name | NVARCHAR(150) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:47 |
| WebsiteBlogCategories | RowVersion | ROWVERSION | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:47 |
| WebsiteBlogCategories | Slug | NVARCHAR(180) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:47 |
| WebsiteBlogCategories | SortOrder | INT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:47 |
| WebsiteBlogCategories | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:47 |
| WebsiteBlogCategories | UpdatedBy | INT | YES | NO | Users | — | database/migrations/20260813_website_management_module.sql:47 |
| WebsiteBlogPosts | CategoryId | BIGINT | NO | NO | WebsiteBlogCategories | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | Content | NVARCHAR(MAX) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | CoverImageUrl | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | CreatedBy | INT | NO | NO | Users | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | DeletedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | DeletedBy | INT | YES | NO | Users | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | Excerpt | NVARCHAR(1000) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | Id | BIGINT | NO | YES | — | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | IsFeatured | BIT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | OpenGraphImageUrl | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | PublishedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | PublishStatus | NVARCHAR(20) | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | ReadTime | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | RowVersion | ROWVERSION | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | SeoDescription | NVARCHAR(500) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | SeoTitle | NVARCHAR(250) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | Slug | NVARCHAR(220) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | SortOrder | INT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | Title | NVARCHAR(250) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteBlogPosts | UpdatedBy | INT | YES | NO | Users | — | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteContactEnquiries | Email | NVARCHAR(254) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:122 |
| WebsiteContactEnquiries | EnquiryType | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:122 |
| WebsiteContactEnquiries | FirstName | NVARCHAR(100) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:122 |
| WebsiteContactEnquiries | Id | BIGINT | NO | YES | — | — | database/migrations/20260813_website_management_module.sql:122 |
| WebsiteContactEnquiries | LastName | NVARCHAR(100) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:122 |
| WebsiteContactEnquiries | Message | NVARCHAR(4000) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:122 |
| WebsiteContactEnquiries | Source | NVARCHAR(100) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:122 |
| WebsiteContactEnquiries | Subject | NVARCHAR(200) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:122 |
| WebsiteContactEnquiries | SubmittedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:122 |
| WebsiteProductBenefits | BenefitText | NVARCHAR(500) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:33 |
| WebsiteProductBenefits | Id | BIGINT | NO | YES | — | — | database/migrations/20260813_website_management_module.sql:33 |
| WebsiteProductBenefits | SortOrder | INT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:33 |
| WebsiteProductBenefits | WebsiteProductId | BIGINT | NO | NO | WebsiteProducts | — | database/migrations/20260813_website_management_module.sql:33 |
| WebsiteProductMedia | AltText | NVARCHAR(500) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:40 |
| WebsiteProductMedia | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:40 |
| WebsiteProductMedia | CreatedBy | INT | NO | NO | Users | — | database/migrations/20260813_website_management_module.sql:40 |
| WebsiteProductMedia | Id | BIGINT | NO | YES | — | — | database/migrations/20260813_website_management_module.sql:40 |
| WebsiteProductMedia | IsPrimary | BIT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:40 |
| WebsiteProductMedia | PublicUrl | NVARCHAR(1000) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:40 |
| WebsiteProductMedia | SortOrder | INT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:40 |
| WebsiteProductMedia | WebsiteProductId | BIGINT | NO | NO | WebsiteProducts | — | database/migrations/20260813_website_management_module.sql:40 |
| WebsiteProducts | AmazonUrl | NVARCHAR(1000) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | AvailabilityText | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | Badge | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | BrandName | NVARCHAR(200) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | Code | NVARCHAR(100) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | CreatedBy | INT | NO | NO | Users | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | CurrencyCode | CHAR(3) | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | DeletedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | DeletedBy | INT | YES | NO | Users | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | Description | NVARCHAR(4000) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | DisplayPrice | DECIMAL(18,2) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | Id | BIGINT | NO | YES | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | IsActive | BIT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | IsDeleted | BIT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | IsRustProof | BIT | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | IsUvResistant | BIT | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | IsWindTested | BIT | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | Material | NVARCHAR(200) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | Name | NVARCHAR(200) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | PublishedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | PublishStatus | NVARCHAR(20) | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | QuantityDisplay | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | Rating | DECIMAL(3,2) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | ReviewCount | INT | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | RowVersion | ROWVERSION | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | SortOrder | INT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | UpdatedBy | INT | YES | NO | Users | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | UrgencyText | NVARCHAR(300) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteProducts | WarrantyDisplay | NVARCHAR(100) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteSettings | IsPublic | BIT | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:116 |
| WebsiteSettings | SettingKey | NVARCHAR(100) | NO | YES | — | — | database/migrations/20260813_website_management_module.sql:116 |
| WebsiteSettings | UpdatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:116 |
| WebsiteSettings | UpdatedByUserId | INT | YES | NO | Users | — | database/migrations/20260813_website_management_module.sql:116 |
| WebsiteSettings | Value | NVARCHAR(2000) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:116 |
| WebsiteWarrantyClaimAttachments | AttachmentType | NVARCHAR(30) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:88 |
| WebsiteWarrantyClaimAttachments | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:88 |
| WebsiteWarrantyClaimAttachments | DetectedMimeType | NVARCHAR(100) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:88 |
| WebsiteWarrantyClaimAttachments | Id | BIGINT | NO | YES | — | — | database/migrations/20260813_website_management_module.sql:88 |
| WebsiteWarrantyClaimAttachments | OriginalFileName | NVARCHAR(260) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:88 |
| WebsiteWarrantyClaimAttachments | ScanStatus | NVARCHAR(20) | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:88 |
| WebsiteWarrantyClaimAttachments | SizeBytes | BIGINT | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:88 |
| WebsiteWarrantyClaimAttachments | StorageKey | NVARCHAR(500) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:88 |
| WebsiteWarrantyClaimAttachments | WarrantyClaimId | BIGINT | NO | NO | WebsiteWarrantyClaims | — | database/migrations/20260813_website_management_module.sql:88 |
| WebsiteWarrantyClaimCustomerMessages | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:109 |
| WebsiteWarrantyClaimCustomerMessages | CreatedByUserId | INT | NO | NO | Users | — | database/migrations/20260813_website_management_module.sql:109 |
| WebsiteWarrantyClaimCustomerMessages | Id | BIGINT | NO | YES | — | — | database/migrations/20260813_website_management_module.sql:109 |
| WebsiteWarrantyClaimCustomerMessages | Message | NVARCHAR(4000) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:109 |
| WebsiteWarrantyClaimCustomerMessages | WarrantyClaimId | BIGINT | NO | NO | WebsiteWarrantyClaims | — | database/migrations/20260813_website_management_module.sql:109 |
| WebsiteWarrantyClaimHistory | ChangedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:95 |
| WebsiteWarrantyClaimHistory | ChangedByUserId | INT | YES | NO | Users | — | database/migrations/20260813_website_management_module.sql:95 |
| WebsiteWarrantyClaimHistory | EventType | NVARCHAR(50) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:95 |
| WebsiteWarrantyClaimHistory | Id | BIGINT | NO | YES | — | — | database/migrations/20260813_website_management_module.sql:95 |
| WebsiteWarrantyClaimHistory | NewResolutionType | NVARCHAR(20) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:95 |
| WebsiteWarrantyClaimHistory | NewStatus | NVARCHAR(30) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:95 |
| WebsiteWarrantyClaimHistory | OldResolutionType | NVARCHAR(20) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:95 |
| WebsiteWarrantyClaimHistory | OldStatus | NVARCHAR(30) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:95 |
| WebsiteWarrantyClaimHistory | Remark | NVARCHAR(2000) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:95 |
| WebsiteWarrantyClaimHistory | WarrantyClaimId | BIGINT | NO | NO | WebsiteWarrantyClaims | — | database/migrations/20260813_website_management_module.sql:95 |
| WebsiteWarrantyClaimNotes | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:102 |
| WebsiteWarrantyClaimNotes | CreatedByUserId | INT | NO | NO | Users | — | database/migrations/20260813_website_management_module.sql:102 |
| WebsiteWarrantyClaimNotes | Id | BIGINT | NO | YES | — | — | database/migrations/20260813_website_management_module.sql:102 |
| WebsiteWarrantyClaimNotes | Note | NVARCHAR(4000) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:102 |
| WebsiteWarrantyClaimNotes | WarrantyClaimId | BIGINT | NO | NO | WebsiteWarrantyClaims | — | database/migrations/20260813_website_management_module.sql:102 |
| WebsiteWarrantyClaims | AssignedToUserId | INT | YES | NO | Users | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | CompletedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | ConsentAccepted | BIT | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | ConsentAcceptedAtUtc | DATETIME | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | CreatedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | Description | NVARCHAR(2000) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | Email | NVARCHAR(254) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | FullName | NVARCHAR(100) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | Id | BIGINT | NO | YES | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | OrderNumber | NVARCHAR(100) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | PurchaseDate | DATE | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | ReferenceId | NVARCHAR(30) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | RefundAmount | DECIMAL(18,2) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | RefundReference | NVARCHAR(200) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | RepairReference | NVARCHAR(200) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | ReplacementReference | NVARCHAR(200) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | ReplacementTrackingNumber | NVARCHAR(200) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | ResolutionRemarks | NVARCHAR(2000) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | ResolutionType | NVARCHAR(20) | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | ResolvedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | ReviewedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | Source | NVARCHAR(100) | NO | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | Status | NVARCHAR(30) | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | SubmittedAtUtc | DATETIME | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | UpdatedAtUtc | DATETIME | YES | NO | — | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaims | WebsiteProductId | BIGINT | YES | NO | WebsiteProducts | — | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaimSequences | ClaimYear | INT | NO | YES | — | — | database/migrations/20260813_website_management_module.sql:75 |
| WebsiteWarrantyClaimSequences | NextNumber | INT | NO | NO | — | YES | database/migrations/20260813_website_management_module.sql:75 |

## Table source registry

| Table | Create-table source |
|---|---|
| AuditLogs | database/001_Full_Database_Setup.sql:156 |
| Categories | database/001_Full_Database_Setup.sql:1416 |
| ChannelSkuMappings | database/migrations/20260715_procurement_planning_module.sql:51 |
| ChannelWarehouses | database/migrations/20260727_supply_chain_common_foundation.sql:37 |
| CompanyGstRegistrations | database/003_gst_integration_module.sql:7 |
| CompanyGstSessions | database/003_gst_integration_module.sql:42 |
| DataBookEntries | database/migrations/20260806_data_book_module.sql:13 |
| DataBookEntryHistory | database/migrations/20260806_data_book_module.sql:48 |
| DispatchAllocations | database/migrations/20260728_dispatch_planning_module.sql:277 |
| DispatchCompanyStockSnapshots | database/migrations/20260728_dispatch_planning_module.sql:210 |
| DispatchImportStagedRows | database/migrations/20260728_dispatch_planning_module.sql:51 |
| DispatchPlanningRuns | database/migrations/20260728_dispatch_planning_module.sql:172 |
| DispatchRecommendationResults | database/migrations/20260728_dispatch_planning_module.sql:232 |
| DispatchSkuSettings | database/migrations/20260728_dispatch_planning_module.sql:17 |
| DispatchWarehouseInboundSnapshots | database/migrations/20260728_dispatch_planning_module.sql:144 |
| DispatchWarehouseSalesSnapshots | database/migrations/20260728_dispatch_planning_module.sql:88 |
| DispatchWarehouseStockSnapshots | database/migrations/20260728_dispatch_planning_module.sql:115 |
| EInvoices | database/003_gst_integration_module.sql:128 |
| EWayBills | database/003_gst_integration_module.sql:89 |
| ExpenseCategories | database/001_Full_Database_Setup.sql:3654 |
| Expenses | database/001_Full_Database_Setup.sql:3655 |
| GstApiLogs | database/003_gst_integration_module.sql:161 |
| GstVerificationLogs | database/003_gst_integration_module.sql:64 |
| HR_Attendance | database/001_Full_Database_Setup.sql:2187 |
| HR_AttendanceAdjustments | database/001_Full_Database_Setup.sql:2206 |
| HR_Departments | database/001_Full_Database_Setup.sql:2064 |
| HR_Designations | database/001_Full_Database_Setup.sql:2079 |
| HR_EmployeeAddresses | database/001_Full_Database_Setup.sql:2143 |
| HR_EmployeeBankAccounts | database/001_Full_Database_Setup.sql:2158 |
| HR_EmployeeDocuments | database/001_Full_Database_Setup.sql:2173 |
| HR_Employees | database/001_Full_Database_Setup.sql:2115 |
| HR_EmployeeSalaryStructures | database/001_Full_Database_Setup.sql:2315 |
| HR_LeaveApplications | database/001_Full_Database_Setup.sql:2254 |
| HR_LeaveBalances | database/001_Full_Database_Setup.sql:2238 |
| HR_LeaveTypes | database/001_Full_Database_Setup.sql:2224 |
| HR_PayrollDetails | database/001_Full_Database_Setup.sql:2343 |
| HR_PayrollRuns | database/001_Full_Database_Setup.sql:2329 |
| HR_SalaryComponents | database/001_Full_Database_Setup.sql:2287 |
| HR_SalaryStructureComponents | database/001_Full_Database_Setup.sql:2301 |
| HR_SalaryStructures | database/001_Full_Database_Setup.sql:2275 |
| HR_Shifts | database/001_Full_Database_Setup.sql:2096 |
| ItemPackagingProfiles | database/migrations/20260727_supply_chain_common_foundation.sql:73 |
| Items | database/001_Full_Database_Setup.sql:1433 |
| NumberSequences | database/001_Full_Database_Setup.sql:3098 |
| OeeDowntimeReasons | database/migrations/20260703_oee_module.sql:66 |
| OeeMachines | database/migrations/20260703_oee_module.sql:24 |
| OeeMoulds | database/migrations/20260703_oee_module.sql:44 |
| OeeProductionEntries | database/migrations/20260703_oee_module.sql:82 |
| Pages | database/001_Full_Database_Setup.sql:87 |
| Parties | database/001_Full_Database_Setup.sql:904 |
| PartyLedgerEntries | database/001_Full_Database_Setup.sql:3660 |
| PartyRoles | database/migrations/20260729_shipment_operations_module.sql:14 |
| PartySettings | database/001_Full_Database_Setup.sql:946 |
| PasswordResetTokens | database/001_Full_Database_Setup.sql:140 |
| PaymentModes | database/001_Full_Database_Setup.sql:3118 |
| ProcurementInboundStockSnapshots | database/migrations/20260727_procurement_shared_foundation_alignment.sql:15 |
| ProcurementLeadTimeHistory | database/migrations/20260715_procurement_planning_module.sql:207 |
| ProcurementPlanningRunLines | database/migrations/20260715_procurement_planning_module.sql:257 |
| ProcurementPlanningRuns | database/migrations/20260715_procurement_planning_module.sql:231 |
| ProcurementSalesHistory | database/migrations/20260715_procurement_planning_module.sql:107 |
| ProcurementSalesImportBatches | database/migrations/20260715_procurement_planning_module.sql:78 |
| ProcurementSettings | database/migrations/20260715_procurement_planning_module.sql:175 |
| ProductBomComponents | database/migrations/20260715_procurement_planning_module.sql:145 |
| PurchaseBillItems | database/001_Full_Database_Setup.sql:3648 |
| PurchaseBills | database/001_Full_Database_Setup.sql:3645 |
| PurchaseOrderItems | database/001_Full_Database_Setup.sql:3657 |
| PurchaseOrders | database/001_Full_Database_Setup.sql:3656 |
| PurchaseReturnItems | database/001_Full_Database_Setup.sql:3659 |
| PurchaseReturns | database/001_Full_Database_Setup.sql:3658 |
| RefreshTokens | database/001_Full_Database_Setup.sql:124 |
| RolePermissions | database/001_Full_Database_Setup.sql:105 |
| Roles | database/001_Full_Database_Setup.sql:60 |
| SalesChannels | database/migrations/20260715_procurement_planning_module.sql:28 |
| SalesInvoiceItems | database/001_Full_Database_Setup.sql:3179 |
| SalesInvoicePayments | database/001_Full_Database_Setup.sql:3211 |
| SalesInvoices | database/001_Full_Database_Setup.sql:3143 |
| ShipmentAppointments | database/migrations/20260729_shipment_operations_module.sql:238 |
| ShipmentDeliveryAttempts | database/migrations/20260729_shipment_operations_module.sql:298 |
| ShipmentDockets | database/migrations/20260729_shipment_operations_module.sql:203 |
| ShipmentFreightCharges | database/migrations/20260729_shipment_operations_module.sql:423 |
| ShipmentImportStagedRows | database/migrations/20260729_shipment_operations_module.sql:477 |
| ShipmentItems | database/migrations/20260729_shipment_operations_module.sql:99 |
| ShipmentPackageItems | database/migrations/20260729_shipment_operations_module.sql:183 |
| ShipmentPackages | database/migrations/20260729_shipment_operations_module.sql:142 |
| ShipmentReceiptItems | database/migrations/20260729_shipment_operations_module.sql:341 |
| ShipmentReceipts | database/migrations/20260729_shipment_operations_module.sql:319 |
| ShipmentReturnItems | database/migrations/20260729_shipment_operations_module.sql:397 |
| ShipmentReturns | database/migrations/20260729_shipment_operations_module.sql:364 |
| Shipments | database/migrations/20260729_shipment_operations_module.sql:29 |
| ShipmentTrackingEvents | database/migrations/20260729_shipment_operations_module.sql:270 |
| StockMovements | database/001_Full_Database_Setup.sql:3234 |
| SupplierPaymentAllocations | database/001_Full_Database_Setup.sql:3653 |
| SupplierPayments | database/001_Full_Database_Setup.sql:3651 |
| SupplyChainImportBatches | database/migrations/20260727_supply_chain_common_foundation.sql:120 |
| SupplyChainImportRows | database/migrations/20260727_supply_chain_common_foundation.sql:158 |
| Units | database/001_Full_Database_Setup.sql:1399 |
| UserRoles | database/001_Full_Database_Setup.sql:74 |
| Users | database/001_Full_Database_Setup.sql:41 |
| WalletCategories | database/migrations/20260720_rojmel_wallet_module.sql:43 |
| Wallets | database/migrations/20260720_rojmel_wallet_module.sql:13 |
| WalletTransactions | database/migrations/20260720_rojmel_wallet_module.sql:95 |
| WalletTransfers | database/migrations/20260720_rojmel_wallet_module.sql:64 |
| WebsiteAnnouncements | database/migrations/20260813_website_management_module.sql:66 |
| WebsiteBlogCategories | database/migrations/20260813_website_management_module.sql:47 |
| WebsiteBlogPosts | database/migrations/20260813_website_management_module.sql:56 |
| WebsiteContactEnquiries | database/migrations/20260813_website_management_module.sql:122 |
| WebsiteProductBenefits | database/migrations/20260813_website_management_module.sql:33 |
| WebsiteProductMedia | database/migrations/20260813_website_management_module.sql:40 |
| WebsiteProducts | database/migrations/20260813_website_management_module.sql:12 |
| WebsiteSettings | database/migrations/20260813_website_management_module.sql:116 |
| WebsiteWarrantyClaimAttachments | database/migrations/20260813_website_management_module.sql:88 |
| WebsiteWarrantyClaimCustomerMessages | database/migrations/20260813_website_management_module.sql:109 |
| WebsiteWarrantyClaimHistory | database/migrations/20260813_website_management_module.sql:95 |
| WebsiteWarrantyClaimNotes | database/migrations/20260813_website_management_module.sql:102 |
| WebsiteWarrantyClaims | database/migrations/20260813_website_management_module.sql:78 |
| WebsiteWarrantyClaimSequences | database/migrations/20260813_website_management_module.sql:75 |

## Stored procedures, views and triggers

The scripts define 485 unique stored procedures. A procedure parameter without a default value is required to that procedure call; parameters, `IS NULL` branches, INSERT/UPDATE/JOIN/WHERE use and caller mappings must be read before making any column optional. Dapper sends named procedure parameters from repository anonymous objects (`src/Cosmos.Persistence/Dapper/StoredProcedureExecutor.cs:10-71`).

| Procedure prefix / area | Unique definitions |
|---|---:|
| ActivityLog | 3 |
| AuditLog | 1 |
| Auth | 7 |
| Category | 8 |
| Dashboard | 8 |
| DataBookEntry | 7 |
| DispatchPlanning | 20 |
| EInvoice | 3 |
| EWayBill | 3 |
| Expense | 5 |
| ExpenseCategory | 6 |
| GstApiLog | 2 |
| GstRegistration | 8 |
| GstSession | 2 |
| GstVerification | 1 |
| GstVerificationLog | 1 |
| HR | 57 |
| Item | 7 |
| OeeDashboard | 5 |
| OeeDowntimeReason | 6 |
| OeeMachine | 6 |
| OeeMould | 6 |
| OeeProductionEntry | 5 |
| OeeReport | 4 |
| Other | 1 |
| Page | 6 |
| Party | 7 |
| PartySettings | 2 |
| Permission | 3 |
| ProcurementInboundSnapshot | 1 |
| ProcurementPlanning | 39 |
| PurchaseBill | 7 |
| PurchaseExpense | 2 |
| PurchaseExpenseReport | 5 |
| PurchaseOrder | 7 |
| PurchaseReturn | 5 |
| Report | 38 |
| RojmelDashboard | 3 |
| RojmelReport | 7 |
| Role | 6 |
| Sales | 2 |
| SalesInvoice | 9 |
| SalesReport | 3 |
| ShipmentOperations | 34 |
| SupplierPayment | 5 |
| SupplyChain | 28 |
| SystemOwner | 2 |
| Unit | 8 |
| User | 15 |
| Wallet | 7 |
| WalletCategory | 1 |
| WalletTransaction | 8 |
| WalletTransfer | 4 |
| WebsiteAnnouncement | 5 |
| WebsiteBlogCategory | 4 |
| WebsiteBlogPost | 6 |
| WebsiteContactEnquiry | 1 |
| WebsiteManagementDashboard | 1 |
| WebsiteProduct | 5 |
| WebsiteSettings | 3 |
| WebsiteWarrantyClaim | 14 |

Views: `vw_ActivityLogs`, `vw_UserEffectivePermissions`.

Triggers: `TR_DataBookEntryHistory_AppendOnly`, `TR_ShipmentTrackingEvents_AppendOnly`, `TR_WebsiteWarrantyClaimHistory_AppendOnly`, `trg_DispatchAllocations_PreventFinalizedMutation`, `trg_DispatchPlanningRuns_PreventFinalizedMutation`, `trg_DispatchRecommendationResults_PreventFinalizedMutation`.

## Database migration impact by field category

| Category | Make optional | Completely remove |
|---|---|---|
| Ordinary `NOT NULL` column | Alter column to `NULL` after procedure/API null handling is deployed; review defaults, unique/check indexes and NULL query semantics. | Remove dependent SELECT/INSERT/UPDATE/procedure parameters, indexes/defaults/checks, then drop column only after client/history migration. |
| Required FK column | Decide whether relation becomes optional and alter both column and FK; review delete action and all joins. | Migrate child rows, remove relation queries/procedure parameters/index/FK, then drop column. |
| PK/identity or ledger/audit key | Not a normal optionality candidate. Use a surrogate/replacement key migration. | Critical redesign with reference remapping and historic-data retention. |
| Rowversion/concurrency field | Do not make optional without replacing optimistic-concurrency policy. | Remove concurrency checks and update APIs/procedures together; high breaking risk. |

## Parse qualification

Unparsed CREATE TABLE blocks: 0. The matrix includes columns that could be structurally parsed from each table declaration; raw SQL remains the evidence of record for computed columns, composite keys/FKs, later `ALTER TABLE` changes, table-valued parameters and procedure parameter defaults.
