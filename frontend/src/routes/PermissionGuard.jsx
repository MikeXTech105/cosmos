import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import { canPerformAction } from "../utils/permissionResolver";

const PermissionGuard = ({ children, pageName, route, targets }) => {
  const location = useLocation();
  const pages = useSelector((state) => state.auth.pages ?? []);
  const roles = useSelector((state) => state.auth.roles ?? []);
  const user = useSelector((state) => state.auth.user);
  const permissionTargets =
    Array.isArray(targets) && targets.length > 0
      ? targets
      : [{ action: "view", label: pageName, page: pageName, route }];
  const canView = permissionTargets.some((target) =>
    canPerformAction({
      action: target.action ?? "view",
      pages,
      roles,
      target: {
        label: target.page ?? target.label,
        route: target.route,
      },
      user,
    }),
  );

  return canView ? (
    children
  ) : (
    <Navigate to="/403" replace state={{ from: location }} />
  );
};

export default PermissionGuard;
