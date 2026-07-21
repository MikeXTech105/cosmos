import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { myWalletService } from "../../../services/rojmel/myWalletService";
import { clampRojmelPageSize } from "../../../utils/rojmelQuery";
import {
  applyRojmelPage,
  createPagedState,
  extractRojmelEntity,
  getRojmelThunkError,
} from "./rojmelSliceHelpers";

const defaultFilters = {
  CategoryId: "all",
  FromDate: "",
  Search: "",
  SortBy: "transactionDate",
  SortDirection: "desc",
  ToDate: "",
  TransactionType: "all",
};

const initialState = {
  categoriesByType: {},
  categoriesError: null,
  categoriesLoading: false,
  ledger: createPagedState(defaultFilters),
  mutationError: null,
  mutationLoading: false,
  transactions: createPagedState(defaultFilters),
  wallet: null,
  walletError: null,
  walletLoading: false,
  walletRequestId: null,
};

export const fetchMyRojmelWallet = createAsyncThunk(
  "myRojmelWallet/fetchWallet",
  async (_, { rejectWithValue, signal }) => {
    try {
      return await myWalletService.getWallet({ signal });
    } catch (error) {
      return rejectWithValue(
        getRojmelThunkError(error, "Unable to load your wallet."),
      );
    }
  },
);

const createPagedThunk = (type, serviceMethod, fallback) =>
  createAsyncThunk(type, async (params, { rejectWithValue, signal }) => {
    try {
      return await serviceMethod(params, { signal });
    } catch (error) {
      return rejectWithValue(getRojmelThunkError(error, fallback));
    }
  });

export const fetchMyRojmelTransactions = createPagedThunk(
  "myRojmelWallet/fetchTransactions",
  myWalletService.getTransactions,
  "Unable to load your transactions.",
);

export const fetchMyRojmelLedger = createPagedThunk(
  "myRojmelWallet/fetchLedger",
  myWalletService.getLedger,
  "Unable to load your ledger.",
);

export const fetchMyRojmelCategories = createAsyncThunk(
  "myRojmelWallet/fetchCategories",
  async (categoryType, { rejectWithValue, signal }) => {
    try {
      const response = await myWalletService.getCategories(categoryType, {
        signal,
      });
      return { categoryType, response };
    } catch (error) {
      return rejectWithValue(
        getRojmelThunkError(error, "Unable to load wallet categories."),
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

export const createMyRojmelIncome = createMovementThunk(
  "myRojmelWallet/createIncome",
  myWalletService.createIncome,
  "Unable to post income.",
);

export const createMyRojmelExpense = createMovementThunk(
  "myRojmelWallet/createExpense",
  myWalletService.createExpense,
  "Unable to post expense.",
);

const mutationTypes = [createMyRojmelIncome, createMyRojmelExpense];

const myWalletSlice = createSlice({
  name: "myRojmelWallet",
  initialState,
  reducers: {
    clearMyRojmelError: (state) => {
      state.categoriesError = null;
      state.ledger.error = null;
      state.mutationError = null;
      state.transactions.error = null;
      state.walletError = null;
    },
    setMyRojmelLedgerFilters: (state, action) => {
      state.ledger.filters = { ...state.ledger.filters, ...action.payload };
    },
    setMyRojmelLedgerPage: (state, action) => {
      state.ledger.pageNumber = action.payload;
    },
    setMyRojmelLedgerPageSize: (state, action) => {
      state.ledger.pageNumber = 1;
      state.ledger.pageSize = clampRojmelPageSize(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyRojmelWallet.pending, (state, action) => {
        state.walletError = null;
        state.walletLoading = true;
        state.walletRequestId = action.meta.requestId;
      })
      .addCase(fetchMyRojmelWallet.fulfilled, (state, action) => {
        if (state.walletRequestId !== action.meta.requestId) return;
        state.wallet = extractRojmelEntity(action.payload.data, "wallet");
        state.walletLoading = false;
        state.walletRequestId = null;
      })
      .addCase(fetchMyRojmelWallet.rejected, (state, action) => {
        if (state.walletRequestId !== action.meta.requestId) return;
        state.walletError = action.payload ?? action.error.message;
        state.walletLoading = false;
        state.walletRequestId = null;
      })
      .addCase(fetchMyRojmelLedger.pending, (state, action) => {
        state.ledger.error = null;
        state.ledger.loading = true;
        state.ledger.requestId = action.meta.requestId;
      })
      .addCase(fetchMyRojmelLedger.fulfilled, (state, action) => {
        if (state.ledger.requestId !== action.meta.requestId) return;
        applyRojmelPage(state.ledger, action.payload.data);
        state.ledger.loading = false;
        state.ledger.requestId = null;
      })
      .addCase(fetchMyRojmelLedger.rejected, (state, action) => {
        if (state.ledger.requestId !== action.meta.requestId) return;
        state.ledger.error = action.payload ?? action.error.message;
        state.ledger.list = [];
        state.ledger.loading = false;
        state.ledger.requestId = null;
      })
      .addCase(fetchMyRojmelTransactions.pending, (state, action) => {
        state.transactions.error = null;
        state.transactions.loading = true;
        state.transactions.requestId = action.meta.requestId;
      })
      .addCase(fetchMyRojmelTransactions.fulfilled, (state, action) => {
        if (state.transactions.requestId !== action.meta.requestId) return;
        applyRojmelPage(state.transactions, action.payload.data);
        state.transactions.loading = false;
        state.transactions.requestId = null;
      })
      .addCase(fetchMyRojmelTransactions.rejected, (state, action) => {
        if (state.transactions.requestId !== action.meta.requestId) return;
        state.transactions.error = action.payload ?? action.error.message;
        state.transactions.list = [];
        state.transactions.loading = false;
        state.transactions.requestId = null;
      })
      .addCase(fetchMyRojmelCategories.pending, (state) => {
        state.categoriesError = null;
        state.categoriesLoading = true;
      })
      .addCase(fetchMyRojmelCategories.fulfilled, (state, action) => {
        const data = action.payload.response.data;
        state.categoriesByType[action.payload.categoryType] = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];
        state.categoriesLoading = false;
      })
      .addCase(fetchMyRojmelCategories.rejected, (state, action) => {
        state.categoriesError = action.payload ?? action.error.message;
        state.categoriesLoading = false;
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
        (state) => {
          state.mutationLoading = false;
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
  clearMyRojmelError,
  setMyRojmelLedgerFilters,
  setMyRojmelLedgerPage,
  setMyRojmelLedgerPageSize,
} = myWalletSlice.actions;

export default myWalletSlice.reducer;
