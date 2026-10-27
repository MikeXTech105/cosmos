import productionApi from "./productionApi";
import { decimalWire, idWire } from "../../utils/productionValues";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const decimalFields = new Set(["acceptedQuantity", "rejectedQuantity", "quarantinedQuantity", "sourceUnitCost", "quantity", "unitPrice", "taxPercentage", "leadTime"]);
const identityFields = new Set(["purchaseOrderLineId", "planningRunLineId", "itemId", "unitId", "receiptLineId", "billItemId", "invoiceLineId", "shipmentItemId", "packagingProfileId"]);
export const wirePhysicalPayload = (payload) => Object.fromEntries(Object.entries(payload).map(([key, value]) => [key,
  value === null || value === undefined ? value : key === "lines" ? value.map(wirePhysicalPayload) : decimalFields.has(key) ? decimalWire(value) : identityFields.has(key) ? idWire(value) : value,
]));
const get = async (url, params, options = {}) => unwrapResponse(await productionApi.get(url, { params: normalizeParams(params), signal: options.signal }));
const command = async (method, url, payload) => unwrapResponse(await productionApi[method](url, wirePhysicalPayload(payload)));
const orders = "/api/purchase-orders";
const procurement = "/api/v1/procurement-planning";
const shipments = "/api/v1/shipment-operations/shipments";

export const physicalInventoryService = {
  listOrders: (params, options) => get(orders, params, options),
  orderDetail: (id, options) => get(`${orders}/${id}`, {}, options),
  billDetail: (id, options) => get(`/api/purchase-bills/${id}`, {}, options),
  listInvoices: (params, options) => get("/api/v1/sales/invoices", params, options),
  invoiceDetail: (id, options) => get(`/api/v1/sales/invoices/${id}`, {}, options),
  shipmentDetail: (id, options) => get(`${shipments}/${id}`, {}, options),
  itemDetail: (id, options) => get(`/api/items/${id}`, {}, options),
  packagingProfiles: (params, options) => get("/api/v1/supply-chain/packaging-profiles", params, options),
  purchaseDraft: (id, payload) => command("post", `${procurement}/plans/runs/${id}/purchase-orders`, payload),
  purchaseSources: (id, options) => get(`${procurement}/plans/runs/${id}/purchase-orders`, {}, options),
  planningRunLines: (id, params, options) => get(`${procurement}/plans/runs/${id}/lines`, params, options),
  supplierPolicy: (id, options) => get(`${procurement}/items/${id}/supplier-policy`, {}, options),
  saveSupplierPolicy: (id, payload) => command("put", `${procurement}/items/${id}/supplier-policy`, payload),
  orderContext: (id, options) => get(`${orders}/${id}/receipt-context`, {}, options),
  billContext: (id, options) => get(`/api/purchase-bills/${id}/receipt-context`, {}, options),
  receiptContext: (id, options) => get(`${orders}/receipts/${id}`, {}, options),
  approveOrder: (id, payload) => command("post", `${orders}/${id}/approve`, payload),
  closeRemainder: (id, payload) => command("post", `${orders}/${id}/close-remainder`, payload),
  revisePromise: (id, payload) => command("post", `${orders}/${id}/promise`, payload),
  receive: (id, payload) => command("post", `${orders}/${id}/receipts`, payload),
  returnReceipt: (id, payload) => command("post", `${orders}/receipts/${id}/returns`, payload),
  creditReturn: (id, payload) => command("post", `${orders}/receipts/returns/${id}/credit`, payload),
  linkBill: (id, payload) => command("post", `/api/purchase-bills/${id}/receipt-links`, payload),
  followups: (params, options) => get(`${orders}/follow-ups`, params, options),
  supplierPerformance: (params, options) => get(`${orders}/supplier-performance`, params, options),
  invoiceOwnership: (id, options) => get(`/api/v1/sales/invoices/${id}/inventory-ownership`, {}, options),
  saveInvoiceOwnership: (id, payload) => command("put", `/api/v1/sales/invoices/${id}/inventory-ownership`, payload),
  shipmentLinks: (id, options) => get(`${shipments}/${id}/invoice-lines`, {}, options),
  packingContext: (id, options) => get(`${shipments}/${id}/packing-verification`, {}, options),
  saveShipmentLinks: (id, payload) => command("put", `${shipments}/${id}/invoice-lines`, payload),
  verifyPacking: (id, payload) => command("put", `${shipments}/${id}/packing-verification`, payload),
};
