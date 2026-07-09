import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { oeeDowntimeReasonService } from "../../../services/oee/oeeDowntimeReasonService";
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

const initialState = createOeeInitialState({
  Search: "",
  IsActive: "all",
  SortBy: "",
  SortDirection: "",
});

export const fetchOeeDowntimeReasons = createAsyncThunk(
  "oeeDowntimeReasons/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await oeeDowntimeReasonService.getDowntimeReasons(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load downtime reasons."),
      );
    }
  },
);

export const fetchOeeDowntimeReasonById = createAsyncThunk(
  "oeeDowntimeReasons/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await oeeDowntimeReasonService.getDowntimeReasonById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load downtime reason details."),
      );
    }
  },
);

export const createOeeDowntimeReason = createAsyncThunk(
  "oeeDowntimeReasons/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await oeeDowntimeReasonService.createDowntimeReason(payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to create downtime reason."),
      );
    }
  },
);

export const updateOeeDowntimeReason = createAsyncThunk(
  "oeeDowntimeReasons/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await oeeDowntimeReasonService.updateDowntimeReason(id, payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to update downtime reason."),
      );
    }
  },
);

export const deleteOeeDowntimeReason = createAsyncThunk(
  "oeeDowntimeReasons/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response =
        await oeeDowntimeReasonService.deleteDowntimeReason(id);

      return { id, response };
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to delete downtime reason."),
      );
    }
  },
);

const oeeDowntimeReasonSlice = createSlice({
  name: "oeeDowntimeReasons",
  initialState,
  reducers: {
    setOeeDowntimeReasonFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setOeeDowntimeReasonPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setOeeDowntimeReasonPageSize: setOeePageSize,
    clearOeeDowntimeReasonError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOeeDowntimeReasons.pending, setOeeListPending)
      .addCase(fetchOeeDowntimeReasons.fulfilled, setOeeListFulfilled)
      .addCase(fetchOeeDowntimeReasons.rejected, setOeeListRejected)
      .addCase(fetchOeeDowntimeReasonById.pending, setOeeDetailPending)
      .addCase(
        fetchOeeDowntimeReasonById.fulfilled,
        setOeeDetailFulfilled("downtimeReason"),
      )
      .addCase(fetchOeeDowntimeReasonById.rejected, setOeeDetailRejected)
      .addCase(
        createOeeDowntimeReason.fulfilled,
        setOeeSavedEntity("downtimeReason"),
      )
      .addCase(
        updateOeeDowntimeReason.fulfilled,
        setOeeSavedEntity("downtimeReason"),
      )
      .addCase(deleteOeeDowntimeReason.fulfilled, setOeeDeletedEntity);
  },
});

export const {
  clearOeeDowntimeReasonError,
  setOeeDowntimeReasonFilters,
  setOeeDowntimeReasonPage,
  setOeeDowntimeReasonPageSize,
} = oeeDowntimeReasonSlice.actions;

export default oeeDowntimeReasonSlice.reducer;
