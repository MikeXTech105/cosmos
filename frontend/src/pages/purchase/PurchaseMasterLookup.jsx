import AppLookup from "../../components/common/AppLookup";
import { partyService } from "../party/partyService";
import { getPartyDisplayName } from "../party/partyHelpers";
import { purchaseBillService } from "../../services/purchase/purchaseBillService";
import { lookupPage } from "../../utils/lookupPage";
import { formatCurrency } from "../../utils/reportFormat";
import { documentLookupService } from "../../services/documentLookupService";

const partyOption = (row) => ({ value: row.id, label: getPartyDisplayName(row) });
const categoryOption = (row) => ({ value: String(row.id), label: row.name });
const billOption = (row) => ({ value: String(row.id), label: `${row.purchaseBillNo ?? row.billNumber ?? "Bill"} · Outstanding ${formatCurrency(row.balanceAmount ?? row.outstandingAmount ?? row.grandTotal)}` });
const created = (handler, mapper) => async () => { const row = await handler(); return row ? mapper(row) : null; };

export function PurchasePartyLookup({ options = [], creatable, onCreateClick, partyType, ...props }) {
  return <AppLookup {...props} initialOptions={options} onCreate={creatable && onCreateClick ? created(onCreateClick, partyOption) : undefined}
    loadPage={async ({ search, page, pageSize, signal }) => {
      const result = lookupPage(await partyService.getParties({ Search: search, PartyType: partyType, PageNumber: page, PageSize: pageSize, IsActive: true }, { signal }), page, pageSize);
      return { ...result, items: result.items.map(partyOption) };
    }} loadById={async (id, options) => { const result = await partyService.getPartyById(id, options); return partyOption(result.data?.party ?? result.data); }} />;
}
export function PurchaseExpenseCategoryLookup({ options = [], creatable, onCreateClick, ...props }) {
  return <AppLookup {...props} initialOptions={options} onCreate={creatable && onCreateClick ? created(onCreateClick, categoryOption) : undefined}
    loadPage={async ({ search, page, pageSize, signal }) => {
      const result = lookupPage(await documentLookupService.expenseCategories({ Search: search, PageNumber: page, PageSize: pageSize, IsActive: true }, { signal }), page, pageSize);
      return { ...result, items: result.items.map(categoryOption) };
    }} loadById={async (id, options) => { const result = await documentLookupService.expenseCategory(id, options); return categoryOption(result.data); }} />;
}
export function PurchaseSupplierBillLookup({ supplierId, options = [], ...props }) {
  return <AppLookup {...props} aria-label={props["aria-label"] ?? "Purchase bill allocation"} scopeKey={supplierId} initialOptions={options}
    loadPage={async ({ search, page, pageSize, signal }) => {
      const result = lookupPage(await purchaseBillService.getPurchaseBillsBySupplier(supplierId, { Search: search, PageNumber: page, PageSize: pageSize }, { signal }), page, pageSize);
      return { ...result, items: result.items.filter((row) => String(row.supplierId).toLowerCase() === String(supplierId).toLowerCase()).map(billOption) };
    }} loadById={async (id, options) => {
      const result = await purchaseBillService.getPurchaseBillById(id, options);
      const row = result.data?.purchaseBill ?? result.data;
      if (String(row?.supplierId).toLowerCase() !== String(supplierId).toLowerCase()) throw new Error("The selected bill belongs to another supplier. Review the allocation.");
      return billOption(row);
    }} />;
}
