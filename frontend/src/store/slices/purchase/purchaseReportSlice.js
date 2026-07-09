import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { purchaseReportService } from "../../../services/purchase/purchaseReportService";
import { getThunkError } from "../inventory/inventorySliceHelpers";

const initialState = {
  purchaseSummary: null,
  supplierOutstanding: null,
  expenseSummary: null,
  categoryWiseExpense: null,
  itemPurchaseHistory: null,
  loading: false,
  error: null,
  filters: {
    FromDate: "",
    ToDate: "",
    itemId: "",
  },
};

export const fetchPurchaseSummary = createAsyncThunk(
  "purchaseReports/purchaseSummary",
  async (params, { rejectWithValue }) => {
    try {
      return await purchaseReportService.getPurchaseSummary(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load purchase summary."),
      );
    }
  },
);

export const fetchSupplierOutstanding = createAsyncThunk(
  "purchaseReports/supplierOutstanding",
  async (_, { rejectWithValue }) => {
    try {
      return await purchaseReportService.getSupplierOutstanding();
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load supplier outstanding."),
      );
    }
  },
);

export const fetchExpenseSummary = createAsyncThunk(
  "purchaseReports/expenseSummary",
  async (params, { rejectWithValue }) => {
    try {
      return await purchaseReportService.getExpenseSummary(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load expense summary."),
      );
    }
  },
);

export const fetchCategoryWiseExpense = createAsyncThunk(
  "purchaseReports/categoryWiseExpense",
  async (params, { rejectWithValue }) => {
    try {
      return await purchaseReportService.getCategoryWiseExpense(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load category-wise expense."),
      );
    }
  },
);

export const fetchItemPurchaseHistory = createAsyncThunk(
  "purchaseReports/itemPurchaseHistory",
  async (itemId, { rejectWithValue }) => {
    try {
      return await purchaseReportService.getItemPurchaseHistory(itemId);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load item purchase history."),
      );
    }
  },
);

const purchaseReportSlice = createSlice({
  name: "purchaseReports",
  initialState,
  reducers: {
    setPurchaseReportFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    const setPending = (state) => {
      state.loading = true;
      state.error = null;
    };
    const setRejected = (state, action) => {
      state.loading = false;
      state.error = action.payload ?? action.error.message;
    };

    builder
      .addCase(fetchPurchaseSummary.pending, setPending)
      .addCase(fetchPurchaseSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.purchaseSummary = action.payload.data;
      })
      .addCase(fetchPurchaseSummary.rejected, setRejected)
      .addCase(fetchSupplierOutstanding.pending, setPending)
      .addCase(fetchSupplierOutstanding.fulfilled, (state, action) => {
        state.loading = false;
        state.supplierOutstanding = action.payload.data;
      })
      .addCase(fetchSupplierOutstanding.rejected, setRejected)
      .addCase(fetchExpenseSummary.pending, setPending)
      .addCase(fetchExpenseSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.expenseSummary = action.payload.data;
      })
      .addCase(fetchExpenseSummary.rejected, setRejected)
      .addCase(fetchCategoryWiseExpense.pending, setPending)
      .addCase(fetchCategoryWiseExpense.fulfilled, (state, action) => {
        state.loading = false;
        state.categoryWiseExpense = action.payload.data;
      })
      .addCase(fetchCategoryWiseExpense.rejected, setRejected)
      .addCase(fetchItemPurchaseHistory.pending, setPending)
      .addCase(fetchItemPurchaseHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.itemPurchaseHistory = action.payload.data;
      })
      .addCase(fetchItemPurchaseHistory.rejected, setRejected);
  },
});

export const { setPurchaseReportFilters } = purchaseReportSlice.actions;

export default purchaseReportSlice.reducer;
