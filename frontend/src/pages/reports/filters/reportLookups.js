import { documentLookupService } from "../../../services/documentLookupService";




import { partyService } from "../../party/partyService";

import { myWalletService } from "../../../services/rojmel/myWalletService";
import { RojmelCategoryType } from "../../../constants/rojmelEnums";
import { lookupPage } from "../../../utils/lookupPage";

const named = (row) => ({ value: row.id ?? row.categoryId ?? row.unitId, label: row.name ?? row.categoryName ?? row.unitName ?? row.symbol });
const createLookup = (list, byId, mapper) => ({
  loadPage: async ({ search, page, pageSize, signal }) => {
    const result = lookupPage(await list({ Search: search, PageNumber: page, PageSize: pageSize, IsActive: true }, { signal }), page, pageSize);
    return { ...result, items: result.items.map(mapper) };
  },
  loadById: async (id, { signal }) => {
    const result = await byId(id, { signal });
    const data = result.data ?? result;
    return mapper(data.party ?? data.item ?? data);
  },
});

export const reportLookups = {
  categories: createLookup(documentLookupService.categories, documentLookupService.category, named),
  expenseCategories: createLookup(documentLookupService.expenseCategories, documentLookupService.expenseCategory, named),
  units: createLookup(documentLookupService.units, documentLookupService.unit, named),
  items: createLookup(documentLookupService.items, documentLookupService.item, (row) => ({ value: row.id ?? row.itemId, label: [row.name ?? row.itemName, row.itemCode].filter(Boolean).join(" · ") })),
  parties: createLookup(partyService.getParties, partyService.getPartyById, (row) => ({ value: row.id ?? row.partyId, label: row.partyName ?? row.tradeName ?? row.legalName ?? row.name })),
  rojmelWallets: createLookup(documentLookupService.wallets, documentLookupService.wallet, (row) => ({ value: row.id ?? row.walletId, label: [row.walletName, row.walletCode].filter(Boolean).join(" · ") })),
  // This endpoint is intentionally unpaged, unlike the master list endpoints.
  rojmelCategories: {
    loadPage: async ({ search, page, pageSize }) => {
      const response = await myWalletService.getCategories(RojmelCategoryType.Both);
      const rows = (Array.isArray(response.data) ? response.data : response.data?.items ?? []).map(named).filter((row) => row.label?.toLowerCase().includes(search.toLowerCase()));
      return { items: rows.slice((page - 1) * pageSize, page * pageSize), hasMore: page * pageSize < rows.length };
    },
    loadById: async (id) => {
      const response = await myWalletService.getCategories(RojmelCategoryType.Both);
      return (Array.isArray(response.data) ? response.data : response.data?.items ?? []).map(named).find((row) => String(row.value) === String(id));
    },
  },
};
