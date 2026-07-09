import { useMemo } from "react";
import { useSelector } from "react-redux";

import {
  findPermissionPage,
  isSuperAdminAuth,
} from "../../hooks/usePermission";

const useOeeCapabilities = ({ label, resource, route }) => {
  const pages = useSelector((state) => state.auth.pages ?? []);
  const roles = useSelector((state) => state.auth.roles);
  const user = useSelector((state) => state.auth.user);

  return useMemo(() => {
    const isSuperAdmin = isSuperAdminAuth({ roles, user });
    const page = findPermissionPage(pages, { label, route });
    const permissionValues = Array.isArray(page?.permissions)
      ? page.permissions.map(String)
      : [];
    const permissionSet = new Set(permissionValues);

    const canPerform = (action, booleanNames) => {
      if (isSuperAdmin) {
        return true;
      }

      const explicitValues = booleanNames.flatMap((name) => {
        return [page?.[name], page?.permissions?.[name]].filter(
          (value) => typeof value === "boolean",
        );
      });

      if (explicitValues.length > 0) {
        return explicitValues.some(Boolean);
      }

      if (permissionSet.size > 0) {
        return permissionSet.has(`${resource}.${action}`);
      }

      return page?.canView === true;
    };

    return {
      canCreate: canPerform("create", ["canCreate"]),
      canDelete: canPerform("delete", ["canDelete"]),
      canEdit: canPerform("update", ["canEdit", "canUpdate"]),
      canView: canPerform("view", ["canView"]),
    };
  }, [label, pages, resource, roles, route, user]);
};

export default useOeeCapabilities;
