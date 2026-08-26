import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { invoiceService } from "../../../services/sales/invoiceService";
import {
  extractEntity,
  getRequestEntityId,
  getThunkError,
  normalizePagedPayload,
} from "../inventory/inventorySliceHelpers";

const DEFAULT_SALES_PAGE_SIZE = 20;

const clampSalesPageSize = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_SALES_PAGE_SIZE;
  }

  return Math.min(200, Math.max(1, Math.trunc(numericValue)));
};

const initialState = {
  list: [],
  loading: false,
  detailLoading: false,
  detailError: null,
  error: null,
  pageNumber: 1,
  pageSize: DEFAULT_SALES_PAGE_SIZE,
  totalCount: 0,
  totalPages: 1,
  summary: null,
  summaryScope: "current-page",
  filters: {
    Search: "",
    CustomerPartyId: "all",
    Status: "all",
    PaymentStatus: "all",
    FromDate: "",
    ToDate: "",
    SortBy: "",
    SortDirection: "",
  },
  selected: null,
  listRequestId: null,
  detailRequestId: null,
  selectedRequestEntityId: null,
  payments: [],
  paymentsLoading: false,
  paymentsError: null,
};

export const fetchInvoices = createAsyncThunk(
  "salesInvoices/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await invoiceService.getInvoices(params);
    } catch (error) {
      return rejectWithValue(getThunkError(error, "Unable to load invoices."));
    }
  },
);

export const fetchInvoiceById = createAsyncThunk(
  "salesInvoices/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await invoiceService.getInvoiceById(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load invoice details."),
      );
    }
  },
);

export const createInvoice = createAsyncThunk(
  "salesInvoices/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await invoiceService.createInvoice(payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to create invoice."),
      );
    }
  },
);

export const updateInvoice = createAsyncThunk(
  "salesInvoices/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await invoiceService.updateInvoice(id, payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to update invoice."),
      );
    }
  },
);

export const confirmInvoice = createAsyncThunk(
  "salesInvoices/confirm",
  async (id, { rejectWithValue }) => {
    try {
      return await invoiceService.confirmInvoice(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to confirm invoice."),
      );
    }
  },
);

export const cancelInvoice = createAsyncThunk(
  "salesInvoices/cancel",
  async (id, { rejectWithValue }) => {
    try {
      return await invoiceService.cancelInvoice(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to cancel invoice."),
      );
    }
  },
);

export const fetchInvoicePayments = createAsyncThunk(
  "salesInvoices/fetchPayments",
  async (id, { rejectWithValue }) => {
    try {
      return await invoiceService.getPayments(id);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to load payment history."),
      );
    }
  },
);

export const recordInvoicePayment = createAsyncThunk(
  "salesInvoices/recordPayment",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await invoiceService.recordPayment(id, payload);
    } catch (error) {
      return rejectWithValue(
        getThunkError(error, "Unable to record payment."),
      );
    }
  },
);

const updateInvoiceInList = (state, invoice) => {
  if (!invoice?.id) {
    return;
  }

  state.list = state.list.map((item) =>
    String(item.id) === String(invoice.id) ? { ...item, ...invoice } : item,
  );
};

const invoiceSlice = createSlice({
  name: "salesInvoices",
  initialState,
  reducers: {
    clearInvoiceError: (state) => {
      state.error = null;
      state.detailError = null;
      state.paymentsError = null;
    },
    clearSelectedInvoice: (state) => {
      state.selected = null;
      state.payments = [];
      state.detailError = null;
      state.paymentsError = null;
    },
    setInvoiceFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setInvoicePage: (state, action) => {
      state.pageNumber = action.payload;
    },
    setInvoicePageSize: (state, action) => {
      state.pageSize = clampSalesPageSize(action.payload);
      state.pageNumber = 1;
    },
    setSelectedInvoice: (state, action) => {
      state.selected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.listRequestId = action.meta.requestId;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        const page = normalizePagedPayload(action.payload.data);

        state.loading = false;
        state.list = page.items;
        state.pageNumber = page.pageNumber;
        state.pageSize = page.pageSize;
        state.totalCount = page.totalCount;
        state.totalPages = page.totalPages;
        state.summary = page.summary;
        state.summaryScope = page.summaryScope;
        state.listRequestId = null;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.list = [];
        state.error = action.payload ?? action.error.message;
        state.listRequestId = null;
      })
      .addCase(fetchInvoiceById.pending, (state, action) => {
        state.detailLoading = true;
        state.detailError = null;
        state.detailRequestId = action.meta.requestId;
        state.selectedRequestEntityId = getRequestEntityId(action.meta.arg);
      })
      .addCase(fetchInvoiceById.fulfilled, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId || String(state.selectedRequestEntityId) !== String(getRequestEntityId(action.meta.arg))) return;
        state.detailLoading = false;
        state.selected = extractEntity(action.payload.data, "invoice");
        state.payments = Array.isArray(state.selected?.payments)
          ? state.selected.payments
          : state.payments;
        state.detailRequestId = null;
      })
      .addCase(fetchInvoiceById.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailLoading = false;
        state.detailError = action.payload ?? action.error.message;
        state.detailRequestId = null;
      })
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.selected = extractEntity(action.payload.data, "invoice");
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        const invoice = extractEntity(action.payload.data, "invoice");

        state.selected = invoice;
        updateInvoiceInList(state, invoice);
      })
      .addCase(confirmInvoice.fulfilled, (state, action) => {
        const invoice = extractEntity(action.payload.data, "invoice");

        state.selected = invoice;
        updateInvoiceInList(state, invoice);
      })
      .addCase(cancelInvoice.fulfilled, (state, action) => {
        const invoice = extractEntity(action.payload.data, "invoice");

        state.selected = invoice;
        updateInvoiceInList(state, invoice);
      })
      .addCase(fetchInvoicePayments.pending, (state) => {
        state.paymentsLoading = true;
        state.paymentsError = null;
      })
      .addCase(fetchInvoicePayments.fulfilled, (state, action) => {
        state.paymentsLoading = false;
        state.payments = Array.isArray(action.payload.data)
          ? action.payload.data
          : [];
      })
      .addCase(fetchInvoicePayments.rejected, (state, action) => {
        state.paymentsLoading = false;
        state.payments = [];
        state.paymentsError = action.payload ?? action.error.message;
      })
      .addCase(recordInvoicePayment.fulfilled, (state, action) => {
        const payment = extractEntity(action.payload.data, "payment");

        if (payment?.id) {
          state.payments = [payment, ...state.payments];
        }
      });
  },
});

export const {
  clearInvoiceError,
  clearSelectedInvoice,
  setInvoiceFilters,
  setInvoicePage,
  setInvoicePageSize,
  setSelectedInvoice,
} = invoiceSlice.actions;

export default invoiceSlice.reducer;
