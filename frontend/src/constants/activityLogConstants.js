export const ACTIVITY_LOG_SORT_FIELDS = Object.freeze([
  "TimestampUtc",
  "Username",
  "Module",
  "Action",
  "EntityType",
  "EntityId",
  "HttpStatusCode",
]);

export const ACTIVITY_LOG_SORT_DIRECTIONS = Object.freeze(["asc", "desc"]);

export const ACTIVITY_LOG_SECURITY_ACTIONS = Object.freeze([
  "LoginFailed",
  "PasswordChanged",
  "PasswordReset",
  "Logout",
  "LoginSucceeded",
]);

export const ACTIVITY_LOG_STATUS_TONES = Object.freeze({
  clientError: "warning",
  serverError: "danger",
  success: "success",
  unknown: "neutral",
});

export const DEFAULT_ACTIVITY_LOG_PAGE_SIZE = 50;
export const MAX_ACTIVITY_LOG_PAGE_SIZE = 200;
export const ACTIVITY_LOG_EXPORT_LIMIT = 50000;

