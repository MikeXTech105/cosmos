# Manufacturing Comparison and Roadmap

**Reviewed:** 22 September 2026  
**Scope:** Vyapar manufacturing flow compared with the current COSMOS frontend and the supplied manufacturing backend contract.

## Executive conclusion

Vyapar is currently easier for a first-time operator because its basic workflow is short and linear:

1. Settings → Item Settings → Enable Manufacturing
2. Open a finished item
3. Add raw materials and additional costs
4. Enter the number of units and manufacture
5. Review Manufacturing and Consumption reports

COSMOS now follows the same placement: manufacturing is enabled from the existing Settings area, configured inside the existing Item form, and its reports live inside the existing Reports area. COSMOS already offers stronger transaction control through versioned BOMs, Draft → Post processing, BOM snapshots and cancellation with stock reversal. Those controls are useful for auditability, but the interface should keep their extra steps clear for small-business users.

## Sources used

- Vyapar official manufacturing page: <https://vyaparapp.in/manufacturing>
- Vyapar official job-work guide: <https://vyaparapp.in/videos/how-to-make-job-work-challan>
- Supplied COSMOS backend notes: `E:/The D/MANUFACTURING_MODULE.md`
- Supplied frontend integration notes: `E:/The D/MANUFACTURING_FRONTEND_INTEGRATION.md`
- Current COSMOS frontend implementation in this repository

The Vyapar references describe product behavior, not an instruction to copy its branding or create separate masters. COSMOS keeps its own design system and existing navigation structure.

## Current feature comparison

| Capability | Vyapar | COSMOS now | Assessment |
|---|---|---|---|
| Global manufacturing switch | Settings → Item Settings | Settings → Item settings → Enable manufacturing | Parity added |
| Finished item setup | Manufacturing inside Item detail | Manufacturing tab inside Pricing, stock & manufacturing | Parity |
| Raw-material recipe / BOM | Raw materials per finished item | Versioned BOM with raw materials | COSMOS stronger |
| Wastage | Material quantity/cost flow | Percentage per BOM material | COSMOS available |
| Additional production costs | Labour, electricity, packing and other cost lines | Not available | Must add |
| Estimated production cost | Shows estimated/total production cost | Material requirement preview only | Must add |
| Production entry | Select item, units, Manufacture | Create Draft, then Post | COSMOS safer; Vyapar faster |
| Stock conversion | Deduct materials and add finished stock | Atomic Post; Cancel reverses stock | COSMOS stronger |
| BOM auditability | Basic saved recipe | BOM versions, activation and production snapshot | COSMOS stronger |
| Reports | Manufacturing and Consumption | Manufacturing History and Raw Material Consumption in Reports | Parity at UI level |
| Outsourced job work | Job Work Out, received goods and conversion to invoice | Not in manufacturing flow | Add if business needs it |
| Multiple warehouse/location production | Advertised by Vyapar | Production entry has no location selector | Must add for multi-warehouse use |
| Batch/lot/expiry selection | Available in Vyapar inventory/manufacturing offering | Not part of production entry | Add for traceable industries |

## Ease-of-use comparison

### Easier today: Vyapar for a basic operator

- Fewer transaction states are exposed.
- Raw materials and additional costs are entered together.
- Estimated cost is visible before manufacturing.
- The public workflow is presented as a single six-step process.

### Stronger today: COSMOS for control and audit

- A BOM can be versioned and explicitly activated.
- A production Draft can be reviewed before stock changes.
- Posting updates raw-material and finished-goods stock as one backend transaction.
- Cancellation records a reason and reverses stock.
- Production keeps a BOM material snapshot, so history is not changed by future BOM edits.

### Recommended UX direction

Keep the COSMOS controls, but present them as a guided flow:

`Enable → Add recipe and costs → Check availability and cost → Manufacture → Review stock result`

The primary button can say **Manufacture** while COSMOS internally creates and posts safely. Advanced users can retain a **Save as draft** secondary action.

## Completed in the current integration

- Added a global manufacturing switch inside the existing Settings screen.
- Manufacturing tab is shown only for Product items when the global switch is enabled.
- Kept item-level **Enable manufacturing** for selecting which products are finished goods.
- Existing items immediately show BOM and Production sections when the item checkbox is enabled.
- New items require one initial save because the backend needs an item ID for BOM and production records.
- Added versioned BOM creation, raw-material quantity and wastage.
- Added BOM effective dates, notes, component notes, activation, deactivation and default handling.
- Added edit/delete actions for non-active BOMs.
- Added production Draft creation/editing with planned quantity, produced quantity and material-consumption preview.
- Added Post and Cancel/reversal actions.
- Added Manufacturing History and Raw Material Consumption to the existing Reports module.

## Remaining work — priority list

### P0 — required before calling it full Vyapar manufacturing parity

1. **Additional cost lines in BOM**
   - Add charge name, calculation type, amount and optional ledger/expense mapping.
   - Examples: labour, electricity, packing, freight and other overhead.
   - Backend contract and database changes are required; current BOM payload supports material components only.

2. **Production costing**
   - Calculate raw-material cost, additional cost, total batch cost and cost per finished unit.
   - Snapshot rates and costs when production is posted.
   - Show estimated cost before posting and actual cost in history.

3. **Server/company-level manufacturing setting**
   - The new COSMOS switch currently persists as a browser workspace preference because no settings endpoint exists in the supplied backend contract.
   - Add a tenant/company setting API so all authorized users receive the same value on every device.
   - Define who can change this setting and log changes.

4. **Native backend report endpoints**
   - Add production-history and material-consumption report APIs with server-side date, item, status and location filters.
   - The current consumption report loads production details record-by-record; this will not scale to large histories.

5. **Production Draft deletion**
   - Draft production editing is available, but the supplied API has no production delete endpoint.
   - Add a backend delete/void contract only if the business wants users to discard unused drafts.

### P1 — important for a practical production rollout

6. **Stock availability and shortage preview**
   - Show required, available and shortage quantities before Post.
   - Keep the backend conflict response as the final authority.
   - Offer a direct link to purchase/procurement planning for shortages.

7. **Warehouse/godown selection**
   - Select the source warehouse for raw materials and destination warehouse for finished goods.
   - Store warehouse references on the production record and stock movements.
   - Add warehouse filters to both reports.

8. **Simplified one-action manufacture flow**
   - Primary action: validate and post in one guided confirmation.
   - Secondary action: Save as draft.
   - After success, show materials consumed, finished stock added and updated balances.

9. **Production detail view**
   - Dedicated read-only detail modal/page with BOM snapshot, stock movements, costs, creator, timestamps, posting user and cancellation information.

10. **Better BOM cost preview**
    - Show each material’s current rate, quantity, wastage quantity and line cost.
    - Show recipe total and cost per unit while editing.

11. **Granular permissions**
    - Separate permissions for view BOM, edit BOM, activate BOM, create production, post production, cancel production, reports and manufacturing settings.

12. **Report completeness**
    - Add cost columns and totals to Manufacturing History.
    - Add material rate and consumed value to Consumption.
    - Add warehouse, batch and operator filters when those features exist.
    - Verify CSV/PDF exports with high-volume data.

### P2 — advanced manufacturing capability

13. **Multi-level BOM explosion**
    - Support manufactured sub-assemblies inside another BOM.
    - Detect circular relationships and calculate exploded demand/cost.
    - The supplied backend notes explicitly mark multi-level explosion as future work.

14. **Batch, lot, serial and expiry traceability**
    - Pick source batches for consumed materials.
    - Create/assign the finished-goods batch and expiry date.
    - Provide forward and backward traceability.

15. **Job work / outsourced manufacturing**
    - Job Work Out challan, party, due date, issued materials, received quantity, wastage/variance, charges and invoice conversion.
    - Build this in the existing sales/purchase/dispatch flow rather than as an unrelated master.

16. **Production planning and work orders**
    - Planned quantity, target date, status, instructions and material reservation.
    - Convert an approved plan/work order into production.

17. **Yield and variance analysis**
    - Planned versus actual material consumption.
    - Expected versus actual output, scrap, rejection and yield percentage.

18. **Manufacturing dashboard alerts**
    - Material shortages, low stock, expiring batches, open drafts, production trend and high-wastage items.

19. **Accounting integration**
    - Map labour/overhead costs, WIP, finished-goods valuation and production variance to accounting ledgers.

20. **Operational documents and sharing**
    - Printable production sheet/work order, labels and controlled share/download actions.

## Suggested delivery order

1. Additional costs + costing backend contract
2. Company-level setting API
3. BOM/Draft edit and delete UI
4. Availability/shortage preview
5. Warehouse-aware production
6. Native scalable reports with cost columns
7. Simplified Manufacture action and production detail
8. Batch traceability or Job Work, selected by actual business priority
9. Multi-level BOM and advanced planning

## Acceptance criteria for the next milestone

- An administrator enables Manufacturing once for the company.
- A user opens a finished product and enters materials plus additional costs in one place.
- COSMOS shows estimated batch cost, unit cost and shortages before manufacture.
- One primary Manufacture action safely updates source and destination stock.
- The saved production detail shows an immutable material-and-cost snapshot.
- Manufacturing and Consumption reports show quantities, values, filters and exports without per-row API requests.
