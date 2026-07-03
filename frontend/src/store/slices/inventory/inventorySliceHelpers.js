import {
  clampInventoryPageSize,
  DEFAULT_INVENTORY_PAGE_SIZE,
} from "../../../utils/inventoryQuery";
import { getApiErrorMessage } from "../../../utils/apiError";

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
  };
};

export const extractEntity = (payload, key) => {
  return payload?.[key] ?? payload?.item ?? payload?.record ?? payload;
};
