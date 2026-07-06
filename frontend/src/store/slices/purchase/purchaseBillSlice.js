import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { purchaseBillService } from "../../../services/purchase/purchaseBillService";
import {
  clampPurchasePageSize,
  PURCHASE_DEFAULT_PAGE_SIZE,
} from "../../../services/purchase/purchaseServiceUtils";
import {
  extractEntity,
  getThunkError,
  normalizePagedPayload,
} from "../inventory/inventorySliceHelpers";

const initialState = {
  list: [],
  loading: false,
  detailLoading: false,
  detailError: null,
  error: null,
  bySupplier: [],
  bySupplierLoading: false,
  bySupplierError: null,
  pageNumber: 1,
  pageSize: PURCHASE_DEFAULT_PAGE_SIZE,
  totalCount: 0,
  totalPages: 1,
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
};

export const fetchPurchaseBills = createAsyncThunk(
  "purchaseBills/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await purchaseBillService.getPurchaseBills(params);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to load bills."));
    }
  },
);

export const fetchPurchaseBillById = createAsyncThunk(
  "purchaseBills/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await purchaseBillService.getPurchaseBillById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load bill details."),
      );
    }
  },
);

export const fetchPurchaseBillsBySupplier = createAsyncThunk(
  "purchaseBills/fetchBySupplier",
  async ({ supplierId, params }, { rejectWithValue }) => {
    try {
      return await purchaseBillService.getPurchaseBillsBySupplier(
        supplierId,
        params,
      );
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load supplier bills."),
      );
    }
  },
);

export const createPurchaseBill = createAsyncThunk(
  "purchaseBills/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await purchaseBillService.createPurchaseBill(payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to create bill."));
    }
  },
);

export const updatePurchaseBill = createAsyncThunk(
  "purchaseBills/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await purchaseBillService.updatePurchaseBill(id, payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to update bill."));
    }
  },
);

export const deletePurchaseBill = createAsyncThunk(
  "purchaseBills/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await purchaseBillService.deletePurchaseBill(id);

      return { id, response };
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to delete bill."));
    }
  },
);

export const confirmPurchaseBill = createAsyncThunk(
  "purchaseBills/confirm",
  async (id, { rejectWithValue }) => {
    try {
      return await purchaseBillService.confirmPurchaseBill(id);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to confirm bill."));
    }
  },
);

export const cancelPurchaseBill = createAsyncThunk(
  "purchaseBills/cancel",
  async (id, { rejectWithValue }) => {
    try {
      return await purchaseBillService.cancelPurchaseBill(id);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to cancel bill."));
    }
  },
);

const updateBillInList = (state, bill) => {
  if (!bill?.id) {
    return;
  }

  state.list = state.list.map((item) =>
    String(item.id) === String(bill.id) ? { ...item, ...bill } : item,
  );
};

const purchaseBillSlice = createSlice({
  name: "purchaseBills",
  initialState,
  reducers: {
    clearPurchaseBillError: (state) => {
      state.error = null;
      state.detailError = null;
      state.bySupplierError = null;
    },
    setPurchaseBillFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPurchaseBillPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setPurchaseBillPageSize: (state, action) => {
      state.pageSize = clampPurchasePageSize(action.payload);
      state.pageNumber = 1;
    },
    setSelectedPurchaseBill: (state, action) => {
      state.selected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPurchaseBills.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPurchaseBills.fulfilled, (state, action) => {
        const page = normalizePagedPayload(action.payload.data);

        state.loading = false;
        state.list = page.items;
        state.pageNumber = page.pageNumber;
        state.pageSize = page.pageSize;
        state.totalCount = page.totalCount;
        state.totalPages = page.totalPages;
      })
      .addCase(fetchPurchaseBills.rejected, (state, action) => {
        state.loading = false;
        state.list = [];
        state.error = action.payload ?? action.error.message;
      })
      .addCase(fetchPurchaseBillById.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchPurchaseBillById.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selected = extractEntity(action.payload.data, "purchaseBill");
      })
      .addCase(fetchPurchaseBillById.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError = action.payload ?? action.error.message;
      })
      .addCase(fetchPurchaseBillsBySupplier.pending, (state) => {
        state.bySupplierLoading = true;
        state.bySupplierError = null;
      })
      .addCase(fetchPurchaseBillsBySupplier.fulfilled, (state, action) => {
        const page = normalizePagedPayload(action.payload.data);

        state.bySupplierLoading = false;
        state.bySupplier = page.items;
      })
      .addCase(fetchPurchaseBillsBySupplier.rejected, (state, action) => {
        state.bySupplierLoading = false;
        state.bySupplier = [];
        state.bySupplierError = action.payload ?? action.error.message;
      })
      .addCase(createPurchaseBill.fulfilled, (state, action) => {
        state.selected = extractEntity(action.payload.data, "purchaseBill");
      })
      .addCase(updatePurchaseBill.fulfilled, (state, action) => {
        const bill = extractEntity(action.payload.data, "purchaseBill");

        state.selected = bill;
        updateBillInList(state, bill);
      })
      .addCase(confirmPurchaseBill.fulfilled, (state, action) => {
        const bill = extractEntity(action.payload.data, "purchaseBill");

        state.selected = bill;
        updateBillInList(state, bill);
      })
      .addCase(cancelPurchaseBill.fulfilled, (state, action) => {
        const bill = extractEntity(action.payload.data, "purchaseBill");

        state.selected = bill;
        updateBillInList(state, bill);
      })
      .addCase(deletePurchaseBill.fulfilled, (state, action) => {
        state.list = state.list.filter(
          (item) => String(item.id) !== String(action.payload.id),
        );
        state.totalCount = Math.max(0, state.totalCount - 1);
      });
  },
});

export const {
  clearPurchaseBillError,
  setPurchaseBillFilters,
  setPurchaseBillPage,
  setPurchaseBillPageSize,
  setSelectedPurchaseBill,
} = purchaseBillSlice.actions;

export default purchaseBillSlice.reducer;
