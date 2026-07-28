import { normalizePagedPayload } from "../inventory/inventorySliceHelpers";
import { getApiErrorMessage } from "../../../utils/apiError";
import {
  clampSupplyChainPageSize,
  DEFAULT_SUPPLY_CHAIN_PAGE_SIZE,
} from "../../../utils/supplyChainQuery";

export const createSupplyChainListState = (filters = {}) => ({
  error: null,
  filters,
  list: [],
  listRequestId: null,
  loading: false,
  pageNumber: 1,
  pageSize: DEFAULT_SUPPLY_CHAIN_PAGE_SIZE,
  summary: null,
  summaryScope: "current-page",
  totalCount: 0,
  totalPages: 1,
});

export const getSupplyChainThunkError = (error, fallback) =>
  getApiErrorMessage(error, fallback);

export const addSupplyChainListCases = (builder, thunk) => {
  builder
    .addCase(thunk.pending, (state, action) => {
      state.loading = true;
      state.error = null;
      state.listRequestId = action.meta.requestId;
    })
    .addCase(thunk.fulfilled, (state, action) => {
      if (state.listRequestId !== action.meta.requestId) {
        return;
      }

      const page = normalizePagedPayload(action.payload.data);
      state.loading = false;
      state.list = page.items;
      state.pageNumber = page.pageNumber;
      state.pageSize = page.pageSize;
      state.totalCount = page.totalCount;
      state.totalPages = page.totalPages;
      state.summary = page.summary;
      state.summaryScope = page.summaryScope;
      state.listRequestId = null;
    })
    .addCase(thunk.rejected, (state, action) => {
      if (state.listRequestId !== action.meta.requestId) {
        return;
      }

      state.loading = false;
      state.list = [];
      state.error = action.payload ?? action.error.message;
      state.listRequestId = null;
    });
};

export const setSupplyChainFilters = (state, action) => {
  state.filters = { ...state.filters, ...action.payload };
  state.pageNumber = 1;
};

export const setSupplyChainPage = (state, action) => {
  state.pageNumber = Math.max(1, Math.trunc(Number(action.payload) || 1));
};

export const setSupplyChainPageSize = (state, action) => {
  state.pageSize = clampSupplyChainPageSize(action.payload);
  state.pageNumber = 1;
};
