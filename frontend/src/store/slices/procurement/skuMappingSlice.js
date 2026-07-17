import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { skuMappingService } from "../../../services/procurement/skuMappingService";
import { normalizePagedPayload } from "../inventory/inventorySliceHelpers";
import {
  createProcurementInitialState,
  getProcurementThunkError,
  setDetailFulfilled,
  setDetailPending,
  setDetailRejected,
  setListFulfilled,
  setListPending,
  setListRejected,
  setPageSize,
} from "./procurementSliceUtils";

const initialState = {
  ...createProcurementInitialState({
    Search: "",
    IsActive: "all",
    SalesChannelId: "",
    SortBy: "",
    SortDirection: "",
  }),
  unmapped: [],
  unmappedLoading: false,
  unmappedError: null,
  unmappedCount: 0,
};

const createThunk = (type, action, fallback) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await action(arg);
    } catch (error) {
      return rejectWithValue(getProcurementThunkError(error, fallback));
    }
  });

export const fetchSkuMappings = createThunk(
  "procurementSkuMappings/fetchList",
  skuMappingService.list,
  "Unable to load SKU mappings.",
);
export const fetchUnmappedSkus = createThunk(
  "procurementSkuMappings/fetchUnmapped",
  skuMappingService.unmapped,
  "Unable to load unmapped SKUs.",
);
export const fetchSkuMappingById = createThunk(
  "procurementSkuMappings/fetchById",
  skuMappingService.get,
  "Unable to load the SKU mapping.",
);
export const createSkuMapping = createThunk(
  "procurementSkuMappings/create",
  skuMappingService.create,
  "Unable to create the SKU mapping.",
);
export const updateSkuMapping = createThunk(
  "procurementSkuMappings/update",
  ({ id, payload }) => skuMappingService.update(id, payload),
  "Unable to update the SKU mapping.",
);
export const patchSkuMappingStatus = createThunk(
  "procurementSkuMappings/patchStatus",
  ({ id, payload }) => skuMappingService.patchStatus(id, payload),
  "Unable to update the SKU mapping status.",
);

const slice = createSlice({
  name: "procurementSkuMappings",
  initialState,
  reducers: {
    setSkuMappingFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSkuMappingPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setSkuMappingPageSize: setPageSize,
    clearSkuMappingError: (state) => {
      state.error = null;
      state.detailError = null;
      state.unmappedError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSkuMappings.pending, setListPending)
      .addCase(fetchSkuMappings.fulfilled, setListFulfilled)
      .addCase(fetchSkuMappings.rejected, setListRejected)
      .addCase(fetchUnmappedSkus.pending, (state) => {
        state.unmappedLoading = true;
        state.unmappedError = null;
      })
      .addCase(fetchUnmappedSkus.fulfilled, (state, action) => {
        const page = normalizePagedPayload(action.payload.data);
        state.unmappedLoading = false;
        state.unmapped = page.items;
        state.unmappedCount = page.totalCount;
      })
      .addCase(fetchUnmappedSkus.rejected, (state, action) => {
        state.unmappedLoading = false;
        state.unmappedError = action.payload ?? action.error.message;
      })
      .addCase(fetchSkuMappingById.pending, setDetailPending)
      .addCase(
        fetchSkuMappingById.fulfilled,
        setDetailFulfilled("mapping", "skuMapping"),
      )
      .addCase(fetchSkuMappingById.rejected, setDetailRejected);
  },
});

export const {
  clearSkuMappingError,
  setSkuMappingFilters,
  setSkuMappingPage,
  setSkuMappingPageSize,
} = slice.actions;
export default slice.reducer;
