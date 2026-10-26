# COSMOS — API, Validation and Database Contracts
**Reviewed:** 2026-10-26 · **Nature:** Master contract guide, not replacement for generated endpoint/column matrices.

## API design and enforcement
- Module-grouped ASP.NET controllers use bearer authentication and `RequirePermission` page/action checks where applicable. Public website APIs have a distinct anonymous contract; do not impose an internal ERP envelope on them without migration planning.
- Use the shared `ApiResponse<T>` success/failure conventions, meaningful HTTP status, correlation IDs and field-specific validation diagnostics. CSV/file exports return file responses, not normal JSON.
- Define DTO, validator, controller response metadata, application service, repository/stored procedure, page/permission seed and tests as one change unit.
- Route/path requirements, optional query members, nullability, conditional validation and persisted `NOT NULL` constraints are **different concepts**. Do not turn every DB non-null field into a frontend mandatory input.

## Canonical detailed evidence ledgers (retain)
1. [API action/required fields matrix](../backend/docs/API_REQUIRED_FIELDS_MATRIX.md) — indexed action/DTO links; snapshot derived from controllers.
2. [Validator-level required fields ledger](../backend/docs/REQUIRED_FIELDS_MASTER.md) — source-level `RuleFor` evidence and conditional semantics.
3. [Database field/source matrix](../backend/docs/DATABASE_REQUIRED_FIELDS.md) — static SQL reconstruction, **not a live DB declaration**.
4. [Required field source taxonomy](../backend/docs/REQUIRED_FIELD_SOURCES.md) and [dependency audit](../backend/docs/REQUIRED_FIELD_AUDIT_REPORT.md).
5. [Per-module required-field evidence](../backend/docs/required-fields/) — retain for human-readable coverage.
6. [QA API contract matrix](archive/qa-reports/COSMOS_API_CONTRACT_MATRIX.md) — historical test and mismatch evidence.

These large documents are audit artifacts, not mutually interchangeable duplicates. Re-run code/DB extraction after material changes rather than asserting their dated row counts remain current.

## Database ownership
`backend/database/` is authoritative for setup and migrations; Dapper procedure signatures and row materialization must be contract tested against actual applied SQL. Maintain a migration manifest and preflight/postflight checks. Never consolidate or discard historical migrations merely because their operations seem superseded.

## Contract acceptance gates
Use positive/negative validation tests, success/failure envelope tests, 401/403/404/409 behaviour, missing/duplicate input checks, SQL schema/procedure mapping, concurrency tests for stock and financial mutations, and browser API routing/CORS checks. Compare UI service expectations with Swagger and actual network responses.

## GST compliance contract status (2026-10-26)

The GST master-data contract is present: HSN/SAC, effective-dated rate versions, category defaults and item overrides have protected API routes, SQL migrations and React screens. The overview now presents those screens only to users with the relevant page grant. This is source-verified only; it is not proof that a target database has the required migrations or that the routes are deployed.

E-Invoice and E-Way Bill **generation remain intentionally unavailable** (`409` / `GST_SERVER_GENERATION_NOT_AVAILABLE`). The sales contract does not yet persist the immutable seller/buyer identity and address snapshots, place of supply, approved component taxes and totals, correction lineage, or E-Way transport context required to construct a statutory payload. The reservation/attempt SQL foundation is additive but not connected to sales confirmation. Do not replace the block, pass browser JSON to GSTZen, or retry an unknown outcome until the approved snapshot and provider-reconciliation contracts are deployed.
