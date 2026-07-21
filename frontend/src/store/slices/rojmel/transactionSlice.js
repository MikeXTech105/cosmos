import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { transactionService } from "../../../services/rojmel/transactionService";
import { clampRojmelPageSize } from "../../../utils/rojmelQuery";
import {
  applyRojmelPage,
  createPagedState,
  extractRojmelEntity,
  getRojmelThunkError,
} from "./rojmelSliceHelpers";

const initialState = {
  ...createPagedState({
    CategoryId: "all",
    FromDate: "",
    LinkedUserId: "all",
    Search: "",
    SortBy: "transactionDate",
    SortDirection: "desc",
    Status: "all",
    ToDate: "",
    TransactionType: "all",
    WalletId: "all",
  }),
  detailError: null,
  detailLoading: false,
  detailRequestId: null,
  mutationError: null,
  mutationLoading: false,
  selected: null,
};

export const fetchRojmelTransactions = createAsyncThunk(
  "rojmelTransactions/fetchList",
  async (params, { rejectWithValue, signal }) => {
    try {
      return await transactionService.getTransactions(params, { signal });
    } catch (error) {
      return rejectWithValue(
        getRojmelThunkError(error, "Unable to load transactions."),
      );
    }
  },
);

export const fetchRojmelTransactionById = createAsyncThunk(
  "rojmelTransactions/fetchById",
  async (id, { rejectWithValue, signal }) => {
    try {
      return await transactionService.getTransactionById(id, { signal });
    } catch (error) {
      return rejectWithValue(
        getRojmelThunkError(error, "Unable to load transaction details."),
      );
    }
  },
);

const createMovementThunk = (type, serviceMethod, fallback) =>
  createAsyncThunk(type, async (payload, { rejectWithValue }) => {
    try {
      return await serviceMethod(payload);
    } catch (error) {
      return rejectWithValue(getRojmelThunkError(error, fallback));
    }
  });

export const createRojmelIncome = createMovementThunk(
  "rojmelTransactions/createIncome",
  transactionService.createIncome,
  "Unable to post income.",
);

export const createRojmelExpense = createMovementThunk(
  "rojmelTransactions/createExpense",
  transactionService.createExpense,
  "Unable to post expense.",
);

export const createRojmelAdjustment = createMovementThunk(
  "rojmelTransactions/createAdjustment",
  transactionService.createAdjustment,
  "Unable to post adjustment.",
);

export const cancelRojmelTransaction = createAsyncThunk(
  "rojmelTransactions/cancel",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      return await transactionService.cancelTransaction(id, reason);
    } catch (error) {
      return rejectWithValue(
        getRojmelThunkError(error, "Unable to reverse transaction."),
      );
    }
  },
);

const mutationTypes = [
  createRojmelIncome,
  createRojmelExpense,
  createRojmelAdjustment,
  cancelRojmelTransaction,
];

const transactionSlice = createSlice({
  name: "rojmelTransactions",
  initialState,
  reducers: {
    clearRojmelTransactionError: (state) => {
      state.error = null;
      state.detailError = null;
      state.mutationError = null;
    },
    setRojmelTransactionFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setRojmelTransactionPage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setRojmelTransactionPageSize: (state, action) => {
      state.pageNumber = 1;
      state.pageSize = clampRojmelPageSize(action.payload);
    },
    setSelectedRojmelTransaction: (state, action) => {
      state.selected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRojmelTransactions.pending, (state, action) => {
        state.error = null;
        state.loading = true;
        state.requestId = action.meta.requestId;
      })
      .addCase(fetchRojmelTransactions.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        applyRojmelPage(state, action.payload.data);
        state.loading = false;
        state.requestId = null;
      })
      .addCase(fetchRojmelTransactions.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.error = action.payload ?? action.error.message;
        state.list = [];
        state.loading = false;
        state.requestId = null;
      })
      .addCase(fetchRojmelTransactionById.pending, (state, action) => {
        state.detailError = null;
        state.detailLoading = true;
        state.detailRequestId = action.meta.requestId;
      })
      .addCase(fetchRojmelTransactionById.fulfilled, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailLoading = false;
        state.detailRequestId = null;
        state.selected = extractRojmelEntity(action.payload.data, "transaction");
      })
      .addCase(fetchRojmelTransactionById.rejected, (state, action) => {
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
          state.selected = extractRojmelEntity(
            action.payload?.data,
            "transaction",
          );
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
  clearRojmelTransactionError,
  setRojmelTransactionFilters,
  setRojmelTransactionPage,
  setRojmelTransactionPageSize,
  setSelectedRojmelTransaction,
} = transactionSlice.actions;

export default transactionSlice.reducer;
