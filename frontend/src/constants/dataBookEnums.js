// CONFIRM: Swagger exposes Visibility as a bare string. These values come from
// the Data Book integration contract and still need verification against a live response.
export const DATA_BOOK_VISIBILITY = Object.freeze({
  ALL: "all",
  MY_PRIVATE: "my-private",
  PUBLIC: "public",
});

// CONFIRM: updatedAtUtc is the only SortBy value documented by the integration contract.
export const DATA_BOOK_SORT_FIELDS = Object.freeze(["updatedAtUtc"]);
export const DATA_BOOK_SORT_DIRECTIONS = Object.freeze(["asc", "desc"]);

export const DATA_BOOK_TABS = Object.freeze({
  ALL: "all",
  MY_PRIVATE: "my-private",
  PUBLIC: "public",
  RECENT: "recently-updated",
});

export const DATA_BOOK_TAB_OPTIONS = Object.freeze([
  { id: DATA_BOOK_TABS.ALL, label: "All" },
  { id: DATA_BOOK_TABS.PUBLIC, label: "Public" },
  { id: DATA_BOOK_TABS.MY_PRIVATE, label: "My private" },
  { id: DATA_BOOK_TABS.RECENT, label: "Recently updated" },
]);

export const getDataBookTabQuery = (tab) => {
  if (tab === DATA_BOOK_TABS.PUBLIC) {
    return { Visibility: DATA_BOOK_VISIBILITY.PUBLIC };
  }

  if (tab === DATA_BOOK_TABS.MY_PRIVATE) {
    return { Visibility: DATA_BOOK_VISIBILITY.MY_PRIVATE };
  }

  if (tab === DATA_BOOK_TABS.RECENT) {
    return {
      SortBy: "updatedAtUtc",
      SortDirection: "desc",
      Visibility: DATA_BOOK_VISIBILITY.ALL,
    };
  }

  return { Visibility: DATA_BOOK_VISIBILITY.ALL };
};
