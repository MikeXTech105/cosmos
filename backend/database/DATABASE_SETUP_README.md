# Cosmos ERP Database Setup

This folder contains the clean SQL Server deployment package for the current Dapper-based Cosmos ERP API.

## Files

1. `000_Reset_Database.sql` - drops Cosmos ERP objects from the selected database. It does not drop the database.
2. `001_Full_Database_Setup.sql` - creates the full schema, indexes, constraints, table types, view, stored procedures, and required seed data.
3. `002_Verify_Database_Setup.sql` - checks required objects, important columns, foreign keys, stored procedures, table types, and seed data.
4. `migrations/20260716_system_owner.sql` - upgrades an existing security schema with the protected System Owner flags, constraints, procedures, and guards.
5. `verify_system_owner.sql` - verifies owner uniqueness, linkage, protected-role independence, indexes, and bootstrap objects after first API startup.

## SSMS Run Order

Open SSMS and connect to the SQL Server instance. Select the target database in the database dropdown, then run scripts in this order:

1. `000_Reset_Database.sql`
2. `001_Full_Database_Setup.sql`
3. `002_Verify_Database_Setup.sql`

For a new blank database, running the reset script first is safe and gives you the same repeatable flow.

## Staging

Select `CosmosERP_Staging` in SSMS, then run the three scripts in order. After setup, update the API connection string to use `Database=CosmosERP_Staging`.

Example:

```json
"ConnectionStrings": {
  "CosmosDb": "Server=<server>,1433;Database=CosmosERP_Staging;User Id=<user>;Password=<password>;TrustServerCertificate=True;Encrypt=True;"
}
```

## Production

Select `CosmosERP_Production` in SSMS, then run the three scripts in order for the initial setup. After setup, update the production API connection string to use `Database=CosmosERP_Production`.

Do not run `000_Reset_Database.sql` on production after live data exists unless you intentionally want to remove all ERP data.

## Current Appsettings Note

The current `backend/src/Cosmos.API/appsettings.json` connection string points to `Database=cosmos`. Change it to `CosmosERP_Staging` or `CosmosERP_Production` for the target environment.

## Execution Order Used

The full setup script was composed in this dependency order:

1. Security/authentication core (`Users`, `Roles`, `Pages`, permissions, audit, auth/user/role/page procedures)
2. Party module
3. Item module
4. HR module
5. Sales module
6. Purchase & Expense module

Purchase & Expense depends on Party, Items, and the Sales shared objects `NumberSequences`, `PaymentModes`, and `StockMovements`.

## Conflicts And Choices

- `backend/database/migrations/20260618_purchase_expense_module.sql` contained `USE [cosmos];`. The deployment setup removes that line so the script runs against whichever database is selected in SSMS.
- Audit/date column names differ by module (`CreatedOn`, `CreatedAt`, `CreatedAtUtc`, `ModifiedOn`, `ModifiedAt`, `UpdatedAtUtc`). These names were preserved because the current Dapper stored procedures and DTOs expect them.
- No Entity Framework migrations were used because this project uses Dapper stored procedures.
- No SQL functions are required by the current repository scan.

## Object Summary

- Tables: 48
- Views: 1
- Stored procedures: 165 (including the three protected System Owner procedures)
- Functions: 0
- User-defined table types: 5
- Foreign keys: 59
- Seed/master rows inserted by setup: at least 42 (`SuperAdmin`, `admin`, 31 page rows, 6 payment modes, 3 HR leave types, and 1 PartySettings row). `RolePermissions` are seeded for SuperAdmin across all pages.

The protected System Owner is not seeded by SQL. The API provisions it once from secure environment configuration after the schema is ready. See `docs/SYSTEM_OWNER.md`.

## Manual Action Needed

Update environment-specific connection strings before starting the API. Keep secrets out of committed appsettings for production; use environment variables, user secrets, or your deployment secret store.

## Protected System Owner Upgrade

For an existing database:

1. Back up the database and stop/drain API instances.
2. Run `migrations/20260716_system_owner.sql`.
3. Inject `COSMOS_SYSTEM_OWNER_USERNAME`, `COSMOS_SYSTEM_OWNER_EMAIL`, and `COSMOS_SYSTEM_OWNER_PASSWORD` from a secret store.
4. Start the upgraded API to perform the locked, one-time BCrypt bootstrap.
5. Run `verify_system_owner.sql`.

The migration is safe to rerun. `001_Full_Database_Setup.sql` includes the same final security overrides for fresh installations. Do not place the owner password or hash in a SQL script. Full provisioning, login/refresh, visibility, recovery, and deployment details are in `docs/SYSTEM_OWNER.md`.

## Procurement Planning Additive Migration

The clean `001_Full_Database_Setup.sql` package predates Procurement Planning. After the normal three-script setup, run:

1. `migrations/20260715_procurement_planning_module.sql`
2. Optional transactional verification: `migrations/20260715_procurement_planning_smoke_tests.sql`

The module migration is idempotent, does not contain `USE`, and must be executed against the database selected by the operator. The smoke script creates realistic mapping/BOM/settings/sales/run data inside a transaction, verifies snapshot preservation and adjustment/finalization behavior, then rolls back.

Do not import the client workbook directly into `Items`. Review `docs/PROCUREMENT_PLANNING_WORKBOOK_MIGRATION_REPORT.xlsx`, confirm all Item and channel-SKU mappings, and use the module APIs for configuration/import.
