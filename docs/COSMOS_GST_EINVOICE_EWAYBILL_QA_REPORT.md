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

## Phase 3 Sales capture verification — 26 October 2026

The Sales issuer-registration migration was reviewed after user-provided SSMS verification: `CompanyGstRegistrationId`, `PlaceOfSupplyStateCode`, `PlaceOfSupplySource`, and `PriceBasis` are nullable; the issuer foreign key and filtered index exist; no invalid issuer reference was reported; and historical invoice IDs 1 and 2 remain null. No historical record was modified by this work.

An opt-in `SalesInvoiceGstSqlIntegrationTests` suite now verifies the actual Dapper repository and `sp_SalesInvoice_Create`, `Update`, `Confirm`, `Cancel`, and `GetById` path against a database named `CosmosSalesGstIntegrationTests_*`. It was not executed because `COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING` was absent. The GST/Sales-focused local unit suite passed 49 tests before the opt-in test was selected; selecting it without the variable correctly reports the missing prerequisite rather than pretending SQL coverage passed.

## Direct development database verification attempt — 26 October 2026

PR #174's development-SQL policy was reviewed. The current process did not have an injected `COSMOS_DEVELOPMENT_SQL_CONNECTION_STRING` or `ConnectionStrings__CosmosDb`; no fallback to a tracked value was attempted. Therefore direct verification of `srv1791248` / `CosmosERP_Staging`, permissions, backup state, deployed stored-procedure text, fields, constraints, and indexes is **not run**. No connection, migration, test data, lifecycle test, business-data change, or statutory-generation action occurred.

The newly added read-only preflight script provides the required target, permissions, schema, object-hash, integrity, and backup-history checks for an authorized SSMS session. Applying the Phase 3 migration remains pending preflight evidence, recovery confirmation, and explicit approval. Repository credential removal is complete in the working tree, but rotation/revocation of the previously exposed SQL, JWT, and provider secrets remains an authorized administrator action.

Local evidence for this verification attempt: `dotnet build backend/src/Cosmos.API/Cosmos.API.csproj --no-restore -v:minimal` and `dotnet build backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore -v:minimal` both succeeded with zero errors. `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore --no-build --filter "FullyQualifiedName~Gst|FullyQualifiedName~Sales" -v:minimal` passed **49**, skipped **1**, failed **0**. The skipped test is the guarded disposable SQL lifecycle test; it was not pointed at `CosmosERP_Staging`. Build output continues to report the existing package vulnerability/pruning warnings; they are not SQL verification evidence.

### Secure connectivity attempt — 26 October 2026

The environment-injected development connection was present and parsed successfully. Its configured database matched `CosmosERP_Staging`; its approved IP endpoint was accepted for the owner-verified `srv1791248` server identity. The client required `Encrypt=True` and `TrustServerCertificate=False`. Opening the SQL connection failed at TLS certificate validation before authentication or any SQL statement executed. Certificate validation was not bypassed. As a result, server/database identity could not be independently queried, the read-only Phase 3 preflight did not run, deployed schema/procedure comparison did not run, permissions and backup history are unverified, and no database object or business data was modified. Install a certificate chain trusted by this Windows host for the SQL Server endpoint, then repeat the read-only preflight; do not weaken the connection by setting `TrustServerCertificate=True`.

### Successful trusted direct-SQL preflight — 26 October 2026

After the server certificate was remediated, the environment-injected connection opened with `Encrypt=True`, `TrustServerCertificate=False`, and SQL Server reporting `encrypt_option = TRUE`. The live identity was `srv1791248` / `CosmosERP_Staging`. The corrected read-only Phase 3 preflight completed successfully: all four nullable Sales GST capture columns exist; `FK_SalesInvoices_CompanyGstRegistrations`, `IX_SalesInvoices_CompanyGstRegistrationId`, and `CK_SalesInvoices_PriceBasis` exist and are enabled/trusted; invalid issuer references and incoherent capture-field counts are both zero. Comment-normalized definitions and parameter contracts for `sp_SalesInvoice_Create`, `sp_SalesInvoice_Update`, and `sp_SalesInvoice_GetById` match the current PR #173 migration source. No migration ledger table was found, so deployed state—not a ledger entry—is the evidence that the Phase 3 migration is present.

No database object or data was modified. The login has `CONNECT`, `SELECT`, `ALTER`, `CONTROL`, and `VIEW SERVER STATE`; reduce it to the minimum approved development role before broader automation. The database is in `FULL` recovery mode, but the newest visible full backup record is `2026-08-03T11:52:30`; this is insufficient recovery-freshness evidence for an approved change. Obtain and test a current backup/restore path before applying any migration. The preflight's null-state predicate was corrected in source because SQL Server rejects direct comparison of `IS NULL` predicates; the corrected script was the one executed successfully.
