# COSMOS ERP — HSN/GST Phase 1 Completion Report

## Final decision

**OPEN — PASS WITH DOCUMENTED BLOCKERS.**

The Phase 1 implementation is buildable and its database lifecycle behaviour was verified against a newly created, disposable LocalDB database. The previously missing category-default retrieval and dated retirement flows are now implemented. It must not be marked fully complete yet because a live API login against the disposable database exposed an unapplied prerequisite migration, so the permission-protected routes could not be exercised; the repository-wide backend test command also has one unrelated Dispatch SQL-integration infrastructure failure.

No staging or production database, credentials, invoice history, sales calculation, purchase calculation, tax-component calculation, or Phase 2 GST work was used or changed.

## Scope completed

| Requirement | Status | Evidence |
| --- | --- | --- |
| HSN/SAC master and effective-dated GST rate history | IMPLEMENTED | Existing Phase 1 controller, service, repository, DTOs, validators, and `20261015_hsn_gst_phase1_foundation.sql`. |
| Category-default retrieval | IMPLEMENTED | `GET /api/v1/gst/categories/{categoryId}/hsn-default?onDate=...`; `usp_CategoryHsnDefault_GetEffective`; `CategoryHsnMappingPage.jsx`. |
| Category-mapping retirement | IMPLEMENTED | Dated `PUT .../retire`, `usp_CategoryHsnDefault_Retire`, no hard delete. |
| Product-override retirement | IMPLEMENTED | Dated `PUT .../retire`, `usp_ItemHsnOverride_Retire`, no hard delete. |
| Effective-date validation and overlap prevention | VERIFIED IN SQL | Save procedures reject inverted date ranges and interval overlaps under `UPDLOCK, HOLDLOCK`. |
| Product override before category default | VERIFIED IN SQL | `usp_ItemHsn_Resolve` returns `ProductOverride` before `CategoryDefault`. |
| Fallback after override/default retirement | VERIFIED IN SQL | Resolver returns `Missing` and preserves legacy item HSN after both tested mappings end. |
| Active/inactive master-data protection | VERIFIED IN SQL | HSN/SAC deactivation was rejected while it had a current category mapping. |
| Audit integration | IMPLEMENTED; API FLOW NOT LIVE-VERIFIED | Service writes `Create`, `Update`, and `Retire` audit entries through the existing `IAuditRepository`; no authenticated API call was available to inspect resulting audit rows. |
| Permission-protected API routes | IMPLEMENTED; API FLOW NOT LIVE-VERIFIED | Existing `RequirePermission` attributes are applied to all new endpoints. |
| Frontend lifecycle workflow | IMPLEMENTED AND UNIT-TESTED | Mapping pages show effective source/default and offer dated retirement; frontend suite/build/lint pass. |

## Changes made

### Database

Added [20261015_hsn_gst_phase1_mapping_lifecycle.sql](../backend/database/migrations/20261015_hsn_gst_phase1_mapping_lifecycle.sql), a forward-only migration applied after the Phase 1 foundation migration. It:

- adds effective-date lookup indexes;
- serializes mapping overlap checks using locking hints;
- adds category-default effective retrieval;
- adds dated category-default and product-override retirement procedures;
- preserves mapping history by updating only `EffectiveTo`;
- prevents HSN/SAC deactivation while an active item or category mapping references it; and
- includes `MappingId` in effective-classification results so a specific product override can be retired.

The migration does not touch `Items.HSNCode`, `Items.GSTRate`, invoices, purchases, historical tax values, or tax calculation routines.

### Backend

Added the read and retirement contracts, repository/service methods, validation, controller endpoints, and application audit events in:

- `backend/src/Cosmos.Contracts/HsnGst/HsnGstDtos.cs`
- `backend/src/Cosmos.Application/Abstractions/Persistence/IHsnGstRepository.cs`
- `backend/src/Cosmos.Application/Abstractions/Services/IHsnGstService.cs`
- `backend/src/Cosmos.Persistence/Repositories/HsnGstRepository.cs`
- `backend/src/Cosmos.Application/Services/HsnGstService.cs`
- `backend/src/Cosmos.Application/Validators/HsnGstValidators.cs`
- `backend/src/Cosmos.API/Controllers/HsnGstController.cs`

New endpoint permissions remain aligned with the existing page model:

| Endpoint | Permission |
| --- | --- |
| `GET /api/v1/gst/categories/{categoryId}/hsn-default` | `GST.CategoryMapping` / View |
| `PUT /api/v1/gst/categories/{categoryId}/hsn-default/{mappingId}/retire` | `GST.CategoryMapping` / Edit |
| `PUT /api/v1/gst/items/{itemId}/hsn-override/{mappingId}/retire` | `GST.ProductMapping` / Edit |

### Frontend

Updated the existing pages and shared API service:

- `frontend/src/api/endpoints.js`
- `frontend/src/services/gst/hsnGstService.js`
- `frontend/src/services/gst/hsnGstService.test.js`
- `frontend/src/pages/gst/CategoryHsnMappingPage.jsx`
- `frontend/src/pages/gst/ProductHsnMappingPage.jsx`
- `frontend/src/pages/gst/hsnGstHelpers.test.js`

The category page retrieves and displays the mapping effective on the selected date. Both mapping pages retire a specific mapping by setting an explicit end date; they do not delete classification history. Existing route guards and page permissions remain unchanged.

## Isolated SQL integration evidence

### Environment

Only the disposable database `CosmosHsnGstPhase1Tests_20261015` on `(localdb)\MSSQLLocalDB` was created and changed. It was built from:

1. `backend/database/001_Full_Database_Setup.sql`
2. `backend/database/migrations/20261015_hsn_gst_phase1_foundation.sql`
3. `backend/database/migrations/20261015_hsn_gst_phase1_mapping_lifecycle.sql`

SQLCMD was run with `-I` (`QUOTED_IDENTIFIER` enabled). The initial attempt without `-I` correctly failed while creating an indexed object; the database was dropped and recreated before any test fixture data was inserted. Both migrations were subsequently re-run successfully to confirm rerun safety.

### Executed assertions and actual results

| Scenario | Expected | Actual |
| --- | --- | --- |
| Foundation and lifecycle migrations apply | All objects compile | PASS |
| Lifecycle migration rerun | No duplicate-object failure | PASS |
| Effective indexes and three new procedures exist | Present | PASS |
| Category default `TEST100`, 2026-01-01 open ended | Saves | `200 Category mapping saved.` |
| Overlapping category mapping starting 2026-01-15 | Rejected | `409 Category HSN effective dates overlap.` |
| Product override `TEST200`, 2026-02-01 | Saves | `200 Product override saved.` |
| Resolve on 2026-01-10 | Category default `TEST100` | PASS |
| Resolve on 2026-02-10 | Product override `TEST200` | PASS |
| Retire category default at 2026-01-31 | Updates end date; keeps row | `200 Category HSN default retired.` |
| Retire product override at 2026-02-10 | Updates end date; keeps row | `200 Product HSN override retired.` |
| Resolve on 2026-02-11 | No effective mapping; retain legacy `LEGACY-TEST` | PASS |
| Deactivate `TEST300` with current category mapping | Rejected | `409 Cannot deactivate an HSN/SAC referenced by an active mapping.` |
| Save a mapping with end before start | Rejected and count unchanged | `400 Effective-to date cannot be before effective-from date.`; count remained 2 |
| Save override with non-existent HSN/SAC | Rejected and count unchanged | `400 HSN/SAC must be active.`; count remained 1 |
| Legacy item fields | Not changed | `HSNCode = LEGACY-TEST`, `GSTRate = 18.00` remained unchanged |

These are SQL-procedure integration checks, not production-data tests. The temporary database contained only `GSTTEST` synthetic master data and was dropped after the checks completed.

## Commands executed and results

| Command | Result |
| --- | --- |
| `sqlcmd -S "(localdb)\MSSQLLocalDB" -d CosmosHsnGstPhase1Tests_20261015 -b -I -i backend/database/001_Full_Database_Setup.sql` | PASS |
| `sqlcmd ... -i backend/database/migrations/20261015_hsn_gst_phase1_foundation.sql` | PASS |
| `sqlcmd ... -i backend/database/migrations/20261015_hsn_gst_phase1_mapping_lifecycle.sql` | PASS, including a rerun |
| `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter "FullyQualifiedName~HsnGstValidatorTests" --no-restore` | PASS — 4/4 |
| `dotnet build backend/src/Cosmos.API/Cosmos.API.csproj --no-restore` | PASS — 0 errors; 3 pre-existing package warnings |
| `npm test -- --run` in `frontend` | PASS — 68 files, 399 tests |
| `npx eslint src/pages/gst src/services/gst src/api/endpoints.js src/routes/AppRoutes.jsx` | PASS |
| `npm run build` in `frontend` | PASS |
| `git diff --check` | PASS |
| Disposable API startup with `ConnectionStrings__CosmosDb` set to LocalDB and disposable `COSMOS_SYSTEM_OWNER_*` values | API started against LocalDB only; PASS as an environment-isolation check |
| `POST /api/auth/login` for the disposable system owner | BLOCKED — HTTP 500: missing `sp_User_IsPrivilegedAdministrator`; the procedure is defined by prerequisite migration `20260720_backend_api_frontend_fixes.sql`, which was not part of the initial minimal HSN/GST SQL test sequence |
| `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore` | NOT GREEN — 311 passed, 1 failed; see blocker B-02 |

## Compatibility review

| Area | Result |
| --- | --- |
| Existing item/category master flows | No controllers, service contracts, or master table columns were changed. The new mapping UI consumes existing paged item/category APIs. |
| Existing sales/purchase and historical invoices | No SQL objects or code in those paths changed. The verified fixture retained legacy `Items.HSNCode` and `Items.GSTRate`. |
| Existing permissions/navigation | Existing `PermissionGuard`, page IDs, role permission model, and data-driven navigation were retained. New endpoints use the pre-existing `GST.*` pages. |
| Existing mapping history | Retirement is an end-date update, not a delete. No existing mapping row is removed. |
| Existing API clients | Additive endpoints only. Existing HSN/SAC, rate-history, category-save, item-override, and effective-classification routes retain their paths and request formats. |

## Remaining blockers and required next actions

| ID | Severity | Blocker | Minimum next action |
| --- | --- | --- |
| B-01 | High | A live API was started only with a disposable LocalDB connection and a disposable system-owner account. Its login endpoint returned HTTP 500 because the database lacked `sp_User_IsPrivilegedAdministrator`, which current source calls and `20260720_backend_api_frontend_fixes.sql` defines. Consequently permission enforcement, API serialization, live create/edit/reload/retire, and persisted audit entries were not observed through HTTP. | Recreate the disposable database using the repository migration order, including `20260720_backend_api_frontend_fixes.sql` before the HSN/GST migrations; then use test accounts with and without the relevant `GST.*` permissions and exercise the routes/audit log. |
| B-02 | Medium | Full backend suite is not green: `DispatchConfiguredPolicySqlIntegrationTests.Configured_policy_calculates_and_persists_against_explicit_test_database` reports `Set COSMOS_DISPATCH_INTEGRATION_CONNECTION_STRING to run SQL integration tests.` | Provision the already-required isolated Dispatch integration database/connection string, or correct that test's skip configuration in a separate Dispatch-scoped task. This report does not alter Dispatch. |
| B-03 | Medium | Category/product pages issue one effective-mapping request per loaded row and use a 200-row master-data lookup. | Add a separately designed paged/batch read API before large-catalogue rollout. This does not affect correctness for the tested small catalogue. |
| B-04 | Low | Mapping tables do not contain modifier columns; retirement audit evidence is recorded through the application audit repository, not row-level mapping columns. | Validate audit entry persistence during B-01; add database-level audit columns only through a separately approved schema design if required. |

## Required live verification before marking complete

1. Configure the API with the disposable database connection, not a staging or production connection. Apply the repository prerequisite migration `20260720_backend_api_frontend_fixes.sql` as part of the test-database migration sequence so login can resolve `sp_User_IsPrivilegedAdministrator`.
2. As an authorized test user, create/update HSN/SAC and a GST rate; add category and product mappings; reload both mapping pages; retire each mapping; verify the effective source and API payloads.
3. As a user without `GST.CategoryMapping` and `GST.ProductMapping` permissions, verify API denial and the existing `/403` route guard.
4. Query the existing audit log for the created `Create`, `Update`, and `Retire` mapping events.
5. Run the full backend suite with its explicitly isolated Dispatch test connection configured, or record that its unrelated integration test remains outside this phase's test environment.

Until B-01 and B-02 are resolved, the accurate status is **OPEN — PASS WITH DOCUMENTED BLOCKERS**, not complete production readiness.
