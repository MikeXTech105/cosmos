# Cosmos HSN/GST Phase 1 Test and Remediation Report

## Final status

**FAIL — incomplete acceptance criteria.** Backend foundation compiles and targeted unit tests pass, but SQL integration is blocked because no isolated SQL Server test database is configured and the required frontend master/mapping screens have not yet been implemented.

## Checklist

| Requirement | Status | Evidence |
|---|---|---|
| HSN/SAC master contract, validation, CRUD/list API | Implemented; SQL execution blocked | `HsnGstDtos.cs`, `HsnGstController.cs`, migration |
| Effective-dated total-rate history | Implemented; SQL execution blocked | `GstRateRules`, `GstRateRuleVersions`, migration |
| Category default/product override precedence | Implemented; SQL execution blocked | `usp_ItemHsn_Resolve` orders ProductOverride before CategoryDefault |
| Legacy item/invoice preservation | Implemented by non-mutation | migration creates new tables only; does not update `Items` or invoices |
| Permissions/role bootstrap | Remediated in migration | idempotent `Pages`/`RolePermissions` merge for the existing SuperAdmin bootstrap convention |
| Audit logging | Implemented | `HsnGstService.cs` audits HSN, rate, category and item mapping writes |
| Frontend master/mapping pages | Blocked/deferred | Backend permission routes are seeded, but no frontend screens were added in this remediation pass; this remains required before user-facing completion. |
| GST calculation / compliance automation | Out of scope | No sales/purchase tax arithmetic or provider payload flow changed. |

## Bugs found and fixes

1. Missing permission-page registration would have made all new controller authorization checks inaccessible. The migration now idempotently registers four GST permissions and grants only the existing SuperAdmin bootstrap role full rights.
2. Category and item mapping writes were not audited. `HsnGstService` now emits audit records using existing infrastructure.
3. The initial classification resolver was corrected to select a single result with explicit override precedence.
4. No isolated SQL Server test instance is available in the repository environment, so no claim is made that the migration/procedures have executed.

## Commands executed

```text
dotnet build backend/src/Cosmos.API/Cosmos.API.csproj --no-restore
PASS (0 errors; existing NU1903/NU1510 warnings)

dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter "FullyQualifiedName~HsnGstValidatorTests|FullyQualifiedName~SalesCalculationServiceTests|FullyQualifiedName~PurchaseExpenseValidatorTests" --no-restore
PASS: 9 passed, 0 failed, 0 skipped
```

An earlier focused suite also passed: 9 tests for Sales calculation, GSTZen provider, and purchase validation.

## Blocked tests

- SQL migration, constraints, stored procedures, rollback, concurrency, authorization database integration, and audit persistence: requires a disposable SQL Server database initialized with the repository prerequisite schema.
- API authorization integration: requires an isolated host/database with role/page permissions.
- Frontend build/UI/Vitest tests for HSN master and mapping pages: no such page was implemented, so those tests cannot honestly be reported.

## Safety confirmation

No production or staging database was contacted or modified. No migration was executed. No real HSN/SAC classification or GST rate was seeded. No item, invoice, sales, purchase, calculation, or compliance data was changed.

## Remaining business decisions

- Official HSN/SAC format/length policy and classification authority.
- GST rule scope, approval/activation policy, component model, jurisdiction/place-of-supply, rounding, and price basis.
- Product/category effective-date change and removal policy.

## Required next action

Provision a disposable SQL Server test database, apply the prerequisite repository schema followed by `20261015_hsn_gst_phase1_foundation.sql`, then run synthetic CRUD/constraint/precedence/audit tests. Implement the frontend HSN master and Product Master mapping UI before declaring Phase 1 user-complete.
