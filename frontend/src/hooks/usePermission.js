import { useSelector } from "react-redux";
import { findPermissionPage } from "../utils/permissionResolver";

export {
  canViewPermission,
  findPermissionPage,
  getPageLabel,
  getPageRoute,
  isSuperAdminAuth,
  normalizeRoute,
} from "../utils/permissionResolver";

const usePermission = (target) => {
  const pages = useSelector((state) => state.auth.pages ?? []);

  return findPermissionPage(pages, target);
};

export default usePermission;
