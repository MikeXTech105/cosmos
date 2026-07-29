const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";
const GENERIC_MESSAGES = new Set([
  "validation failed",
  "one or more validation errors occurred.",
  "one or more validation errors occurred",
  "an error occurred",
  "bad request",
  "forbidden",
  "internal server error",
  "request failed",
  "unauthorized",
]);

const isPlainObject = (value) => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
};

const normalizeMessage = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
};

const uniqueMessages = (messages) => {
  const seen = new Set();

  return messages
    .map(normalizeMessage)
    .filter(Boolean)
    .filter((message) => {
      const key = message.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
};

const flattenErrorValue = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap(flattenErrorValue);
  }

  if (isPlainObject(value)) {
    return Object.values(value).flatMap(flattenErrorValue);
  }

  const message = normalizeMessage(value);

  return message ? [message] : [];
};

const getResponseData = (error) => {
  if (typeof error === "string") {
    return null;
  }

  return (
    error?.apiError ??
    error?.response?.data ??
    error?.data ??
    null
  );
};

const getNestedData = (data) => {
  if (isPlainObject(data?.data)) {
    return data.data;
  }

  return null;
};

const getStatus = (error, data) => {
  return Number(
    error?.response?.status ??
      error?.status ??
      data?.status ??
      getNestedData(data)?.status,
  );
};

const isGenericMessage = (message) => {
  return GENERIC_MESSAGES.has(message.trim().toLowerCase());
};

const getMessageFromData = (data) => {
  if (!isPlainObject(data)) {
    return "";
  }

  return (
    normalizeMessage(data.message) ||
    normalizeMessage(data.error) ||
    normalizeMessage(getNestedData(data)?.message) ||
    normalizeMessage(getNestedData(data)?.error)
  );
};

const getTitleFromData = (data) => {
  if (!isPlainObject(data)) {
    return "";
  }

  return normalizeMessage(data.title) || normalizeMessage(getNestedData(data)?.title);
};

const getCorrelationIdFromData = (data) => {
  if (!isPlainObject(data)) {
    return "";
  }

  return (
    normalizeMessage(data.correlationId) ||
    normalizeMessage(data.traceId) ||
    normalizeMessage(getNestedData(data)?.correlationId) ||
    normalizeMessage(getNestedData(data)?.traceId)
  );
};

const getStatusMessage = (status, correlationId) => {
  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You don't have permission to do this.";
  }

  if (status >= 500) {
    return correlationId
      ? `Server error - please try again. Ref: ${correlationId}`
      : "Server error - please try again.";
  }

  return "";
};

const isTimeoutError = (error) => {
  const code = normalizeMessage(error?.code).toLowerCase();
  const message = normalizeMessage(error?.message).toLowerCase();

  return code === "econnaborted" || message.includes("timeout");
};

const isNetworkError = (error) => {
  const message = normalizeMessage(error?.message).toLowerCase();

  return (
    !error?.response &&
    (message === "network error" ||
      message.includes("failed to fetch") ||
      message.includes("network"))
  );
};

export const getApiErrorList = (error) => {
  if (typeof error === "string") {
    return error.trim() ? [error.trim()] : [];
  }

  const data = getResponseData(error);
  const nestedData = getNestedData(data);
  const messages = [
    ...flattenErrorValue(data?.errors),
    ...flattenErrorValue(nestedData?.errors),
  ];

  return uniqueMessages(messages);
};

const normalizeFieldPath = (key) => {
  const segments = String(key ?? "")
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  if (["model", "payload", "request"].includes(segments[0]?.toLowerCase())) {
    segments.shift();
  }

  return segments
    .map((segment) =>
      /^\d+$/.test(segment)
        ? segment
        : `${segment.charAt(0).toLowerCase()}${segment.slice(1)}`,
    )
    .join(".");
};

const getErrorMapCandidates = (error) => [
  error?.apiError?.errors,
  error?.response?.data?.errors,
  error?.response?.data?.data?.errors,
  error?.data?.errors,
  error?.data?.data?.errors,
  error?.errors,
];

export const getApiStatus = (error) => {
  return getStatus(error, getResponseData(error));
};

export const getApiFieldErrors = (error) => {
  const source = getErrorMapCandidates(error).find(isPlainObject);

  if (!source) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(source)
      .map(([key, value]) => {
        const fieldPath = normalizeFieldPath(key);
        const message = uniqueMessages(flattenErrorValue(value)).join(" ");

        return fieldPath && message ? [fieldPath, message] : null;
      })
      .filter(Boolean),
  );
};

export const getApiCorrelationId = (error) => {
  return getCorrelationIdFromData(getResponseData(error));
};

export const isConflictError = (error) => getApiStatus(error) === 409;

export const isValidationError = (error) =>
  [400, 422].includes(getApiStatus(error));

export const isNotFoundError = (error) => getApiStatus(error) === 404;

export const getApiErrorMessage = (error, fallback = DEFAULT_ERROR_MESSAGE) => {
  const data = getResponseData(error);
  const status = getStatus(error, data);
  const correlationId = getCorrelationIdFromData(data);
  const withConflictReference = (message) =>
    status === 409 &&
    correlationId &&
    !message.includes(correlationId)
      ? `${message}\nReference: ${correlationId}`
      : message;
  const details = getApiErrorList(error);

  if (details.length > 0) {
    return withConflictReference(details.join("\n"));
  }

  if (isTimeoutError(error)) {
    return "Request timed out.";
  }

  if (isNetworkError(error)) {
    return "Network error - please check your connection.";
  }

  const message = getMessageFromData(data);

  if (message && !isGenericMessage(message)) {
    return withConflictReference(message);
  }

  const statusMessage = getStatusMessage(status, correlationId);

  if (statusMessage) {
    return statusMessage;
  }

  const title = getTitleFromData(data);

  if (title && !isGenericMessage(title)) {
    return withConflictReference(title);
  }

  const statusText = normalizeMessage(error?.response?.statusText);

  if (statusText && !isGenericMessage(statusText)) {
    return withConflictReference(statusText);
  }

  const errorMessage = normalizeMessage(error?.message);

  if (
    errorMessage &&
    !isGenericMessage(errorMessage) &&
    !/^request failed with status code \d+$/i.test(errorMessage)
  ) {
    return withConflictReference(errorMessage);
  }

  return withConflictReference(fallback || DEFAULT_ERROR_MESSAGE);
};

export const createApiError = (data, response) => {
  const error = new Error(
    getApiErrorMessage({
      response: {
        data,
        status: response?.status,
        statusText: response?.statusText,
      },
    }),
  );

  error.name = "ApiError";
  error.apiError = data;
  error.response = {
    data,
    headers: response?.headers,
    status: response?.status,
    statusText: response?.statusText,
  };

  return error;
};
