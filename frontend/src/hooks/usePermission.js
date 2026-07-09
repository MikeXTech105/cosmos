import { useSelector } from "react-redux";

const normalizeText = (value) => {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

export const normalizeRoute = (route) => {
  const normalizedRoute = String(route ?? "").trim();

  if (!normalizedRoute) {
    return "";
  }

  return normalizedRoute.startsWith("/")
    ? normalizedRoute
    : `/${normalizedRoute}`;
};

export const getPageLabel = (page) => {
  return (
    page?.pageName ??
    page?.displayName ??
    page?.name ??
    page?.title ??
    page?.label ??
    ""
  );
};

export const getPageRoute = (page) => {
  return normalizeRoute(page?.route ?? page?.path ?? page?.url);
};

export const canViewPermission = (permission) => {
  return (
    permission?.canView === true ||
    permission?.permissions?.canView === true ||
    permission?.view === true
  );
};

export const findPermissionPage = (pages, target) => {
  const route = normalizeRoute(
    typeof target === "string" ? target : target?.route,
  );
  const label = normalizeText(
    typeof target === "string" ? target : target?.pageName ?? target?.label,
  );
  const id = normalizeText(typeof target === "string" ? "" : target?.id);

  return (pages ?? []).find((page) => {
    const pageRoute = getPageRoute(page);
    const pageLabel = normalizeText(getPageLabel(page));
    const pageId = normalizeText(page?.pageId ?? page?.id ?? page?._id);

    return (
      (route && pageRoute === route) ||
      (label && pageLabel === label) ||
      (id && pageId === id)
    );
  });
};

const getRoleName = (role) => {
  if (typeof role === "string") {
    return role;
  }

  return (
    role?.name ??
    role?.roleName ??
    role?.label ??
    role?.value ??
    role?.authority ??
    role?.code ??
    ""
  );
};

export const isSuperAdminAuth = ({ roles = [], user = null } = {}) => {
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const roleValues = [
    user?.role,
    user?.roleName,
    user?.roleCode,
    ...userRoles,
    ...(Array.isArray(roles) ? roles : [roles]),
  ];

  return roleValues.some((role) => {
    const roleName = normalizeText(getRoleName(role));

    return (
      roleName.includes("super admin") ||
      roleName.replace(/\s+/g, "").includes("superadmin")
    );
  });
};

const usePermission = (target) => {
  const pages = useSelector((state) => state.auth.pages ?? []);

  return findPermissionPage(pages, target);
};

export default usePermission;
