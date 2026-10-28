import {
  getApiErrorMessage,
  getApiFieldErrors,
  getApiStatus,
  isConflictError,
  isValidationError,
} from "./apiError";

const normalizeFieldName = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\[(\d+)\]/g, ".$1")
    .replace(/^[^.]+\./, (prefix) =>
      ["model.", "payload.", "request."].includes(prefix.toLowerCase())
        ? ""
        : prefix,
    )
    .replace(/^[A-Z]/, (letter) => letter.toLowerCase());

const createAliasMap = (fieldAliases) => {
  const aliases = new Map();

  Object.entries(fieldAliases ?? {}).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];

    values.filter(Boolean).forEach((alias) => {
      aliases.set(normalizeFieldName(key).toLowerCase(), normalizeFieldName(alias));
      aliases.set(normalizeFieldName(alias).toLowerCase(), normalizeFieldName(key));
    });
  });

  return aliases;
};

const getResponseData = (error) =>
  error?.apiError ?? error?.response?.data ?? error?.data ?? null;

const getConflictFieldError = (error) => {
  const data = getResponseData(error);
  const nested = data?.data && typeof data.data === "object" ? data.data : null;
  const field = data?.field ?? data?.fieldName ?? nested?.field ?? nested?.fieldName;

  if (!field) return null;

  return [normalizeFieldName(field), getApiErrorMessage(error)];
};

export const applyApiErrorsToForm = ({
  error,
  fieldAliases = {},
  formFieldNames = [],
  globalField = "root.server",
  setError,
}) => {
  if (typeof setError !== "function") {
    throw new TypeError("applyApiErrorsToForm requires a setError function.");
  }

  const status = getApiStatus(error);
  const wasValidation = isValidationError(error);
  const wasConflict = isConflictError(error);
  const availableFields = new Map(
    formFieldNames.map((name) => [normalizeFieldName(name).toLowerCase(), name]),
  );
  const aliases = createAliasMap(fieldAliases);
  const fieldEntries = Object.entries(getApiFieldErrors(error));
  const conflictEntry = wasConflict ? getConflictFieldError(error) : null;

  if (conflictEntry && !fieldEntries.some(([name]) => name === conflictEntry[0])) {
    fieldEntries.push(conflictEntry);
  }

  const boundFields = [];
  const unboundMessages = [];

  fieldEntries.forEach(([rawName, message]) => {
    const normalizedName = normalizeFieldName(rawName);
    const directName = availableFields.get(normalizedName.toLowerCase());
    const aliasName = aliases.get(normalizedName.toLowerCase());
    const resolvedName =
      directName ?? availableFields.get(normalizeFieldName(aliasName).toLowerCase());

    if (!resolvedName) {
      unboundMessages.push(message);
      return;
    }

    setError(
      resolvedName,
      { message, type: "server" },
      { shouldFocus: boundFields.length === 0 },
    );
    boundFields.push(resolvedName);
  });

  const fallbackMessage = getApiErrorMessage(error);
  const globalMessages = [...new Set(unboundMessages)];

  if (boundFields.length === 0 || wasConflict || (!wasValidation && status)) {
    if (fallbackMessage && !globalMessages.includes(fallbackMessage)) {
      globalMessages.unshift(fallbackMessage);
    }
  }

  if (globalMessages.length > 0) {
    setError(globalField, {
      message: globalMessages.join(" "),
      type: "server",
    });
  }

  return {
    boundFields,
    status,
    unboundMessages,
    wasConflict,
    wasValidation,
  };
};

export default applyApiErrorsToForm;
