import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

import { getEnabledSidebarModules } from "../config/sidebar";

const PERSONAL_TITLES = {
  "/preferences": "Preferences",
  "/profile": "Profile",
};

const DETAIL_TITLES = [
  { pattern: /^\/sales\/invoices\/[^/]+$/, title: "Sales Invoice" },
  { pattern: /^\/purchase\/bills\/[^/]+$/, title: "Purchase Bill" },
  { pattern: /^\/purchase\/orders\/[^/]+$/, title: "Purchase Order" },
  { pattern: /^\/purchase\/returns\/[^/]+$/, title: "Purchase Return" },
];

const routeMatches = (pathname, route) =>
  pathname === route || pathname.startsWith(`${route}/`);

const titleCase = (value) =>
  String(value ?? "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const getDocumentPageTitle = (pathname) => {
  if (PERSONAL_TITLES[pathname]) return PERSONAL_TITLES[pathname];

  const detail = DETAIL_TITLES.find(({ pattern }) => pattern.test(pathname));
  if (detail) return detail.title;

  if (pathname.startsWith("/reports/")) {
    const segments = pathname.split("/").filter(Boolean);
    return segments.length > 2
      ? titleCase(segments.at(-1))
      : `${titleCase(segments[1])} Reports`;
  }

  const match = getEnabledSidebarModules()
    .filter((module) => routeMatches(pathname, module.route))
    .sort((first, second) => second.route.length - first.route.length)[0];

  return match?.label ?? "COSMOS ERP";
};

const useDocumentTitle = (explicitTitle) => {
  const { pathname } = useLocation();
  const pageTitle = useMemo(
    () => explicitTitle || getDocumentPageTitle(pathname),
    [explicitTitle, pathname],
  );

  useEffect(() => {
    document.title = pageTitle === "COSMOS ERP" ? pageTitle : `${pageTitle} | COSMOS ERP`;
  }, [pageTitle]);

  return pageTitle;
};

export default useDocumentTitle;
