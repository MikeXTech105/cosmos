import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import { canPerformAction } from "../utils/permissionResolver";

const PermissionGuard = ({ route, pageName, children }) => {
  const location = useLocation();
  const pages = useSelector((state) => state.auth.pages ?? []);
  const roles = useSelector((state) => state.auth.roles ?? []);
  const user = useSelector((state) => state.auth.user);
  const canView = canPerformAction({
    action: "view",
    pages,
    roles,
    target: { label: pageName, pageName, route },
    user,
  });

  return canView ? (
    children
  ) : (
    <Navigate to="/403" replace state={{ from: location }} />
  );
};

export default PermissionGuard;
