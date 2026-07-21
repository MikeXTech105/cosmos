import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { unitService } from "../../../services/inventory/unitService";
import {
  clampInventoryPageSize,
  DEFAULT_INVENTORY_PAGE_SIZE,
} from "../../../utils/inventoryQuery";
import {
  extractEntity,
  getRequestEntityId,
  getThunkError,
  normalizePagedPayload,
} from "./inventorySliceHelpers";

const initialState = {
  list: [],
  loading: false,
  detailLoading: false,
  detailError: null,
  error: null,
  pageNumber: 1,
  pageSize: DEFAULT_INVENTORY_PAGE_SIZE,
  totalCount: 0,
  totalPages: 1,
  summary: null,
  summaryScope: "current-page",
  filters: {
    Search: "",
    IsActive: "all",
    SortBy: "",
    SortDirection: "",
  },
  selected: null,
  listRequestId: null,
  detailRequestId: null,
  selectedRequestEntityId: null,
};

export const fetchUnits = createAsyncThunk(
  "units/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await unitService.getUnits(params);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to load units."));
    }
  },
);

export const fetchUnitById = createAsyncThunk(
  "units/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await unitService.getUnitById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load unit details."),
      );
    }
  },
);

export const createUnit = createAsyncThunk(
  "units/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await unitService.createUnit(payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to create unit."));
    }
  },
);

export const updateUnit = createAsyncThunk(
  "units/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await unitService.updateUnit(id, payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to update unit."));
    }
  },
);

export const deleteUnit = createAsyncThunk(
  "units/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await unitService.deleteUnit(id);

      return { id, response };
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to delete unit."));
    }
  },
);

const unitSlice = createSlice({
  name: "units",
  initialState,
  reducers: {
    setUnitFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setUnitPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setUnitPageSize: (state, action) => {
      state.pageSize = clampInventoryPageSize(action.payload);
      state.pageNumber = 1;
    },
    setSelectedUnit: (state, action) => {
      state.selected = action.payload;
    },
    clearUnitError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUnits.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.listRequestId = action.meta.requestId;
      })
      .addCase(fetchUnits.fulfilled, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        const page = normalizePagedPayload(action.payload.data);

        state.loading = false;
        state.list = page.items;
        state.pageNumber = page.pageNumber;
        state.pageSize = page.pageSize;
        state.totalCount = page.totalCount;
        state.totalPages = page.totalPages;
        state.summary = page.summary;
        state.summaryScope = page.summaryScope;
        state.listRequestId = null;
      })
      .addCase(fetchUnits.rejected, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.list = [];
        state.error = action.payload ?? action.error.message;
        state.listRequestId = null;
      })
      .addCase(fetchUnitById.pending, (state, action) => {
        state.detailLoading = true;
        state.detailError = null;
        state.detailRequestId = action.meta.requestId;
        state.selectedRequestEntityId = getRequestEntityId(action.meta.arg);
      })
      .addCase(fetchUnitById.fulfilled, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId || String(state.selectedRequestEntityId) !== String(getRequestEntityId(action.meta.arg))) return;
        state.detailLoading = false;
        state.selected = extractEntity(action.payload.data, "unit");
        state.detailRequestId = null;
      })
      .addCase(fetchUnitById.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailLoading = false;
        state.detailError = action.payload ?? action.error.message;
        state.detailRequestId = null;
      })
      .addCase(createUnit.fulfilled, (state, action) => {
        state.selected = extractEntity(action.payload.data, "unit");
      })
      .addCase(updateUnit.fulfilled, (state, action) => {
        state.selected = extractEntity(action.payload.data, "unit");
      })
      .addCase(deleteUnit.fulfilled, (state, action) => {
        state.list = state.list.filter(
          (unit) => String(unit.id) !== String(action.payload.id),
        );
        state.totalCount = Math.max(0, state.totalCount - 1);
        if (String(state.selected?.id) === String(action.payload.id)) {
          state.selected = null;
        }
      });
  },
});

export const {
  clearUnitError,
  setSelectedUnit,
  setUnitFilters,
  setUnitPage,
  setUnitPageSize,
} = unitSlice.actions;

export default unitSlice.reducer;
