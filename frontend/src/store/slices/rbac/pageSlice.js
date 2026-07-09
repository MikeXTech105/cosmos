import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { pageService } from "../../../services/rbac/pageService";
import {
  extractSinglePage,
  normalizePage,
  normalizePageListPayload,
} from "../../../pages/rbac/pages/pageHelpers";
import { getThunkError } from "../inventory/inventorySliceHelpers";

const initialState = {
  list: [],
  loading: false,
  detailLoading: false,
  error: null,
  detailError: null,
  selected: null,
  filters: {
    parentPageId: "all",
    search: "",
    status: "all",
  },
  viewMode: "table",
  expandedGroupIds: {},
  expandedTreeIds: {},
};

export const fetchRbacPages = createAsyncThunk(
  "rbacPages/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await pageService.getPages(params);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to load pages."));
    }
  },
);

export const fetchRbacPageById = createAsyncThunk(
  "rbacPages/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await pageService.getPageById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load page details."),
      );
    }
  },
);

export const createRbacPage = createAsyncThunk(
  "rbacPages/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await pageService.createPage(payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to create page."));
    }
  },
);

export const updateRbacPage = createAsyncThunk(
  "rbacPages/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await pageService.updatePage(id, payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to update page."));
    }
  },
);

export const deleteRbacPage = createAsyncThunk(
  "rbacPages/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await pageService.deletePage(id);

      return { id, response };
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to delete page."));
    }
  },
);

const pageSlice = createSlice({
  name: "rbacPages",
  initialState,
  reducers: {
    setRbacPageFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearRbacPageFilters: (state) => {
      state.filters = initialState.filters;
    },
    setRbacPageViewMode: (state, action) => {
      state.viewMode = action.payload;
    },
    toggleRbacPageGroup: (state, action) => {
      const key = String(action.payload);
      state.expandedGroupIds[key] =
        state.expandedGroupIds[key] === undefined
          ? false
          : !state.expandedGroupIds[key];
    },
    setRbacPageGroupsExpanded: (state, action) => {
      if (!Array.isArray(action.payload)) {
        const expanded = action.payload?.expanded ?? true;
        const ids = action.payload?.ids ?? [];

        state.expandedGroupIds = Object.fromEntries(
          ids.map((id) => [String(id), Boolean(expanded)]),
        );
        return;
      }

      state.expandedGroupIds = Object.fromEntries(
        action.payload.map((id) => [String(id), true]),
      );
    },
    toggleRbacPageTreeNode: (state, action) => {
      const key = String(action.payload);
      state.expandedTreeIds[key] =
        state.expandedTreeIds[key] === undefined
          ? false
          : !state.expandedTreeIds[key];
    },
    setRbacPageTreeExpanded: (state, action) => {
      if (!Array.isArray(action.payload)) {
        const expanded = action.payload?.expanded ?? true;
        const ids = action.payload?.ids ?? [];

        state.expandedTreeIds = Object.fromEntries(
          ids.map((id) => [String(id), Boolean(expanded)]),
        );
        return;
      }

      state.expandedTreeIds = Object.fromEntries(
        action.payload.map((id) => [String(id), true]),
      );
    },
    clearRbacPageError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRbacPages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRbacPages.fulfilled, (state, action) => {
        state.loading = false;
        state.list = normalizePageListPayload(
          action.payload.data,
          action.payload.meta,
        );
      })
      .addCase(fetchRbacPages.rejected, (state, action) => {
        state.loading = false;
        state.list = [];
        state.error = action.payload ?? action.error.message;
      })
      .addCase(fetchRbacPageById.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchRbacPageById.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selected = normalizePage(extractSinglePage(action.payload.data));
      })
      .addCase(fetchRbacPageById.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError = action.payload ?? action.error.message;
      })
      .addCase(createRbacPage.fulfilled, (state, action) => {
        state.selected = normalizePage(extractSinglePage(action.payload.data));
      })
      .addCase(updateRbacPage.fulfilled, (state, action) => {
        state.selected = normalizePage(extractSinglePage(action.payload.data));
      })
      .addCase(deleteRbacPage.fulfilled, (state, action) => {
        state.list = state.list.filter(
          (page) => String(page.id) !== String(action.payload.id),
        );
      });
  },
});

export const {
  clearRbacPageError,
  clearRbacPageFilters,
  setRbacPageFilters,
  setRbacPageGroupsExpanded,
  setRbacPageTreeExpanded,
  setRbacPageViewMode,
  toggleRbacPageGroup,
  toggleRbacPageTreeNode,
} = pageSlice.actions;

export default pageSlice.reducer;
