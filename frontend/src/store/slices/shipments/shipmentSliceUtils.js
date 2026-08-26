import { getApiErrorMessage } from "../../../utils/apiError";
import {
  clampShipmentPageSize,
  DEFAULT_SHIPMENT_PAGE_SIZE,
} from "../../../utils/shipmentQuery";

export const createShipmentListState = (filters = {}) => ({
  error: null,
  filters,
  list: [],
  listRequestId: null,
  loading: false,
  pageNumber: 1,
  pageSize: DEFAULT_SHIPMENT_PAGE_SIZE,
  totalCount: 0,
  totalPages: 1,
});

export const addShipmentListCases = (builder, thunk) => {
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
      state.pageSize = clampShipmentPageSize(page.pageSize);
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

export const rejectShipmentThunk = (error, rejectWithValue, fallback) =>
  rejectWithValue(getApiErrorMessage(error, fallback));

export const setShipmentFilters = (state, action) => {
  state.filters = { ...state.filters, ...action.payload };
  state.pageNumber = 1;
};

export const setShipmentPage = (state, action) => {
  state.pageNumber = Math.max(1, Math.trunc(Number(action.payload) || 1));
};

export const setShipmentPageSize = (state, action) => {
  state.pageSize = clampShipmentPageSize(action.payload);
  state.pageNumber = 1;
};

