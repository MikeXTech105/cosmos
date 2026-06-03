import { Navigate } from "react-router-dom";

import usePermission from "../hooks/usePermission";

const canViewPermission = (permission) => {
  return permission?.canView ?? permission?.permissions?.canView ?? permission?.view ?? false;
};

const PermissionGuard = ({ route, children }) => {
  const permission = usePermission(route);

  return canViewPermission(permission) ? (
    children
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

export default PermissionGuard;
