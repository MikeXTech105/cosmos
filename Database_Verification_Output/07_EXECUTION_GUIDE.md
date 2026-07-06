# Execution Guide

## Backup First
1. Take a full SQL Server backup of the target database.
2. Capture the current deployment/version label and connection string target.
3. Run scripts in a transaction-capable tool such as SSMS or Azure Data Studio.

## Recommended Order
1. `05_DATA_INTEGRITY_CHECKS.sql` - review current state first.
2. `01_SCHEMA_FIXES.sql` - no-op currently.
3. `02_STORED_PROCEDURE_FIXES.sql` - no-op currently.
4. `03_INDEX_FIXES.sql` - run during a quiet period.
5. `04_MASTER_DATA_FIXES.sql` - insert-only master-data safety net.
6. Re-run `05_DATA_INTEGRITY_CHECKS.sql`.
7. Review `06_MANUAL_REVIEW_REQUIRED.sql` notes.

## Rollback Notes
- `01_SCHEMA_FIXES.sql` and `02_STORED_PROCEDURE_FIXES.sql` do not change the database.
- `03_INDEX_FIXES.sql` creates indexes only. Roll back by dropping the specific `IX_*` names from that script if required.
- `04_MASTER_DATA_FIXES.sql` inserts only missing setup rows. If rollback is needed, remove only rows inserted during your run and only after confirming they are not in use.

## Verification After Running
- Re-run `05_DATA_INTEGRITY_CHECKS.sql`; expected result sets should be empty unless they are informational duplicates you intentionally keep.
- Confirm API startup succeeds with the intended connection string.
- Confirm login works for an admin user.
- Confirm role/page permissions are returned by `sp_User_GetPagePermissions` through the login response.

## API/Swagger Smoke Checklist
- Auth: login, refresh token, logout, change password.
- Settings/security: users, roles, pages, permissions.
- Masters: categories, units, items, parties, party settings.
- Sales: create/update/list/get/confirm/cancel invoice and reports.
- Purchase & Expense: purchase bills, orders, returns, supplier payments, expense categories, expenses, reports.
- HR: departments, designations, shifts, employees, attendance, leave, payroll.
- GST: configuration, registrations, verification, sessions, e-way bill, e-invoice, API logs.
- OEE: machines, moulds, downtime reasons, production entries, dashboard, reports.
