import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { hrEmployeeService } from "../../../services/hr/employeeService";
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

const initialState = {
  ...createHrInitialState({
    Search: "",
    DepartmentId: "all",
    DesignationId: "all",
    Status: "all",
    IsActive: "all",
    SortBy: "",
    SortDirection: "",
  }),
  bankDetails: null,
  documents: [],
  lookups: {
    dropdown: [],
    reportingManagers: [],
  },
  relatedLoading: false,
};

export const fetchHrEmployees = createAsyncThunk(
  "hrEmployees/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await hrEmployeeService.getEmployees(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load employees."),
      );
    }
  },
);

export const fetchHrEmployeeById = createAsyncThunk(
  "hrEmployees/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await hrEmployeeService.getEmployeeById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load employee details."),
      );
    }
  },
);

export const createHrEmployee = createAsyncThunk(
  "hrEmployees/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await hrEmployeeService.createEmployee(payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to create employee."),
      );
    }
  },
);

export const updateHrEmployee = createAsyncThunk(
  "hrEmployees/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await hrEmployeeService.updateEmployee(id, payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to update employee."),
      );
    }
  },
);

export const deleteHrEmployee = createAsyncThunk(
  "hrEmployees/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await hrEmployeeService.deleteEmployee(id);

      return { id, response };
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to delete employee."),
      );
    }
  },
);

export const fetchHrEmployeeDropdown = createAsyncThunk(
  "hrEmployees/fetchDropdown",
  async (params, { rejectWithValue }) => {
    try {
      return await hrEmployeeService.getEmployeeDropdown(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load employee options."),
      );
    }
  },
);

export const fetchHrReportingManagers = createAsyncThunk(
  "hrEmployees/fetchReportingManagers",
  async (params, { rejectWithValue }) => {
    try {
      return await hrEmployeeService.getReportingManagers(params);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load reporting managers."),
      );
    }
  },
);

export const fetchHrEmployeeDocuments = createAsyncThunk(
  "hrEmployees/fetchDocuments",
  async (id, { rejectWithValue }) => {
    try {
      return await hrEmployeeService.getDocuments(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load employee documents."),
      );
    }
  },
);

export const fetchHrEmployeeBankDetails = createAsyncThunk(
  "hrEmployees/fetchBankDetails",
  async (id, { rejectWithValue }) => {
    try {
      return await hrEmployeeService.getBankDetails(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load bank details."),
      );
    }
  },
);

export const addHrEmployeeDocument = createAsyncThunk(
  "hrEmployees/addDocument",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await hrEmployeeService.addDocument(id, payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to add employee document."),
      );
    }
  },
);

export const deleteHrEmployeeDocument = createAsyncThunk(
  "hrEmployees/deleteDocument",
  async (documentId, { rejectWithValue }) => {
    try {
      const response = await hrEmployeeService.deleteDocument(documentId);

      return { documentId, response };
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to delete employee document."),
      );
    }
  },
);

export const saveHrEmployeeBankDetails = createAsyncThunk(
  "hrEmployees/saveBankDetails",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await hrEmployeeService.saveBankDetails(id, payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to save bank details."),
      );
    }
  },
);

const employeeSlice = createSlice({
  name: "hrEmployees",
  initialState,
  reducers: {
    setHrEmployeeFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setHrEmployeePage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setHrEmployeePageSize: setHrPageSize,
    setSelectedHrEmployee: (state, action) => {
      state.selected = action.payload;
    },
    clearHrEmployeeError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHrEmployees.pending, setHrListPending)
      .addCase(fetchHrEmployees.fulfilled, setHrListFulfilled)
      .addCase(fetchHrEmployees.rejected, setHrListRejected)
      .addCase(fetchHrEmployeeById.pending, setHrDetailPending)
      .addCase(fetchHrEmployeeById.fulfilled, setHrDetailFulfilled("employee"))
      .addCase(fetchHrEmployeeById.rejected, setHrDetailRejected)
      .addCase(createHrEmployee.fulfilled, setHrSavedEntity("employee"))
      .addCase(updateHrEmployee.fulfilled, setHrSavedEntity("employee"))
      .addCase(deleteHrEmployee.fulfilled, setHrDeletedEntity)
      .addCase(fetchHrEmployeeDropdown.fulfilled, (state, action) => {
        state.lookups.dropdown = Array.isArray(action.payload.data)
          ? action.payload.data
          : action.payload.data?.items ?? [];
      })
      .addCase(fetchHrReportingManagers.fulfilled, (state, action) => {
        state.lookups.reportingManagers = Array.isArray(action.payload.data)
          ? action.payload.data
          : action.payload.data?.items ?? [];
      })
      .addCase(fetchHrEmployeeDocuments.pending, (state) => {
        state.relatedLoading = true;
      })
      .addCase(fetchHrEmployeeDocuments.fulfilled, (state, action) => {
        state.relatedLoading = false;
        state.documents = Array.isArray(action.payload.data)
          ? action.payload.data
          : action.payload.data?.items ?? [];
      })
      .addCase(fetchHrEmployeeDocuments.rejected, (state, action) => {
        state.relatedLoading = false;
        state.detailError = action.payload ?? action.error.message;
      })
      .addCase(fetchHrEmployeeBankDetails.fulfilled, (state, action) => {
        state.bankDetails = action.payload.data;
      })
      .addCase(addHrEmployeeDocument.fulfilled, (state, action) => {
        const document =
          action.payload.data?.document ??
          action.payload.data?.employeeDocument ??
          action.payload.data;

        if (document) {
          state.documents = [document, ...state.documents];
        }
      })
      .addCase(deleteHrEmployeeDocument.fulfilled, (state, action) => {
        state.documents = state.documents.filter((document) => {
          const id = document.id ?? document.documentId;

          return String(id) !== String(action.payload.documentId);
        });
      })
      .addCase(saveHrEmployeeBankDetails.fulfilled, (state, action) => {
        state.bankDetails = action.payload.data;
      });
  },
});

export const {
  clearHrEmployeeError,
  setHrEmployeeFilters,
  setHrEmployeePage,
  setHrEmployeePageSize,
  setSelectedHrEmployee,
} = employeeSlice.actions;

export default employeeSlice.reducer;
