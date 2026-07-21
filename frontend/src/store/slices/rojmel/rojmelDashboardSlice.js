import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { rojmelDashboardService } from "../../../services/rojmel/dashboardService";
import { getRojmelThunkError } from "./rojmelSliceHelpers";

const initialState = {
  error: null,
  loading: false,
  recentTransactions: [],
  requestId: null,
  summary: null,
  walletBalances: [],
};

const toItems = (data) => {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : [];
};

export const fetchRojmelDashboard = createAsyncThunk(
  "rojmelDashboard/fetch",
  async (params, { rejectWithValue, signal }) => {
    try {
      const [summary, walletBalances, recentTransactions] = await Promise.all([
        rojmelDashboardService.getSummary(params, { signal }),
        rojmelDashboardService.getWalletBalances(params, { signal }),
        rojmelDashboardService.getRecentTransactions(params, { signal }),
      ]);

      return { recentTransactions, summary, walletBalances };
    } catch (error) {
      return rejectWithValue(
        getRojmelThunkError(error, "Unable to load the Rojmel dashboard."),
      );
    }
  },
);

const rojmelDashboardSlice = createSlice({
  name: "rojmelDashboard",
  initialState,
  reducers: {
    clearRojmelDashboardError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRojmelDashboard.pending, (state, action) => {
        state.error = null;
        state.loading = true;
        state.requestId = action.meta.requestId;
      })
      .addCase(fetchRojmelDashboard.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.summary = action.payload.summary.data;
        state.walletBalances = toItems(action.payload.walletBalances.data);
        state.recentTransactions = toItems(
          action.payload.recentTransactions.data,
        );
        state.loading = false;
        state.requestId = null;
      })
      .addCase(fetchRojmelDashboard.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.error = action.payload ?? action.error.message;
        state.loading = false;
        state.requestId = null;
      });
  },
});

export const { clearRojmelDashboardError } = rojmelDashboardSlice.actions;

export default rojmelDashboardSlice.reducer;
