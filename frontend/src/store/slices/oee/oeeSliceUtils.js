import {
  clampInventoryPageSize,
  DEFAULT_INVENTORY_PAGE_SIZE,
} from "../../../utils/inventoryQuery";
import {
  extractEntity,
  getRequestEntityId,
  normalizePagedPayload,
} from "../inventory/inventorySliceHelpers";

export const createOeeInitialState = (filters = {}) => ({
  list: [],
  loading: false,
  detailLoading: false,
  detailError: null,
  error: null,
  pageNumber: 1,
  pageSize: DEFAULT_INVENTORY_PAGE_SIZE,
  totalCount: 0,
  totalPages: 1,
  summary: null,
  summaryScope: "current-page",
  filters,
  selected: null,
  listRequestId: null,
  detailRequestId: null,
  selectedRequestEntityId: null,
});

export const setOeeListPending = (state, action) => {
  state.loading = true;
  state.error = null;
  state.listRequestId = action.meta.requestId;
};

export const setOeeListFulfilled = (state, action) => {
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
};

export const setOeeListRejected = (state, action) => {
  if (state.listRequestId !== action.meta.requestId) return;
  state.loading = false;
  state.list = [];
  state.error = action.payload ?? action.error.message;
  state.listRequestId = null;
};

export const setOeeDetailPending = (state, action) => {
  state.detailLoading = true;
  state.detailError = null;
  state.detailRequestId = action.meta.requestId;
  state.selectedRequestEntityId = getRequestEntityId(action.meta.arg);
};

export const setOeeDetailFulfilled = (entityKey) => (state, action) => {
  if (
    state.detailRequestId !== action.meta.requestId ||
    String(state.selectedRequestEntityId) !== String(getRequestEntityId(action.meta.arg))
  ) return;
  state.detailLoading = false;
  state.selected = extractEntity(action.payload.data, entityKey);
  state.detailRequestId = null;
};

export const setOeeDetailRejected = (state, action) => {
  if (state.detailRequestId !== action.meta.requestId) return;
  state.detailLoading = false;
  state.detailError = action.payload ?? action.error.message;
  state.detailRequestId = null;
};

export const setOeeSavedEntity = (entityKey) => (state, action) => {
  state.selected = extractEntity(action.payload.data, entityKey);
};

export const setOeeDeletedEntity = (state, action) => {
  state.list = state.list.filter(
    (item) => String(item.id) !== String(action.payload.id),
  );
  state.totalCount = Math.max(0, state.totalCount - 1);

  if (String(state.selected?.id) === String(action.payload.id)) {
    state.selected = null;
  }
};

export const setOeePageSize = (state, action) => {
  state.pageSize = clampInventoryPageSize(action.payload);
  state.pageNumber = 1;
};
