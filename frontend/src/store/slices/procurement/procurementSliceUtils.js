import { normalizePagedPayload } from "../inventory/inventorySliceHelpers";
import { getApiErrorMessage } from "../../../utils/apiError";

export const createProcurementInitialState = (filters = {}) => ({
  list: [],
  loading: false,
  detailLoading: false,
  detailError: null,
  error: null,
  pageNumber: 1,
  pageSize: 20,
  totalCount: 0,
  totalPages: 1,
  filters,
  selected: null,
});

export const setListPending = (state) => {
  state.loading = true;
  state.error = null;
};

export const setListFulfilled = (state, action) => {
  const page = normalizePagedPayload(action.payload.data);
  state.loading = false;
  state.list = page.items;
  state.pageNumber = page.pageNumber;
  state.pageSize = page.pageSize;
  state.totalCount = page.totalCount;
  state.totalPages = page.totalPages;
};

export const setListRejected = (state, action) => {
  state.loading = false;
  state.error = action.payload ?? action.error.message;
};

export const setDetailPending = (state) => {
  state.detailLoading = true;
  state.detailError = null;
};

export const extractProcurementEntity = (payload, keys = []) => {
  for (const key of keys) {
    if (payload?.[key] !== undefined) {
      return payload[key];
    }
  }

  return payload?.item ?? payload?.record ?? payload;
};

export const setDetailFulfilled = (...keys) => (state, action) => {
  state.detailLoading = false;
  state.selected = extractProcurementEntity(action.payload.data, keys);
};

export const setDetailRejected = (state, action) => {
  state.detailLoading = false;
  state.detailError = action.payload ?? action.error.message;
};

export const setPageSize = (state, action) => {
  const value = Number(action.payload);
  state.pageSize = Number.isFinite(value)
    ? Math.min(200, Math.max(1, Math.trunc(value)))
    : 20;
  state.pageNumber = 1;
};

export const getProcurementThunkError = (error, fallback) => {
  return getApiErrorMessage(error, fallback);
};
