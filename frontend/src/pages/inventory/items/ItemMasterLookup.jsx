import AppLookup from "../../../components/common/AppLookup";
import { categoryService } from "../../../services/inventory/categoryService";
import { unitService } from "../../../services/inventory/unitService";
import { lookupPage } from "../../../utils/lookupPage";

export default function ItemMasterLookup({ kind, ...props }) {
  const category = kind === "category";
  return <AppLookup {...props} scopeKey={kind}
    loadPage={async ({ search, page, pageSize, signal }) => lookupPage(await (category ? categoryService.getCategories : unitService.getUnits)({ Search: search, PageNumber: page, PageSize: pageSize, IsActive: true }, { signal }), page, pageSize)}
    loadById={async (id, options) => { const response = await (category ? categoryService.getCategoryById : unitService.getUnitById)(id, options); return response.data?.[kind] ?? response.data; }}
    getOptionLabel={row => row.label ?? [row.name, row.shortName].filter(Boolean).join(" · ")} />;
}
