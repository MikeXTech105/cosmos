import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { oeeReportService } from "../../../services/oee/oeeReportService";
import { getThunkError } from "../inventory/inventorySliceHelpers";

const initialState = {
  daily: [],
  downtime: [],
  machinePerformance: [],
  mouldPerformance: [],
  exportFile: null,
  loading: false,
  exporting: false,
  error: null,
  exportError: null,
  reportRequestId: null,
  filters: {
    LastDays: 30,
    FromDate: "",
    ToDate: "",
    MachineId: "",
    MouldId: "",
    DowntimeReasonId: "",
    mode: "lastDays",
  },
};

export const fetchOeeDailyReport = createAsyncThunk(
  "oeeReports/daily",
  async (params, { rejectWithValue }) => {
    try {
      return await oeeReportService.getDailyReport(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load daily OEE report."),
      );
    }
  },
);

export const fetchOeeMachinePerformanceReport = createAsyncThunk(
  "oeeReports/machinePerformance",
  async (params, { rejectWithValue }) => {
    try {
      return await oeeReportService.getMachinePerformance(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load machine performance report."),
      );
    }
  },
);

export const fetchOeeMouldPerformanceReport = createAsyncThunk(
  "oeeReports/mouldPerformance",
  async (params, { rejectWithValue }) => {
    try {
      return await oeeReportService.getMouldPerformance(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load mould performance report."),
      );
    }
  },
);

export const fetchOeeDowntimeReport = createAsyncThunk(
  "oeeReports/downtime",
  async (params, { rejectWithValue }) => {
    try {
      return await oeeReportService.getDowntimeReport(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load downtime report."),
      );
    }
  },
);

export const exportOeeReportExcel = createAsyncThunk(
  "oeeReports/exportExcel",
  async (params, { rejectWithValue }) => {
    try {
      return await oeeReportService.exportExcel(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to export OEE report."),
      );
    }
  },
);

const setPending = (state, action) => {
  state.loading = true;
  state.error = null;
  state.reportRequestId = action.meta.requestId;
};

const setRejected = (state, action) => {
  if (state.reportRequestId !== action.meta.requestId) return;
  state.loading = false;
  state.error = action.payload ?? action.error.message;
  state.reportRequestId = null;
};

const isCurrentReportRequest = (state, action) =>
  state.reportRequestId === action.meta.requestId;

const getRows = (payload) => (Array.isArray(payload.data) ? payload.data : []);

const oeeReportSlice = createSlice({
  name: "oeeReports",
  initialState,
  reducers: {
    setOeeReportFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearOeeReportError: (state) => {
      state.error = null;
      state.exportError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOeeDailyReport.pending, setPending)
      .addCase(fetchOeeDailyReport.fulfilled, (state, action) => {
        if (!isCurrentReportRequest(state, action)) return;
        state.loading = false;
        state.daily = getRows(action.payload);
        state.reportRequestId = null;
      })
      .addCase(fetchOeeDailyReport.rejected, setRejected)
      .addCase(fetchOeeMachinePerformanceReport.pending, setPending)
      .addCase(fetchOeeMachinePerformanceReport.fulfilled, (state, action) => {
        if (!isCurrentReportRequest(state, action)) return;
        state.loading = false;
        state.machinePerformance = getRows(action.payload);
        state.reportRequestId = null;
      })
      .addCase(fetchOeeMachinePerformanceReport.rejected, setRejected)
      .addCase(fetchOeeMouldPerformanceReport.pending, setPending)
      .addCase(fetchOeeMouldPerformanceReport.fulfilled, (state, action) => {
        if (!isCurrentReportRequest(state, action)) return;
        state.loading = false;
        state.mouldPerformance = getRows(action.payload);
        state.reportRequestId = null;
      })
      .addCase(fetchOeeMouldPerformanceReport.rejected, setRejected)
      .addCase(fetchOeeDowntimeReport.pending, setPending)
      .addCase(fetchOeeDowntimeReport.fulfilled, (state, action) => {
        if (!isCurrentReportRequest(state, action)) return;
        state.loading = false;
        state.downtime = getRows(action.payload);
        state.reportRequestId = null;
      })
      .addCase(fetchOeeDowntimeReport.rejected, setRejected)
      .addCase(exportOeeReportExcel.pending, (state) => {
        state.exporting = true;
        state.exportError = null;
      })
      .addCase(exportOeeReportExcel.fulfilled, (state, action) => {
        state.exporting = false;
        state.exportFile = action.payload;
      })
      .addCase(exportOeeReportExcel.rejected, (state, action) => {
        state.exporting = false;
        state.exportError = action.payload ?? action.error.message;
      });
  },
});

export const {
  clearOeeReportError,
  setOeeReportFilters,
} = oeeReportSlice.actions;

export default oeeReportSlice.reducer;
