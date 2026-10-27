# GST policy and provider decision register

| Decision | Current evidence | Required owner decision | Effect |
|---|---|---|---|
| Seller registration selection | Phase 3 persists an optional issuer-registration link, but not legal identity/address or company/branch scope | Tax/compliance owner | blocks snapshot |
| Place of supply | Phase 3 persists reviewed state/source, but no approved determination policy | Tax/compliance owner | blocks CGST/SGST vs IGST |
| Pricing, discount and rounding | Price basis is captured but only aggregate current Sales tax is posted | Finance owner | blocks reconciliation |
| Confirmed invoice edits/corrections | confirmation changes stock only; no snapshot is created | Finance owner | blocks supersession policy |
| Special treatments | no verified model | Compliance owner | blocks treatment mapping |
| GSTZen schema/idempotency/status lookup | adapter contains mapping TODO | Provider owner | blocks submission/recovery |
| E-Way transportation details | not on sales invoice | Operations owner | blocks E-Way payload |

Safe default: generation remains blocked. Historical invoices require an explicit validation result; they must not be recalculated from current rules.

## Phase 4 authoritative-calculation decision register — 27 October 2026

The implementation-ready proposal is maintained in [Phase 4 authoritative calculation and snapshot design](COSMOS_GST_PHASE4_AUTHORITATIVE_CALCULATION_AND_SNAPSHOT_DESIGN.md). None of its proposed formulas, supported treatments, lifecycle consequences, or provider mappings are approved policy. Phase 2 engine behavior is confirmed technical capability; it is not authority to change Sales totals.

| Decision area | Confirmed technical fact | Approval still required |
|---|---|---|
| Jurisdiction | The engine selects intra-state versus inter-state components from seller state and reviewed place of supply | Valid source hierarchy, exceptions, and supported treatments |
| Price basis/discount/rounding | Draft price basis is captured; an isolated proportional allocator and deterministic engine rounding exist | Legal calculation order, eligibility, scale/mode, cess/other components, and reconciliation adjustment |
| Confirmation snapshot | Immutable snapshot/request foundations exist but are not wired to confirmation | Required source fields, blocking behavior, correction and supersession policy |
| Authorization | Registration has company/branch fields; Sales invoice lacks an enforceable ownership scope | Invoice/registration/user company-branch scope and read/generation access rules |
| GSTZen | Provider adapter is source-blocked and contains mapping TODOs | Account contract, sandbox, headers, payloads, idempotency and reconciliation semantics |

The readiness evaluator documents the missing seller, buyer, place-of-supply, component-tax, rounding, and transport bindings per invoice. The sales-confirmation workflow remains unchanged pending owner approval of whether these should block ordinary confirmation.

## Phase 2 decision gate

| Policy area | Classification | Safe Phase 2 behaviour |
|---|---|---|
| Seller registration selection | Missing; requires tax/compliance owner | Report `GST_SNAPSHOT_SELLER_REGISTRATION_UNRESOLVED`; do not select a default registration. |
| Buyer identity, GSTIN and addresses | Missing; requires tax/compliance owner | Report unsnapshotted buyer identity; do not copy a current Party record to history. |
| Place of supply and tax treatment | Missing; requires tax/compliance owner | Report unresolved place of supply; do not infer CGST/SGST/IGST. |
| Component tax/rule binding, discount allocation and rounding | Implemented calculation foundations but not formally approved for statutory sales posting | Report missing component/rule evidence; retain existing aggregate sales tax untouched. |
| Confirmation/correction/supersession | Missing; requires finance owner | Do not change `sp_SalesInvoice_Confirm`; do not create/backfill snapshots. |
| Historical invoices | Missing; requires finance/tax owner | Assess persisted data only; never recalculate from current masters. |
| E-Invoice/E-Way eligibility and transport contract | Missing; provider and operations owners | Report explicit diagnostics; retain the generation block. |
