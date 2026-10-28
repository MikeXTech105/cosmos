import { getApiCorrelationId, getApiErrorList, getApiErrorMessage, getApiFieldErrors, getApiStatus } from "./apiError";

const text = (value, max = 2000) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
const metadata = value => typeof value === "string" && /^[A-Za-z0-9_.:-]{1,200}$/.test(value) ? value : null;
const fieldPath = value => typeof value === "string" && /^[A-Za-z_][A-Za-z0-9_.[\]-]{0,399}$/.test(value) ? value : null;

/** A serializable, explicitly selected error contract for Redux mutation unwrap; never copies Axios/request/config/headers. */
export function toSerializableFormError(error, fallback) {
  const rawStatus = getApiStatus(error);
  const status = Number.isInteger(rawStatus) && rawStatus >= 100 && rawStatus <= 599 ? rawStatus : null;
  const message = text(getApiErrorMessage(error, fallback)) ?? text(fallback) ?? "Unable to save. Please review and try again.";
  const fieldErrors = Object.fromEntries(Object.entries(getApiFieldErrors(error)).flatMap(([field, value]) => fieldPath(field) && text(value) ? [[field, text(value)]] : []));
  const data = error?.apiError ?? error?.response?.data ?? error?.data;
  const nested = data?.data && typeof data.data === "object" ? data.data : null;
  const correlationId = metadata(getApiCorrelationId(error) || error?.correlationId);
  const code = metadata(error?.code);
  const conflictField = fieldPath(data?.field ?? data?.fieldName ?? nested?.field ?? nested?.fieldName);
  const conflictCode = metadata(data?.conflictCode ?? nested?.conflictCode);
  const errors = Object.keys(fieldErrors).length ? fieldErrors : getApiErrorList(error).map(value => text(value)).filter(Boolean);
  const apiError = { message, errors, ...(correlationId ? { correlationId } : {}), ...(conflictField ? { field: conflictField } : {}), ...(conflictCode ? { conflictCode } : {}) };
  return {
    name: "FormRequestError", message, status, code, correlationId, fieldErrors, apiError,
    // Existing outcome guards distinguish a definite HTTP4xx failure from an unknown network result.
    ...(status ? { response: { status, data: apiError } } : {}),
  };
}
