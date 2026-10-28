import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { purchaseOrderService } from "../../../services/purchase/purchaseOrderService";
import {
  clampPurchasePageSize,
  PURCHASE_DEFAULT_PAGE_SIZE,
} from "../../../services/purchase/purchaseServiceUtils";
import {
  extractEntity,
  getRequestEntityId,
  getThunkError,
  getThunkFormError,
  normalizePagedPayload,
} from "../inventory/inventorySliceHelpers";

const initialState = {
  list: [],
  loading: false,
  detailLoading: false,
  detailError: null,
  error: null,
  pageNumber: 1,
  pageSize: PURCHASE_DEFAULT_PAGE_SIZE,
  totalCount: 0,
  totalPages: 1,
  summary: null,
  summaryScope: "current-page",
  filters: {
    Search: "",
    SupplierId: "all",
    Status: "all",
    FromDate: "",
    ToDate: "",
    SortBy: "",
    SortDirection: "",
  },
  selected: null,
  listRequestId: null,
  detailRequestId: null,
  selectedRequestEntityId: null,
};

export const fetchPurchaseOrders = createAsyncThunk(
  "purchaseOrders/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await purchaseOrderService.getPurchaseOrders(params);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to load orders."));
    }
  },
);

export const fetchPurchaseOrderById = createAsyncThunk(
  "purchaseOrders/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await purchaseOrderService.getPurchaseOrderById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load order details."),
      );
    }
  },
);

export const createPurchaseOrder = createAsyncThunk(
  "purchaseOrders/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await purchaseOrderService.createPurchaseOrder(payload);
    } catch (error) {
      return rejectWithValue(getThunkFormError(error, "Unable to create order."));
    }
  },
);

export const updatePurchaseOrder = createAsyncThunk(
  "purchaseOrders/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await purchaseOrderService.updatePurchaseOrder(id, payload);
    } catch (error) {
      return rejectWithValue(getThunkFormError(error, "Unable to update order."));
    }
  },
);

export const deletePurchaseOrder = createAsyncThunk(
  "purchaseOrders/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await purchaseOrderService.deletePurchaseOrder(id);

      return { id, response };
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to delete order."));
    }
  },
);

export const cancelPurchaseOrder = createAsyncThunk(
  "purchaseOrders/cancel",
  async (id, { rejectWithValue }) => {
    try {
      return await purchaseOrderService.cancelPurchaseOrder(id);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to cancel order."));
    }
  },
);

export const convertPurchaseOrderToBill = createAsyncThunk(
  "purchaseOrders/convertToBill",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await purchaseOrderService.convertToBill(id, payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to convert order to bill."),
      );
    }
  },
);

const updateOrderInList = (state, order) => {
  if (!order?.id) {
    return;
  }

  state.list = state.list.map((item) =>
    String(item.id) === String(order.id) ? { ...item, ...order } : item,
  );
};

const purchaseOrderSlice = createSlice({
  name: "purchaseOrders",
  initialState,
  reducers: {
    clearPurchaseOrderError: (state) => {
      state.error = null;
      state.detailError = null;
    },
    setPurchaseOrderFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPurchaseOrderPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setPurchaseOrderPageSize: (state, action) => {
      state.pageSize = clampPurchasePageSize(action.payload);
      state.pageNumber = 1;
    },
    setSelectedPurchaseOrder: (state, action) => {
      state.selected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPurchaseOrders.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.listRequestId = action.meta.requestId;
      })
      .addCase(fetchPurchaseOrders.fulfilled, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
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
      .addCase(fetchPurchaseOrders.rejected, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.list = [];
        state.error = getThunkError(action.payload ?? action.error);
        state.listRequestId = null;
      })
      .addCase(fetchPurchaseOrderById.pending, (state, action) => {
        state.detailLoading = true;
        state.detailError = null;
        state.detailRequestId = action.meta.requestId;
        state.selectedRequestEntityId = getRequestEntityId(action.meta.arg);
      })
      .addCase(fetchPurchaseOrderById.fulfilled, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId || String(state.selectedRequestEntityId) !== String(getRequestEntityId(action.meta.arg))) return;
        state.detailLoading = false;
        state.selected = extractEntity(action.payload.data, "purchaseOrder");
        state.detailRequestId = null;
      })
      .addCase(fetchPurchaseOrderById.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailLoading = false;
        state.detailError = getThunkError(action.payload ?? action.error);
        state.detailRequestId = null;
      })
      .addCase(createPurchaseOrder.pending, state => { state.error = null; })
      .addCase(createPurchaseOrder.rejected, (state, action) => { state.error = getThunkError(action.payload ?? action.error, "Unable to create order."); })
      .addCase(updatePurchaseOrder.pending, state => { state.error = null; })
      .addCase(updatePurchaseOrder.rejected, (state, action) => { state.error = getThunkError(action.payload ?? action.error, "Unable to update order."); })
      .addCase(createPurchaseOrder.fulfilled, (state, action) => {
        state.selected = extractEntity(action.payload.data, "purchaseOrder");
      })
      .addCase(updatePurchaseOrder.fulfilled, (state, action) => {
        const order = extractEntity(action.payload.data, "purchaseOrder");

        state.selected = order;
        updateOrderInList(state, order);
      })
      .addCase(cancelPurchaseOrder.fulfilled, (state, action) => {
        const order = extractEntity(action.payload.data, "purchaseOrder");

        state.selected = order;
        updateOrderInList(state, order);
      })
      .addCase(deletePurchaseOrder.fulfilled, (state, action) => {
        state.list = state.list.filter(
          (item) => String(item.id) !== String(action.payload.id),
        );
        state.totalCount = Math.max(0, state.totalCount - 1);
      });
  },
});

export const {
  clearPurchaseOrderError,
  setPurchaseOrderFilters,
  setPurchaseOrderPage,
  setPurchaseOrderPageSize,
  setSelectedPurchaseOrder,
} = purchaseOrderSlice.actions;

export default purchaseOrderSlice.reducer;
