import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { categoryService } from "../../../services/inventory/categoryService";
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

export const fetchCategories = createAsyncThunk(
  "categories/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await categoryService.getCategories(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load categories."),
      );
    }
  },
);

export const fetchCategoryById = createAsyncThunk(
  "categories/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await categoryService.getCategoryById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load category details."),
      );
    }
  },
);

export const createCategory = createAsyncThunk(
  "categories/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await categoryService.createCategory(payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to create category."),
      );
    }
  },
);

export const updateCategory = createAsyncThunk(
  "categories/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await categoryService.updateCategory(id, payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to update category."),
      );
    }
  },
);

export const deleteCategory = createAsyncThunk(
  "categories/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await categoryService.deleteCategory(id);

      return { id, response };
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to delete category."),
      );
    }
  },
);

const categorySlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    setCategoryFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setCategoryPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setCategoryPageSize: (state, action) => {
      state.pageSize = clampInventoryPageSize(action.payload);
      state.pageNumber = 1;
    },
    setSelectedCategory: (state, action) => {
      state.selected = action.payload;
    },
    clearCategoryError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.listRequestId = action.meta.requestId;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
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
      .addCase(fetchCategories.rejected, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.list = [];
        state.error = action.payload ?? action.error.message;
        state.listRequestId = null;
      })
      .addCase(fetchCategoryById.pending, (state, action) => {
        state.detailLoading = true;
        state.detailError = null;
        state.detailRequestId = action.meta.requestId;
        state.selectedRequestEntityId = getRequestEntityId(action.meta.arg);
      })
      .addCase(fetchCategoryById.fulfilled, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId || String(state.selectedRequestEntityId) !== String(getRequestEntityId(action.meta.arg))) return;
        state.detailLoading = false;
        state.selected = extractEntity(action.payload.data, "category");
        state.detailRequestId = null;
      })
      .addCase(fetchCategoryById.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailLoading = false;
        state.detailError = action.payload ?? action.error.message;
        state.detailRequestId = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.selected = extractEntity(action.payload.data, "category");
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.selected = extractEntity(action.payload.data, "category");
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.list = state.list.filter(
          (category) => String(category.id) !== String(action.payload.id),
        );
        state.totalCount = Math.max(0, state.totalCount - 1);
        if (String(state.selected?.id) === String(action.payload.id)) {
          state.selected = null;
        }
      });
  },
});

export const {
  clearCategoryError,
  setCategoryFilters,
  setCategoryPage,
  setCategoryPageSize,
  setSelectedCategory,
} = categorySlice.actions;

export default categorySlice.reducer;
