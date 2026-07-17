import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { salesChannelService } from "../../../services/procurement/salesChannelService";
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

const initialState = createProcurementInitialState({
  Search: "",
  IsActive: "all",
  SortBy: "",
  SortDirection: "",
});

const thunk = (type, action, fallback) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await action(arg);
    } catch (error) {
      return rejectWithValue(getProcurementThunkError(error, fallback));
    }
  });

export const fetchSalesChannels = thunk(
  "procurementSalesChannels/fetchList",
  salesChannelService.list,
  "Unable to load sales channels.",
);
export const fetchSalesChannelById = thunk(
  "procurementSalesChannels/fetchById",
  salesChannelService.get,
  "Unable to load the sales channel.",
);
export const createSalesChannel = thunk(
  "procurementSalesChannels/create",
  salesChannelService.create,
  "Unable to create the sales channel.",
);
export const updateSalesChannel = thunk(
  "procurementSalesChannels/update",
  ({ id, payload }) => salesChannelService.update(id, payload),
  "Unable to update the sales channel.",
);
export const patchSalesChannelStatus = thunk(
  "procurementSalesChannels/patchStatus",
  ({ id, payload }) => salesChannelService.patchStatus(id, payload),
  "Unable to update the sales channel status.",
);

const slice = createSlice({
  name: "procurementSalesChannels",
  initialState,
  reducers: {
    setSalesChannelFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSalesChannelPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setSalesChannelPageSize: setPageSize,
    clearSalesChannelError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalesChannels.pending, setListPending)
      .addCase(fetchSalesChannels.fulfilled, setListFulfilled)
      .addCase(fetchSalesChannels.rejected, setListRejected)
      .addCase(fetchSalesChannelById.pending, setDetailPending)
      .addCase(
        fetchSalesChannelById.fulfilled,
        setDetailFulfilled("channel", "salesChannel"),
      )
      .addCase(fetchSalesChannelById.rejected, setDetailRejected);
  },
});

export const {
  clearSalesChannelError,
  setSalesChannelFilters,
  setSalesChannelPage,
  setSalesChannelPageSize,
} = slice.actions;
export default slice.reducer;
