import api from "../../api/axios";
import { ENDPOINTS as E } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";
import { registrationPayload, vehiclePayload } from "../../utils/gstCompliance";

const pick = (value, keys) => Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]]));
const listKeys = ["Search", "PageNumber", "PageSize", "SortBy", "SortDirection"];
const read = async (url, options) => unwrapResponse(await api.get(url, { timeout: 90000, ...options }));
// No retry policy: provider mutations must never be replayed automatically here.
const post = async (url, body) => unwrapResponse(await api.post(url, body, { timeout: 90000 }));
const cancelKeys = ["companyGstRegistrationId", "cancelReasonCode", "cancelRemark"];

export const gstService = {
  configuration: options => read(E.GST_CONFIG_STATUS, options),
  registrations: (query = {}, options = {}) => read(E.GST_REGISTRATIONS, { ...options, params: normalizeParams(pick(query, [...listKeys, "CompanyId", "BranchId", "StateCode", "Status"])) }),
  registration: id => read(E.GST_REGISTRATION(id)),
  saveRegistration: async (id, values) => unwrapResponse(await (id
    ? api.put(E.GST_REGISTRATION(id), registrationPayload(values))
    : api.post(E.GST_REGISTRATIONS, registrationPayload(values)))),
  deleteRegistration: async id => unwrapResponse(await api.delete(E.GST_REGISTRATION(id))),
  verifyRegistration: id => post(E.GST_REGISTRATION_VERIFY(id)),
  defaultRegistration: (id, companyId) => post(E.GST_REGISTRATION_DEFAULT(id), { companyId: companyId ?? null }),
  logs: (query = {}, options = {}) => read(E.GST_API_LOGS, { ...options, params: normalizeParams(pick(query, [...listKeys, "CompanyGstRegistrationId", "ApiType", "IsSuccess", "FromDate", "ToDate"])) }),
  verifyGstin: gstin => post(E.GST_VERIFY_GSTIN, { gstin: gstin.trim().toUpperCase(), forceRefresh: false }),
  session: id => read(E.GST_SESSION_STATUS(id)),
  invoice: irn => read(E.GST_EINVOICE(irn)),
  wayBill: number => read(E.GST_EWAY(number)),
  refreshInvoice: values => post(E.GST_EINVOICE_DETAILS, pick(values, ["companyGstRegistrationId", "irn", "sellerGstin", "irp"])),
  refreshWayBill: values => post(E.GST_EWAY_DETAILS, pick(values, ["companyGstRegistrationId", "eWayBillNumber"])),
  cancelInvoice: values => post(E.GST_EINVOICE_CANCEL, pick(values, [...cancelKeys, "irn"])),
  cancelWayBill: values => post(E.GST_EWAY_CANCEL, pick(values, [...cancelKeys, "eWayBillNumber"])),
  updateVehicle: values => post(E.GST_EWAY_VEHICLE, vehiclePayload(values)),
};
