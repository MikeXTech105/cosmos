import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { oeeMouldService } from "../../../services/oee/oeeMouldService";
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

export const fetchOeeMoulds = createAsyncThunk(
  "oeeMoulds/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await oeeMouldService.getMoulds(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load OEE moulds."),
      );
    }
  },
);

export const fetchOeeMouldById = createAsyncThunk(
  "oeeMoulds/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await oeeMouldService.getMouldById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load mould details."),
      );
    }
  },
);

export const createOeeMould = createAsyncThunk(
  "oeeMoulds/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await oeeMouldService.createMould(payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to create mould."));
    }
  },
);

export const updateOeeMould = createAsyncThunk(
  "oeeMoulds/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await oeeMouldService.updateMould(id, payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to update mould."));
    }
  },
);

export const deleteOeeMould = createAsyncThunk(
  "oeeMoulds/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await oeeMouldService.deleteMould(id);

      return { id, response };
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to delete mould."));
    }
  },
);

const oeeMouldSlice = createSlice({
  name: "oeeMoulds",
  initialState,
  reducers: {
    setOeeMouldFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setOeeMouldPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setOeeMouldPageSize: setOeePageSize,
    clearOeeMouldError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOeeMoulds.pending, setOeeListPending)
      .addCase(fetchOeeMoulds.fulfilled, setOeeListFulfilled)
      .addCase(fetchOeeMoulds.rejected, setOeeListRejected)
      .addCase(fetchOeeMouldById.pending, setOeeDetailPending)
      .addCase(fetchOeeMouldById.fulfilled, setOeeDetailFulfilled("mould"))
      .addCase(fetchOeeMouldById.rejected, setOeeDetailRejected)
      .addCase(createOeeMould.fulfilled, setOeeSavedEntity("mould"))
      .addCase(updateOeeMould.fulfilled, setOeeSavedEntity("mould"))
      .addCase(deleteOeeMould.fulfilled, setOeeDeletedEntity);
  },
});

export const {
  clearOeeMouldError,
  setOeeMouldFilters,
  setOeeMouldPage,
  setOeeMouldPageSize,
} = oeeMouldSlice.actions;

export default oeeMouldSlice.reducer;
