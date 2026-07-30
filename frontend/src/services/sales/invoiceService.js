import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const SALES_INVOICE_SORT_FIELDS = [
  "invoiceNumber",
  "invoiceDate",
  "dueDate",
  "customerName",
  "grandTotal",
  "createdAtUtc",
];

const MAX_SALES_PAGE_SIZE = 200;

const clampPageSize = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 20;
  }

  return Math.min(MAX_SALES_PAGE_SIZE, Math.max(1, Math.trunc(numericValue)));
};

const sanitizeInvoiceListParams = (params = {}) => {
  const requestedSort = String(params.SortBy ?? "").trim().toLowerCase();
  const sortBy = SALES_INVOICE_SORT_FIELDS.find(
    (field) => field.toLowerCase() === requestedSort,
  );
  const sortDirection = String(params.SortDirection ?? "")
    .trim()
    .toLowerCase();
  const pageNumber = Number(params.PageNumber);

  const sanitizedParams = {
    ...params,
    PageNumber:
      Number.isFinite(pageNumber) && pageNumber > 0
        ? Math.trunc(pageNumber)
        : 1,
    PageSize: clampPageSize(params.PageSize),
  };

  if (sortBy && ["asc", "desc"].includes(sortDirection)) {
    sanitizedParams.SortBy = sortBy;
    sanitizedParams.SortDirection = sortDirection;
  } else {
    delete sanitizedParams.SortBy;
    delete sanitizedParams.SortDirection;
  }

  return sanitizedParams;
};

export const invoiceService = {
  getInvoices: async (params, { signal } = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.SALES_INVOICES, {
      params: normalizeParams(sanitizeInvoiceListParams(params)),
      ...(signal ? { signal } : {}),
    });

    return unwrapResponse(response);
  },

  getInvoiceById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.SALES_INVOICE_BY_ID(id));

    return unwrapResponse(response);
  },

  createInvoice: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SALES_INVOICES,
      payload,
    );

    return unwrapResponse(response);
  },

  updateInvoice: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.SALES_INVOICE_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  confirmInvoice: async (id) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SALES_INVOICE_CONFIRM(id),
    );

    return unwrapResponse(response);
  },

  cancelInvoice: async (id) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SALES_INVOICE_CANCEL(id),
    );

    return unwrapResponse(response);
  },

  getPayments: async (id) => {
    const response = await axiosInstance.get(
      ENDPOINTS.SALES_INVOICE_PAYMENTS(id),
    );

    return unwrapResponse(response);
  },

  recordPayment: async (id, payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SALES_INVOICE_PAYMENTS(id),
      payload,
    );

    return unwrapResponse(response);
  },
};
