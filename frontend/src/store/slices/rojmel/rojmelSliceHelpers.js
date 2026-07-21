import { getApiErrorMessage } from "../../../utils/apiError";
import {
  clampRojmelPageSize,
  DEFAULT_ROJMEL_PAGE_SIZE,
} from "../../../utils/rojmelQuery";

export const getRojmelThunkError = (error, fallback) =>
  getApiErrorMessage(error, fallback);

export const normalizeRojmelPage = (payload) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      pageNumber: 1,
      pageSize: clampRojmelPageSize(payload.length || DEFAULT_ROJMEL_PAGE_SIZE),
      totalCount: payload.length,
      totalPages: 1,
      summary: null,
      summaryScope: "current-page",
    };
  }

  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    pageNumber: Number(payload?.pageNumber) || 1,
    pageSize: clampRojmelPageSize(
      payload?.pageSize,
      DEFAULT_ROJMEL_PAGE_SIZE,
    ),
    totalCount: Number(payload?.totalCount) || 0,
    totalPages: Number(payload?.totalPages) || 1,
    summary: payload?.summary ?? null,
    summaryScope: payload?.summary ? "all-matching" : "current-page",
  };
};

export const extractRojmelEntity = (payload, key) =>
  payload?.[key] ?? payload?.record ?? payload;

export const createPagedState = (filters) => ({
  error: null,
  filters,
  list: [],
  loading: false,
  pageNumber: 1,
  pageSize: DEFAULT_ROJMEL_PAGE_SIZE,
  requestId: null,
  summary: null,
  summaryScope: "current-page",
  totalCount: 0,
  totalPages: 1,
});

export const applyRojmelPage = (state, payload) => {
  const page = normalizeRojmelPage(payload);

  state.list = page.items;
  state.pageNumber = page.pageNumber;
  state.pageSize = page.pageSize;
  state.totalCount = page.totalCount;
  state.totalPages = page.totalPages;
  state.summary = page.summary;
  state.summaryScope = page.summaryScope;
};
