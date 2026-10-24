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
