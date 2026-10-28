import api from "./manufacturing/productionApi";
import { ENDPOINTS } from "../api/endpoints";
import { normalizeParams, unwrapResponse } from "./apiServiceUtils";

const read = async (url, params, { signal } = {}) => unwrapResponse(await api.get(url, { params: normalizeParams(params), signal }));
// Opt-in exact reads for the document editors; existing Item/Unit/GST CRUD stays shared.
export const documentLookupService = {
  items: (params, options) => read(ENDPOINTS.ITEMS, params, options),
  item: (id, options) => read(ENDPOINTS.ITEM_BY_ID(id), {}, options),
  units: (params, options) => read(ENDPOINTS.UNITS, params, options),
  registrations: (params, options) => read(ENDPOINTS.GST_REGISTRATIONS, params, options),
};
