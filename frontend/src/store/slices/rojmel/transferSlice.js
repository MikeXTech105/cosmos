import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { transferService } from "../../../services/rojmel/transferService";
import { clampRojmelPageSize } from "../../../utils/rojmelQuery";
import {
  applyRojmelPage,
  createPagedState,
  extractRojmelEntity,
  getRojmelThunkError,
} from "./rojmelSliceHelpers";

const initialState = {
  ...createPagedState({
    FromDate: "",
    Search: "",
    Status: "all",
    ToDate: "",
    WalletId: "all",
  }),
  detailError: null,
  detailLoading: false,
  detailRequestId: null,
  mutationError: null,
  mutationLoading: false,
  selected: null,
};

export const fetchRojmelTransfers = createAsyncThunk(
  "rojmelTransfers/fetchList",
  async (params, { rejectWithValue, signal }) => {
    try {
      return await transferService.getTransfers(params, { signal });
    } catch (error) {
      return rejectWithValue(
        getRojmelThunkError(error, "Unable to load transfers."),
      );
    }
  },
);

export const fetchRojmelTransferById = createAsyncThunk(
  "rojmelTransfers/fetchById",
  async (id, { rejectWithValue, signal }) => {
    try {
      return await transferService.getTransferById(id, { signal });
    } catch (error) {
      return rejectWithValue(
        getRojmelThunkError(error, "Unable to load transfer details."),
      );
    }
  },
);

export const createRojmelTransfer = createAsyncThunk(
  "rojmelTransfers/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await transferService.createTransfer(payload);
    } catch (error) {
      return rejectWithValue(
        getRojmelThunkError(error, "Unable to post transfer."),
      );
    }
  },
);

export const cancelRojmelTransfer = createAsyncThunk(
  "rojmelTransfers/cancel",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      return await transferService.cancelTransfer(id, reason);
    } catch (error) {
      return rejectWithValue(
        getRojmelThunkError(error, "Unable to reverse transfer."),
      );
    }
  },
);

const mutationTypes = [createRojmelTransfer, cancelRojmelTransfer];

const transferSlice = createSlice({
  name: "rojmelTransfers",
  initialState,
  reducers: {
    clearRojmelTransferError: (state) => {
      state.error = null;
      state.detailError = null;
      state.mutationError = null;
    },
    setRojmelTransferFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setRojmelTransferPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setRojmelTransferPageSize: (state, action) => {
      state.pageNumber = 1;
      state.pageSize = clampRojmelPageSize(action.payload);
    },
    setSelectedRojmelTransfer: (state, action) => {
      state.selected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRojmelTransfers.pending, (state, action) => {
        state.error = null;
        state.loading = true;
        state.requestId = action.meta.requestId;
      })
      .addCase(fetchRojmelTransfers.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        applyRojmelPage(state, action.payload.data);
        state.loading = false;
        state.requestId = null;
      })
      .addCase(fetchRojmelTransfers.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.error = action.payload ?? action.error.message;
        state.list = [];
        state.loading = false;
        state.requestId = null;
      })
      .addCase(fetchRojmelTransferById.pending, (state, action) => {
        state.detailError = null;
        state.detailLoading = true;
        state.detailRequestId = action.meta.requestId;
      })
      .addCase(fetchRojmelTransferById.fulfilled, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailLoading = false;
        state.detailRequestId = null;
        state.selected = extractRojmelEntity(action.payload.data, "transfer");
      })
      .addCase(fetchRojmelTransferById.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailError = action.payload ?? action.error.message;
        state.detailLoading = false;
        state.detailRequestId = null;
      })
      .addMatcher(
        (action) => mutationTypes.some((thunk) => thunk.pending.type === action.type),
        (state) => {
          state.mutationError = null;
          state.mutationLoading = true;
        },
      )
      .addMatcher(
        (action) =>
          mutationTypes.some((thunk) => thunk.fulfilled.type === action.type),
        (state, action) => {
          state.mutationLoading = false;
          state.selected = extractRojmelEntity(action.payload?.data, "transfer");
        },
      )
      .addMatcher(
        (action) => mutationTypes.some((thunk) => thunk.rejected.type === action.type),
        (state, action) => {
          state.mutationError = action.payload ?? action.error.message;
          state.mutationLoading = false;
        },
      );
  },
});

export const {
  clearRojmelTransferError,
  setRojmelTransferFilters,
  setRojmelTransferPage,
  setRojmelTransferPageSize,
  setSelectedRojmelTransfer,
} = transferSlice.actions;

export default transferSlice.reducer;
