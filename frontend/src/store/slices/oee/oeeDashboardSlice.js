import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { oeeDashboardService } from "../../../services/oee/oeeDashboardService";
import { getApiErrorMessage } from "../../../utils/apiError";

const requestMap = {
  dailyTrend: oeeDashboardService.getDailyTrend,
  machineWise: oeeDashboardService.getMachineWise,
  mouldWise: oeeDashboardService.getMouldWise,
  summary: oeeDashboardService.getSummary,
  topDowntime: oeeDashboardService.getTopDowntimeReasons,
};

const initialPanel = (fallback) => ({
  data: fallback,
  error: null,
  loading: false,
});

const initialState = {
  requestId: null,
  filters: {
    LastDays: 30,
    FromDate: "",
    ToDate: "",
    mode: "lastDays",
  },
  dailyTrend: initialPanel([]),
  machineWise: initialPanel([]),
  mouldWise: initialPanel([]),
  summary: initialPanel(null),
  topDowntime: initialPanel([]),
};

export const fetchOeeDashboard = createAsyncThunk(
  "oeeDashboard/fetchAll",
  async (params) => {
    const entries = await Promise.all(
      Object.entries(requestMap).map(async ([key, request]) => {
        try {
          const response = await request(params);

          return [key, { data: response.data, error: null }];
        } catch (error) {
          return [
            key,
            {
              data: undefined,
              error: getApiErrorMessage(
                error,
                `Unable to load ${key} dashboard data.`,
              ),
            },
          ];
        }
      }),
    );

    return Object.fromEntries(entries);
  },
);

const setAllLoading = (state, loading) => {
  Object.keys(requestMap).forEach((key) => {
    state[key].loading = loading;

    if (loading) {
      state[key].error = null;
    }
  });
};

const oeeDashboardSlice = createSlice({
  name: "oeeDashboard",
  initialState,
  reducers: {
    setOeeDashboardFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearOeeDashboardErrors: (state) => {
      Object.keys(requestMap).forEach((key) => {
        state[key].error = null;
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOeeDashboard.pending, (state, action) => {
        state.requestId = action.meta.requestId;
        setAllLoading(state, true);
      })
      .addCase(fetchOeeDashboard.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        Object.entries(action.payload).forEach(([key, panel]) => {
          state[key].loading = false;
          state[key].error = panel.error;

          if (panel.data !== undefined) {
            state[key].data = panel.data;
          }
        });
        state.requestId = null;
      })
      .addCase(fetchOeeDashboard.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        setAllLoading(state, false);
        Object.keys(requestMap).forEach((key) => {
          state[key].error =
            action.payload ?? action.error.message ?? "Unable to load data.";
        });
        state.requestId = null;
      });
  },
});

export const {
  clearOeeDashboardErrors,
  setOeeDashboardFilters,
} = oeeDashboardSlice.actions;

export default oeeDashboardSlice.reducer;
