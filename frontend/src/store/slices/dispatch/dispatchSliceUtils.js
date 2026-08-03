import { getApiErrorMessage } from "../../../utils/apiError";
import {
  clampDispatchPageSize,
  DEFAULT_DISPATCH_PAGE_SIZE,
} from "../../../utils/dispatchQuery";

export const createDispatchListState = (filters = {}) => ({
  error: null,
  filters,
  list: [],
  listRequestId: null,
  loading: false,
  pageNumber: 1,
  pageSize: DEFAULT_DISPATCH_PAGE_SIZE,
  summary: null,
  totalCount: 0,
  totalPages: 1,
});

export const addDispatchListCases = (builder, thunk) => {
  builder
    .addCase(thunk.pending, (state, action) => {
      state.error = null;
      state.loading = true;
      state.listRequestId = action.meta.requestId;
    })
    .addCase(thunk.fulfilled, (state, action) => {
      if (state.listRequestId !== action.meta.requestId) return;

      const page = action.payload.data ?? {};
      state.error = null;
      state.list = Array.isArray(page.items) ? page.items : [];
      state.loading = false;
      state.pageNumber = Number(page.pageNumber) || 1;
      state.pageSize = clampDispatchPageSize(page.pageSize);
      state.summary = page.summary ?? null;
      state.totalCount = Number(page.totalCount) || 0;
      state.totalPages = Number(page.totalPages) || 1;
      state.listRequestId = null;
    })
    .addCase(thunk.rejected, (state, action) => {
      if (state.listRequestId !== action.meta.requestId) return;

      state.error = action.payload ?? action.error.message;
      state.list = [];
      state.loading = false;
      state.listRequestId = null;
    });
};

export const rejectDispatchThunk = (error, rejectWithValue, fallback) =>
  rejectWithValue(getApiErrorMessage(error, fallback));

export const setDispatchFilters = (state, action) => {
  state.filters = { ...state.filters, ...action.payload };
  state.pageNumber = 1;
};

export const setDispatchPage = (state, action) => {
  state.pageNumber = Math.max(1, Math.trunc(Number(action.payload) || 1));
};

export const setDispatchPageSize = (state, action) => {
  state.pageSize = clampDispatchPageSize(action.payload);
  state.pageNumber = 1;
};
