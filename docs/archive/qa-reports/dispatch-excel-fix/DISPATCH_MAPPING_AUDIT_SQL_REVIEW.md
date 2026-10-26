# Dispatch Mapping Audit SQL — Syntax-Fix Review

**Review date:** 2026-10-12  
**Scope:** Static source and syntax review only. No query was run against production, a replica, a restored database, or any SQL Server instance.  
**Decision:** **READY FOR ISOLATED EXECUTION** after an operator provides the approved replica/restored database, read-only access, audit scope, and date range, and Batch 1 succeeds. It is not approved for production execution.

## Files reviewed and corrected

- `qa-reports/dispatch-excel-fix/DISPATCH_MAPPING_AUDIT_SQL.sql`
- `qa-reports/dispatch-excel-fix/DISPATCH_MAPPING_AUDIT_EXECUTION_GUIDE.md`
- `backend/database/migrations/20260715_procurement_planning_module.sql`
- `backend/database/migrations/20260727_supply_chain_common_foundation.sql`
- `backend/database/migrations/20260728_dispatch_planning_module.sql`
- `backend/database/migrations/20261008_dispatch_planning_sku_snapshot_integrity.sql`

The requested files with a literal `(1)` suffix were not present in the workspace. The canonical files above were updated.

## Findings, root causes, and fixes

| ID | Severity | Finding and evidence | Fix applied |
|---|---|---|---|
| SQL-01 | P1 | `:ON ERROR EXIT` at former SQL line 1 was a SQLCMD metacommand, not Transact-SQL. Submitting it in normal SSMS explains `Incorrect syntax near ':'`. | Removed the directive. The file is now plain Transact-SQL (SQL lines 1-13) and can be submitted in SSMS standard mode. `sqlcmd -b` is documented when a non-zero command-line exit code is required. |
| SQL-02 | P1 | The reported backtick syntax error cannot arise from the final canonical script: static inspection found no backtick characters or Markdown fences. It likely came from text copied from a Markdown-rendered document or a different script copy; this cannot be proven without the submitted text. | The guide now requires opening the canonical `.sql` file directly and explicitly prohibits pasting ``` fences, review text, or copied code blocks (guide execution step 1). |
| SQL-03 | P1 | `RowCount` was used as an alias in Batch 2 and Batch 4 and referenced in Batch 4. It was reported by SQL Server near the alias/reference. | Renamed all aliases and references to `RowCountValue` at SQL lines 293, 466, and 492. No remaining whole-word `RowCount` alias/reference exists. |
| SQL-04 | P1 | The reported comma at the former line 315 is downstream of a parser error near the earlier `RowCount` alias, or came from a divergent submitted copy. The canonical file available for review did not contain an independently invalid trailing comma there. | Reviewed both identity CTE select lists, CTE separators, window partitions, `CROSS APPLY`, and parentheses. Both `IdentityGroups` CTEs terminate `ValidMappingCount` without a comma before `FROM` (SQL lines 293-302 and 466-473); the corrected `COUNT(*) OVER` expressions are syntactically balanced (lines 305-317 and 476-488). |
| SQL-05 | P1 | `COUNT(DISTINCT ...)` ignores NULL. A former concatenated inbound candidate identity could also convert a NULL mapping into a non-NULL token, falsely classifying it as a duplicate candidate. | Duplicate candidates now use `COUNT(*) OVER (PARTITION BY actual source columns)` (SQL lines 305-317 and 476-488). The predicate explicitly requires `ChannelItemMappingId IS NOT NULL` (lines 327 and 502). NULL mapping IDs remain relationship exceptions, not duplicate candidates. |
| SQL-06 | P1 | `THROW` guards used an unnecessary leading semicolon and the guide depended on a removed SQLCMD directive for flow control. | Guards are conventional `BEGIN` / `THROW` / `END;` blocks at SQL lines 22-35 and 93-176. There are no `GO` batch separators; a thrown parameter or preflight error terminates the single submitted batch. Manual preflight instructions identify the exact safe stopping boundary. |
| SQL-07 | P2 | A scope can mean source creation time, upload time, or business-effective date; mixing these clocks would produce misleading batch evidence. | Mandatory scope validation is at SQL lines 18-35. Each scope filters source rows consistently, and Batch 1/Batch 2 batch evidence derives from those selected rows. The guide documents all three meanings and requires owner approval rather than choosing one. |
| SQL-08 | P2 | Every selected object and field must be validated before later audit results can be trusted. | Batch 1 enumerates required table/column pairs, returns missing fields, then guards all required tables and columns with `OBJECT_ID`/`COL_LENGTH` and throws error 51003 on any failure (SQL lines 39-176). |
| SQL-09 | P3 | Repository migrations cannot prove deployed schema, permissions, compatibility level, source data, or target isolation. | Remains a pre-execution blocker. Batch 1, a read-only login, and the approved non-production target are mandatory; no data finding is claimed. |

## Schema verification

| Dependency | Migration evidence | Fields checked by Batch 1 |
|---|---|---|
| Sales snapshots | `20260728_dispatch_planning_module.sql:88-108` | ID, import batch, channel, warehouse, item, mapping, sales period/quantity, source reference, created time. |
| Stock snapshots | `20260728_dispatch_planning_module.sql:115-137` | ID, import batch, channel, warehouse, item, mapping, snapshot date, sellable quantity, source reference, created time. |
| Inbound snapshots | `20260728_dispatch_planning_module.sql:144-166` | ID, import batch, channel, warehouse, item, mapping, snapshot date, inbound quantity, expected arrival, reference, status, source reference, created time. |
| Import batches | `20260727_supply_chain_common_foundation.sql:120-150` | ID, module/type/channel/status, upload/commit time, and row-count metadata. |
| SKU mappings | `20260715_procurement_planning_module.sql:51-69` | ID, channel, item, SKU, active/deleted state. |
| Warehouses | `20260727_supply_chain_common_foundation.sql:37-57` | ID, channel, warehouse code, active/deleted state. |

## Static validation performed

- Confirmed no leading colon/SQLCMD command, Markdown backtick, or `GO` separator is present in the canonical SQL file.
- Confirmed all three `RowCountValue` occurrences are the two aliases and their Batch 4 projection reference.
- Confirmed the duplicate logic uses windowed `COUNT(*)`, not `COUNT(DISTINCT ...)` or a concatenated identity.
- Confirmed no trailing comma follows either `ValidMappingCount` expression before `FROM`.
- Searched the executable SQL for data-changing statements. It contains only `SET`, `DECLARE`, `IF`/`THROW`, CTEs, `SELECT`, `CROSS APPLY`, and window/grouped aggregates. It contains no `INSERT`, `UPDATE`, `DELETE`, `MERGE`, DDL, procedure execution, transaction control, or permission change.

This is a static review, not SQL Server compilation or execution. The SQL Server engine/version and target permissions have not been verified in this task.

## Remaining blockers and assumptions

1. The business/data owner must approve the restored database or reporting replica, selected channel scope, and one exact audit-time semantics/range.
2. The operator must use a read-only login that can see the required tables and metadata (`sys.schemas`, `sys.tables`, and `sys.columns`).
3. Batch 1 must return no missing object/column rows and must not raise errors 51000-51003. Otherwise stop; do not execute later batches.
4. Current mapping/warehouse active state is not historical proof of status at import time.
5. Multiple valid mappings and duplicate candidates require business/data-owner interpretation. The audit neither deletes/merges records nor asserts that a candidate is a confirmed duplicate.
6. An empty Batch 3 or Batch 4 result is not evidence of clean mappings unless Batch 1A reports in-scope source records and Batch 2 reports `Rows audited` greater than zero for the relevant source type.

## Empty-result diagnostics update

The current configured parameters are `SNAPSHOT_CREATED_UTC`, `2026-09-01T00:00:00` inclusive through `2026-10-01T00:00:00` exclusive, and all channels (`@ChannelId = NULL`). Five header-only grids are consistent with no snapshot rows having `CreatedAtUtc` in that range, but this static review cannot establish that fact from the database.

The script now adds Batch 1A immediately after the schema guard. It always returns one row containing the selected scope and parameters plus sales, stock, inbound, total, and known-batch in-scope record counts. Batch 2 now emits zero-valued `Rows audited` and `Relationship exception rows` rows for each source type even when no data matches. This distinguishes an empty audit population from an audited population with no exceptions.

**2026-10-12 correction:** the first Batch 1A revision omitted `FROM InScopeRows` after its aggregate projection, causing SQL Server errors 207 for `SourceType` and `ImportBatchId`. The aggregate now explicitly reads from the CTE. No audit predicate or data-access behavior changed.

## Exact safe execution route

Follow `DISPATCH_MAPPING_AUDIT_EXECUTION_GUIDE.md` in the same directory. Open the canonical SQL file, set the approved parameters, run its declarations/validation/Batch 1 first, and stop on any preflight finding or throw. For command-line execution, use `sqlcmd -b` as documented. Do not run against production.

## Final readiness

**READY FOR ISOLATED EXECUTION** only under the preceding blockers and execution guide. The script remains read-only and is not an authorization for production execution, data remediation, schema change, or application changes.
