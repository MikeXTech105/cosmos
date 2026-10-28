import productionApi from "./productionApi";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";
import { decimalWire, idWire } from "../../utils/productionValues";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeOeeListParams } from "../oee/oeeServiceUtils";
import { sanitizeHrListParams } from "../hr/hrServiceUtils";
import { sanitizeInventoryListParams } from "../../utils/inventoryQuery";

const root = "/api/v1/manufacturing";
const decimalFields = new Set(["defaultRate", "rate", "setupMinutes", "quantityBasis", "skuOutputPerShot", "capacityFactor", "sourceQuantityBasis", "baseQuantityBasis"]);
const idFields = new Set(["defaultShiftId", "operationId", "workCentreId", "machineId", "mouldId", "shiftId", "sourceUnitId"]);
const wire = (payload) => Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, value === null ? null : Array.isArray(value) ? value.map(wire) : decimalFields.has(key) ? decimalWire(value) : idFields.has(key) ? idWire(value) : value]));
const get = async (path, params, signal) => unwrapResponse(await productionApi.get(path, { params: normalizeParams(params), signal }));
const post = async (path, payload) => unwrapResponse(await productionApi.post(path, wire(payload)));
const put = async (path, payload) => unwrapResponse(await productionApi.put(path, wire(payload)));

export const productionConfigurationService = {
  machines: (params = {}, { signal } = {}) => get(ENDPOINTS.OEE_MACHINES, sanitizeOeeListParams(params), signal),
  moulds: (params = {}, { signal } = {}) => get(ENDPOINTS.OEE_MOULDS, sanitizeOeeListParams(params), signal),
  hrShifts: (params = {}, { signal } = {}) => get(ENDPOINTS.HR_SHIFTS, sanitizeHrListParams(params), signal),
  units: (params = {}, { signal } = {}) => get(ENDPOINTS.UNITS, sanitizeInventoryListParams(params), signal),
  listMasters: (kind, params = {}, { signal } = {}) => get(`${root}/${kind}`, params, signal),
  saveMaster: (kind, id, payload) => id ? put(`${root}/${kind}/${id}`, payload) : post(`${root}/${kind}`, payload),
  itemConfiguration: (id, { signal } = {}) => get(`${root}/items/${id}/configuration`, {}, signal),
  shifts: (id, { signal } = {}) => get(`${root}/work-centres/${id}/shifts`, {}, signal),
  createRouting: (id, payload) => post(`${root}/items/${id}/routings`, payload),
  createEligibility: (id, payload) => post(`${root}/items/${id}/eligibility`, payload),
  createShift: (id, payload) => post(`${root}/work-centres/${id}/shifts`, payload),
  calendar: (id, payload) => put(`${root}/shift-capacity/${id}/calendar`, payload),
  calendarContext: (id, businessDate, { signal } = {}) => get(`${root}/shift-capacity/${id}/calendar`, { businessDate }, signal),
  closeEffectivity: (kind, id, payload) => post(`${root}/configuration/${kind}/${id}/effectivity`, payload),
  packagingConversion: (id, { signal } = {}) => get(`/api/v1/supply-chain/packaging-profiles/${id}/conversion`, {}, signal),
  savePackagingConversion: (id, payload) => put(`/api/v1/supply-chain/packaging-profiles/${id}/conversion`, payload),
};
