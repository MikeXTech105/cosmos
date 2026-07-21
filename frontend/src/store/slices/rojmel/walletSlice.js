import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { walletService } from "../../../services/rojmel/walletService";
import { clampRojmelPageSize } from "../../../utils/rojmelQuery";
import {
  applyRojmelPage,
  createPagedState,
  extractRojmelEntity,
  getRojmelThunkError,
} from "./rojmelSliceHelpers";

const initialState = {
  ...createPagedState({
    IsActive: "all",
    LinkedUserId: "all",
    Search: "",
    SortBy: "",
    SortDirection: "",
    WalletType: "all",
  }),
  balanceById: {},
  balanceLoadingById: {},
  detailError: null,
  detailLoading: false,
  detailRequestId: null,
  mutationError: null,
  mutationLoading: false,
  selected: null,
};

export const fetchRojmelWallets = createAsyncThunk(
  "rojmelWallets/fetchList",
  async (params, { rejectWithValue, signal }) => {
    try {
      return await walletService.getWallets(params, { signal });
    } catch (error) {
      return rejectWithValue(
        getRojmelThunkError(error, "Unable to load wallets."),
      );
    }
  },
);

export const fetchRojmelWalletById = createAsyncThunk(
  "rojmelWallets/fetchById",
  async (id, { rejectWithValue, signal }) => {
    try {
      return await walletService.getWalletById(id, { signal });
    } catch (error) {
      return rejectWithValue(
        getRojmelThunkError(error, "Unable to load wallet details."),
      );
    }
  },
);

export const fetchRojmelWalletBalance = createAsyncThunk(
  "rojmelWallets/fetchBalance",
  async (id, { rejectWithValue, signal }) => {
    try {
      const response = await walletService.getWalletBalance(id, { signal });
      return { id, response };
    } catch (error) {
      return rejectWithValue({
        id,
        message: getRojmelThunkError(error, "Unable to load wallet balance."),
      });
    }
  },
);

export const createRojmelWallet = createAsyncThunk(
  "rojmelWallets/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await walletService.createWallet(payload);
    } catch (error) {
      return rejectWithValue(
        getRojmelThunkError(error, "Unable to create wallet."),
      );
    }
  },
);

export const updateRojmelWallet = createAsyncThunk(
  "rojmelWallets/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await walletService.updateWallet(id, payload);
    } catch (error) {
      return rejectWithValue(
        getRojmelThunkError(error, "Unable to update wallet."),
      );
    }
  },
);

export const changeRojmelWalletStatus = createAsyncThunk(
  "rojmelWallets/changeStatus",
  async ({ id, isActive }, { rejectWithValue }) => {
    try {
      const response = await walletService.changeWalletStatus(id, isActive);
      return { id, isActive, response };
    } catch (error) {
      return rejectWithValue(
        getRojmelThunkError(error, "Unable to change wallet status."),
      );
    }
  },
);

const walletSlice = createSlice({
  name: "rojmelWallets",
  initialState,
  reducers: {
    clearRojmelWalletError: (state) => {
      state.error = null;
      state.detailError = null;
      state.mutationError = null;
    },
    setRojmelWalletFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setRojmelWalletPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setRojmelWalletPageSize: (state, action) => {
      state.pageNumber = 1;
      state.pageSize = clampRojmelPageSize(action.payload);
    },
    setSelectedRojmelWallet: (state, action) => {
      state.selected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRojmelWallets.pending, (state, action) => {
        state.error = null;
        state.loading = true;
        state.requestId = action.meta.requestId;
      })
      .addCase(fetchRojmelWallets.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        applyRojmelPage(state, action.payload.data);
        state.loading = false;
        state.requestId = null;
      })
      .addCase(fetchRojmelWallets.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.error = action.payload ?? action.error.message;
        state.list = [];
        state.loading = false;
        state.requestId = null;
      })
      .addCase(fetchRojmelWalletById.pending, (state, action) => {
        state.detailError = null;
        state.detailLoading = true;
        state.detailRequestId = action.meta.requestId;
      })
      .addCase(fetchRojmelWalletById.fulfilled, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailLoading = false;
        state.detailRequestId = null;
        state.selected = extractRojmelEntity(action.payload.data, "wallet");
      })
      .addCase(fetchRojmelWalletById.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailError = action.payload ?? action.error.message;
        state.detailLoading = false;
        state.detailRequestId = null;
      })
      .addCase(fetchRojmelWalletBalance.pending, (state, action) => {
        state.balanceLoadingById[action.meta.arg] = true;
      })
      .addCase(fetchRojmelWalletBalance.fulfilled, (state, action) => {
        state.balanceLoadingById[action.payload.id] = false;
        state.balanceById[action.payload.id] = extractRojmelEntity(
          action.payload.response.data,
          "balance",
        );
      })
      .addCase(fetchRojmelWalletBalance.rejected, (state, action) => {
        const id = action.payload?.id ?? action.meta.arg;
        state.balanceLoadingById[id] = false;
      })
      .addMatcher(
        (action) =>
          [
            createRojmelWallet.pending.type,
            updateRojmelWallet.pending.type,
            changeRojmelWalletStatus.pending.type,
          ].includes(action.type),
        (state) => {
          state.mutationError = null;
          state.mutationLoading = true;
        },
      )
      .addMatcher(
        (action) =>
          [
            createRojmelWallet.fulfilled.type,
            updateRojmelWallet.fulfilled.type,
            changeRojmelWalletStatus.fulfilled.type,
          ].includes(action.type),
        (state) => {
          state.mutationLoading = false;
        },
      )
      .addMatcher(
        (action) =>
          [
            createRojmelWallet.rejected.type,
            updateRojmelWallet.rejected.type,
            changeRojmelWalletStatus.rejected.type,
          ].includes(action.type),
        (state, action) => {
          state.mutationError = action.payload ?? action.error.message;
          state.mutationLoading = false;
        },
      );
  },
});

export const {
  clearRojmelWalletError,
  setRojmelWalletFilters,
  setRojmelWalletPage,
  setRojmelWalletPageSize,
  setSelectedRojmelWallet,
} = walletSlice.actions;

export default walletSlice.reducer;
