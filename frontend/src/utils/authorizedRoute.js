import { getEnabledSidebarModules } from "../config/sidebar";
import {
  canPerformAction,
  canViewPermission,
  findPermissionPage,
  getPageRoute,
  isSuperAdminAuth,
  normalizeRoute,
} from "./permissionResolver";

const ALWAYS_AUTHENTICATED_ROUTES = new Set([
  "/403",
  "/404",
  "/change-password",
  "/preferences",
  "/profile",
]);

const canViewModule = ({ module, pages, roles, user }) => {
  return canPerformAction({
    action: "view",
    pages,
    resource: module.resource,
    roles,
    target: {
      id: module.id,
      label: module.permissionPageName ?? module.label,
      pageName: module.permissionPageName,
      route: module.route,
    },
    user,
  });
};

const getFirstGrantedPageRoute = (pages) => {
  const grantedPage = (Array.isArray(pages) ? pages : []).find((page) => {
    return page && canViewPermission(page) && getPageRoute(page);
  });

  return getPageRoute(grantedPage);
};

export const getDefaultAuthorizedRoute = ({
  modules = getEnabledSidebarModules(),
  pages = [],
  roles = [],
  user = null,
} = {}) => {
  if (isSuperAdminAuth({ roles, user })) {
    return modules.some((module) => normalizeRoute(module.route) === "/dashboard")
      ? "/dashboard"
      : normalizeRoute(modules.find((module) => module.route)?.route) || "/403";
  }

  const firstAuthorizedModule = modules.find((module) => {
    return module.route && canViewModule({ module, pages, roles, user });
  });

  return (
    normalizeRoute(firstAuthorizedModule?.route) ||
    // Land on whatever the backend actually granted rather than /403 when no
    // configured module lines up with the page list.
    getFirstGrantedPageRoute(pages) ||
    "/403"
  );
};

export const isRouteAuthorized = ({
  modules = getEnabledSidebarModules(),
  pages = [],
  roles = [],
  route,
  user = null,
} = {}) => {
  const normalizedRoute = normalizeRoute(route);

  if (!normalizedRoute) {
    return false;
  }

  if (ALWAYS_AUTHENTICATED_ROUTES.has(normalizedRoute)) {
    return true;
  }

  const isSuperAdmin = isSuperAdminAuth({ roles, user });

  const exactPermissionPage = findPermissionPage(pages, {
    route: normalizedRoute,
  });

  if (exactPermissionPage) {
    return (
      isSuperAdmin ||
      canPerformAction({
        action: "view",
        pages,
        roles,
        target: { route: normalizedRoute },
        user,
      })
    );
  }

  const matchingModule = modules
    .filter((module) => {
      const moduleRoute = normalizeRoute(module.route);

      return (
        moduleRoute &&
        (normalizedRoute === moduleRoute ||
          normalizedRoute.startsWith(`${moduleRoute}/`))
      );
    })
    .sort((first, second) => second.route.length - first.route.length)[0];

  return Boolean(
    matchingModule &&
      (isSuperAdmin || canViewModule({ module: matchingModule, pages, roles, user })),
  );
};
