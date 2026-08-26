import { ACTIVITY_LOG_STATUS_TONES } from "../constants/activityLogConstants";

export const ACTIVITY_EMPTY_VALUE = "—";
export const ACTIVITY_VALUE_UNAVAILABLE = "Not available for this record";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const getActivityActor = (activity = {}) => {
  const displayName = String(activity?.userDisplayName ?? "").trim();
  const username = String(activity?.username ?? "").trim();

  if (!displayName && !username) {
    return {
      isSystem: true,
      primary: "System",
      secondary: "",
    };
  }

  return {
    isSystem: false,
    primary: displayName || username,
    secondary: displayName && username ? username : "",
  };
};

export const getActivityStatusTone = (statusCode) => {
  if (statusCode === null || statusCode === undefined || statusCode === "") {
    return ACTIVITY_LOG_STATUS_TONES.unknown;
  }

  const numericStatus = Number(statusCode);
  if (!Number.isFinite(numericStatus)) return ACTIVITY_LOG_STATUS_TONES.unknown;
  if (numericStatus >= 200 && numericStatus < 300) {
    return ACTIVITY_LOG_STATUS_TONES.success;
  }
  if (numericStatus >= 400 && numericStatus < 500) {
    return ACTIVITY_LOG_STATUS_TONES.clientError;
  }
  if (numericStatus >= 500 && numericStatus < 600) {
    return ACTIVITY_LOG_STATUS_TONES.serverError;
  }
  return ACTIVITY_LOG_STATUS_TONES.unknown;
};

const stringifyValue = (value) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
};

export const parseActivitySnapshot = (value) => {
  if (value === null || value === undefined || value === "") {
    return { kind: "unavailable", raw: "", value: null };
  }

  if (isPlainObject(value)) {
    return { kind: "object", raw: stringifyValue(value), value };
  }

  if (typeof value !== "string") {
    const raw = stringifyValue(value);
    return raw
      ? { kind: "text", raw, value: raw }
      : { kind: "unavailable", raw: "", value: null };
  }

  const text = value.trim();
  if (!text) return { kind: "unavailable", raw: "", value: null };

  const looksLikeJson = /^[{[]/.test(text) || /^"/.test(text);
  if (!looksLikeJson) {
    return { kind: "text", raw: text, value: text };
  }

  try {
    const parsed = JSON.parse(text);

    if (isPlainObject(parsed)) {
      return { kind: "object", raw: stringifyValue(parsed), value: parsed };
    }

    if (typeof parsed === "string") {
      return { kind: "text", raw: text, value: parsed };
    }

    const raw = stringifyValue(parsed);
    return raw
      ? { kind: "text", raw, value: raw }
      : { kind: "unavailable", raw: "", value: null };
  } catch {
    return { kind: "unavailable", raw: "", value: null };
  }
};

const findSnapshotKey = (snapshot, field) => {
  if (snapshot?.kind !== "object") return undefined;
  const fieldKey = String(field ?? "").toLowerCase();

  return Object.keys(snapshot.value).find(
    (key) => key.toLowerCase() === fieldKey,
  );
};

export const getActivitySnapshotValue = (snapshot, field) => {
  const key = findSnapshotKey(snapshot, field);
  if (key === undefined) return undefined;
  return snapshot.value[key];
};

export const formatActivitySnapshotValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return ACTIVITY_EMPTY_VALUE;
  }
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";

  return stringifyValue(value) || ACTIVITY_EMPTY_VALUE;
};

export const getActivityDiffFields = (changedFields, before, after) => {
  const declaredFields = Array.isArray(changedFields)
    ? changedFields.map((field) => String(field ?? "").trim()).filter(Boolean)
    : [];
  const inferredFields = [before, after]
    .filter((snapshot) => snapshot?.kind === "object")
    .flatMap((snapshot) => Object.keys(snapshot.value));
  const candidates = declaredFields.length > 0 ? declaredFields : inferredFields;
  const seen = new Set();

  return candidates.filter((field) => {
    const key = field.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const formatActivityTimestamp = (value) => {
  if (!value) return ACTIVITY_EMPTY_VALUE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return ACTIVITY_EMPTY_VALUE;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
    minute: "2-digit",
    month: "short",
    second: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replace(" at ", ", ");
};

export const getActivityEntityLabel = (activity = {}) => {
  const displayValue = String(activity?.entityDisplayValue ?? "").trim();
  if (displayValue) return displayValue;

  const entityType = String(activity?.entityType ?? "").trim();
  const entityId = String(activity?.entityId ?? "").trim();
  if (entityType && entityId) return `${entityType} #${entityId}`;
  if (entityType) return entityType;
  if (entityId) return `#${entityId}`;
  return ACTIVITY_EMPTY_VALUE;
};

export const formatRelativeActivityTime = (value, now = Date.now()) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return ACTIVITY_EMPTY_VALUE;

  const difference = Math.max(0, now - timestamp);
  const minutes = Math.floor(difference / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};
