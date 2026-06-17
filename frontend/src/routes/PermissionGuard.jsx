import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

import usePermission, {
  canViewPermission,
  isSuperAdminAuth,
} from "../hooks/usePermission";

const PermissionGuard = ({ route, pageName, children }) => {
  const roles = useSelector((state) => state.auth.roles);
  const user = useSelector((state) => state.auth.user);
  const permission = usePermission({ label: pageName, route });

  return isSuperAdminAuth({ roles, user }) || canViewPermission(permission) ? (
    children
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

export default PermissionGuard;
