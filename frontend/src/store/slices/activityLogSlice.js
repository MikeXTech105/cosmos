import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  DEFAULT_ACTIVITY_LOG_PAGE_SIZE,
} from "../../constants/activityLogConstants";
import { activityLogService } from "../../services/activityLogs/activityLogService";
import {
  getApiCorrelationId,
  getApiErrorMessage,
  getApiFieldErrors,
  getApiStatus,
} from "../../utils/apiError";
import { clampActivityLogPageSize } from "../../utils/activityLogQuery";

export const getDefaultActivityLogFilters = () => ({
  Action: "",
  CorrelationId: "",
  EntityId: "",
  EntityType: "",
  FromDate: "",
  HttpMethod: "",
  Module: "",
  Search: "",
  SortBy: "TimestampUtc",
  SortDirection: "desc",
  StatusCode: "",
  ToDate: "",
  UserId: "",
  Username: "",
});

const serializeError = (error, fallback) => {
  const status = getApiStatus(error) || null;

  return {
    correlationId: getApiCorrelationId(error) || null,
    fieldErrors: getApiFieldErrors(error),
    message:
      status === 403
        ? "You don't have access to activity logs."
        : getApiErrorMessage(error, fallback),
    status,
  };
};

const normalizePage = (payload) => {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const totalCount =
    Number(payload?.totalCount ?? items[0]?.totalCount ?? items.length) || 0;
  const pageSize = clampActivityLogPageSize(
    payload?.pageSize,
    DEFAULT_ACTIVITY_LOG_PAGE_SIZE,
  );

  return {
    items,
    pageNumber: Math.max(1, Number(payload?.pageNumber) || 1),
    pageSize,
    summary: payload?.summary ?? null,
    totalCount,
    totalPages: Math.max(
      1,
      Number(payload?.totalPages) || Math.ceil(totalCount / pageSize),
    ),
  };
};

const appendDistinct = (current, values) => {
  const next = [...current];
  const seen = new Set(current.map((value) => String(value).toLowerCase()));

  values.forEach((value) => {
    const text = String(value ?? "").trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    next.push(text);
  });

  return next.sort((left, right) => left.localeCompare(right));
};

const appendActors = (current, items) => {
  const byUsername = new Map(
    current.map((actor) => [String(actor.username).toLowerCase(), actor]),
  );

  items.forEach((item) => {
    const username = String(item?.username ?? "").trim();
    if (!username) return;
    const key = username.toLowerCase();
    const existing = byUsername.get(key);

    byUsername.set(key, {
      displayName:
        String(item?.userDisplayName ?? "").trim() ||
        existing?.displayName ||
        "",
      userId: item?.userId ?? existing?.userId ?? null,
      username,
    });
  });

  return [...byUsername.values()].sort((left, right) =>
    left.username.localeCompare(right.username),
  );
};

const initialState = {
  actions: [],
  actors: [],
  detailError: null,
  detailLoading: false,
  detailRequestId: null,
  error: null,
  filters: getDefaultActivityLogFilters(),
  items: [],
  listRequestId: null,
  loading: false,
  modules: [],
  pageNumber: 1,
  pageSize: DEFAULT_ACTIVITY_LOG_PAGE_SIZE,
  selected: null,
  selectedRequestEntityId: null,
  summary: null,
  totalCount: 0,
  totalPages: 1,
};

export const fetchActivityLogs = createAsyncThunk(
  "activityLogs/fetchList",
  async (params, { rejectWithValue, signal }) => {
    try {
      return await activityLogService.getLogs(params, { signal });
    } catch (error) {
      if (signal.aborted) throw error;
      return rejectWithValue(serializeError(error, "Unable to load activity logs."));
    }
  },
);

export const fetchActivityLogById = createAsyncThunk(
  "activityLogs/fetchById",
  async (id, { rejectWithValue, signal }) => {
    try {
      return await activityLogService.getLogById(id, { signal });
    } catch (error) {
      if (signal.aborted) throw error;
      return rejectWithValue(
        serializeError(error, "Unable to load activity details."),
      );
    }
  },
);

const activityLogSlice = createSlice({
  name: "activityLogs",
  initialState,
  reducers: {
    clearActivityLogDetail: (state) => {
      state.selected = null;
      state.detailError = null;
      state.selectedRequestEntityId = null;
    },
    clearActivityLogErrors: (state) => {
      state.error = null;
      state.detailError = null;
    },
    resetActivityLogFilters: (state) => {
      state.filters = getDefaultActivityLogFilters();
      state.pageNumber = 1;
    },
    setActivityLogFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pageNumber = 1;
      state.error = null;
    },
    setActivityLogPage: (state, action) => {
      state.pageNumber = Math.max(1, Number(action.payload) || 1);
    },
    setActivityLogPageSize: (state, action) => {
      state.pageSize = clampActivityLogPageSize(action.payload);
      state.pageNumber = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivityLogs.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.listRequestId = action.meta.requestId;
      })
      .addCase(fetchActivityLogs.fulfilled, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        const page = normalizePage(action.payload.data);
        state.items = page.items;
        state.pageNumber = page.pageNumber;
        state.pageSize = page.pageSize;
        state.summary = page.summary;
        state.totalCount = page.totalCount;
        state.totalPages = page.totalPages;
        state.modules = appendDistinct(
          state.modules,
          page.items.map((item) => item?.module),
        );
        state.actions = appendDistinct(
          state.actions,
          page.items.map((item) => item?.action),
        );
        state.actors = appendActors(state.actors, page.items);
        state.loading = false;
        state.listRequestId = null;
      })
      .addCase(fetchActivityLogs.rejected, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.listRequestId = null;
        if (!action.meta.aborted) {
          state.items = [];
          state.error = action.payload ?? {
            fieldErrors: {},
            message: action.error.message,
            status: null,
          };
        }
      })
      .addCase(fetchActivityLogById.pending, (state, action) => {
        state.detailError = null;
        state.detailLoading = true;
        state.detailRequestId = action.meta.requestId;
        state.selectedRequestEntityId = action.meta.arg;
        state.selected = null;
      })
      .addCase(fetchActivityLogById.fulfilled, (state, action) => {
        if (
          state.detailRequestId !== action.meta.requestId ||
          String(state.selectedRequestEntityId) !== String(action.meta.arg)
        ) {
          return;
        }
        state.selected = action.payload.data;
        state.detailLoading = false;
        state.detailRequestId = null;
      })
      .addCase(fetchActivityLogById.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailLoading = false;
        state.detailRequestId = null;
        if (!action.meta.aborted) {
          state.detailError = action.payload ?? {
            fieldErrors: {},
            message: action.error.message,
            status: null,
          };
        }
      });
  },
});

export const {
  clearActivityLogDetail,
  clearActivityLogErrors,
  resetActivityLogFilters,
  setActivityLogFilters,
  setActivityLogPage,
  setActivityLogPageSize,
} = activityLogSlice.actions;

export default activityLogSlice.reducer;
