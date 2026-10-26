# Dispatch Mapping Audit — Execution Guide

## Purpose and safety boundary

This guide covers [DISPATCH_MAPPING_AUDIT_SQL.sql](D:/Work/My_Projects/cosmos/qa-reports/dispatch-excel-fix/DISPATCH_MAPPING_AUDIT_SQL.sql). It is a read-only evidence-gathering audit. The SQL uses no DML, DDL, procedure execution, temporary-object creation, or transaction control.

It has not been executed by this task against production, a replica, or a restored database.

## What is ready to execute

The SQL is ready for an approved Microsoft SQL Server restored database or reporting replica that matches the migration-defined Dispatch schema. It is plain Transact-SQL and may be run in SSMS standard query mode or SQLCMD mode. For an automated non-zero exit code on error, use the `sqlcmd` utility with `-b`. The script contains no SQLCMD directives, so it cannot produce an `Incorrect syntax near ':'` error when submitted as ordinary T-SQL.

| Object | Migration evidence | Audit purpose |
|---|---|---|
| dbo.DispatchWarehouseSalesSnapshots | backend/database/migrations/20260728_dispatch_planning_module.sql:86-110 | Sales period, source identity, mapping, batch, and duplicate-candidate checks. |
| dbo.DispatchWarehouseStockSnapshots | 20260728_dispatch_planning_module.sql:113-139 | Stock snapshot-date, mapping, batch, and duplicate-candidate checks. |
| dbo.DispatchWarehouseInboundSnapshots | 20260728_dispatch_planning_module.sql:142-167 | Inbound mapping/reference/status, batch, and duplicate-candidate checks. |
| dbo.SupplyChainImportBatches | backend/database/migrations/20260727_supply_chain_common_foundation.sql:118-151 | Batch module/type/channel/committed-status evidence. |
| dbo.ChannelSkuMappings | backend/database/migrations/20260715_procurement_planning_module.sql:49-76 | Mapping existence, active/deleted state, item, channel, and SKU evidence. |
| dbo.ChannelWarehouses | backend/database/migrations/20260727_supply_chain_common_foundation.sql:35-58 | Warehouse existence, active/deleted state, and channel evidence. |

Every detailed result contains the immutable source snapshot Id as SnapshotId. It identifies the exact source record without modifying it.

## Pre-execution checklist

- [ ] Written data-owner approval identifies the restored database/reporting replica, channels, and UTC audit range.
- [ ] The target is not production. This task does not authorize production execution.
- [ ] Connection uses a read-only account with only SELECT permission on the listed tables and metadata visibility needed by the preflight query.
- [ ] Operator has recorded server/database name, restore or replica reference, database version, and repository revision outside the database.
- [ ] The query tool points to the approved database; no credentials will be copied into saved evidence.
- [ ] The business/data owner selected exactly one approved scope: `SNAPSHOT_CREATED_UTC`, `BATCH_UPLOADED_UTC`, or `BUSINESS_EFFECTIVE_DATE`.
- [ ] For either UTC timestamp scope, AuditStartUtc and exclusive AuditEndUtc have approved values. For BUSINESS_EFFECTIVE_DATE, AuditStartDate and exclusive AuditEndDate have approved dates. Optional ChannelId is set only if the approved scope is one channel.
- [ ] The operator has an external audit ticket/reference and will record execution UTC time, parameters, output row counts, and script file hash.
- [ ] The operator understands that results classify evidence; they are not instructions to delete, merge, update, or reassign any source record.

## Execution sequence

1. Open the canonical `.sql` file directly. Do not paste Markdown fences (```), review text, or a copied code block into the query editor. The canonical file contains no backticks or SQLCMD directives.
2. In SSMS, choose the approved restored database/reporting replica and run in standard query mode. SQLCMD mode (Query > SQLCMD Mode) is also supported but not required because the file has no SQLCMD commands. Do not use a client or connection that targets production.
3. Set `@AuditScope` and the matching approved range variables at the top; leave the non-selected range variables NULL. Missing/invalid scope or range values throw before audit queries run.
4. For an explicit manual preflight review, select the declarations, parameter validation, and Batch 1 only, ending with the schema-gate `END;` statement immediately before the `In-scope batch evidence` comment. Execute that selection. If the missing-object result set is non-empty or error 51000, 51001, 51002, or 51003 occurs, stop and do not select any later batch.
5. For a normal SSMS run, submit the complete script as one batch. It intentionally contains no `GO` separators: a parameter or schema `THROW` aborts the submitted batch before later audit statements execute.
6. For command-line execution with an error exit code, use SQLCMD with `-b` after setting the approved variables in the file:

   ```powershell
   sqlcmd -S "<approved-server>" -d "<approved-restored-or-replica-database>" -E -b -i "D:\Work\My_Projects\cosmos\qa-reports\dispatch-excel-fix\DISPATCH_MAPPING_AUDIT_SQL.sql"
   ```

   Use the organisation-approved authentication mechanism in place of `-E` if needed; do not place passwords in a saved command or audit output.

7. Batch 1 first emits the preflight result set, then rechecks every required table/column with `COL_LENGTH` and throws if anything is unavailable.
8. Batch 1A then always returns exactly one scope-diagnostics row. Confirm its selected scope, dates, channel, and per-source/total record counts match the approval. `NO_SOURCE_RECORDS_MATCHED_SCOPE` means the later empty grids are not evidence of valid mappings.
9. Proceed only when the missing-object result set is empty, scope diagnostics match the approval, and returned in-scope batch evidence is understood. Otherwise stop and raise a schema/scope clarification.
10. Batch 2 always returns summary rows for Sales, Stock, and Inbound. Compare `Rows audited` with `Relationship exception rows`: zero exceptions is only meaningful when rows audited is greater than zero.
11. Save Batch 3 detailed relationship exceptions and Batch 4 mapping-identity/duplicate-candidate evidence.
12. Export result sets through the approved evidence process. Record query revision/hash, execution time, parameters, row counts, operator, server/database reference, and restore/replica reference externally.
13. Send the immutable exception inventory to the data owner under [DISPATCH_MAPPING_DATA_AUDIT_PLAN.md](D:/Work/My_Projects/cosmos/qa-reports/dispatch-excel-fix/DISPATCH_MAPPING_DATA_AUDIT_PLAN.md). Do not remediate from query output.

## Result interpretation

| Finding | Meaning | Required handling |
|---|---|---|
| Missing import batch/mapping/warehouse | A referenced relation is unavailable to the expected schema query. | Treat as integrity/deployment evidence. Investigate; do not infer a replacement. |
| Invalid batch module/type/status/channel | Snapshot source does not agree with committed Dispatch source expectations. | Exclude it from parity eligibility pending technical/data-owner review. |
| Inactive/deleted mapping or warehouse | The current master record is inactive/deleted. | Historical-state evidence, not automatically corruption. The schema does not prove its status at import time. |
| Mapping item/channel or warehouse-channel mismatch | Source identity conflicts with master data. | Ambiguous attribution; block affected policy-2 source identity until source-owner correction. |
| LEGITIMATE_MULTIPLE_MAPPINGS_REQUIRES_MAPPING_AWARE_IDENTITY | More than one currently valid mapping shares a legacy source identity. | Preserve every record. This is a design/data-shape finding, not an invalid-row finding. |
| AMBIGUOUS_MULTIPLE_MAPPING_ATTRIBUTION | More than one mapping exists and one or more relationships are missing, inactive, or inconsistent. | Data owner must classify; never select a mapping by heuristic. |
| DUPLICATE_CANDIDATE_AT_MAPPING_AWARE_IDENTITY | Two or more rows with a non-NULL mapping share the exact source-specific candidate identity. | Investigate correction/import semantics. Inbound rows with no reference are not automatically duplicate receipts. NULL mapping IDs are relationship exceptions, not duplicate candidates. |
| `NO_SOURCE_RECORDS_MATCHED_SCOPE` | The approved scope/filter matched no sales, stock, or inbound source rows. | Do not infer mapping validity. Confirm scope semantics, date range, channel filter, and snapshot/import timing before rerunning. |

## Schema assumptions and required clarification

1. Migration versus deployment: object and column names were verified from repository migrations, not from a live database. Batch 1 is mandatory.
2. SQL Server compatibility: the script uses THROW, CTEs, CROSS APPLY, window functions, and grouped aggregates. The deployment compatibility level was not verified; it must support the existing migration syntax. SQLCMD is optional for SSMS execution; `sqlcmd -b` is the recommended command-line mode when an error exit code is required.
3. Scope definition is deliberately not chosen by the script. Operators must select one approved scope: SNAPSHOT_CREATED_UTC filters every source by CreatedAtUtc; BATCH_UPLOADED_UTC filters using its import batch UploadedAtUtc; BUSINESS_EFFECTIVE_DATE filters sales rows whose PeriodFrom/PeriodTo overlap the inclusive/exclusive date range and filters stock/inbound by SnapshotDate. In-scope batch metadata is derived from the selected source rows, preventing a second, different clock from silently changing batch evidence.
4. Historical master-data state: ChannelSkuMappings and ChannelWarehouses expose current IsActive/IsDeleted, but audited schema has no immutable mapping/warehouse status history in this query shape. Current inactivity does not prove invalidity at time of import.
5. Multiple mappings: the schema cannot establish whether two valid mappings are commercially legitimate. That is a business/data-owner decision; the script deliberately reports valid multi-mapping groups separately.
6. Inbound duplicates: nullable ReferenceNumber means identical inbound details are candidates, not confirmed duplicates. Candidate counting uses SQL Server window partitions over actual columns, not a concatenated key or COUNT(DISTINCT), and excludes NULL mapping IDs.
7. Committed status: the audit treats status 5 as committed because usp_DispatchPlanning_Import_Commit sets it at backend/database/migrations/20260728_dispatch_planning_module.sql:568. It does not infer meanings for other status values.

## Read-only verification

The SQL file was reviewed after generation. Its SQL statement types are SET, DECLARE, IF/THROW, CTEs, and SELECT. It has no SQLCMD directives and contains no INSERT, UPDATE, DELETE, MERGE, CREATE, ALTER, DROP, EXEC, BEGIN TRANSACTION, COMMIT, or ROLLBACK.

## Ready versus blocked

Ready now:

- Read-only schema preflight.
- Read-only summary counts.
- Immutable-ID relationship exception rows.
- Separate legitimate-multiple-mapping, ambiguous-attribution, and duplicate-candidate evidence.

Requires clarification before interpreting or changing anything:

- The approved target environment and scope selection/range.
- The business meaning of multiple valid mappings.
- Any correction policy for duplicate-candidate rows.
- Any future migration/remediation action. This guide does not authorize one.

