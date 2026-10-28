import {
  clampInventoryPageSize,
  DEFAULT_INVENTORY_PAGE_SIZE,
} from "../../../utils/inventoryQuery";
import { getApiErrorMessage } from "../../../utils/apiError";
export { toSerializableFormError as getThunkFormError } from "../../../utils/thunkFormError";

export const getThunkError = (error, fallback) => {
  return getApiErrorMessage(error, fallback);
};

export const normalizePagedPayload = (payload) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      pageNumber: 1,
      pageSize: clampInventoryPageSize(payload.length),
      totalCount: payload.length,
      totalPages: 1,
      summary: null,
      summaryScope: "current-page",
    };
  }

  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    pageNumber: Number(payload?.pageNumber) || 1,
    pageSize: clampInventoryPageSize(
      payload?.pageSize,
      DEFAULT_INVENTORY_PAGE_SIZE,
    ),
    totalCount: Number(payload?.totalCount) || 0,
    totalPages: Number(payload?.totalPages) || 1,
    summary: payload?.summary ?? null,
    summaryScope: payload?.summary ? "all-matching" : "current-page",
  };
};

export const extractEntity = (payload, key) => {
  return payload?.[key] ?? payload?.item ?? payload?.record ?? payload;
};

export const getRequestEntityId = (arg) => {
  if (arg && typeof arg === "object") {
    return arg.id ?? arg.entityId ?? arg.recordId ?? null;
  }

  return arg ?? null;
};
