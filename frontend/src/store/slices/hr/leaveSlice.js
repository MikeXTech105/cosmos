import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { hrLeaveService } from "../../../services/hr/leaveService";
import { getThunkError } from "../inventorySliceHelpers";
import {
  createHrInitialState,
  setHrListFulfilled,
  setHrListPending,
  setHrListRejected,
  setHrPageSize,
} from "./hrSliceUtils";

const initialState = {
  ...createHrInitialState({
    EmployeeId: "",
    LeaveTypeId: "all",
    Status: "all",
    FromDate: "",
    ToDate: "",
  }),
  balance: null,
  pendingApprovals: [],
};

export const fetchHrLeaves = createAsyncThunk(
  "hrLeaves/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await hrLeaveService.getLeaves(params);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to load leaves."));
    }
  },
);

export const fetchHrLeaveBalance = createAsyncThunk(
  "hrLeaves/fetchBalance",
  async (employeeId, { rejectWithValue }) => {
    try {
      return await hrLeaveService.getLeaveBalance(employeeId);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load leave balance."),
      );
    }
  },
);

export const fetchHrPendingLeaveApprovals = createAsyncThunk(
  "hrLeaves/fetchPendingApprovals",
  async (params, { rejectWithValue }) => {
    try {
      return await hrLeaveService.getPendingApprovals(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load pending approvals."),
      );
    }
  },
);

export const applyHrLeave = createAsyncThunk(
  "hrLeaves/apply",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrLeaveService.applyLeave(payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to apply leave."));
    }
  },
);

export const cancelHrLeave = createAsyncThunk(
  "hrLeaves/cancel",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrLeaveService.cancelLeave(payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to cancel leave."));
    }
  },
);

export const approveHrLeave = createAsyncThunk(
  "hrLeaves/approve",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrLeaveService.approveLeave(payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to approve leave."));
    }
  },
);

export const rejectHrLeave = createAsyncThunk(
  "hrLeaves/reject",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrLeaveService.rejectLeave(payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to reject leave."));
    }
  },
);

const leaveSlice = createSlice({
  name: "hrLeaves",
  initialState,
  reducers: {
    setHrLeaveFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setHrLeavePage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setHrLeavePageSize: setHrPageSize,
    clearHrLeaveError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHrLeaves.pending, setHrListPending)
      .addCase(fetchHrLeaves.fulfilled, setHrListFulfilled)
      .addCase(fetchHrLeaves.rejected, setHrListRejected)
      .addCase(fetchHrLeaveBalance.fulfilled, (state, action) => {
        state.balance = action.payload.data;
      })
      .addCase(fetchHrPendingLeaveApprovals.fulfilled, (state, action) => {
        state.pendingApprovals = Array.isArray(action.payload.data)
          ? action.payload.data
          : action.payload.data?.items ?? [];
      });
  },
});

export const {
  clearHrLeaveError,
  setHrLeaveFilters,
  setHrLeavePage,
  setHrLeavePageSize,
} = leaveSlice.actions;

export default leaveSlice.reducer;
