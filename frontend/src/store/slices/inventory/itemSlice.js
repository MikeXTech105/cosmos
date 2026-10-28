import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { itemService } from "../../../services/inventory/itemService";
import {
  clampInventoryPageSize,
  DEFAULT_INVENTORY_PAGE_SIZE,
} from "../../../utils/inventoryQuery";
import {
  extractEntity,
  getRequestEntityId,
  getThunkError,
  getThunkFormError,
  normalizePagedPayload,
} from "./inventorySliceHelpers";
import { getMediaUrl } from "../../../utils/mediaUrl";

const normalizeItemImage = (item) => {
  if (!item || typeof item !== "object") {
    return item;
  }

  return {
    ...item,
    imageUrl: getMediaUrl(item, [
      "imageUrl",
      "imageURL",
      "imagePath",
      "image",
      "photoUrl",
      "primaryImageUrl",
    ]),
  };
};

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
    CategoryId: "all",
    ProcurementClassification: "all",
    Barcode: "",
    ItemCode: "",
    SortBy: "",
    SortDirection: "",
  },
  selected: null,
  listRequestId: null,
  detailRequestId: null,
  selectedRequestEntityId: null,
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
      return rejectWithValue(getThunkFormError(error, "Unable to create item."));
    }
  },
);

export const updateItem = createAsyncThunk(
  "items/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await itemService.updateItem(id, payload);
    } catch (error) {
      return rejectWithValue(getThunkFormError(error, "Unable to update item."));
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
      .addCase(fetchItems.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.listRequestId = action.meta.requestId;
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        const page = normalizePagedPayload(action.payload.data);

        state.loading = false;
        state.list = page.items.map(normalizeItemImage);
        state.pageNumber = page.pageNumber;
        state.pageSize = page.pageSize;
        state.totalCount = page.totalCount;
        state.totalPages = page.totalPages;
        state.summary = page.summary;
        state.summaryScope = page.summaryScope;
        state.listRequestId = null;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.list = [];
        state.error = getThunkError(action.payload ?? action.error);
        state.listRequestId = null;
      })
      .addCase(fetchItemById.pending, (state, action) => {
        state.detailLoading = true;
        state.detailError = null;
        state.detailRequestId = action.meta.requestId;
        state.selectedRequestEntityId = getRequestEntityId(action.meta.arg);
      })
      .addCase(fetchItemById.fulfilled, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId || String(state.selectedRequestEntityId) !== String(getRequestEntityId(action.meta.arg))) return;
        state.detailLoading = false;
        state.selected = normalizeItemImage(
          extractEntity(action.payload.data, "item"),
        );
        state.detailRequestId = null;
      })
      .addCase(fetchItemById.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailLoading = false;
        state.detailError = getThunkError(action.payload ?? action.error);
        state.detailRequestId = null;
      })
      .addCase(createItem.pending, state => { state.error = null; })
      .addCase(createItem.rejected, (state, action) => { state.error = getThunkError(action.payload ?? action.error, "Unable to create item."); })
      .addCase(updateItem.pending, state => { state.error = null; })
      .addCase(updateItem.rejected, (state, action) => { state.error = getThunkError(action.payload ?? action.error, "Unable to update item."); })
      .addCase(createItem.fulfilled, (state, action) => {
        state.selected = normalizeItemImage(
          extractEntity(action.payload.data, "item"),
        );
      })
      .addCase(updateItem.fulfilled, (state, action) => {
        state.selected = normalizeItemImage(
          extractEntity(action.payload.data, "item"),
        );
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
