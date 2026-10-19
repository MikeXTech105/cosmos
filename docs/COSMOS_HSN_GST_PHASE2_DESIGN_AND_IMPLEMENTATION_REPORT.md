# COSMOS ERP — HSN/GST Phase 2 Design and Implementation Report

## Status

**READY FOR CONTROLLED INTEGRATION TESTING OF THE ISOLATED ENGINE ONLY.**

This is a technical calculation core, not a GST compliance determination and not a Sales or Purchase integration. It has no API endpoint, database migration, dependency-injection registration, or production call path. Existing Sales/Purchase calculations continue to operate unchanged.

## Review findings before implementation

The Phase 1 foundation provides active HSN/SAC records, effective category/product mappings, and effective-dated **total** rate versions. It does not provide the data needed to determine an authoritative Phase 2 tax result:

| Required model concern | Phase 1 state | Decision |
| --- | --- | --- |
| Rule approval status | Missing | The engine requires `Approved`; no Phase 1 rate is silently treated as approved. |
| Rule-to-HSN/SAC applicability | Missing | The engine accepts only resolver-supplied rule candidates tied to the resolved classification. |
| CGST/SGST/IGST/other component configuration | Missing | The engine requires explicitly supplied components that reconcile to the approved total rate. It does not split a total rate by assumption. |
| Jurisdiction policy | Missing | The engine selects the supplied intra-state component set when seller state equals place of supply; otherwise it selects the supplied inter-state set. No additional treatment, export, SEZ, reverse-charge, or exemption policy is inferred. |
| Inclusive price and rounding policy | Missing | The isolated engine supports explicit exclusive/inclusive basis and deterministic line-level two-decimal, midpoint-away-from-zero rounding only. This is a technical policy for controlled testing, not an approved statutory policy. |
| Mapping/rule historical snapshots | Missing from documents | A future integration must persist the whole selected calculation snapshot; it must not recalculate historical lines from current master data. |

The initial isolated-engine pass added no migration. The subsequent rule/snapshot-foundation update adds only the technical schema described below: it creates no approved rules, components, classifications, or rates, so it cannot silently make unsupported tax decisions authoritative.

## Implemented architecture

### Contracts

Added [GstCalculationContracts.cs](../backend/src/Cosmos.Contracts/GstCalculation/GstCalculationContracts.cs).

- `GstCalculationRequest` holds item, optional selected HSN/SAC, date, seller registration/state, buyer treatment/state, place of supply, transaction type, price basis, quantity, price, discount, and taxable charges.
- The request intentionally contains **no tax percentage** or component amounts.
- `GstCalculationReference` holds the server-resolved effective classification and candidate rule versions.
- A rule version includes approval state, effective dates, total rate, and distinct intra/inter-state component definitions.
- `GstCalculationResult` returns selection identities, taxable value, total rate/tax, CGST/SGST/IGST/other totals, per-component values, rounding adjustment, total, and structured diagnostics.

### Calculation core

Added [IGstCalculationEngine.cs](../backend/src/Cosmos.Application/Abstractions/Services/IGstCalculationEngine.cs) and [GstCalculationEngine.cs](../backend/src/Cosmos.Application/Services/GstCalculationEngine.cs).

`IGstCalculationReferenceResolver` is the explicit boundary for the future Dapper/SQL resolver. There is deliberately no production resolver or DI registration yet: Phase 1 tables cannot supply approved jurisdiction/component rules. The engine itself:

1. validates transaction inputs;
2. obtains the server-side reference;
3. validates the selected/effective classification and optional client selection match;
4. selects exactly one active, approved, effective rule for that HSN/SAC and date;
5. selects intra-state components when seller registration state equals place of supply, otherwise inter-state components;
6. rejects missing, inactive, unapproved, expired/non-effective, ambiguous, or non-reconciling rules;
7. calculates exclusive or inclusive amounts using `decimal`; and
8. returns a rounding adjustment so `taxable value + component tax + adjustment = total`.

`GstEffectiveClassificationSelector` is a pure reusable selector for the planned resolver. It gives an effective `ProductOverride` precedence over `CategoryDefault`, then uses effective date and mapping identity for deterministic ordering.

## Calculation policy implemented for controlled tests

| Policy | Behaviour |
| --- | --- |
| Exclusive basis | Taxable value is `quantity × unit price − line discount + taxable charges`; component tax is calculated from that value. |
| Inclusive basis | Total consideration is divided by `(100 + approved total rate) / 100`; components are then calculated from the rounded taxable value. |
| Rounding | Monetary values and individual component amounts are rounded to two decimal places using `MidpointRounding.AwayFromZero`. The result explicitly records any reconciliation adjustment. |
| Component validation | Applicable component rates must be non-negative, named, and exactly reconcile to the approved total rate at two-decimal precision. |
| Jurisdiction | Only the supplied component sets are selected. Seller state equal to place of supply means intra-state; otherwise inter-state. |
| Unsupported cases | Any transaction type other than `TaxableSupply`, inactive seller registration, missing state, invalid amount, missing classification/rule/components, and ambiguous rules returns a non-valid result with diagnostics. |

The policy does **not** decide legal treatment for zero-rated, exempt, reverse-charge, SEZ, export, stock transfer, or other special cases.

## Tests executed

Added [GstCalculationEngineTests.cs](../backend/tests/Cosmos.Tests/Gst/GstCalculationEngineTests.cs) with synthetic classifications/rules only.

| Command | Actual result |
| --- | --- |
| `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter "FullyQualifiedName~GstCalculationEngineTests" --no-restore` | PASS — 10/10 |
| `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter "FullyQualifiedName~GstCalculationEngineTests|FullyQualifiedName~HsnGstValidatorTests" --no-restore` | PASS — 14/14 |
| `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter "FullyQualifiedName~SalesCalculationServiceTests|FullyQualifiedName~GstCalculationEngineTests|FullyQualifiedName~HsnGstValidatorTests" --no-restore` | PASS — 16/16; confirms the untouched legacy sales-calculation tests remain green |
| `dotnet build backend/src/Cosmos.API/Cosmos.API.csproj --no-restore` | PASS — 0 errors; 3 existing package warnings |
| `git diff --check` | PASS |

The Phase 2 tests cover:

- product override precedence over category default;
- effective-date boundary selection;
- missing, inactive, expired/non-effective, ambiguous, and component-rate-mismatch rules;
- intra-state CGST/SGST and inter-state IGST supplied by approved test rule data;
- exclusive and inclusive arithmetic, discount/charge treatment, rounding, and reconciliation;
- invalid transaction inputs and diagnostics; and
- deterministic replay using the same saved reference snapshot after a simulated master/rule change.

No SQL integration, live API, staging, production, external provider, or browser test was run for this Phase 2 work.

## Immutable document-line snapshot design for the next phase

Before Sales/Purchase integration, introduce a backward-compatible line snapshot owned by the document line, containing at minimum:

- calculation-engine version and calculation timestamp;
- item identifier and resolved HSN/SAC identifier, code, source, mapping ID, and mapping effective range;
- GST rule ID/version ID, rule code, approval state, effective range, and component policy version;
- seller registration identity/state, buyer treatment/state, place of supply, transaction type, and price basis;
- quantity, unit price, discount/charge inputs, taxable value, each component rate/amount, total tax, rounding adjustment, and total;
- canonical decision-input JSON and a content hash; and
- immutable audit identity and a correction/reversal relationship rather than an in-place rewrite after posting.

The existing aggregate Sales/Purchase tax fields can remain compatibility projections during rollout. Historical invoices and purchase records must never be backfilled or recalculated from current masters without a separately approved migration and reconciliation plan.

## Required schema and resolver work before integration

1. Create a rule-version model with explicit HSN/SAC applicability, approval lifecycle, effective dates, component rows, jurisdiction applicability, and overlap constraints.
2. Implement a Dapper `IGstCalculationReferenceResolver` that retrieves mappings/rules atomically for the requested date and returns clear missing/ambiguous diagnostics.
3. Add a snapshot persistence migration and line-level immutable/audit enforcement.
4. Add isolated SQL integration tests for resolver date boundaries, approval transitions, race/overlap prevention, snapshots, and document finalization.
5. Add a new API endpoint only after contract review; keep existing Sales/Purchase request contracts compatible until their separately approved integration phase.

## Rule resolver and snapshot foundation update — 16 October 2026

The Phase 2 rule/snapshot foundation is now implemented, still without a Sales/Purchase integration or public API.

### Added database-backed model

- [20261016_hsn_gst_phase2_rule_snapshot_foundation.sql](../backend/database/migrations/20261016_hsn_gst_phase2_rule_snapshot_foundation.sql) extends Phase 1 rule versions with Draft/Approved/Retired state, approval/audit fields, and safe supersession metadata.
- `GstRateRuleVersionApplicabilities` explicitly binds a rule version to HSN/SAC records with a technical priority.
- `GstRateRuleVersionComponents` records explicit intra-state and inter-state component rates. Approval rejects a component set that does not reconcile to the saved total rate.
- `usp_GstTaxRuleVersion_Approve` validates applicability, both jurisdiction scopes, rate reconciliation, and same-rule approved-version date overlap under locking.
- `usp_GstTaxCalculation_ResolveReference` resolves the effective Phase 1 mapping and returns only active, approved, effective rule candidates and their components in one serializable read.
- `GstCalculationSnapshots` and `GstCalculationSnapshotComponents` persist document-agnostic, immutable calculation evidence. `usp_GstCalculationSnapshot_Create` calculates the SHA-256 hash from canonical decision JSON and validates total/component reconciliation. Update/delete triggers require a superseding snapshot instead of mutation.

### Added application integration

- [GstCalculationReferenceResolver.cs](../backend/src/Cosmos.Persistence/Repositories/GstCalculationReferenceResolver.cs) implements `IGstCalculationReferenceResolver` with Dapper `QueryMultipleAsync`, grouping the resolver's component rows into engine contracts.
- The resolver and `IGstCalculationEngine` are registered through the existing Persistence/Application dependency-injection extensions. They have no controller/API route and no Sales/Purchase consumer.
- Resolver diagnostics include missing classification, missing rule applicability, unapproved/inactive rules, and no effective approved rule.

### Isolated SQL Server verification

Only disposable LocalDB database `CosmosGstPhase2Tests_20261016` on `(localdb)\MSSQLLocalDB` was used. It was built from the full setup script plus the Phase 1 and Phase 2 HSN/GST migrations, using synthetic `GST2-*` records.

| Scenario | Actual result |
| --- | --- |
| Apply Phase 2 migration | PASS |
| Reapply Phase 2 migration | PASS — idempotent |
| Product override takes precedence during resolver lookup | PASS — returned `GST2PRODUCT` / `ProductOverride` |
| Approved rule candidate/component lookup | PASS — returned only approved active version with explicit 9/9 intra-state and 18 inter-state components |
| Same-rule overlapping approved version | PASS — rejected with SQL error 51106 |
| Component sum not matching total rate | PASS — rejected with SQL error 51105 |
| Missing item classification | PASS — resolver emitted `CLASSIFICATION_MISSING` |
| Snapshot persistence | PASS — stored a 32-byte SHA-256 hash and two component rows |
| Snapshot mutation | PASS — update rejected with SQL error 51110 |

No real HSN/SAC, legal rate, staging, production, invoice, purchase, or provider data was inserted or accessed.

### Updated test/build results

| Command | Actual result |
| --- | --- |
| `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter "FullyQualifiedName~SalesCalculationServiceTests|FullyQualifiedName~GstCalculationEngineTests|FullyQualifiedName~HsnGstValidatorTests" --no-restore` | PASS — 16/16 |
| `dotnet build backend/src/Cosmos.API/Cosmos.API.csproj --no-restore` | PASS — 0 errors; 3 existing package warnings |

### Final verification update — 16 October 2026

The snapshot foundation had one application-side persistence gap: it stored IDs but did not persist the resolved HSN/SAC code/type, mapping dates, or rule code/approval/effective values needed to make a snapshot independently intelligible if master data changes. The Phase 2 migration now adds nullable, backward-compatible columns for that evidence and requires all new snapshots to supply and match those values. It also rejects malformed component data and mismatched component rates, component amounts, aggregate component totals, or rule total rate.

Added SSMS-only verification artifacts:

- `backend/database/migrations/20261016_hsn_gst_phase2_ssms_verification.sql` — guarded synthetic positive-path verification. It requires SQLCMD Mode and the exact disposable database name `CosmosGstPhase2Verification`; all synthetic rows are created inside, then rolled back.
- `backend/database/migrations/20261016_hsn_gst_phase2_concurrency_verification.sql` — guarded two-session approval-overlap fixture, Session A/Session B contention procedure, and explicit cleanup mode. It must not be run outside its named disposable database.

Actual local SQL verification was rerun on disposable LocalDB database `CosmosGstPhase2Verification` only. The revised migration applied successfully, and the SSMS verification script passed: product override was returned at the effective-date boundary, the resolver returned one approved 18% candidate with 9/9 intra-state and 18 inter-state components, and initial plus superseding snapshots persisted with a 32-byte SHA-256 hash and two component rows. The script rolled its fixtures back. The two-session contention script was prepared but has **not** been run; concurrency remains pending manual SSMS evidence.

| Command | Actual final result |
| --- | --- |
| `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter "FullyQualifiedName~SalesCalculationServiceTests\|FullyQualifiedName~GstCalculationEngineTests\|FullyQualifiedName~HsnGstValidatorTests" --no-restore` | PASS — 16 passed, 0 failed, 0 skipped |
| `dotnet build backend/src/Cosmos.API/Cosmos.API.csproj --no-restore` | PASS — 0 errors; 3 pre-existing package warnings (`NU1903`, `NU1510` × 2) |
| `sqlcmd -S "(localdb)\MSSQLLocalDB" -E -d CosmosGstPhase2Verification -I -b -i backend/database/migrations/20261016_hsn_gst_phase2_ssms_verification.sql` | PASS — disposable LocalDB only; synthetic transaction rolled back |

Remaining test gap: the SQL procedures were exercised in an isolated LocalDB database, but there is not yet a checked-in SQL integration-test harness that invokes the Dapper resolver against a disposable database. Concurrent approval locking is implemented with `UPDLOCK, HOLDLOCK`; an explicit multi-session contention test remains required before production activation.

## Business decisions still required

- Who can create, approve, activate, supersede, and retire a tax rule/version?
- Which rule(s) apply to each HSN/SAC and how are multiple conditions prioritized?
- The approved CGST/SGST/IGST/cess/other component definitions and jurisdiction rules.
- Seller-registration selection and place-of-supply derivation, including billing/shipping conflicts.
- Treatment of registered/unregistered buyers, exemption, zero-rate, reverse charge, SEZ, export, and stock transfer.
- Inclusive/exclusive pricing defaults, line versus invoice rounding, discount allocation, charge treatment, and accepted reconciliation tolerance.
- Purchase supplier-declared classification/rate mismatch and approval policy.

## Files changed

- `backend/src/Cosmos.Contracts/GstCalculation/GstCalculationContracts.cs`
- `backend/src/Cosmos.Application/Abstractions/Services/IGstCalculationEngine.cs`
- `backend/src/Cosmos.Application/Services/GstCalculationEngine.cs`
- `backend/tests/Cosmos.Tests/Gst/GstCalculationEngineTests.cs`
- `backend/database/migrations/20261016_hsn_gst_phase2_rule_snapshot_foundation.sql`
- `backend/src/Cosmos.Persistence/Repositories/GstCalculationReferenceResolver.cs`
- `backend/src/Cosmos.Application/DependencyInjection.cs`
- `backend/src/Cosmos.Persistence/DependencyInjection.cs`
- `docs/COSMOS_HSN_GST_PHASE2_RULE_SCHEMA_DESIGN.md`
- `docs/COSMOS_HSN_GST_PHASE2_DESIGN_AND_IMPLEMENTATION_REPORT.md`

No existing Sales/Purchase calculation file, API endpoint, database schema, stored procedure, frontend file, or Phase 1 migration was changed for Phase 2.

## Controlled integration readiness

The **database-backed calculation engine is ready for controlled integration testing** with the new Phase 2 migration and synthetic approved-rule fixtures. It is **not ready for production activation or GST legal-compliance claims** until the listed business decisions, manual concurrency evidence, immutable snapshot use by document lines, and end-to-end Sales/Purchase integration tests are completed.

## Final verification pass — 17 October 2026

### Application-layer result

The isolated engine remains outside Sales and Purchase; no invoice calculation, endpoint, or document workflow was added or changed.

- The request contract contains no tax percentage or component amount. The engine obtains classifications, approved rule versions, and components exclusively through `IGstCalculationReferenceResolver`.
- Unit coverage confirms approved/effective rule selection, HSN/SAC match and effective dates, intra-state CGST/SGST versus inter-state IGST, component/rate reconciliation, ambiguous-rule rejection, `decimal` line rounding, and invalid-context failures.
- The calculation result now retains the authoritative mapping ID and the full applied rule version. This closes a snapshot-evidence gap: a later snapshot writer can preserve mapping identity plus rule approval/effective-date context without re-resolving master data.
- A DI regression test confirms both `IGstCalculationEngine` and the SQL `IGstCalculationReferenceResolver` resolve from the production registration extensions. It uses a dummy LocalDB connection string only to construct services; it opens no database connection.
- The snapshot procedure now requires an approved, active, HSN/SAC-applicable rule effective on the transaction date. A superseding snapshot must point to an existing snapshot for the same item and document line. This prevents cross-document correction links and forged draft/non-applicable rule evidence.

### Actual local commands and results

| Command | Result in this verification pass |
| --- | --- |
| `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter "FullyQualifiedName~SalesCalculationServiceTests\|FullyQualifiedName~GstCalculationEngineTests\|FullyQualifiedName~HsnGstValidatorTests" --no-restore` | **PASS — 17 passed, 0 failed, 0 skipped** |
| `dotnet build backend/src/Cosmos.API/Cosmos.API.csproj --no-restore` | **PASS — 0 errors**; three existing package warnings: `NU1903` and `NU1510` × 2 |
| `git diff --check` | **PASS** |

No SQL integration test harness is checked in, and no database connection was configured for this pass. Consequently, no SQL Server, staging, or production verification is claimed here. Earlier LocalDB claims recorded above are historical report content, not evidence generated by this final pass.

### Manual SSMS verification required

Use only a disposable database named `CosmosGstPhase2Verification`; do not change the guard variables to point at staging or production.

1. Apply the base schema plus these migrations in order, using SSMS: `backend/database/migrations/20261015_hsn_gst_phase1_foundation.sql`, `backend/database/migrations/20261015_hsn_gst_phase1_mapping_lifecycle.sql`, and `backend/database/migrations/20261016_hsn_gst_phase2_rule_snapshot_foundation.sql`. The Phase 2 migration has guarded additive/object-replacement statements intended for safe re-runs; still review SQL Server output and stop on any error.
2. Enable **Query → SQLCMD Mode**, change the query database to `CosmosGstPhase2Verification`, and run [20261016_hsn_gst_phase2_ssms_verification.sql](../backend/database/migrations/20261016_hsn_gst_phase2_ssms_verification.sql). It uses only a `GST2VERIFY20261016` synthetic prefix inside one transaction and rolls it back. Expected output includes the resolver result sets, a 32-byte hash, two snapshot components, two immutability-trigger PASS messages, and a final PASS row.
3. For the two-session contention check, enable SQLCMD Mode and run [20261016_hsn_gst_phase2_concurrency_verification.sql](../backend/database/migrations/20261016_hsn_gst_phase2_concurrency_verification.sql) with `Session=SETUP`. Open two SSMS windows and run `Session=A`, then `Session=B` while A is in its 15-second wait. Expected result: A commits its approval and B is blocked then reports rejection `51106`. Finally run `Session=CLEANUP`. Save the Messages/results from all four executions as the concurrency evidence.

The main verification script covers migration prerequisites, rerun-safe object prerequisites, rule approval/use, HSN applicability fixture data, product override and date-boundary resolver invocation, component sets/rate reconciliation, snapshot hash/component reconciliation, mutation/delete rejection, and the superseding-snapshot workflow. The separate two-session script is required because concurrency cannot be meaningfully verified in one SQL session.

### Files changed in this final pass

- `backend/src/Cosmos.Contracts/GstCalculation/GstCalculationContracts.cs`
- `backend/src/Cosmos.Application/Services/GstCalculationEngine.cs`
- `backend/src/Cosmos.Persistence/Repositories/GstCalculationReferenceResolver.cs`
- `backend/tests/Cosmos.Tests/Gst/GstCalculationEngineTests.cs`
- `backend/database/migrations/20261016_hsn_gst_phase2_rule_snapshot_foundation.sql`
- `backend/database/migrations/20261016_hsn_gst_phase2_ssms_verification.sql`
- `docs/COSMOS_HSN_GST_PHASE2_DESIGN_AND_IMPLEMENTATION_REPORT.md`

### Readiness status

**Application layer: verified locally for the isolated Phase 2 calculation path.**

**Database layer: pending manual SSMS verification; concurrency specifically remains unverified until the two-session script produces the expected evidence.**

**Sales/Purchase integration: deliberately not started.** Remaining policy decisions listed above, real disposable-database SQL integration coverage, manual SQL evidence, and later document-line ownership/integration must be completed before any production or compliance readiness claim.
