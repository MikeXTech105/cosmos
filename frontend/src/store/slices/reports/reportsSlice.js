import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { getReportById } from "../../../pages/reports/reportRegistry";
import { getApiErrorMessage } from "../../../utils/apiError";

const DEFAULT_META = {
  pageNumber: 1,
  pageSize: 20,
  totalCount: 0,
  totalPages: 1,
};

const initialReportState = {
  correlationId: null,
  data: null,
  error: null,
  filters: {},
  lastRunAt: null,
  loading: false,
  meta: { ...DEFAULT_META },
  pagination: { ...DEFAULT_META },
  requestId: null,
  status: "idle",
};

const initialState = {
  byReport: {},
  exporting: {},
};

const createReportState = () => ({
  ...initialReportState,
  meta: { ...DEFAULT_META },
  pagination: { ...DEFAULT_META },
});

const getReportState = (state, reportId) => {
  state.byReport[reportId] ??= createReportState();

  return state.byReport[reportId];
};

const normalizeMeta = (payload, data) => {
  const source = payload?.meta ?? data ?? {};
  const totalCount =
    Number(source.totalCount ?? source.totalRecords ?? source.count) ||
    DEFAULT_META.totalCount;
  const pageSize = Number(source.pageSize) || DEFAULT_META.pageSize;
  const pageNumber = Number(source.pageNumber) || DEFAULT_META.pageNumber;

  return {
    pageNumber,
    pageSize,
    totalCount,
    totalPages:
      Number(source.totalPages) ||
      Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize))),
  };
};

const normalizeReportResult = (payload) => {
  const data = payload?.data;
  const isPaged = data && typeof data === "object" && Array.isArray(data.items);
  const rows = isPaged ? data.items : data;

  return {
    correlationId: payload?.correlationId ?? null,
    data: rows,
    meta: normalizeMeta(payload, data),
  };
};

export const runReportThunk = createAsyncThunk(
  "reports/runReport",
  async ({ params = {}, reportId }, { rejectWithValue, signal }) => {
    const report = getReportById(reportId);

    if (!report?.fetcher) {
      return rejectWithValue({
        message: "Report configuration was not found.",
        reportId,
      });
    }

    try {
      const payload = await report.fetcher(params, { signal });

      return {
        ...normalizeReportResult(payload),
        filters: params,
        reportId,
      };
    } catch (error) {
      return rejectWithValue({
        correlationId:
          error?.apiError?.correlationId ??
          error?.response?.data?.correlationId ??
          null,
        message: getApiErrorMessage(error, "Unable to run report."),
        reportId,
      });
    }
  },
);

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {
    clearAllReports: () => initialState,
    clearReport: (state, action) => {
      delete state.byReport[action.payload];
      delete state.exporting[action.payload];
    },
    setReportExporting: (state, action) => {
      const { reportId, value } = action.payload;

      state.exporting[reportId] = Boolean(value);
    },
    setReportFilters: (state, action) => {
      const { filters, reportId } = action.payload;
      const reportState = getReportState(state, reportId);

      reportState.filters = { ...reportState.filters, ...filters };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runReportThunk.pending, (state, action) => {
        const { params = {}, reportId } = action.meta.arg;
        const reportState = getReportState(state, reportId);

        reportState.error = null;
        reportState.filters = params;
        reportState.loading = true;
        reportState.requestId = action.meta.requestId;
        reportState.status = "loading";
      })
      .addCase(runReportThunk.fulfilled, (state, action) => {
        const reportState = getReportState(state, action.payload.reportId);

        if (reportState.requestId !== action.meta.requestId) {
          return;
        }

        reportState.correlationId = action.payload.correlationId;
        reportState.data = action.payload.data;
        reportState.error = null;
        reportState.filters = action.payload.filters;
        reportState.lastRunAt = new Date().toISOString();
        reportState.loading = false;
        reportState.meta = action.payload.meta;
        reportState.pagination = action.payload.meta;
        reportState.requestId = null;
        reportState.status = "succeeded";
      })
      .addCase(runReportThunk.rejected, (state, action) => {
        const reportId = action.payload?.reportId ?? action.meta.arg.reportId;
        const reportState = getReportState(state, reportId);

        if (reportState.requestId !== action.meta.requestId) {
          return;
        }

        reportState.loading = false;
        reportState.requestId = null;

        if (action.meta.aborted) {
          reportState.status = "idle";
          return;
        }

        reportState.correlationId = action.payload?.correlationId ?? null;
        reportState.error =
          action.payload?.message ?? action.error.message ?? "Unable to run report.";
        reportState.status = "failed";
      });
  },
});

export const {
  clearAllReports,
  clearReport,
  setReportExporting,
  setReportFilters,
} = reportsSlice.actions;

export default reportsSlice.reducer;
