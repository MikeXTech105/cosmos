import api from "./productionApi";
import axiosInstance from "../../api/axios";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";
import { decimalWire, idWire } from "../../utils/productionValues";
import { normalizeProductionRead } from "../../utils/productionSummary";

const root = "/api/v1/manufacturing";
const read = async (path, params = {}, signal) => {
  const result = unwrapResponse(await api.get(path, { params: normalizeParams(params), signal }));
  return { ...result, data: normalizeProductionRead(result.data) };
};
const post = async (path, body) => unwrapResponse(await api.post(path, body));
export const productionWorkspaceService = {
  plan: body => post(`${root}/planning/finished`, { ...body, channelId: body.channelId ? idWire(body.channelId) : null, itemIds: body.itemIds?.map(idWire) ?? null }),
  snapshot: (id, query, signal) => read(`${root}/planning/snapshots/${id}`, query, signal),
  demand: (query, signal) => read(`${root}/planning/demand-observations`, query, signal),
  observe: body => post(`${root}/planning/demand-observations`, { ...body, itemId: idWire(body.itemId), unitId: idWire(body.unitId), channelId: body.channelId ? idWire(body.channelId) : null, sourceQuantity: decimalWire(body.sourceQuantity) }),
  materials: (snapshotId, outputs) => post(`${root}/planning/materials`, { snapshotId, outputs: outputs.map(row => ({ itemId: idWire(row.itemId), quantity: decimalWire(row.quantity, { positive: true }) })) }),
  items: (query, signal) => read("/api/items", query, signal),
  units: (query, signal) => read("/api/units", query, signal),
  channels: (query, signal) => read("/api/v1/supply-chain/channels", query, signal),
  packaging: (query, signal) => read("/api/v1/supply-chain/packaging-profiles", query, signal),
  stage: body => post(`${root}/imports/stage`, body),
  preview: (id, query, signal) => read(`${root}/imports/${id}/preview`, query, signal),
  map: (id, body) => post(`${root}/imports/${id}/map`, { ...body, rowId: idWire(body.rowId), itemId: body.itemId ? idWire(body.itemId) : null, sourceUnitId: body.sourceUnitId ? idWire(body.sourceUnitId) : null, channelId: body.channelId ? idWire(body.channelId) : null, packagingProfileId: body.packagingProfileId ? idWire(body.packagingProfileId) : null, purchaseOrderLineId: body.purchaseOrderLineId ? idWire(body.purchaseOrderLineId) : null, sourceQuantity: body.sourceQuantity === "" || body.sourceQuantity == null ? null : decimalWire(body.sourceQuantity, { scale: 12, nonNegative: false }), sourceUnitCost: body.sourceUnitCost === "" || body.sourceUnitCost == null ? null : decimalWire(body.sourceUnitCost, { scale: 6 }) }),
  importAction: (id, action, body) => post(`${root}/imports/${id}/${action}`, { ...body, rowIds: body.rowIds.map(idWire) }),
  stock: (id, signal) => read(`/api/items/${id}/stock-balance`, {}, signal),
  adjust: (id, body) => post(`/api/items/${id}/stock-adjustments`, { ...body, unitId: idWire(body.unitId), signedQuantity: decimalWire(body.signedQuantity, { nonNegative: false }) }),
  report: (kind, query, signal) => read(`${root}/reports/operational/${kind}`, query, signal),
  exportReport: async (kind, query, format = "ndjson") => {
    try { return await axiosInstance.get(`${root}/reports/operational/${kind}/export`, { params: normalizeParams({ ...query, format }), responseType: "blob" }); }
    catch (error) { if (error.response?.data instanceof Blob) { try { error.response.data = JSON.parse(await error.response.data.text()); } catch { /* Keep the original network/status error when the response is not JSON. */ } } throw error; }
  },
};
