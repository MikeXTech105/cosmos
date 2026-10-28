import productionApi from "./productionApi";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";
import { decimalWire, idWire } from "../../utils/productionValues";

const base = "/api/v1/manufacturing/orders";
const decimalFields = new Set(["plannedQuantity", "quantity", "releasedQuantity", "goodOutput", "rejectedOutput", "consumedQuantity", "scrapQuantity", "returnedQuantity"]);
const idFields = new Set(["itemId", "bomId", "routingId", "machineId", "mouldId", "shiftId", "unitId", "channelId", "routingStepId"]);
export const orderWirePayload = (value) => Array.isArray(value) ? value.map(orderWirePayload) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, entry === null || entry === undefined ? entry : decimalFields.has(key) ? decimalWire(entry) : idFields.has(key) ? idWire(entry) : orderWirePayload(entry)])) : value;
const read = async (url, params, signal) => unwrapResponse(await productionApi.get(url, { params: normalizeParams(params), signal }));
const post = async (url, payload) => unwrapResponse(await productionApi.post(url, orderWirePayload(payload)));

export const productionOrderService = {
  items: (params = {}, { signal } = {}) => read(ENDPOINTS.ITEMS, params, signal),
  item: (id, { signal } = {}) => read(ENDPOINTS.ITEM_BY_ID(id), {}, signal),
  machines: (params = {}, { signal } = {}) => read(ENDPOINTS.OEE_MACHINES, params, signal),
  moulds: (params = {}, { signal } = {}) => read(ENDPOINTS.OEE_MOULDS, params, signal),
  shifts: (params = {}, { signal } = {}) => read(ENDPOINTS.HR_SHIFTS, params, signal),
  channels: (params = {}, { signal } = {}) => read(ENDPOINTS.SC_CHANNELS, params, signal),
  list: (params = {}, { signal } = {}) => read(base, params, signal),
  getById: (id, { signal } = {}) => read(`${base}/${id}`, {}, signal),
  context: (id, { signal } = {}) => read(`${base}/${id}/context`, {}, signal),
  labels: (id, { signal } = {}) => read(`${base}/${id}/labels`, {}, signal),
  create: (payload) => post(base, payload),
  update: async (id, payload) => unwrapResponse(await productionApi.put(`${base}/${id}`, orderWirePayload(payload))),
  release: (id, payload) => post(`${base}/${id}/release`, payload),
  complete: (id, payload) => post(`${base}/${id}/completions`, payload),
  amend: (id, payload) => post(`${base}/${id}/amend`, payload),
  close: (id, payload) => post(`${base}/${id}/close`, payload),
  cancel: (id, payload) => post(`${base}/${id}/cancel`, payload),
  reverseCompletion: (completionId, payload) => post(`${base}/completions/${completionId}/reverse`, payload),
  capacity: (id, businessDate, { signal } = {}) => read(`${base}/${id}/capacity`, { businessDate }, signal),
  schedule: (id, payload) => post(`${base}/${id}/schedule`, payload),
  configuration: (itemId, { signal } = {}) => read(`/api/v1/manufacturing/items/${itemId}/configuration`, {}, signal),
  workCentreShifts: (id, { signal } = {}) => read(`/api/v1/manufacturing/work-centres/${id}/shifts`, {}, signal),
  applicableBom: (itemId, businessDate, { signal } = {}) => read(ENDPOINTS.MANUFACTURING_BOM_APPLICABLE, { finishedItemId: itemId, asOfDate: businessDate }, signal),
  bom: (id, { signal } = {}) => read(ENDPOINTS.MANUFACTURING_BOM_BY_ID(id), {}, signal),
};

export default productionOrderService;
