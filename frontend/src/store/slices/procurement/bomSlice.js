import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { bomService } from "../../../services/procurement/bomService";
import { normalizePagedPayload } from "../inventory/inventorySliceHelpers";
import {
  createProcurementInitialState,
  getProcurementThunkError,
  setDetailRejected,
} from "./procurementSliceUtils";

const initialState = {
  ...createProcurementInitialState({ Search: "" }),
  issues: [],
  issuesLoading: false,
  issuesError: null,
};

const createThunk = (type, action, fallback) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await action(arg);
    } catch (error) {
      return rejectWithValue(getProcurementThunkError(error, fallback));
    }
  });

export const fetchProductBom = createThunk(
  "procurementBom/fetchProductBom",
  bomService.getProductBom,
  "Unable to load the product BOM.",
);
export const saveProductBom = createThunk(
  "procurementBom/saveProductBom",
  ({ productId, payload }) => bomService.saveProductBom(productId, payload),
  "Unable to save the product BOM.",
);
export const fetchBomIssues = createThunk(
  "procurementBom/fetchIssues",
  bomService.getIssues,
  "Unable to load BOM issues.",
);

const slice = createSlice({
  name: "procurementBom",
  initialState,
  reducers: {
    clearBomSelection: (state) => {
      state.selected = null;
      state.detailError = null;
    },
    clearBomError: (state) => {
      state.error = null;
      state.detailError = null;
      state.issuesError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductBom.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchProductBom.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selected = action.payload.data;
      })
      .addCase(fetchProductBom.rejected, setDetailRejected)
      .addCase(saveProductBom.fulfilled, (state, action) => {
        state.selected = action.payload.data;
      })
      .addCase(fetchBomIssues.pending, (state) => {
        state.issuesLoading = true;
        state.issuesError = null;
      })
      .addCase(fetchBomIssues.fulfilled, (state, action) => {
        const page = normalizePagedPayload(action.payload.data);
        state.issuesLoading = false;
        state.issues = page.items;
      })
      .addCase(fetchBomIssues.rejected, (state, action) => {
        state.issuesLoading = false;
        state.issuesError = action.payload ?? action.error.message;
      });
  },
});

export const { clearBomError, clearBomSelection } = slice.actions;
export default slice.reducer;
