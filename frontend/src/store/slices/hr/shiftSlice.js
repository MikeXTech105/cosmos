import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { hrShiftService } from "../../../services/hr/shiftService";
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

export const fetchHrShifts = createAsyncThunk(
  "hrShifts/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await hrShiftService.getShifts(params);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to load shifts."));
    }
  },
);

export const fetchHrShiftById = createAsyncThunk(
  "hrShifts/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await hrShiftService.getShiftById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load shift details."),
      );
    }
  },
);

export const createHrShift = createAsyncThunk(
  "hrShifts/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrShiftService.createShift(payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to create shift."));
    }
  },
);

export const updateHrShift = createAsyncThunk(
  "hrShifts/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await hrShiftService.updateShift(id, payload);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to update shift."));
    }
  },
);

export const deleteHrShift = createAsyncThunk(
  "hrShifts/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await hrShiftService.deleteShift(id);

      return { id, response };
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to delete shift."));
    }
  },
);

const shiftSlice = createSlice({
  name: "hrShifts",
  initialState,
  reducers: {
    setHrShiftFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setHrShiftPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setHrShiftPageSize: setHrPageSize,
    setSelectedHrShift: (state, action) => {
      state.selected = action.payload;
    },
    clearHrShiftError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHrShifts.pending, setHrListPending)
      .addCase(fetchHrShifts.fulfilled, setHrListFulfilled)
      .addCase(fetchHrShifts.rejected, setHrListRejected)
      .addCase(fetchHrShiftById.pending, setHrDetailPending)
      .addCase(fetchHrShiftById.fulfilled, setHrDetailFulfilled("shift"))
      .addCase(fetchHrShiftById.rejected, setHrDetailRejected)
      .addCase(createHrShift.fulfilled, setHrSavedEntity("shift"))
      .addCase(updateHrShift.fulfilled, setHrSavedEntity("shift"))
      .addCase(deleteHrShift.fulfilled, setHrDeletedEntity);
  },
});

export const {
  clearHrShiftError,
  setHrShiftFilters,
  setHrShiftPage,
  setHrShiftPageSize,
  setSelectedHrShift,
} = shiftSlice.actions;

export default shiftSlice.reducer;
