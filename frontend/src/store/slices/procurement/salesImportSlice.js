import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { salesImportService } from "../../../services/procurement/salesImportService";
import { normalizePagedPayload } from "../inventory/inventorySliceHelpers";
import {
  createProcurementInitialState,
  getProcurementThunkError,
  setListFulfilled,
  setListPending,
  setListRejected,
  setPageSize,
} from "./procurementSliceUtils";

const initialState = {
  ...createProcurementInitialState({
    FromDate: "",
    ToDate: "",
    SalesChannelId: "",
    ItemId: "",
    ImportBatchId: "",
    IsMapped: "all",
  }),
  batches: [],
  batchCount: 0,
  batchLoading: false,
  batchError: null,
  preview: null,
  previewLoading: false,
  previewError: null,
  summary: null,
  summaryLoading: false,
  summaryError: null,
};

const createThunk = (type, action, fallback) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await action(arg);
    } catch (error) {
      return rejectWithValue(getProcurementThunkError(error, fallback));
    }
  });

export const previewSalesImport = createThunk(
  "procurementSalesImport/preview",
  salesImportService.preview,
  "Unable to preview the sales import.",
);
export const confirmSalesImport = createThunk(
  "procurementSalesImport/confirm",
  ({ file, allowDuplicate, correctionReason }) =>
    salesImportService.confirm(file, allowDuplicate, correctionReason),
  "Unable to confirm the sales import.",
);
export const fetchSalesHistory = createThunk(
  "procurementSalesImport/fetchHistory",
  salesImportService.getHistory,
  "Unable to load sales history.",
);
export const fetchSalesImportBatches = createThunk(
  "procurementSalesImport/fetchBatches",
  salesImportService.listBatches,
  "Unable to load import batches.",
);
export const fetchSalesImportBatch = createThunk(
  "procurementSalesImport/fetchBatch",
  salesImportService.getBatch,
  "Unable to load the import batch.",
);
export const fetchSalesSummary = createThunk(
  "procurementSalesImport/fetchSummary",
  salesImportService.getSummary,
  "Unable to load the product summary.",
);
export const createManualSale = createThunk(
  "procurementSalesImport/createManual",
  salesImportService.createManual,
  "Unable to create the manual sale.",
);
export const updateManualSale = createThunk(
  "procurementSalesImport/updateManual",
  ({ id, payload }) => salesImportService.updateManual(id, payload),
  "Unable to update the manual sale.",
);
export const deleteManualSale = createThunk(
  "procurementSalesImport/deleteManual",
  salesImportService.deleteManual,
  "Unable to delete the manual sale.",
);
export const cancelSalesImportBatch = createThunk(
  "procurementSalesImport/cancelBatch",
  ({ id, reason }) => salesImportService.cancelBatch(id, reason),
  "Unable to cancel the import batch.",
);

const slice = createSlice({
  name: "procurementSalesImport",
  initialState,
  reducers: {
    setSalesImportFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSalesImportPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setSalesImportPageSize: setPageSize,
    clearSalesImportPreview: (state) => {
      state.preview = null;
      state.previewError = null;
    },
    clearSalesImportError: (state) => {
      state.error = null;
      state.batchError = null;
      state.previewError = null;
      state.summaryError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalesHistory.pending, setListPending)
      .addCase(fetchSalesHistory.fulfilled, setListFulfilled)
      .addCase(fetchSalesHistory.rejected, setListRejected)
      .addCase(previewSalesImport.pending, (state) => {
        state.previewLoading = true;
        state.previewError = null;
      })
      .addCase(previewSalesImport.fulfilled, (state, action) => {
        state.previewLoading = false;
        state.preview = action.payload.data;
      })
      .addCase(previewSalesImport.rejected, (state, action) => {
        state.previewLoading = false;
        state.previewError = action.payload ?? action.error.message;
      })
      .addCase(fetchSalesImportBatches.pending, (state) => {
        state.batchLoading = true;
        state.batchError = null;
      })
      .addCase(fetchSalesImportBatches.fulfilled, (state, action) => {
        const page = normalizePagedPayload(action.payload.data);
        state.batchLoading = false;
        state.batches = page.items;
        state.batchCount = page.totalCount;
      })
      .addCase(fetchSalesImportBatches.rejected, (state, action) => {
        state.batchLoading = false;
        state.batchError = action.payload ?? action.error.message;
      })
      .addCase(fetchSalesImportBatch.fulfilled, (state, action) => {
        state.selected = action.payload.data;
      })
      .addCase(fetchSalesSummary.pending, (state) => {
        state.summaryLoading = true;
        state.summaryError = null;
      })
      .addCase(fetchSalesSummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summary = action.payload.data;
      })
      .addCase(fetchSalesSummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.summaryError = action.payload ?? action.error.message;
      });
  },
});

export const {
  clearSalesImportError,
  clearSalesImportPreview,
  setSalesImportFilters,
  setSalesImportPage,
  setSalesImportPageSize,
} = slice.actions;
export default slice.reducer;
