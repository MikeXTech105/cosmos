import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import { getIconComponent } from "../config/iconMap";
import {
  getEnabledSidebarModules,
  getSidebarCategory,
} from "../config/sidebar";
import {
  getReportGroup,
  reportRegistry,
} from "../pages/reports/reportRegistry";
import { canViewReport } from "../utils/reportPermissions";
import {
  canViewPermission,
  findPermissionPage,
  isSuperAdminAuth,
} from "./usePermission";
import {
  closeCommand,
  expandSidebarGroups,
  openCommand,
  resetSidebarSearch,
  setSidebarSearchQuery,
  toggleSidebarGroup,
} from "../store/slices/sidebarSlice";

const getPageId = (page) => {
  return String(page.pageId ?? page.id ?? page._id ?? page.route ?? page.pageName);
};

const getParentId = (page) => {
  const parentId = page.parentId ?? page.parentPageId ?? page.parent_id;

  return parentId === null || parentId === undefined || parentId === ""
    ? null
    : String(parentId);
};

const getPageLabel = (page) => {
  return (
    page.pageName ??
    page.displayName ??
    page.name ??
    page.title ??
    page.route ??
    "Untitled"
  );
};

const getSortOrder = (page) => {
  return Number(
    page.sortOrder ??
      page.displayOrder ??
      page.sequence ??
      page.order ??
      page.position ??
      0,
  );
};

const sortMenuItems = (items) => {
  return [...items]
    .sort((first, second) => {
      if (first.sortOrder !== second.sortOrder) {
        return first.sortOrder - second.sortOrder;
      }

      return first.label.localeCompare(second.label);
    })
    .map((item) => ({
      ...item,
      children: sortMenuItems(item.children),
    }));
};

const createItem = ({ module, page }) => {
  const iconName = page?.icon ?? page?.iconName ?? page?.moduleIcon ?? module.icon;

  return {
    raw: page ?? module,
    id: String(page ? getPageId(page) : module.id),
    parentId: page ? getParentId(page) : null,
    label: page ? getPageLabel(page) : module.label,
    route: module.route,
    iconName,
    Icon: getIconComponent(iconName),
    description:
      page?.description ?? page?.moduleName ?? page?.categoryName ?? module.description ?? "",
    sortOrder: page ? getSortOrder(page) || module.sortOrder : module.sortOrder,
    children: [],
  };
};

const createCategoryItem = (category) => ({
  id: `category-${category.id}`,
  parentId: null,
  label: category.label,
  route: null,
  iconName: category.icon,
  Icon: getIconComponent(category.icon),
  description: category.description ?? "",
  sortOrder: category.sortOrder ?? 0,
  children: [],
});

const buildMenuTree = (pages, isSuperAdmin) => {
  const groupMap = new Map();
  const rootItems = [];
  const enabledModules = getEnabledSidebarModules();

  enabledModules.forEach((module) => {
    const page = isSuperAdmin
      ? null
      : findPermissionPage(pages, {
          id: module.id,
          label: module.label,
          route: module.route,
        });

    if (!isSuperAdmin && (!page || !canViewPermission(page))) {
      return;
    }

    const item = createItem({ module, page });

    if (!module.categoryId) {
      rootItems.push(item);
      return;
    }

    const category = getSidebarCategory(module.categoryId);

    if (!category) {
      rootItems.push(item);
      return;
    }

    if (!groupMap.has(category.id)) {
      groupMap.set(category.id, createCategoryItem(category));
    }

    groupMap.get(category.id).children.push(item);
  });

  groupMap.forEach((group) => {
    rootItems.push(group);
  });

  return sortMenuItems(rootItems);
};

const isRouteActive = (pathname, route) => {
  return Boolean(route && (pathname === route || pathname.startsWith(`${route}/`)));
};

const markActiveItems = (items, pathname) => {
  return items.map((item) => {
    const children = markActiveItems(item.children, pathname);
    const isActive = isRouteActive(pathname, item.route);
    const hasActiveChild = children.some(
      (child) => child.isActive || child.hasActiveChild,
    );

    return {
      ...item,
      children,
      isActive,
      hasActiveChild,
    };
  });
};

const filterMenuTree = (items, query) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.reduce((filteredItems, item) => {
    const children = filterMenuTree(item.children, normalizedQuery);
    const haystack = [item.label, item.route, item.iconName, item.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (haystack.includes(normalizedQuery) || children.length > 0) {
      filteredItems.push({
        ...item,
        children,
      });
    }

    return filteredItems;
  }, []);
};

const flattenMenuItems = (items, ancestors = []) => {
  return items.flatMap((item) => {
    const nextAncestors = [...ancestors, item];
    const current = item.route
      ? [
          {
            ...item,
            ancestors,
            modulePath: ancestors.map((ancestor) => ancestor.label).join(" / "),
          },
        ]
      : [];

    return [...current, ...flattenMenuItems(item.children, nextAncestors)];
  });
};

const createReportCommandItems = (pages, roles, user) => {
  return reportRegistry
    .filter((report) => canViewReport({ pages, report, roles, user }))
    .map((report) => {
      const group = getReportGroup(report.group);

      return {
        raw: report,
        id: `report-${report.id}`,
        parentId: null,
        label: report.title,
        route: report.route,
        iconName: report.icon,
        Icon: getIconComponent(report.icon),
        description: report.description,
        sortOrder: 0,
        modulePath: `Reports / ${group?.label ?? report.group}`,
        children: [],
      };
    });
};

const getActiveTrail = (items) => {
  for (const item of items) {
    if (item.isActive) {
      return [item];
    }

    if (item.hasActiveChild) {
      return [item, ...getActiveTrail(item.children)];
    }
  }

  return [];
};

export const useSidebar = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const pages = useSelector((state) => state.auth.pages);
  const roles = useSelector((state) => state.auth.roles);
  const user = useSelector((state) => state.auth.user);
  const sidebar = useSelector((state) => state.sidebar);

  const isSuperAdmin = useMemo(
    () => isSuperAdminAuth({ roles, user }),
    [roles, user],
  );

  const menuTree = useMemo(
    () => buildMenuTree(pages, isSuperAdmin),
    [isSuperAdmin, pages],
  );

  const activeMenuTree = useMemo(
    () => markActiveItems(menuTree, location.pathname),
    [location.pathname, menuTree],
  );

  const activeTrail = useMemo(
    () => getActiveTrail(activeMenuTree),
    [activeMenuTree],
  );

  const filteredMenuTree = useMemo(
    () => filterMenuTree(activeMenuTree, sidebar.searchQuery),
    [activeMenuTree, sidebar.searchQuery],
  );

  const reportCommandItems = useMemo(
    () => createReportCommandItems(pages, roles, user),
    [pages, roles, user],
  );

  const flatMenuItems = useMemo(
    () => [...flattenMenuItems(activeMenuTree), ...reportCommandItems],
    [activeMenuTree, reportCommandItems],
  );

  useEffect(() => {
    const groupIds = activeTrail
      .filter((item) => item.children.length > 0)
      .map((item) => item.id);

    if (groupIds.length > 0) {
      const closedGroupIds = groupIds.filter(
        (groupId) => !sidebar.expandedGroupIds[groupId],
      );

      if (closedGroupIds.length > 0) {
        dispatch(expandSidebarGroups(closedGroupIds));
      }
    }
  }, [activeTrail, dispatch, sidebar.expandedGroupIds]);

  const closeCommandHandler = useCallback(() => dispatch(closeCommand()), [dispatch]);
  const openCommandHandler = useCallback(() => dispatch(openCommand()), [dispatch]);
  const resetSearchHandler = useCallback(
    () => dispatch(resetSidebarSearch()),
    [dispatch],
  );
  const setSearchQueryHandler = useCallback(
    (query) => dispatch(setSidebarSearchQuery(query)),
    [dispatch],
  );
  const toggleGroupHandler = useCallback(
    (groupId) => dispatch(toggleSidebarGroup(groupId)),
    [dispatch],
  );

  return {
    activeTrail,
    commandOpen: sidebar.commandOpen,
    expandedGroupIds: sidebar.expandedGroupIds,
    flatMenuItems,
    hasPages: activeMenuTree.length > 0,
    menuTree: filteredMenuTree,
    rawMenuTree: activeMenuTree,
    searchQuery: sidebar.searchQuery,
    closeCommand: closeCommandHandler,
    openCommand: openCommandHandler,
    resetSearch: resetSearchHandler,
    setSearchQuery: setSearchQueryHandler,
    toggleGroup: toggleGroupHandler,
  };
};
