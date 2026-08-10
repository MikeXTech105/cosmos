import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { dataBookService } from "../../services/dataBook/dataBookService";
import {
  getApiCorrelationId,
  getApiErrorMessage,
  getApiStatus,
} from "../../utils/apiError";
import {
  clampDataBookPageSize,
  DEFAULT_DATA_BOOK_PAGE_SIZE,
} from "../../utils/dataBookQuery";

const getResponseData = (error) =>
  error?.apiError ?? error?.response?.data ?? error?.data ?? null;

const serializeError = (error, fallback) => {
  const source = getResponseData(error);
  const base =
    source && typeof source === "object" && !Array.isArray(source)
      ? { ...source }
      : {};

  return {
    ...base,
    correlationId: getApiCorrelationId(error) || base.correlationId || null,
    message: getApiErrorMessage(error, fallback),
    status: getApiStatus(error) || base.status || null,
  };
};

const getEntry = (payload) =>
  payload?.entry ?? payload?.dataBookEntry ?? payload?.record ?? payload;

const normalizePage = (payload) => ({
  items: Array.isArray(payload?.items) ? payload.items : [],
  pageNumber: Number(payload?.pageNumber) || 1,
  pageSize: clampDataBookPageSize(payload?.pageSize),
  summary: payload?.summary ?? null,
  totalCount: Number(payload?.totalCount) || 0,
  totalPages: Math.max(1, Number(payload?.totalPages) || 1),
});

const initialState = {
  activeTab: "all",
  detailError: null,
  detailLoading: false,
  detailRequestId: null,
  error: null,
  filters: {
    Category: "",
    FromDate: "",
    Search: "",
    ToDate: "",
  },
  history: [],
  historyError: null,
  historyLoading: false,
  historyRequestId: null,
  items: [],
  listRequestId: null,
  loading: false,
  pageNumber: 1,
  pageSize: DEFAULT_DATA_BOOK_PAGE_SIZE,
  selected: null,
  selectedRequestEntityId: null,
  summary: null,
  totalCount: 0,
  totalPages: 1,
};

export const fetchDataBookEntries = createAsyncThunk(
  "dataBook/fetchEntries",
  async (params, { rejectWithValue }) => {
    try {
      return await dataBookService.getEntries(params);
    } catch (error) {
      return rejectWithValue(
        serializeError(error, "Unable to load Data Book entries."),
      );
    }
  },
);

export const fetchDataBookEntryById = createAsyncThunk(
  "dataBook/fetchEntryById",
  async (id, { rejectWithValue }) => {
    try {
      return await dataBookService.getEntryById(id);
    } catch (error) {
      return rejectWithValue(
        serializeError(error, "Unable to load the entry."),
      );
    }
  },
);

export const fetchDataBookEntryHistory = createAsyncThunk(
  "dataBook/fetchEntryHistory",
  async (id, { rejectWithValue }) => {
    try {
      return await dataBookService.getEntryHistory(id);
    } catch (error) {
      return rejectWithValue(
        serializeError(error, "Unable to load entry history."),
      );
    }
  },
);

export const createDataBookEntry = createAsyncThunk(
  "dataBook/createEntry",
  async (payload, { rejectWithValue }) => {
    try {
      return await dataBookService.createEntry(payload);
    } catch (error) {
      return rejectWithValue(serializeError(error, "Unable to create entry."));
    }
  },
);

export const updateDataBookEntry = createAsyncThunk(
  "dataBook/updateEntry",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await dataBookService.updateEntry(id, payload);
    } catch (error) {
      return rejectWithValue(serializeError(error, "Unable to update entry."));
    }
  },
);

export const deleteDataBookEntry = createAsyncThunk(
  "dataBook/deleteEntry",
  async ({ id, rowVersion }, { rejectWithValue }) => {
    try {
      return await dataBookService.deleteEntry(id, rowVersion);
    } catch (error) {
      return rejectWithValue(serializeError(error, "Unable to delete entry."));
    }
  },
);

const dataBookSlice = createSlice({
  name: "dataBook",
  initialState,
  reducers: {
    clearDataBookDetail: (state) => {
      state.selected = null;
      state.detailError = null;
    },
    clearDataBookErrors: (state) => {
      state.error = null;
      state.detailError = null;
      state.historyError = null;
    },
    setDataBookFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setDataBookPage: (state, action) => {
      state.pageNumber = Math.max(1, Number(action.payload) || 1);
    },
    setDataBookPageSize: (state, action) => {
      state.pageSize = clampDataBookPageSize(action.payload);
      state.pageNumber = 1;
    },
    setDataBookTab: (state, action) => {
      state.activeTab = action.payload;
      state.pageNumber = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDataBookEntries.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.listRequestId = action.meta.requestId;
      })
      .addCase(fetchDataBookEntries.fulfilled, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        const page = normalizePage(action.payload.data);
        state.items = page.items;
        state.pageNumber = page.pageNumber;
        state.pageSize = page.pageSize;
        state.summary = page.summary;
        state.totalCount = page.totalCount;
        state.totalPages = page.totalPages;
        state.loading = false;
        state.listRequestId = null;
      })
      .addCase(fetchDataBookEntries.rejected, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.error = action.payload?.message ?? action.error.message;
        state.items = [];
        state.loading = false;
        state.listRequestId = null;
      })
      .addCase(fetchDataBookEntryById.pending, (state, action) => {
        state.detailError = null;
        state.detailLoading = true;
        state.detailRequestId = action.meta.requestId;
        state.selectedRequestEntityId = action.meta.arg;
      })
      .addCase(fetchDataBookEntryById.fulfilled, (state, action) => {
        if (
          state.detailRequestId !== action.meta.requestId ||
          String(state.selectedRequestEntityId) !== String(action.meta.arg)
        ) {
          return;
        }
        state.selected = getEntry(action.payload.data);
        state.detailLoading = false;
        state.detailRequestId = null;
      })
      .addCase(fetchDataBookEntryById.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailError = action.payload?.message ?? action.error.message;
        state.detailLoading = false;
        state.detailRequestId = null;
      })
      .addCase(fetchDataBookEntryHistory.pending, (state, action) => {
        state.historyError = null;
        state.historyLoading = true;
        state.historyRequestId = action.meta.requestId;
      })
      .addCase(fetchDataBookEntryHistory.fulfilled, (state, action) => {
        if (state.historyRequestId !== action.meta.requestId) return;
        const payload = action.payload.data;
        state.history = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : [];
        state.historyLoading = false;
        state.historyRequestId = null;
      })
      .addCase(fetchDataBookEntryHistory.rejected, (state, action) => {
        if (state.historyRequestId !== action.meta.requestId) return;
        state.history = [];
        state.historyError = action.payload?.message ?? action.error.message;
        state.historyLoading = false;
        state.historyRequestId = null;
      })
      .addCase(createDataBookEntry.fulfilled, (state, action) => {
        state.selected = getEntry(action.payload.data);
      })
      .addCase(updateDataBookEntry.fulfilled, (state, action) => {
        state.selected = getEntry(action.payload.data);
      });
  },
});

export const {
  clearDataBookDetail,
  clearDataBookErrors,
  setDataBookFilters,
  setDataBookPage,
  setDataBookPageSize,
  setDataBookTab,
} = dataBookSlice.actions;

export default dataBookSlice.reducer;
