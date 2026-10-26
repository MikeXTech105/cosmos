# Cosmos ERP — GST Phase 4 Authoritative Calculation and Compliance Snapshot Design

**Status:** Design only — 27 October 2026. This document authorizes neither an invoice-total change nor statutory generation.

## Confirmed starting point

- Phase 2 supplies a server-resolved, approved-rule calculation engine. It rejects client-provided rates, missing/effective/ambiguous rules, unreconciled component rates, and invalid classification data. Its deterministic arithmetic is two-decimal, `AwayFromZero` rounding.
- Phase 3 persists only optional draft context: issuer registration, reviewed place-of-supply state/source, and price basis. The existing Sales procedures still calculate aggregate tax from client-supplied line tax percentages.
- `GstComplianceSnapshots`, request reservation, attempt ledger, immutable mutation trigger, and active-snapshot uniqueness foundation exist, but are not connected to Sales confirmation. Retained staging has zero snapshots, generation requests, or generation attempts.
- GSTZen statutory calls remain source-blocked. No draft calculation, preview, or historical recomputation is legally authoritative.

## Target boundary

Phase 4 makes a **new confirmation path** authoritative only after the approval gates below pass. It must calculate from server-resolved reference data, persist a canonical immutable snapshot in the same transaction as confirmation/stock posting, and treat the snapshot—not mutable Sales, Party, Item, Registration, HSN, or rate tables—as the sole statutory document source.

Draft preview is optional and non-authoritative. It may show diagnostics and estimates, but it must neither overwrite existing Sales aggregate tax nor reserve/provider-submit a statutory document.

## Proposed calculation contract

1. Load the draft invoice, its selected registration, buyer facts, and line items inside one controlled transaction.
2. Validate the approved place-of-supply input and authorization scope before resolving any rule. The request carries no tax rate or tax component supplied by a browser.
3. Resolve HSN/SAC and exactly one active, approved, effective rule per line through `IGstCalculationReferenceResolver`/`IGstCalculationEngine`.
4. Allocate any approved invoice-level discount across eligible lines using the approved policy, then calculate taxable value and the applicable intra-state or inter-state component set per line.
5. Round components under the approved policy, reconcile line components to rule rates and invoice totals, and reject any unresolved variance rather than silently adjusting tax.
6. Build a versioned canonical payload from persisted seller/buyer/address/treatment/line/rule/component/rounding facts; hash it server-side with SHA-256.
7. Confirm stock and persist exactly one active immutable compliance snapshot atomically. A failed calculation, snapshot, or stock operation rolls back the entire confirmation.

The existing component model supports CGST, SGST, IGST and `Other`; the legal meaning, ordering, cess treatment, and adjustment policy require approval before it is used for posting.

## Proposed database migration sequence

All migrations are proposals to be written as forward-only, versioned SQL with read-only verification scripts before implementation. Do not alter historical invoices or backfill snapshots.

1. `202610xx_sales_invoice_gst_authoritative_context.sql`: add only the approved invoice/snapshot source fields (seller legal identity/address/GSTIN, buyer identity/GSTIN/billing/shipping facts, treatment, determined place-of-supply basis, document type, and policy version identifiers). Add company/branch ownership keys or an equivalent enforceable scope relation.
2. `202610xx_gst_compliance_snapshot_line_components.sql`: add immutable snapshot-line and snapshot-component tables, correction/supersession lineage, canonicalization version, policy/rule/version IDs, taxable values, component amounts, rounding adjustments, and reconciliation totals. FKs must point from snapshot children to the snapshot, not to mutable current master data as the historical source.
3. `202610xx_sales_invoice_confirm_with_gst_snapshot.sql`: introduce an explicit confirmation procedure that locks the draft, validates status/scope, persists the snapshot and line components, applies stock posting, and returns a deterministic result. It must not replace the legacy `sp_SalesInvoice_Confirm` until rollout approval.
4. `202610xx_gst_generation_reconciliation.sql`: extend the existing reservation/attempt foundation only after the provider contract is verified. Retain unique snapshot/document reservations and model unknown outcomes as reconciliation-required, never safe-to-retry.
5. For each migration: a preflight, a verification script, a clean-schema test, a rerun test, a concurrent-confirmation/reservation test, and an explicit preservation test for historical data.

## Proposed application and API changes

- Add an internal `SalesInvoiceGstAuthoritativeCalculationService` that orchestrates persisted data, scope validation, the existing rule resolver/engine, canonical serialization, and the confirmation repository operation. It replaces neither the current Sales calculation service nor ordinary draft save behavior until enabled by an approved workflow.
- Add versioned contracts for calculation diagnostics, line allocations, component breakdown, canonical snapshot read models, and correction lineage. Public contracts must accept facts requiring review, not a rate, component amount, or arbitrary provider JSON.
- If a preview endpoint is approved, expose it as a clearly labelled draft preview with an `isAuthoritative = false` response and no persistence/provider side effects. Do not expose an endpoint merely to invoke confirmation calculation during design.
- Add snapshot retrieval and generation-status read models behind company/branch/registration scope plus existing GST/Sales permissions. Generation commands stay unavailable until the provider and policy gates pass.

## Cancellation and correction design

Cancellation policy must distinguish: draft cancellation; confirmed but not statutorily submitted cancellation; submitted/issued document cancellation; and correction after issuance. A correction must create a new approved snapshot that explicitly supersedes its predecessor; neither updates nor deletes the prior snapshot. The legally required downstream action (for example provider cancellation, credit/debit-note workflow, or prohibition) is a finance/tax decision and is not assumed here.

## Mandatory approval register

| Decision | Owner | Required before implementation |
|---|---|---|
| Place-of-supply source priority, validation and exception handling | Tax/compliance | Yes |
| Intra/inter-state component rules, component ordering and cess/other tax handling | Tax/compliance | Yes |
| Inclusive/exclusive formula, discount eligibility/order, rounding scale/mode and permitted reconciliation adjustment | Finance + tax | Yes |
| Which GST treatments/document types are supported and which block confirmation | Tax/compliance | Yes |
| Seller/buyer/billing/shipping legal snapshot fields and retention rules | Legal + tax | Yes |
| Whether GST readiness blocks ordinary confirmation or creates a separately controlled confirmation mode | Finance + operations | Yes |
| Cancellation, correction, credit/debit-note and supersession policy | Finance + tax | Yes |
| Company/branch/registration ownership and user authorization scope | Security + business owner | Yes |
| GSTZen account contract, header/GSTIN routing, payloads, timeout semantics, idempotency and reconciliation endpoints | Provider owner | Yes |
| Sandbox data, credentials, permitted document types and acceptance criteria | Provider owner + compliance | Yes |

## Authorization model gap

`CompanyGstRegistrations` has `CompanyId` and `BranchId`; current `SalesInvoices` exposes only a selected registration and customer reference. Selecting an active registration proves neither that the caller can use it nor that the invoice belongs to its company/branch. Phase 4 must define and enforce a single ownership path on invoice creation, draft edit, confirmation, snapshot read, correction, and provider generation. Page permission alone is insufficient where records must be isolated.

The first non-financial Phase 4 increment is specified in [Phase 4 ownership and authorization increment](COSMOS_GST_PHASE4_OWNERSHIP_AUTHORIZATION_INCREMENT.md). It introduces no tax authority or statutory workflow and is contingent on an explicit ownership-source and cross-scope response decision.

## GSTZen prerequisites

Before any sandbox submission: obtain the account-specific current API/OpenAPI or Postman contract; sandbox base URL and credentials through the secret manager; exact authentication and selected-GSTIN headers; required payload/codes; idempotency/retry semantics; status/retrieval/cancellation endpoints; error taxonomy; rate limits; and masked request/response retention policy. Test successful, validation-failed, timeout/unknown-outcome, duplicate, provider-retrieval, cancellation, and reconciliation flows against disposable snapshot fixtures. Provider responses must be correlated to an immutable snapshot and durable request record, never browser JSON.

## Recommended implementation sequence

1. Record the approvals above and implement company/branch/registration record scope.
2. Implement canonical immutable snapshot tables and read models in an isolated SQL database; test immutability and supersession.
3. Add line-level authoritative calculation with approved component, discount, and rounding policies; test effective dates, ambiguity, inclusive/exclusive cases, and reconciliation.
4. Add the new atomic confirm-with-snapshot path behind an explicit feature/workflow boundary; test stock and snapshot rollback/concurrency.
5. Add correction/cancellation policy workflows and historical-data preservation tests.
6. Integrate GSTZen only in sandbox through snapshot-bound reservation/reconciliation; run provider acceptance tests before any statutory enablement.

**Exit criterion:** Phase 4 is ready for a controlled sandbox pilot only when all policy decisions are approved, scope is enforced, the new transactional path passes isolated SQL integration tests, provider reconciliation is verified, and release owners explicitly authorize activation. It is not a production-compliance certification.
