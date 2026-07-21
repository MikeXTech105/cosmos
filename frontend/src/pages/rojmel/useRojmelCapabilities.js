import { useMemo } from "react";
import { useSelector } from "react-redux";

import useCapabilities from "../../hooks/useCapabilities";
import {
  canPerformAction,
  isSuperAdminAuth,
} from "../../utils/permissionResolver";

const normalizeRole = (role) =>
  String(
    typeof role === "string"
      ? role
      : role?.code ?? role?.roleCode ?? role?.name ?? role?.roleName ?? "",
  )
    .trim()
    .toLowerCase();

const hasAdminRole = ({ roles, user }) => {
  const userRoles = Array.isArray(user?.roles)
    ? user.roles
    : user?.roles
      ? [user.roles]
      : [];
  const values = [
    ...(Array.isArray(roles) ? roles : [roles]),
    ...userRoles,
    user?.role,
    user?.roleName,
    user?.roleCode,
  ].filter(Boolean);

  return values.some((value) =>
    ["admin", "administrator"].includes(normalizeRole(value)),
  );
};

const hasAdminViewCode = (pages) =>
  pages.some((page) => {
    const pageName = String(page?.pageName ?? page?.name ?? "").toLowerCase();
    const permissions = Array.isArray(page?.permissions)
      ? page.permissions
      : [];

    return (
      pageName === "rojmel.admin/view" ||
      permissions.some((permission) => {
        const value = String(permission).replace(/\s+/g, "").toLowerCase();
        return ["rojmel.admin/view", "rojmel.admin.view"].includes(value);
      })
    );
  });

const useRojmelCapabilities = ({ label, resource, route }) => {
  const capabilities = useCapabilities({
    actions: ["view", "create", "update", "delete", "approve", "export"],
    label,
    resource,
    route,
  });
  const auth = useSelector((state) => state.auth);
  const isAdmin = useMemo(() => {
    const explicitGrant = canPerformAction({
      action: "view",
      pages: auth.pages,
      resource: ["rojmel.admin", "rojmel.admin/view"],
      roles: auth.roles,
      target: { label: "Rojmel.Admin/View", route: "/rojmel/admin" },
      user: auth.user,
    });

    return (
      explicitGrant ||
      hasAdminViewCode(auth.pages ?? []) ||
      isSuperAdminAuth({ roles: auth.roles, user: auth.user }) ||
      hasAdminRole({ roles: auth.roles, user: auth.user })
    );
  }, [auth.pages, auth.roles, auth.user]);

  return {
    ...capabilities,
    canCancel: capabilities.canDelete || capabilities.canApprove,
    canEdit: capabilities.canUpdate,
    isAdmin,
  };
};

export default useRojmelCapabilities;
