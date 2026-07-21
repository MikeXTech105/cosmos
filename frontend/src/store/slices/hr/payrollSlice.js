import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { hrPayrollService } from "../../../services/hr/payrollService";
import { getThunkError } from "../inventory/inventorySliceHelpers";

const initialState = {
  loading: false,
  error: null,
  selectedRun: null,
  history: [],
  payslip: null,
  detailRequestId: null,
  selectedRequestEntityId: null,
  historyRequestId: null,
  payslipRequestId: null,
};

export const processHrPayroll = createAsyncThunk(
  "hrPayroll/process",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrPayrollService.processPayroll(payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to process payroll."));
    }
  },
);

export const approveHrPayroll = createAsyncThunk(
  "hrPayroll/approve",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrPayrollService.approvePayroll(payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to approve payroll."));
    }
  },
);

export const fetchHrPayrollRunById = createAsyncThunk(
  "hrPayroll/fetchRunById",
  async (id, { rejectWithValue }) => {
    try {
      return await hrPayrollService.getPayrollRunById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load payroll run."),
      );
    }
  },
);

export const fetchHrPayrollHistory = createAsyncThunk(
  "hrPayroll/fetchHistory",
  async (employeeId, { rejectWithValue }) => {
    try {
      return await hrPayrollService.getPayrollHistory(employeeId);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load payroll history."),
      );
    }
  },
);

export const fetchHrPayslip = createAsyncThunk(
  "hrPayroll/fetchPayslip",
  async ({ employeeId, params }, { rejectWithValue }) => {
    try {
      return await hrPayrollService.getPayslip(employeeId, params);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to load payslip."));
    }
  },
);

const payrollSlice = createSlice({
  name: "hrPayroll",
  initialState,
  reducers: {
    clearHrPayrollError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHrPayrollRunById.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.detailRequestId = action.meta.requestId;
        state.selectedRequestEntityId = action.meta.arg;
      })
      .addCase(fetchHrPayrollRunById.fulfilled, (state, action) => {
        if (
          state.detailRequestId !== action.meta.requestId ||
          String(state.selectedRequestEntityId) !== String(action.meta.arg)
        ) {
          return;
        }
        state.loading = false;
        state.selectedRun = action.payload.data;
        state.detailRequestId = null;
      })
      .addCase(fetchHrPayrollRunById.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.error = action.payload ?? action.error.message;
        state.detailRequestId = null;
      })
      .addCase(processHrPayroll.fulfilled, (state, action) => {
        state.selectedRun = action.payload.data;
      })
      .addCase(approveHrPayroll.fulfilled, (state, action) => {
        state.selectedRun = action.payload.data ?? state.selectedRun;
      })
      .addCase(fetchHrPayrollHistory.pending, (state, action) => {
        state.historyRequestId = action.meta.requestId;
      })
      .addCase(fetchHrPayrollHistory.fulfilled, (state, action) => {
        if (state.historyRequestId !== action.meta.requestId) return;
        state.history = Array.isArray(action.payload.data)
          ? action.payload.data
          : action.payload.data?.items ?? [];
        state.historyRequestId = null;
      })
      .addCase(fetchHrPayrollHistory.rejected, (state, action) => {
        if (state.historyRequestId === action.meta.requestId) {
          state.historyRequestId = null;
        }
      })
      .addCase(fetchHrPayslip.pending, (state, action) => {
        state.payslipRequestId = action.meta.requestId;
      })
      .addCase(fetchHrPayslip.fulfilled, (state, action) => {
        if (state.payslipRequestId !== action.meta.requestId) return;
        state.payslip = action.payload.data;
        state.payslipRequestId = null;
      })
      .addCase(fetchHrPayslip.rejected, (state, action) => {
        if (state.payslipRequestId === action.meta.requestId) {
          state.payslipRequestId = null;
        }
      });
  },
});

export const { clearHrPayrollError } = payrollSlice.actions;

export default payrollSlice.reducer;
