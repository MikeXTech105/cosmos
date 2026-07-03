# Database Verification Report

## Summary
- Source export checked: `D:\Downloads\CurrentDatabase_SchemaAndData.sql`
- Backend scanned: `backend/src/**/*.cs`, `backend/database/**/*.sql`, controllers, repositories, DTOs, permission attributes, constants, and setup/migration SQL.
- Result: the export matches the application contract for required tables, user-defined table types, stored procedure names/signatures, and permission page names.
- Generated safe fixes: useful missing FK/search-support indexes only.
- No direct database changes were made.

## What Was Checked
- 58 exported tables against project database scripts.
- 6 exported user-defined table types against Dapper table-valued parameter usage.
- 211 exported stored procedures against 209 stored procedures referenced from C# repositories/services.
- Stored procedure parameter names and data types against the project SQL scripts.
- `RequirePermission(...)` usage in controllers against exported `Pages` master data.
- Required roles, pages, payment modes, number sequences, and permission rows as application master/setup data.
- Existing index coverage for foreign keys and common search/filter fields.

## Missing Tables
None found. All tables defined by the current project database scripts are present in the export.

## Missing Columns
None found in the project-script-to-export comparison.

## Data Type Mismatches
No procedure parameter type mismatches were found. No actionable table-column mismatches were found after normalizing SQL Server script/export formatting differences such as bracketed types and generated constraint names.

## Missing Or Incorrect Stored Procedures
- Missing procedures referenced by code: none.
- Missing procedures from project database scripts: none.
- Parameter mismatches: none found.
- Present but not currently called by C#:
  - `sp_HR_Attendance_GetById`
  - `sp_HR_Leave_GetById`

These unused procedures are not removed automatically because they are non-breaking and may support future endpoints or manual diagnostics.

## Missing Indexes
The export already contains many unique, FK, and search indexes. The index pass found additional useful FK indexes for HR, GST sessions, purchase/expense, sales line items, stock movements, and supplier payment allocation tables. See `03_INDEX_FIXES.sql`.

## Missing Permissions, Menu, And Master Data
No missing permission page names were found. Every page name used by `RequirePermission(...)` exists in `Pages`.

Master/setup data present in the export includes:
- Roles: `SuperAdmin`, `Manager`
- Payment modes: Cash, Bank Transfer, Card, UPI, Cheque, Other
- Required GST and OEE page/menu entries
- SuperAdmin role-permission rows for the exported page set

`04_MASTER_DATA_FIXES.sql` includes insert-only safety nets for required roles, pages, payment modes, and missing SuperAdmin permission rows. It does not insert business/test transaction data.

## Risky Issues
No destructive schema/data operation is recommended.

Index creation can take locks on larger production tables. Run `03_INDEX_FIXES.sql` during a maintenance window if the database is already large.

## Manual Review Items
- Confirm whether `sp_HR_Attendance_GetById` and `sp_HR_Leave_GetById` should stay as reserved procedures or be wired to future API endpoints.
- Confirm whether the `Manager` role should receive default permissions. The generated master-data script intentionally does not grant Manager permissions.
- Confirm OEE parent/report permission intent for SuperAdmin if you require every permission bit to be 1. Existing exported rows are left unchanged by the generated script.

## Final Recommended Execution Order
1. Back up the database.
2. Run `05_DATA_INTEGRITY_CHECKS.sql` first and review result sets.
3. Run `01_SCHEMA_FIXES.sql` (currently no-op).
4. Run `02_STORED_PROCEDURE_FIXES.sql` (currently no-op).
5. Run `03_INDEX_FIXES.sql` during a quiet period.
6. Run `04_MASTER_DATA_FIXES.sql`.
7. Re-run `05_DATA_INTEGRITY_CHECKS.sql`.
8. Review `06_MANUAL_REVIEW_REQUIRED.sql`.
9. Follow `07_EXECUTION_GUIDE.md` for API/Swagger smoke checks.
