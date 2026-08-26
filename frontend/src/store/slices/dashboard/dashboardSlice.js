import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { dashboardService } from "../../../services/dashboard/dashboardService";
import { getApiErrorMessage, getApiStatus } from "../../../utils/apiError";
import {
  buildDashboardApiParams,
  getDefaultDashboardFilters,
  normalizeDashboardFilters,
} from "../../../pages/dashboard/dashboardHelpers";

const widgetConfig = {
  alerts: {
    fallback: null,
    params: buildDashboardApiParams.alerts,
    request: dashboardService.getAlerts,
  },
  hrSummary: {
    fallback: null,
    params: buildDashboardApiParams.hrSummary,
    request: dashboardService.getHrSummary,
  },
  overview: {
    fallback: null,
    params: buildDashboardApiParams.overview,
    request: dashboardService.getOverview,
  },
  recentActivity: {
    fallback: [],
    params: buildDashboardApiParams.recentActivity,
    request: dashboardService.getRecentActivity,
  },
  revenueExpenseTrend: {
    fallback: [],
    params: buildDashboardApiParams.revenueExpenseTrend,
    request: dashboardService.getRevenueExpenseTrend,
  },
  salesPurchaseTrend: {
    fallback: [],
    params: buildDashboardApiParams.salesPurchaseTrend,
    request: dashboardService.getSalesPurchaseTrend,
  },
  topParties: {
    fallback: [],
    params: buildDashboardApiParams.topParties,
    request: dashboardService.getTopParties,
  },
  topSellingItems: {
    fallback: [],
    params: buildDashboardApiParams.topSellingItems,
    request: dashboardService.getTopSellingItems,
  },
};

const initialPanel = (fallback) => ({
  data: fallback,
  error: null,
  errorStatus: null,
  loading: false,
  requestId: null,
});

const initialState = {
  filters: getDefaultDashboardFilters(),
  alerts: initialPanel(null),
  hrSummary: initialPanel(null),
  overview: initialPanel(null),
  recentActivity: initialPanel([]),
  revenueExpenseTrend: initialPanel([]),
  salesPurchaseTrend: initialPanel([]),
  topParties: initialPanel([]),
  topSellingItems: initialPanel([]),
};

const fetchWidget = async (widgetId, filters, signal) => {
  const widget = widgetConfig[widgetId];

  if (!widget) {
    throw new Error("Dashboard widget is not configured.");
  }

  const response = await widget.request(widget.params(filters), { signal });

  return response.data;
};

export const fetchDashboardWidget = createAsyncThunk(
  "dashboard/fetchWidget",
  async ({ filters, widgetId }, { rejectWithValue, signal }) => {
    try {
      const normalizedFilters = normalizeDashboardFilters(filters);
      const data = await fetchWidget(widgetId, normalizedFilters, signal);

      return { data, widgetId };
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }

      return rejectWithValue({
        error: getApiErrorMessage(error, `Unable to load ${widgetId}.`),
        errorStatus: getApiStatus(error) || null,
        widgetId,
      });
    }
  },
);

export const fetchDashboard = createAsyncThunk(
  "dashboard/fetchAll",
  async (filters, { signal }) => {
    const normalizedFilters = normalizeDashboardFilters(filters);
    const entries = await Promise.all(
      Object.entries(widgetConfig).map(async ([widgetId]) => {
        try {
          return [
            widgetId,
            {
              data: await fetchWidget(widgetId, normalizedFilters, signal),
              error: null,
              errorStatus: null,
            },
          ];
        } catch (error) {
          if (signal.aborted) {
            throw error;
          }

          return [
            widgetId,
            {
              data: undefined,
              error: getApiErrorMessage(
                error,
                `Unable to load ${widgetId}.`,
              ),
              errorStatus: getApiStatus(error) || null,
            },
          ];
        }
      }),
    );

    return Object.fromEntries(entries);
  },
);

const setWidgetLoading = (state, widgetId, loading, requestId = null) => {
  state[widgetId].loading = loading;
  state[widgetId].requestId = requestId;

  if (loading) {
    state[widgetId].error = null;
    state[widgetId].errorStatus = null;
  }
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboardErrors: (state) => {
      Object.keys(widgetConfig).forEach((widgetId) => {
        state[widgetId].error = null;
        state[widgetId].errorStatus = null;
      });
    },
    setDashboardFilters: (state, action) => {
      state.filters = normalizeDashboardFilters({
        ...state.filters,
        ...action.payload,
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state, action) => {
        Object.keys(widgetConfig).forEach((widgetId) => {
          setWidgetLoading(state, widgetId, true, action.meta.requestId);
        });
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        Object.entries(action.payload).forEach(([widgetId, panel]) => {
          if (state[widgetId].requestId !== action.meta.requestId) {
            return;
          }

          state[widgetId].loading = false;
          state[widgetId].requestId = null;
          state[widgetId].error = panel.error;
          state[widgetId].errorStatus = panel.errorStatus;

          if (panel.data !== undefined) {
            state[widgetId].data = panel.data;
          }
        });
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        Object.keys(widgetConfig).forEach((widgetId) => {
          if (state[widgetId].requestId !== action.meta.requestId) {
            return;
          }

          state[widgetId].loading = false;
          state[widgetId].requestId = null;

          if (!action.meta.aborted) {
            state[widgetId].error =
              action.error.message ?? "Unable to load dashboard.";
            state[widgetId].errorStatus = null;
          }
        });
      })
      .addCase(fetchDashboardWidget.pending, (state, action) => {
        setWidgetLoading(
          state,
          action.meta.arg.widgetId,
          true,
          action.meta.requestId,
        );
      })
      .addCase(fetchDashboardWidget.fulfilled, (state, action) => {
        const { data, widgetId } = action.payload;

        if (state[widgetId].requestId !== action.meta.requestId) {
          return;
        }

        state[widgetId].data = data;
        state[widgetId].error = null;
        state[widgetId].errorStatus = null;
        state[widgetId].loading = false;
        state[widgetId].requestId = null;
      })
      .addCase(fetchDashboardWidget.rejected, (state, action) => {
        const widgetId = action.payload?.widgetId ?? action.meta.arg.widgetId;

        if (state[widgetId].requestId !== action.meta.requestId) {
          return;
        }

        state[widgetId].loading = false;
        state[widgetId].requestId = null;

        if (!action.meta.aborted) {
          state[widgetId].error =
            action.payload?.error ??
            action.error.message ??
            `Unable to load ${widgetId}.`;
          state[widgetId].errorStatus =
            action.payload?.errorStatus ?? null;
        }
      });
  },
});

export const {
  clearDashboardErrors,
  setDashboardFilters,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
