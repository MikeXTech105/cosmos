import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { planningService } from "../../../services/procurement/planningService";
import { normalizePagedPayload } from "../inventory/inventorySliceHelpers";
import {
  createProcurementInitialState,
  getProcurementThunkError,
  setDetailRejected,
  setListFulfilled,
  setListPending,
  setListRejected,
  setPageSize,
} from "./procurementSliceUtils";

const initialState = {
  ...createProcurementInitialState({
    FromDate: "",
    ToDate: "",
    Status: "",
  }),
  lines: [],
  linesLoading: false,
  linesError: null,
  validation: null,
  validationLoading: false,
  validationError: null,
  preview: null,
  previewLoading: false,
  previewError: null,
};

const createThunk = (type, action, fallback) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await action(arg);
    } catch (error) {
      return rejectWithValue(getProcurementThunkError(error, fallback));
    }
  });

export const validateProcurementPlan = createThunk(
  "procurementPlanning/validate",
  planningService.validate,
  "Unable to validate the plan.",
);
export const previewProcurementPlan = createThunk(
  "procurementPlanning/preview",
  planningService.preview,
  "Unable to preview the plan.",
);
export const saveProcurementPlanRun = createThunk(
  "procurementPlanning/saveRun",
  planningService.saveRun,
  "Unable to save the draft plan.",
);
export const fetchProcurementPlanRuns = createThunk(
  "procurementPlanning/fetchRuns",
  planningService.listRuns,
  "Unable to load planning history.",
);
export const fetchProcurementPlanRun = createThunk(
  "procurementPlanning/fetchRun",
  planningService.getRun,
  "Unable to load the planning run.",
);
export const fetchProcurementPlanRunLines = createThunk(
  "procurementPlanning/fetchRunLines",
  ({ id, params }) => planningService.getRunLines(id, params),
  "Unable to load planning lines.",
);
export const adjustProcurementPlanLine = createThunk(
  "procurementPlanning/adjustLine",
  ({ runId, lineId, payload }) =>
    planningService.adjustLine(runId, lineId, payload),
  "Unable to adjust the planning line.",
);
export const finalizeProcurementPlanRun = createThunk(
  "procurementPlanning/finalizeRun",
  planningService.finalize,
  "Unable to finalize the planning run.",
);

const slice = createSlice({
  name: "procurementPlanning",
  initialState,
  reducers: {
    setPlanningFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPlanningPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setPlanningPageSize: setPageSize,
    clearPlanningPreview: (state) => {
      state.preview = null;
      state.previewError = null;
    },
    clearPlanningError: (state) => {
      state.error = null;
      state.detailError = null;
      state.linesError = null;
      state.validationError = null;
      state.previewError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProcurementPlanRuns.pending, setListPending)
      .addCase(fetchProcurementPlanRuns.fulfilled, setListFulfilled)
      .addCase(fetchProcurementPlanRuns.rejected, setListRejected)
      .addCase(fetchProcurementPlanRun.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchProcurementPlanRun.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selected = action.payload.data;
      })
      .addCase(fetchProcurementPlanRun.rejected, setDetailRejected)
      .addCase(fetchProcurementPlanRunLines.pending, (state) => {
        state.linesLoading = true;
        state.linesError = null;
      })
      .addCase(fetchProcurementPlanRunLines.fulfilled, (state, action) => {
        const page = normalizePagedPayload(action.payload.data);
        state.linesLoading = false;
        state.lines = page.items;
      })
      .addCase(fetchProcurementPlanRunLines.rejected, (state, action) => {
        state.linesLoading = false;
        state.linesError = action.payload ?? action.error.message;
      })
      .addCase(validateProcurementPlan.pending, (state) => {
        state.validationLoading = true;
        state.validationError = null;
      })
      .addCase(validateProcurementPlan.fulfilled, (state, action) => {
        state.validationLoading = false;
        state.validation = action.payload.data;
      })
      .addCase(validateProcurementPlan.rejected, (state, action) => {
        state.validationLoading = false;
        state.validationError = action.payload ?? action.error.message;
      })
      .addCase(previewProcurementPlan.pending, (state) => {
        state.previewLoading = true;
        state.previewError = null;
      })
      .addCase(previewProcurementPlan.fulfilled, (state, action) => {
        state.previewLoading = false;
        state.preview = action.payload.data;
      })
      .addCase(previewProcurementPlan.rejected, (state, action) => {
        state.previewLoading = false;
        state.previewError = action.payload ?? action.error.message;
      });
  },
});

export const {
  clearPlanningError,
  clearPlanningPreview,
  setPlanningFilters,
  setPlanningPage,
  setPlanningPageSize,
} = slice.actions;
export default slice.reducer;
