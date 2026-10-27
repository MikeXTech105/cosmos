# GST policy and provider decision register

| Decision | Current evidence | Required owner decision | Effect |
|---|---|---|---|
| Seller registration selection | `SalesInvoices` has no registration link | Tax/compliance owner | blocks snapshot |
| Place of supply | absent from sales contract | Tax/compliance owner | blocks CGST/SGST vs IGST |
| Pricing, discount and rounding | only aggregate tax fields exist | Finance owner | blocks reconciliation |
| Confirmed invoice edits/corrections | confirmation changes stock only | Finance owner | blocks supersession policy |
| Special treatments | no verified model | Compliance owner | blocks treatment mapping |
| GSTZen schema/idempotency/status lookup | adapter contains mapping TODO | Provider owner | blocks submission/recovery |
| E-Way transportation details | not on sales invoice | Operations owner | blocks E-Way payload |

Safe default: generation remains blocked. Historical invoices require an explicit validation result; they must not be recalculated from current rules.

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
