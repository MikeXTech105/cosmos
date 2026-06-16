import {
  clampInventoryPageSize,
  DEFAULT_INVENTORY_PAGE_SIZE,
} from "../../../utils/inventoryQuery";
import {
  extractEntity,
  normalizePagedPayload,
} from "../inventory/inventorySliceHelpers";

export const createHrInitialState = (filters = {}) => ({
  list: [],
  loading: false,
  detailLoading: false,
  detailError: null,
  error: null,
  pageNumber: 1,
  pageSize: DEFAULT_INVENTORY_PAGE_SIZE,
  totalCount: 0,
  totalPages: 1,
  filters,
  selected: null,
});

export const setHrListPending = (state) => {
  state.loading = true;
  state.error = null;
};

export const setHrListFulfilled = (state, action) => {
  const page = normalizePagedPayload(action.payload.data);

  state.loading = false;
  state.list = page.items;
  state.pageNumber = page.pageNumber;
  state.pageSize = page.pageSize;
  state.totalCount = page.totalCount;
  state.totalPages = page.totalPages;
};

export const setHrListRejected = (state, action) => {
  state.loading = false;
  state.list = [];
  state.error = action.payload ?? action.error.message;
};

export const setHrDetailPending = (state) => {
  state.detailLoading = true;
  state.detailError = null;
};

export const setHrDetailFulfilled = (entityKey) => (state, action) => {
  state.detailLoading = false;
  state.selected = extractEntity(action.payload.data, entityKey);
};

export const setHrDetailRejected = (state, action) => {
  state.detailLoading = false;
  state.detailError = action.payload ?? action.error.message;
};

export const setHrSavedEntity = (entityKey) => (state, action) => {
  state.selected = extractEntity(action.payload.data, entityKey);
};

export const setHrDeletedEntity = (state, action) => {
  state.list = state.list.filter(
    (item) => String(item.id) !== String(action.payload.id),
  );
  state.totalCount = Math.max(0, state.totalCount - 1);

  if (String(state.selected?.id) === String(action.payload.id)) {
    state.selected = null;
  }
};

export const setHrPageSize = (state, action) => {
  state.pageSize = clampInventoryPageSize(action.payload);
  state.pageNumber = 1;
};
