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

The read-only `GET /api/v1/gst/invoices/{salesInvoiceId}/eligibility` contract is available to `GST.EInvoice` viewers. It returns structured persisted-data diagnostics and does not select master data, create a snapshot, or alter the Sales Invoice lifecycle. Treat `canCreateSnapshot = false` as an implementation/policy result, not a normal-sales confirmation failure.

## Sales GST capture policy status (2026-10-26)

Sales invoice drafts can capture an explicit active issuing registration, a reviewed two-digit place-of-supply state code plus source, and an explicit tax-inclusive/tax-exclusive price-basis intent. These nullable fields are additive; historical invoices are not backfilled. The existing Sales tax percentage and aggregate total behavior remains authoritative until approved GST calculation, component, discount-allocation, and rounding policies are deployed and tested.

The proportional discount allocator is an isolated engineering proposal only. The current Sales create/update procedures do not invoke it, do not create immutable statutory snapshots, and do not enable E-Invoice or E-Way Bill generation. Registration selection does not prove company/branch record scope; deployments requiring such isolation remain blocked on an enforceable authorization model.

## Company/Branch master contract status (2026-10-28)

`/api/v1/organization/companies` and `/api/v1/organization/branches` retain the existing authenticated, `System.CompanyBranchScope` page/action permission contract. They additionally enforce database-backed record scope: inaccessible individual resources return `404`, while missing page permission returns `403`. Lists return only records in the caller's effective scope. Company creation is System Owner-only; Company-level scope administers that company and may create its branches; Branch-only scope may read or edit its assigned branch but cannot administer the Company, siblings, or create branches.

`SaveCompanyRequest` and `SaveBranchRequest` validate required, non-whitespace `Code` and `Name` values at their SQL column limits (50/250), and Branch requests require a positive `CompanyId`. Duplicate codes, inactive companies, unsafe deactivation, reassignment, and record-scope decisions remain controlled database outcomes (`409` or non-disclosing `404`) rather than client-side assumptions. Company/Branch deactivation is blocked by active operational dependencies; no historical Sales record is rewritten or cascaded.

Company and Branch writes create their required audit event inside the same SQL transaction through database audit triggers. The event records the persisted acting user, UTC timestamp, action, old/new master values, and changed-field metadata. An audit insertion failure aborts the master mutation; no post-commit compensation is used.
