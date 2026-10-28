import AppLookup from "../../components/common/AppLookup";
import { categoryService } from "../../services/inventory/categoryService";
import { lookupPage } from "../../utils/lookupPage";
import { getPartyDisplayName } from "./partyHelpers";
import { partyService } from "./partyService";

const allLabels = { category: "All categories", customer: "All customers", supplier: "All suppliers" };
const asOption = (record, kind) => ({
  value: String(record.value ?? record.id),
  label: `${record.label ?? (kind === "category" ? record.name : getPartyDisplayName(record))}${record.isActive === false ? " (inactive)" : ""}`,
});

// Filtering historical documents can legitimately select an inactive master.
// View options retain its status in the label without pretending the master is active.
export default function CommerceFilterLookup({ kind, value, onChange, initialOptions = [], onCreate, ...props }) {
  const toOption = record => asOption(record, kind);
  const loadPage = async ({ search, page, pageSize, signal }) => {
    const query = { Search: search, PageNumber: page, PageSize: pageSize };
    if (kind === "category") {
      const result = lookupPage(await categoryService.getCategories(query, { signal }), page, pageSize);
      return { ...result, items: result.items.map(toOption) };
    }
    // PartyType is an exact server filter: include Both through its own bounded page.
    const pages = await Promise.all([kind === "customer" ? "Customer" : "Supplier", "Both"].map(async PartyType =>
      lookupPage(await partyService.getParties({ ...query, PartyType }, { signal }), page, pageSize)));
    return { items: [...new Map(pages.flatMap(result => result.items).map(record => [String(record.id), toOption(record)])).values()], hasMore: pages.some(result => result.hasMore) };
  };
  const loadById = async (id, options) => {
    const response = kind === "category" ? await categoryService.getCategoryById(id, options) : await partyService.getPartyById(id, options);
    const record = response.data?.category ?? response.data?.party ?? response.data;
    return record ? toOption(record) : null;
  };
  return <AppLookup {...props} scopeKey={`historical-filter:${kind}`} value={value ?? "all"}
    onChange={id => onChange?.(id ? String(id) : "all")}
    initialOptions={[{ value: "all", label: allLabels[kind] }, ...initialOptions.map(toOption)]}
    loadPage={loadPage} loadById={loadById} onCreate={onCreate ? async search => { const record = await onCreate(search); return record ? toOption(record) : null; } : undefined}
    createLabel={`Create new ${kind}`} placeholder={`Search ${kind === "category" ? "categories" : `${kind}s`}`} />;
}
