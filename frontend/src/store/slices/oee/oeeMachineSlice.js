import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { oeeMachineService } from "../../../services/oee/oeeMachineService";
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

export const fetchOeeMachines = createAsyncThunk(
  "oeeMachines/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await oeeMachineService.getMachines(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load OEE machines."),
      );
    }
  },
);

export const fetchOeeMachineById = createAsyncThunk(
  "oeeMachines/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await oeeMachineService.getMachineById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load machine details."),
      );
    }
  },
);

export const createOeeMachine = createAsyncThunk(
  "oeeMachines/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await oeeMachineService.createMachine(payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to create machine."),
      );
    }
  },
);

export const updateOeeMachine = createAsyncThunk(
  "oeeMachines/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await oeeMachineService.updateMachine(id, payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to update machine."),
      );
    }
  },
);

export const deleteOeeMachine = createAsyncThunk(
  "oeeMachines/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await oeeMachineService.deleteMachine(id);

      return { id, response };
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to delete machine."),
      );
    }
  },
);

const oeeMachineSlice = createSlice({
  name: "oeeMachines",
  initialState,
  reducers: {
    setOeeMachineFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setOeeMachinePage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setOeeMachinePageSize: setOeePageSize,
    clearOeeMachineError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOeeMachines.pending, setOeeListPending)
      .addCase(fetchOeeMachines.fulfilled, setOeeListFulfilled)
      .addCase(fetchOeeMachines.rejected, setOeeListRejected)
      .addCase(fetchOeeMachineById.pending, setOeeDetailPending)
      .addCase(fetchOeeMachineById.fulfilled, setOeeDetailFulfilled("machine"))
      .addCase(fetchOeeMachineById.rejected, setOeeDetailRejected)
      .addCase(createOeeMachine.fulfilled, setOeeSavedEntity("machine"))
      .addCase(updateOeeMachine.fulfilled, setOeeSavedEntity("machine"))
      .addCase(deleteOeeMachine.fulfilled, setOeeDeletedEntity);
  },
});

export const {
  clearOeeMachineError,
  setOeeMachineFilters,
  setOeeMachinePage,
  setOeeMachinePageSize,
} = oeeMachineSlice.actions;

export default oeeMachineSlice.reducer;
