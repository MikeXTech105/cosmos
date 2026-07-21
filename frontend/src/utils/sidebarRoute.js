import { normalizeRoute } from "./permissionResolver";

export const flattenSidebarRouteItems = (items, ancestorIds = []) => {
  return (Array.isArray(items) ? items : []).flatMap((item) => {
    const route = normalizeRoute(item?.route);
    const current = route
      ? [{ ancestorIds, id: String(item.id), route }]
      : [];

    return [
      ...current,
      ...flattenSidebarRouteItems(item?.children, [
        ...ancestorIds,
        String(item.id),
      ]),
    ];
  });
};

export const findLongestSidebarRouteMatch = (items, pathname) => {
  const normalizedPathname = normalizeRoute(pathname);

  if (!normalizedPathname) {
    return null;
  }

  return (
    flattenSidebarRouteItems(items)
      .filter(({ route }) => {
        return (
          normalizedPathname === route ||
          normalizedPathname.startsWith(`${route}/`)
        );
      })
      .sort((first, second) => second.route.length - first.route.length)[0] ??
    null
  );
};

export const markActiveSidebarItems = (items, pathname) => {
  const match = findLongestSidebarRouteMatch(items, pathname);
  const ancestorIds = new Set(match?.ancestorIds ?? []);

  const markItems = (menuItems) => {
    return (Array.isArray(menuItems) ? menuItems : []).map((item) => ({
      ...item,
      children: markItems(item.children),
      hasActiveChild: ancestorIds.has(String(item.id)),
      isActive: String(item.id) === match?.id,
    }));
  };

  return markItems(items);
};
