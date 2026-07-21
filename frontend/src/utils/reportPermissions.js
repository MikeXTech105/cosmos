import { canPerformAction } from "./permissionResolver";

export const canViewReport = ({ pages = [], report, roles = [], user = null }) => {
  if (!report) {
    return false;
  }

  return canPerformAction({
    action: "view",
    pages,
    roles,
    target: {
      label: report.permission,
      route: report.permissionRoute ?? report.route,
    },
    user,
  });
};

