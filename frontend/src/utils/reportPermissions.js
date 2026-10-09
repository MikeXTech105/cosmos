import { canPerformAction } from "./permissionResolver";
import { getReportPermissionTarget } from "../pages/reports/reportRegistry";

export const canViewReport = ({ pages = [], report, roles = [], user = null }) => {
  if (!report) {
    return false;
  }

  return canPerformAction({
    action: "view",
    pages,
    roles,
    target: getReportPermissionTarget(report),
    user,
  });
};

