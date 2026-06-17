import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { hrDepartmentService } from "../../../services/hr/departmentService";
import { getThunkError } from "../inventory/inventorySliceHelpers";
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

export const fetchHrDepartments = createAsyncThunk(
  "hrDepartments/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await hrDepartmentService.getDepartments(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load departments."),
      );
    }
  },
);

export const fetchHrDepartmentById = createAsyncThunk(
  "hrDepartments/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await hrDepartmentService.getDepartmentById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load department details."),
      );
    }
  },
);

export const createHrDepartment = createAsyncThunk(
  "hrDepartments/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrDepartmentService.createDepartment(payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to create department."),
      );
    }
  },
);

export const updateHrDepartment = createAsyncThunk(
  "hrDepartments/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await hrDepartmentService.updateDepartment(id, payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to update department."),
      );
    }
  },
);

export const deleteHrDepartment = createAsyncThunk(
  "hrDepartments/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await hrDepartmentService.deleteDepartment(id);

      return { id, response };
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to delete department."),
      );
    }
  },
);

const departmentSlice = createSlice({
  name: "hrDepartments",
  initialState,
  reducers: {
    setHrDepartmentFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setHrDepartmentPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setHrDepartmentPageSize: setHrPageSize,
    setSelectedHrDepartment: (state, action) => {
      state.selected = action.payload;
    },
    clearHrDepartmentError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHrDepartments.pending, setHrListPending)
      .addCase(fetchHrDepartments.fulfilled, setHrListFulfilled)
      .addCase(fetchHrDepartments.rejected, setHrListRejected)
      .addCase(fetchHrDepartmentById.pending, setHrDetailPending)
      .addCase(
        fetchHrDepartmentById.fulfilled,
        setHrDetailFulfilled("department"),
      )
      .addCase(fetchHrDepartmentById.rejected, setHrDetailRejected)
      .addCase(createHrDepartment.fulfilled, setHrSavedEntity("department"))
      .addCase(updateHrDepartment.fulfilled, setHrSavedEntity("department"))
      .addCase(deleteHrDepartment.fulfilled, setHrDeletedEntity);
  },
});

export const {
  clearHrDepartmentError,
  setHrDepartmentFilters,
  setHrDepartmentPage,
  setHrDepartmentPageSize,
  setSelectedHrDepartment,
} = departmentSlice.actions;

export default departmentSlice.reducer;
