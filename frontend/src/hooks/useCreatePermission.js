import { useMemo } from "react";
import { useSelector } from "react-redux";

import {
  findPermissionPage,
  isSuperAdminAuth,
} from "./usePermission";

const useCreatePermission = ({ label, resource, route }) => {
  const pages = useSelector((state) => state.auth.pages ?? []);
  const roles = useSelector((state) => state.auth.roles);
  const user = useSelector((state) => state.auth.user);

  return useMemo(() => {
    if (isSuperAdminAuth({ roles, user })) {
      return true;
    }

    const page = findPermissionPage(pages, { label, route });
    const explicitValues = [
      page?.canCreate,
      page?.permissions?.canCreate,
    ].filter((value) => typeof value === "boolean");

    if (explicitValues.length > 0) {
      return explicitValues.some(Boolean);
    }

    const permissionValues = Array.isArray(page?.permissions)
      ? page.permissions.map(String)
      : [];

    if (permissionValues.length > 0 && resource) {
      return permissionValues.includes(`${resource}.create`);
    }

    return page?.canView === true;
  }, [label, pages, resource, roles, route, user]);
};

export default useCreatePermission;
