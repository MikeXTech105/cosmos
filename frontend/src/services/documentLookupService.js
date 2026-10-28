import api from "./manufacturing/productionApi";
import { ENDPOINTS } from "../api/endpoints";
import { normalizeParams, unwrapResponse } from "./apiServiceUtils";

const read = async (url, params, { signal } = {}) => unwrapResponse(await api.get(url, { params: normalizeParams(params), signal }));
// Opt-in exact reads for the document editors; existing Item/Unit/GST CRUD stays shared.
export const documentLookupService = {
  items: (params, options) => read(ENDPOINTS.ITEMS, params, options),
  item: (id, options) => read(ENDPOINTS.ITEM_BY_ID(id), {}, options),
  units: (params, options) => read(ENDPOINTS.UNITS, params, options),
  unit: (id, options) => read(ENDPOINTS.UNIT_BY_ID(id), {}, options),
  categories: (params, options) => read(ENDPOINTS.CATEGORIES, params, options),
  category: (id, options) => read(ENDPOINTS.CATEGORY_BY_ID(id), {}, options),
  expenseCategories: (params, options) => read(ENDPOINTS.EXPENSE_CATEGORIES, params, options),
  expenseCategory: (id, options) => read(ENDPOINTS.EXPENSE_CATEGORY_BY_ID(id), {}, options),
  wallets: (params, options) => read(ENDPOINTS.ROJMEL_WALLETS, params, options),
  wallet: (id, options) => read(ENDPOINTS.ROJMEL_WALLET_BY_ID(id), {}, options),
  registrations: (params, options) => read(ENDPOINTS.GST_REGISTRATIONS, params, options),
};
