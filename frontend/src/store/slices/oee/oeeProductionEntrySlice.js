import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { oeeProductionEntryService } from "../../../services/oee/oeeProductionEntryService";
import { getThunkError } from "../inventory/inventorySliceHelpers";
import {
  createOeeInitialState,
  setOeeDeletedEntity,
  setOeeDetailFulfilled,
  setOeeDetailPending,
  setOeeDetailRejected,
  setOeeListFulfilled,
  setOeeListPending,
  setOeeListRejected,
  setOeePageSize,
  setOeeSavedEntity,
} from "./oeeSliceUtils";

const initialState = {
  ...createOeeInitialState({
    FromDate: "",
    ToDate: "",
    MachineId: "",
    MouldId: "",
    DowntimeReasonId: "",
    SortBy: "productionDate",
    SortDirection: "desc",
  }),
  bulkSaving: false,
  bulkError: null,
  bulkResult: null,
};

export const fetchOeeProductionEntries = createAsyncThunk(
  "oeeProductionEntries/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await oeeProductionEntryService.getProductionEntries(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load production entries."),
      );
    }
  },
);

export const fetchOeeProductionEntryById = createAsyncThunk(
  "oeeProductionEntries/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await oeeProductionEntryService.getProductionEntryById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load production entry details."),
      );
    }
  },
);

export const createOeeProductionEntriesBulk = createAsyncThunk(
  "oeeProductionEntries/createBulk",
  async (payload, { rejectWithValue }) => {
    try {
      return await oeeProductionEntryService.createProductionEntriesBulk(
        payload,
      );
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to save daily production entries."),
      );
    }
  },
);

export const updateOeeProductionEntry = createAsyncThunk(
  "oeeProductionEntries/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await oeeProductionEntryService.updateProductionEntry(id, payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to update production entry."),
      );
    }
  },
);

export const deleteOeeProductionEntry = createAsyncThunk(
  "oeeProductionEntries/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response =
        await oeeProductionEntryService.deleteProductionEntry(id);

      return { id, response };
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to delete production entry."),
      );
    }
  },
);

const oeeProductionEntrySlice = createSlice({
  name: "oeeProductionEntries",
  initialState,
  reducers: {
    setOeeProductionEntryFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setOeeProductionEntryPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setOeeProductionEntryPageSize: setOeePageSize,
    clearOeeProductionEntryError: (state) => {
      state.error = null;
      state.detailError = null;
      state.bulkError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOeeProductionEntries.pending, setOeeListPending)
      .addCase(fetchOeeProductionEntries.fulfilled, setOeeListFulfilled)
      .addCase(fetchOeeProductionEntries.rejected, setOeeListRejected)
      .addCase(fetchOeeProductionEntryById.pending, setOeeDetailPending)
      .addCase(
        fetchOeeProductionEntryById.fulfilled,
        setOeeDetailFulfilled("productionEntry"),
      )
      .addCase(fetchOeeProductionEntryById.rejected, setOeeDetailRejected)
      .addCase(createOeeProductionEntriesBulk.pending, (state) => {
        state.bulkSaving = true;
        state.bulkError = null;
      })
      .addCase(createOeeProductionEntriesBulk.fulfilled, (state, action) => {
        state.bulkSaving = false;
        state.bulkResult = action.payload.data;
      })
      .addCase(createOeeProductionEntriesBulk.rejected, (state, action) => {
        state.bulkSaving = false;
        state.bulkError = action.payload ?? action.error.message;
      })
      .addCase(
        updateOeeProductionEntry.fulfilled,
        setOeeSavedEntity("productionEntry"),
      )
      .addCase(deleteOeeProductionEntry.fulfilled, setOeeDeletedEntity);
  },
});

export const {
  clearOeeProductionEntryError,
  setOeeProductionEntryFilters,
  setOeeProductionEntryPage,
  setOeeProductionEntryPageSize,
} = oeeProductionEntrySlice.actions;

export default oeeProductionEntrySlice.reducer;
