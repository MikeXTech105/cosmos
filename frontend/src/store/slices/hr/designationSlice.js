import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { hrDesignationService } from "../../../services/hr/designationService";
import { getThunkError } from "../inventorySliceHelpers";
import {
  createHrInitialState,
  setHrDeletedEntity,
  setHrDetailFulfilled,
  setHrDetailPending,
  setHrDetailRejected,
  setHrListFulfilled,
  setHrListPending,
  setHrListRejected,
  setHrPageSize,
  setHrSavedEntity,
} from "./hrSliceUtils";

const initialState = createHrInitialState({
  Search: "",
  IsActive: "all",
  SortBy: "",
  SortDirection: "",
});

export const fetchHrDesignations = createAsyncThunk(
  "hrDesignations/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await hrDesignationService.getDesignations(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load designations."),
      );
    }
  },
);

export const fetchHrDesignationById = createAsyncThunk(
  "hrDesignations/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await hrDesignationService.getDesignationById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load designation details."),
      );
    }
  },
);

export const createHrDesignation = createAsyncThunk(
  "hrDesignations/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrDesignationService.createDesignation(payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to create designation."),
      );
    }
  },
);

export const updateHrDesignation = createAsyncThunk(
  "hrDesignations/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await hrDesignationService.updateDesignation(id, payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to update designation."),
      );
    }
  },
);

export const deleteHrDesignation = createAsyncThunk(
  "hrDesignations/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await hrDesignationService.deleteDesignation(id);

      return { id, response };
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to delete designation."),
      );
    }
  },
);

const designationSlice = createSlice({
  name: "hrDesignations",
  initialState,
  reducers: {
    setHrDesignationFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setHrDesignationPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setHrDesignationPageSize: setHrPageSize,
    setSelectedHrDesignation: (state, action) => {
      state.selected = action.payload;
    },
    clearHrDesignationError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHrDesignations.pending, setHrListPending)
      .addCase(fetchHrDesignations.fulfilled, setHrListFulfilled)
      .addCase(fetchHrDesignations.rejected, setHrListRejected)
      .addCase(fetchHrDesignationById.pending, setHrDetailPending)
      .addCase(
        fetchHrDesignationById.fulfilled,
        setHrDetailFulfilled("designation"),
      )
      .addCase(fetchHrDesignationById.rejected, setHrDetailRejected)
      .addCase(createHrDesignation.fulfilled, setHrSavedEntity("designation"))
      .addCase(updateHrDesignation.fulfilled, setHrSavedEntity("designation"))
      .addCase(deleteHrDesignation.fulfilled, setHrDeletedEntity);
  },
});

export const {
  clearHrDesignationError,
  setHrDesignationFilters,
  setHrDesignationPage,
  setHrDesignationPageSize,
  setSelectedHrDesignation,
} = designationSlice.actions;

export default designationSlice.reducer;
