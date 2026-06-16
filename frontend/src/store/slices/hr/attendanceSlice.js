import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { hrAttendanceService } from "../../../services/hr/attendanceService";
import { getThunkError } from "../inventory/inventorySliceHelpers";
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
    DepartmentId: "all",
    FromDate: "",
    ToDate: "",
    Status: "all",
  }),
  monthlyReport: null,
  departmentReport: null,
};

export const fetchHrAttendance = createAsyncThunk(
  "hrAttendance/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await hrAttendanceService.getAttendance(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load attendance."),
      );
    }
  },
);

export const fetchHrAttendanceMonthlyReport = createAsyncThunk(
  "hrAttendance/fetchMonthlyReport",
  async (params, { rejectWithValue }) => {
    try {
      return await hrAttendanceService.getMonthlyReport(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load monthly report."),
      );
    }
  },
);

export const fetchHrAttendanceDepartmentReport = createAsyncThunk(
  "hrAttendance/fetchDepartmentReport",
  async (params, { rejectWithValue }) => {
    try {
      return await hrAttendanceService.getDepartmentReport(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load department report."),
      );
    }
  },
);

export const hrAttendanceCheckIn = createAsyncThunk(
  "hrAttendance/checkIn",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrAttendanceService.checkIn(payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to check in."));
    }
  },
);

export const hrAttendanceCheckOut = createAsyncThunk(
  "hrAttendance/checkOut",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrAttendanceService.checkOut(payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to check out."));
    }
  },
);

export const createHrAttendanceManualEntry = createAsyncThunk(
  "hrAttendance/createManualEntry",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrAttendanceService.createManualEntry(payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to save manual attendance."),
      );
    }
  },
);

export const requestHrAttendanceAdjustment = createAsyncThunk(
  "hrAttendance/requestAdjustment",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrAttendanceService.requestAdjustment(payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to request adjustment."),
      );
    }
  },
);

export const approveHrAttendanceAdjustment = createAsyncThunk(
  "hrAttendance/approveAdjustment",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrAttendanceService.approveAdjustment(payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to approve adjustment."),
      );
    }
  },
);

export const rejectHrAttendanceAdjustment = createAsyncThunk(
  "hrAttendance/rejectAdjustment",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrAttendanceService.rejectAdjustment(payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to reject adjustment."),
      );
    }
  },
);

const attendanceSlice = createSlice({
  name: "hrAttendance",
  initialState,
  reducers: {
    setHrAttendanceFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setHrAttendancePage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setHrAttendancePageSize: setHrPageSize,
    clearHrAttendanceError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHrAttendance.pending, setHrListPending)
      .addCase(fetchHrAttendance.fulfilled, setHrListFulfilled)
      .addCase(fetchHrAttendance.rejected, setHrListRejected)
      .addCase(fetchHrAttendanceMonthlyReport.fulfilled, (state, action) => {
        state.monthlyReport = action.payload.data;
      })
      .addCase(fetchHrAttendanceDepartmentReport.fulfilled, (state, action) => {
        state.departmentReport = action.payload.data;
      });
  },
});

export const {
  clearHrAttendanceError,
  setHrAttendanceFilters,
  setHrAttendancePage,
  setHrAttendancePageSize,
} = attendanceSlice.actions;

export default attendanceSlice.reducer;
