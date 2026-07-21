export const filterCommandItems = (items, query, limit = 10) => {
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  const resultLimit = normalizedQuery ? limit : Math.min(limit, 8);

  return (items ?? [])
    .filter((item) => {
      if (!normalizedQuery) {
        return true;
      }

      return [item.label, item.route, item.modulePath]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .slice(0, resultLimit);
};

export const clampCommandHighlight = (index, resultCount) => {
  if (resultCount <= 0) {
    return -1;
  }

  return Math.max(0, Math.min(Number(index) || 0, resultCount - 1));
};
