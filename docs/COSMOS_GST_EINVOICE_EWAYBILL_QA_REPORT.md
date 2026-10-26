# GST QA and regression report

Automated coverage added: `backend/tests/Cosmos.Tests/Gst/GstGenerationSafetyTests.cs` verifies the structured non-retryable block; `backend/tests/Cosmos.Tests/Gst/GstGenerationLifecycleTests.cs` verifies allowed transitions and rejects a blind retry from an unknown outcome; `backend/tests/Cosmos.Tests/Gst/GstComplianceSnapshotReadinessTests.cs` verifies that current master data is not treated as a historical snapshot. `dotnet build backend/src/Cosmos.Application/Cosmos.Application.csproj --no-restore -v:minimal` passed with zero warnings/errors. `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore --filter "FullyQualifiedName~GstComplianceSnapshotReadinessTests|FullyQualifiedName~GstGeneration" -v:minimal` passed 8/8. Existing provider-adapter tests remain unit tests only and do not prove government issuance.

Not run: SSMS migration/verification, provider sandbox, and end-to-end provider recovery, because no database or sandbox was authorized or configured. Required future scenarios are snapshot confirmation rollback, duplicate concurrent requests, timeout/unknown reconciliation, tenant isolation, and frontend eligibility states.

## 2026-10-26 follow-up evidence

`dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore --filter "FullyQualifiedName~Gst" -v:minimal` passed **26/26**. Frontend GST navigation/source-contract and screen tests passed **16/16**; the production frontend build passed. Targeted ESLint over the changed GST files passed. The full frontend suite has four unrelated pre-existing failures in `src/utils/validationRules.test.js` (HR employee optional email/bank/address expectations); no GST test failed. Full-project ESLint did not complete within the bounded local command window, so it is not claimed as passed.

No SQL Server instance, provider sandbox, or production provider was contacted. These results do not verify migrations, provider mappings, statutory issuance, cancellation, vehicle update, extension, or reconciliation against GSTZen.

## Phase 2 sales-invoice foundation evidence

`dotnet build backend/src/Cosmos.API/Cosmos.API.csproj --no-restore -v:minimal` passed with zero errors. `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore --filter "FullyQualifiedName~Gst" -v:minimal` passed **28/28**, including persisted-data-only eligibility assessment and unknown-invoice handling. The active-snapshot uniqueness migration was reviewed statically only; no SQL Server was authorized for applying its preflight/index checks.

The endpoint does not create or validate a compliance snapshot, and sales confirmation was intentionally not changed. Its results must not be treated as authority to generate E-Invoices or E-Way Bills.

## Phase 2 finalization security evidence

Eligibility now requires both `GST.EInvoice/View` and `Sales.Invoice/View`, matching the established global Sales Invoice read gate. A GST-only user is denied before the service loads invoice data. The route uses `:long:min(1)` for non-positive IDs. Source review found no company/branch/owner scope fields on `SalesInvoices` and no corresponding JWT claims or scoped repository path; cross-company/branch tests cannot truthfully be claimed until that access model exists. System Owner behavior remains provided by the existing `PermissionService.UserHasPermissionAsync` bypass and was not changed.

The user separately reported a successful SSMS verification: the active-snapshot index is unique and filtered by non-superseded status, and the duplicate-active query returned zero rows. This report records that as user-provided evidence only; Codex did not execute SQL against that database.

Finalization commands: the GST-filtered backend suite passed **30/30** and the Sales-filtered backend suite passed **14/14**. The API project built with zero errors. These are unit/source-contract tests, not authenticated HTTP-host tests, disposable-SQL tests, or Swagger-session tests; those environment-level checks remain outstanding.

### Runtime authorization verification

Loopback HTTP integration tests now run the production controller, authentication middleware, `RequirePermissionFilter`, routing constraint, global exception middleware, and response envelope. **6/6** tests passed: unauthenticated `401`; GST-only `403`; Sales-only `403`; both permissions `200` for an existing invoice; unknown invoice `404`; and `0` rejected by route constraint without calling the eligibility service. These tests use a test authentication scheme and mocked permission/data services, not a live JWT issuer or SQL Server.

Docker and a local SQL Server runtime were unavailable on the verification host, so disposable-database migration/repeated-run/duplicate-insert tests were not executed. The supplied SSMS result remains separately attributed evidence.
