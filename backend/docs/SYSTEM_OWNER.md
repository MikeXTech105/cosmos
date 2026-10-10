# Protected System Owner

## Purpose

Cosmos has one protected System Owner account in addition to the normal `SuperAdmin` role. `SuperAdmin` remains a visible, assignable, configurable RBAC role whose access comes from `RolePermissions`. The System Owner is identified only by database flags and its protected user-role relationship; authorization never relies on username, email, role name, or a fixed database ID.

The owner still authenticates through the normal JWT login API, uses normal access-token expiry and refresh-token rotation, and must remain active and non-deleted. Its only special behavior is centralized authorization: after account-state validation, it passes every supported page action without consulting `RolePermissions`.

## Database changes

Migration: `database/migrations/20260716_system_owner.sql`

- `Users.IsSystemUser BIT NOT NULL DEFAULT (0)`
- `Roles.IsSystemRole BIT NOT NULL DEFAULT (0)`
- Filtered unique index `UX_Users_OneSystemUser`
- Filtered unique index `UX_Roles_OneSystemRole`
- Protected, locked bootstrap procedures
- System-owner detection based on both flags and the user-role link
- Dynamic active-page permission results for login and refresh
- User, role, assignment, password-reset, and role-permission procedure guards

The protected role deliberately has no `RolePermissions`. New active `Pages` rows are returned dynamically with `CanView`, `CanCreate`, `CanEdit`, `CanDelete`, `CanExport`, and `CanApprove` all set to `true`.

The canonical `database/001_Full_Database_Setup.sql` contains the same final security override. Fresh and upgraded databases therefore reach the same structure and procedure behavior.

## Required secure configuration

Set these values in the deployment secret store or process environment before the first application start after migration:

```text
COSMOS_SYSTEM_OWNER_USERNAME=<unique-owner-username>
COSMOS_SYSTEM_OWNER_EMAIL=<unique-owner-email>
COSMOS_SYSTEM_OWNER_PASSWORD=<unique-strong-initial-password>
```

Do not commit the values to appsettings, Compose files, source control, deployment manifests, logs, or tickets. Use the platform's secret injection facility. Environment variables are the supported configuration interface, but a production secret manager should own their values.

Windows service/process example:

```powershell
$env:COSMOS_SYSTEM_OWNER_USERNAME = '<from-secret-store>'
$env:COSMOS_SYSTEM_OWNER_EMAIL = '<from-secret-store>'
$env:COSMOS_SYSTEM_OWNER_PASSWORD = '<from-secret-store>'
```

Container configuration shape:

```yaml
environment:
  COSMOS_SYSTEM_OWNER_USERNAME: "<injected-secret-reference>"
  COSMOS_SYSTEM_OWNER_EMAIL: "<injected-secret-reference>"
  COSMOS_SYSTEM_OWNER_PASSWORD: "<injected-secret-reference>"
```

These are placeholders, not deployable credentials. Prefer the orchestrator's secret-reference syntax instead of literal values.

## Exact upgrade deployment order

1. Stop or drain Cosmos API instances and take a verified SQL Server backup.
2. Deploy or stage the application binaries containing this implementation, but do not start them yet.
3. Apply `database/migrations/20260716_system_owner.sql` to the intended database with an account authorized for schema and procedure changes.
4. Rerun the migration once in staging to confirm idempotency. It must complete without creating an owner in SQL.
5. Inject the three `COSMOS_SYSTEM_OWNER_*` values from the deployment secret store.
6. Start the API. Startup checks the protected state, BCrypt-hashes the configured password in .NET, and invokes the transaction-locked bootstrap procedure.
7. Multiple instances may start concurrently: `sp_getapplock`, transaction locks, and filtered unique indexes ensure only one protected user and role are created.
8. Confirm the startup log reports successful or already-complete provisioning. It never logs credentials or the hash.
9. Run `database/verify_system_owner.sql`.
10. Log in through `POST /api/auth/login`, confirm all active pages and action flags are present, then rotate through `POST /api/auth/refresh-token`.
11. After successful first provisioning, remove the initial password value from long-lived process configuration if the deployment platform permits. Repeated startup does not read it when a valid owner already exists and never resets the password.

If no valid owner exists and provisioning configuration is missing or invalid, startup fails with field names and safe validation messages such as `Username: username is required`; configured values are never included in the exception or log. Partial or conflicting flagged records also stop startup; the application never silently chooses or repairs one.

## Fresh installation order

1. Select a new empty database. Use `000_Reset_Database.sql` only for a disposable/new database where destructive reset is intentional.
2. Run `001_Full_Database_Setup.sql`.
3. Apply the repository's later additive module migrations in their documented order.
4. `20260716_system_owner.sql` is already represented in the canonical setup, but it is safe to run again as an idempotency check.
5. Inject the three secure environment values and start the API once.
6. Run `verify_system_owner.sql`, then verify login and refresh.

## API and authorization behavior

No frontend change is required. `LoginResponse` is unchanged. For the owner, its `Pages` collection uses the existing page-permission DTO, hierarchy, route, icon, parent ID, and sort order. Refresh recalculates active pages, so a future module appears without a protected-role permission row.

`PermissionService.UserHasPermissionAsync` is the centralized bypass point. It:

1. Loads the database user represented by the validated JWT `UserId`.
2. Rejects a missing, inactive, or deleted account.
3. Calls the centralized flag/link owner detection.
4. Returns allowed for a valid owner.
5. Otherwise calls the existing `RolePermissions` check unchanged.

The SQL permission procedure mirrors these checks as defense in depth. JWT validation, token expiry, refresh-token rotation, input validation, business validation, and auditing are never bypassed.

## Visibility and immutability

Normal user and role list/direct-ID procedures exclude protected records. Existing Cosmos user/role APIs do not currently expose separate search, pagination, export, bulk, or selection-dropdown endpoints; any future endpoint must reuse the protected filters.

Normal administration cannot update, delete, activate/deactivate, reset, or reassign the protected user. It cannot list, read, update, delete, assign, or edit permissions for the protected role. Service checks provide not-found behavior, and stored procedures independently guard mutations with safe SQL errors. The owner is protected from its own normal administration requests as well.

The authenticated owner may use the existing self-service `POST /api/auth/change-password` flow because it verifies the current password. Anonymous forgot/reset-password procedures intentionally do not create or consume reset tokens for the owner.

## Auditing

Provisioning inserts a safe `SystemOwnerProvisioned` audit record inside the bootstrap transaction. User, role, and permission services preserve the authenticated actor ID. Mutation middleware also records safe method/path/status metadata for successful and rejected requests, including generic protected-or-inaccessible reasons for hidden administration targets. Request bodies, passwords, hashes, JWTs, refresh tokens, and provisioning values are never audited.

## Lost-password recovery

The normal forgot/reset-password API is intentionally unavailable for the protected owner. Use this controlled break-glass process:

1. Stop or drain all API instances and take a database backup.
2. Require an authorized DBA and the organization's break-glass approval/audit process.
3. Generate a BCrypt hash for a new unique strong password using the same approved BCrypt work factor as the Cosmos password hasher. Transfer only the hash to the DBA through an approved secret channel.
4. In one SQL transaction, verify exactly one `IsSystemUser = 1` record, update only that flagged record's `PasswordHash`, revoke all of its refresh tokens, and insert a safe `SystemOwnerPasswordRecovered` audit entry. Do not select or log the username, email, old hash, new password, or tokens.
5. Commit, remove the transferred hash from operator history/artifacts, restart the API, and test login.
6. Run `verify_system_owner.sql` and review the recovery audit event.

Reference transaction shape (replace the placeholder through a secure SQL parameter, not by editing a committed script):

```sql
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF (SELECT COUNT(*) FROM dbo.Users WHERE IsSystemUser = 1) <> 1
    THROW 51043, 'Exactly one protected system user is required for recovery.', 1;

DECLARE @SystemUserId INT = (SELECT Id FROM dbo.Users WHERE IsSystemUser = 1);
DECLARE @NewPasswordHash NVARCHAR(500) = N'<securely-supplied-bcrypt-hash>';

UPDATE dbo.Users
SET PasswordHash = @NewPasswordHash, UpdatedOn = SYSUTCDATETIME()
WHERE Id = @SystemUserId AND IsSystemUser = 1;

UPDATE dbo.RefreshTokens SET IsRevoked = 1 WHERE UserId = @SystemUserId;

INSERT dbo.AuditLogs(TableName, RecordId, ActionType, NewValues, CreatedBy)
VALUES(N'Users', CONVERT(NVARCHAR(100), @SystemUserId), N'SystemOwnerPasswordRecovered',
       N'{"reason":"Approved break-glass DBA recovery."}', NULL);

COMMIT TRANSACTION;
```

## Verification performed on 2026-07-16

- `dotnet build Cosmos.slnx --no-restore`: passed with the pre-existing `Microsoft.OpenApi` advisory warning.
- `dotnet test Cosmos.slnx --no-build`: 93/93 passed.
- Canonical setup executed on a disposable local SQL Server database: passed.
- Migration applied and reapplied: passed.
- Two concurrent bootstrap calls: exactly one protected user, role, and link created.
- Real API bootstrap, login, and refresh: passed.
- Login returned 31 active pages with all six flags true.
- A newly inserted active page appeared on refresh with all six flags true.
- List/direct-ID hiding, mutation guards, protected-role assignment/permission guards, and owner reset-token exclusion: passed.
- `verify_system_owner.sql`: passed.
- The disposable verification database was removed.

Production data and production deployment topology were not modified or verified. Repeat the documented backup, migration, startup, and verification sequence in staging before production rollout.
