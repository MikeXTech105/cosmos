import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { itemService } from "../../../services/inventory/itemService";
import {
  clampInventoryPageSize,
  DEFAULT_INVENTORY_PAGE_SIZE,
} from "../../../utils/inventoryQuery";
import {
  extractEntity,
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
  filters: {
    Search: "",
    IsActive: "all",
    CategoryId: "all",
    Barcode: "",
    ItemCode: "",
    SortBy: "",
    SortDirection: "",
  },
  selected: null,
};

export const fetchItems = createAsyncThunk(
  "items/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await itemService.getItems(params);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to load items."));
    }
  },
);

export const fetchItemById = createAsyncThunk(
  "items/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await itemService.getItemById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load item details."),
      );
    }
  },
);

export const createItem = createAsyncThunk(
  "items/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await itemService.createItem(payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to create item."));
    }
  },
);

export const updateItem = createAsyncThunk(
  "items/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await itemService.updateItem(id, payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to update item."));
    }
  },
);

export const deleteItem = createAsyncThunk(
  "items/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await itemService.deleteItem(id);

      return { id, response };
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to delete item."));
    }
  },
);

const itemSlice = createSlice({
  name: "items",
  initialState,
  reducers: {
    setItemFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setItemPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setItemPageSize: (state, action) => {
      state.pageSize = clampInventoryPageSize(action.payload);
      state.pageNumber = 1;
    },
    setSelectedItem: (state, action) => {
      state.selected = action.payload;
    },
    clearItemError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        const page = normalizePagedPayload(action.payload.data);

        state.loading = false;
        state.list = page.items;
        state.pageNumber = page.pageNumber;
        state.pageSize = page.pageSize;
        state.totalCount = page.totalCount;
        state.totalPages = page.totalPages;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.loading = false;
        state.list = [];
        state.error = action.payload ?? action.error.message;
      })
      .addCase(fetchItemById.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchItemById.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selected = extractEntity(action.payload.data, "item");
      })
      .addCase(fetchItemById.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError = action.payload ?? action.error.message;
      })
      .addCase(createItem.fulfilled, (state, action) => {
        state.selected = extractEntity(action.payload.data, "item");
      })
      .addCase(updateItem.fulfilled, (state, action) => {
        state.selected = extractEntity(action.payload.data, "item");
      })
      .addCase(deleteItem.fulfilled, (state, action) => {
        state.list = state.list.filter(
          (item) => String(item.id) !== String(action.payload.id),
        );
        state.totalCount = Math.max(0, state.totalCount - 1);
        if (String(state.selected?.id) === String(action.payload.id)) {
          state.selected = null;
        }
      });
  },
});

export const {
  clearItemError,
  setItemFilters,
  setItemPage,
  setItemPageSize,
  setSelectedItem,
} = itemSlice.actions;

export default itemSlice.reducer;
