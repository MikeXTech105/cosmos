import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { procurementSettingService } from "../../../services/procurement/procurementSettingService";
import { normalizePagedPayload } from "../inventory/inventorySliceHelpers";
import {
  createProcurementInitialState,
  getProcurementThunkError,
  setDetailRejected,
  setListFulfilled,
  setListPending,
  setListRejected,
  setPageSize,
} from "./procurementSliceUtils";

const initialState = {
  ...createProcurementInitialState({
    Search: "",
    IsActive: "all",
    AutomaticCalculationEnabled: "all",
    ManualPlanning: "all",
  }),
  missing: [],
  missingCount: 0,
  missingLoading: false,
  missingError: null,
  history: [],
  historyLoading: false,
  historyError: null,
};

const createThunk = (type, action, fallback) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await action(arg);
    } catch (error) {
      return rejectWithValue(getProcurementThunkError(error, fallback));
    }
  });

export const fetchProcurementSettings = createThunk(
  "procurementSettings/fetchList",
  procurementSettingService.list,
  "Unable to load procurement settings.",
);
export const fetchProcurementSettingByItem = createThunk(
  "procurementSettings/fetchByItem",
  procurementSettingService.getByItem,
  "Unable to load the procurement setting.",
);
export const saveProcurementSetting = createThunk(
  "procurementSettings/save",
  ({ itemId, payload }) => procurementSettingService.saveByItem(itemId, payload),
  "Unable to save the procurement setting.",
);
export const fetchMissingProcurementSettings = createThunk(
  "procurementSettings/fetchMissing",
  procurementSettingService.getMissing,
  "Unable to load missing procurement settings.",
);
export const fetchLeadTimeHistory = createThunk(
  "procurementSettings/fetchLeadTimeHistory",
  ({ itemId, params }) =>
    procurementSettingService.getLeadTimeHistory(itemId, params),
  "Unable to load lead-time history.",
);
export const addLeadTimeHistory = createThunk(
  "procurementSettings/addLeadTimeHistory",
  procurementSettingService.addLeadTimeHistory,
  "Unable to add the lead-time record.",
);

const slice = createSlice({
  name: "procurementSettings",
  initialState,
  reducers: {
    setProcurementSettingFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setProcurementSettingPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setProcurementSettingPageSize: setPageSize,
    clearProcurementSettingError: (state) => {
      state.error = null;
      state.detailError = null;
      state.missingError = null;
      state.historyError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProcurementSettings.pending, setListPending)
      .addCase(fetchProcurementSettings.fulfilled, setListFulfilled)
      .addCase(fetchProcurementSettings.rejected, setListRejected)
      .addCase(fetchProcurementSettingByItem.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchProcurementSettingByItem.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selected = action.payload.data;
      })
      .addCase(fetchProcurementSettingByItem.rejected, setDetailRejected)
      .addCase(saveProcurementSetting.fulfilled, (state, action) => {
        state.selected = action.payload.data;
      })
      .addCase(fetchMissingProcurementSettings.pending, (state) => {
        state.missingLoading = true;
        state.missingError = null;
      })
      .addCase(fetchMissingProcurementSettings.fulfilled, (state, action) => {
        const page = normalizePagedPayload(action.payload.data);
        state.missingLoading = false;
        state.missing = page.items;
        state.missingCount = page.totalCount;
      })
      .addCase(fetchMissingProcurementSettings.rejected, (state, action) => {
        state.missingLoading = false;
        state.missingError = action.payload ?? action.error.message;
      })
      .addCase(fetchLeadTimeHistory.pending, (state) => {
        state.historyLoading = true;
        state.historyError = null;
      })
      .addCase(fetchLeadTimeHistory.fulfilled, (state, action) => {
        const page = normalizePagedPayload(action.payload.data);
        state.historyLoading = false;
        state.history = page.items;
      })
      .addCase(fetchLeadTimeHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.historyError = action.payload ?? action.error.message;
      });
  },
});

export const {
  clearProcurementSettingError,
  setProcurementSettingFilters,
  setProcurementSettingPage,
  setProcurementSettingPageSize,
} = slice.actions;
export default slice.reducer;
