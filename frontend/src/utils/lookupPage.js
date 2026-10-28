export function lookupPage(response, page, pageSize) {
  const data = response?.data ?? response;
  const items = Array.isArray(data) ? data : data?.items ?? [];
  const meta = response?.meta ?? data?.pagination ?? data ?? {};
  const total = meta.totalCount ?? meta.totalRecords;
  return {
    items,
    hasMore: typeof meta.hasNextPage === "boolean" ? meta.hasNextPage
      : total !== undefined ? page * pageSize < Number(total) : items.length === pageSize,
  };
}
