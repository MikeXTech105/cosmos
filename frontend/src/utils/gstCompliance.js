import { getApiCorrelationId, getApiErrorMessage } from "./apiError";

export const GST_PAGES = [
  { key: "configuration", title: "GST overview", pageName: "GST.Configuration", route: "/gst/configuration" },
  { key: "registrations", title: "GST registrations", pageName: "GST.Registration", route: "/gst/registrations" },
  { key: "verification", title: "GSTIN verification", pageName: "GST.Verification", route: "/gst/verify-gstin" },
  { key: "invoices", title: "E-Invoice lookup", pageName: "GST.EInvoice", route: "/gst/e-invoices" },
  { key: "wayBills", title: "E-Way Bill lookup", pageName: "GST.EWayBill", route: "/gst/eway-bills" },
  { key: "sessions", title: "GST session status", pageName: "GST.Session", route: "/gst/sessions" },
  { key: "logs", title: "GST API logs", pageName: "GST.Logs", route: "/gst/api-logs" },
];
export const GENERATION_DEPENDENCY = "Generation is unavailable: the server needs validated invoice GST details and duplicate protection for existing government documents. Contact your administrator.";
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
// Validators accept more fields, but these are the columns actually sorted by SQL.
export const GST_REGISTRATION_SORTS = ["CreatedAt", "Gstin", "LegalName"];
export const GST_LOG_SORTS = ["CreatedAt", "ApiType"];

const registrationStrings = ["gstin", "legalName", "tradeName", "stateCode", "stateName", "branchName", "addressLine1", "addressLine2", "city", "district", "pincode", "addressJson", "gstPortalUsername", "status"];
export const registrationPayload = values => ({
  ...Object.fromEntries(registrationStrings.map(key => [key, key === "gstin" ? String(values[key] ?? "").trim().toUpperCase() : values[key] || null])),
  companyId: values.companyId ? Number(values.companyId) : null,
  branchId: values.branchId ? Number(values.branchId) : null,
  ...Object.fromEntries(["isEInvoiceEnabled", "isEWayBillEnabled", "isGstReturnEnabled", "isDefault"].map(key => [key, Boolean(values[key])])),
});

export const vehiclePayload = values => ({
  companyGstRegistrationId: values.companyGstRegistrationId,
  eWayBillNumber: values.eWayBillNumber,
  vehicleNumber: values.vehicleNumber.trim().toUpperCase(),
  vehicleType: values.vehicleType || null,
  transportMode: values.transportMode,
  requestJson: JSON.stringify({
    ewbNo: values.eWayBillNumber,
    FromPlace: values.fromPlace.trim(),
    FromState: values.fromState.trim(),
    ReasonCode: values.reasonCode.trim(),
    ReasonRem: values.reasonRemark.trim(),
    TransMode: values.transportMode,
    VehicleNo: values.vehicleNumber.trim().toUpperCase(),
  }),
});

// Only an explicit known active status permits a mutation. Unknown/Fetched is not active.
export const canChangeGstDocument = record => Boolean(record && !record.cancelledAt && ["generated", "active", "act", "a", "vehicleupdated", "extended"].includes(String(record.status).toLowerCase()));
export const canManageGstDocument = ({ stored, provider, identifier, kind, contextId, contextKey, reconciled, uncertain }) => {
  const key = kind === "invoice" ? "irn" : "eWayBillNumber";
  return Boolean(stored?.companyGstRegistrationId > 0
    && (!contextId || (Number.isSafeInteger(Number(contextId)) && Number(contextId) > 0))
    && (!contextId || String(stored[contextKey] ?? "") === String(contextId))
    && identifier.trim() === String(stored[key])
    && String(provider?.[key] ?? "") === String(stored[key])
    && reconciled && !uncertain
    && canChangeGstDocument(stored) && canChangeGstDocument(provider));
};
export const gstLogFilters = draft => {
  const filters = { ...draft, IsSuccess: draft.IsSuccess === "" ? "" : draft.IsSuccess === "true" };
  for (const key of ["FromDate", "ToDate"]) {
    if (!draft[key]) continue;
    const date = new Date(draft[key]);
    if (!Number.isFinite(date.getTime())) throw new Error("Enter valid filter dates.");
    filters[key] = date.toISOString();
  }
  if (filters.FromDate && filters.ToDate && filters.ToDate < filters.FromDate) throw new Error("To date must be on or after From date.");
  return filters;
};
export const safeQrImage = value => typeof value === "string" && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value) ? value : null;
export const gstError = error => {
  const message = getApiErrorMessage(error, "Unable to complete the GST request.");
  const correlationId = getApiCorrelationId(error);
  const reference = /^[a-z0-9-]{1,80}$/i.test(correlationId) ? ` Ref: ${correlationId}` : "";
  if (message.length > 300 || /[{}<>]|bearer\s|token|password|secret|payload|authorization|\b\d{10,}\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(message)) {
    return `GST request failed. Review the operation status and contact your administrator.${reference}`;
  }
  return reference && !message.includes(correlationId) ? `${message}${reference}` : message;
};
export const safeLogSummary = row => row.isSuccess ? "Completed" : row.statusCode === 408 || row.statusCode === 504 ? "Provider timeout; reconcile status before retrying" : row.statusCode >= 500 ? "Provider or server failure" : "Request rejected; review configuration and document details";
// GstApiLogs.CreatedAt is SQL DATETIME2 written using SYSUTCDATETIME().
export const gstLogTimestamp = value => {
  if (!value) return "—";
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Not supplied";
};

// Synchronous gate covers double-clicks before React can commit disabled state.
export const createOperationGate = () => {
  let busy = false;
  return async operation => {
    if (busy) return undefined;
    busy = true;
    try { return await operation(); } finally { busy = false; }
  };
};
