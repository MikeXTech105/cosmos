import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  extractEntity,
  getRequestEntityId,
  getThunkError,
  getThunkFormError,
  normalizePagedPayload,
} from "../inventory/inventorySliceHelpers";
import {
  clampPurchasePageSize,
  PURCHASE_DEFAULT_PAGE_SIZE,
} from "../../../services/purchase/purchaseServiceUtils";

export const createPurchaseCrudSlice = ({
  entityKey = "record",
  initialFilters,
  name,
  service,
  serviceMethods,
}) => {
  const initialState = {
    list: [],
    loading: false,
    detailLoading: false,
    detailError: null,
    error: null,
    pageNumber: 1,
    pageSize: PURCHASE_DEFAULT_PAGE_SIZE,
    totalCount: 0,
    totalPages: 1,
    summary: null,
    summaryScope: "current-page",
    filters: initialFilters,
    selected: null,
    listRequestId: null,
    detailRequestId: null,
    selectedRequestEntityId: null,
  };

  const fetchList = createAsyncThunk(
    `${name}/fetchList`,
    async (params, { rejectWithValue }) => {
      try {
        return await service[serviceMethods.list](params);
      } catch (error) {
        return rejectWithValue(getThunkError(error, "Unable to load records."));
      }
    },
  );

  const fetchById = createAsyncThunk(
    `${name}/fetchById`,
    async (id, { rejectWithValue }) => {
      try {
        return await service[serviceMethods.detail](id);
      } catch (error) {
        return rejectWithValue(
          getThunkError(error, "Unable to load record details."),
        );
      }
    },
  );

  const createRecord = createAsyncThunk(
    `${name}/create`,
    async (payload, { rejectWithValue }) => {
      try {
        return await service[serviceMethods.create](payload);
      } catch (error) {
        return rejectWithValue(getThunkFormError(error, "Unable to create record."));
      }
    },
  );

  const updateRecord = createAsyncThunk(
    `${name}/update`,
    async ({ id, payload }, { rejectWithValue }) => {
      try {
        return await service[serviceMethods.update](id, payload);
      } catch (error) {
        return rejectWithValue(getThunkFormError(error, "Unable to update record."));
      }
    },
  );

  const deleteRecord = createAsyncThunk(
    `${name}/delete`,
    async (id, { rejectWithValue }) => {
      try {
        const response = await service[serviceMethods.delete](id);

        return { id, response };
      } catch (error) {
        return rejectWithValue(getThunkError(error, "Unable to delete record."));
      }
    },
  );

  const slice = createSlice({
    name,
    initialState,
    reducers: {
      clearError: (state) => {
        state.error = null;
        state.detailError = null;
      },
      setFilters: (state, action) => {
        state.filters = { ...state.filters, ...action.payload };
      },
      setPage: (state, action) => {
        state.pageNumber = action.payload;
      },
      setPageSize: (state, action) => {
        state.pageSize = clampPurchasePageSize(action.payload);
        state.pageNumber = 1;
      },
      setSelected: (state, action) => {
        state.selected = action.payload;
      },
    },
    extraReducers: (builder) => {
      builder
        .addCase(fetchList.pending, (state, action) => {
          state.loading = true;
          state.error = null;
          state.listRequestId = action.meta.requestId;
        })
        .addCase(fetchList.fulfilled, (state, action) => {
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
        .addCase(fetchList.rejected, (state, action) => {
          if (state.listRequestId !== action.meta.requestId) return;
          state.loading = false;
          state.list = [];
          state.error = getThunkError(action.payload ?? action.error);
          state.listRequestId = null;
        })
        .addCase(fetchById.pending, (state, action) => {
          state.detailLoading = true;
          state.detailError = null;
          state.detailRequestId = action.meta.requestId;
          state.selectedRequestEntityId = getRequestEntityId(action.meta.arg);
        })
        .addCase(fetchById.fulfilled, (state, action) => {
          if (
            state.detailRequestId !== action.meta.requestId ||
            String(state.selectedRequestEntityId) !== String(getRequestEntityId(action.meta.arg))
          ) return;
          state.detailLoading = false;
          state.selected = extractEntity(action.payload.data, entityKey);
          state.detailRequestId = null;
        })
        .addCase(fetchById.rejected, (state, action) => {
          if (state.detailRequestId !== action.meta.requestId) return;
          state.detailLoading = false;
          state.detailError = getThunkError(action.payload ?? action.error);
          state.detailRequestId = null;
        })
        .addCase(createRecord.pending, state => { state.error = null; })
        .addCase(createRecord.rejected, (state, action) => { state.error = getThunkError(action.payload ?? action.error, "Unable to create record."); })
        .addCase(updateRecord.pending, state => { state.error = null; })
        .addCase(updateRecord.rejected, (state, action) => { state.error = getThunkError(action.payload ?? action.error, "Unable to update record."); })
        .addCase(createRecord.fulfilled, (state, action) => {
          state.selected = extractEntity(action.payload.data, entityKey);
        })
        .addCase(updateRecord.fulfilled, (state, action) => {
          const record = extractEntity(action.payload.data, entityKey);

          state.selected = record;
          if (record?.id) {
            state.list = state.list.map((item) =>
              String(item.id) === String(record.id)
                ? { ...item, ...record }
                : item,
            );
          }
        })
        .addCase(deleteRecord.fulfilled, (state, action) => {
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

  return {
    actions: slice.actions,
    createRecord,
    deleteRecord,
    fetchById,
    fetchList,
    reducer: slice.reducer,
    updateRecord,
  };
};
