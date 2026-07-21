import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import { getEnabledSidebarModules } from "../../config/sidebar";
import { useSidebar } from "../../hooks/useSidebar";
import { getDefaultAuthorizedRoute } from "../../utils/authorizedRoute";
import { normalizeRoute } from "../../utils/permissionResolver";

const titleize = (value) => {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const fallbackTrail = (pathname) => {
  const segments = pathname.split("/").filter(Boolean);

  return segments.map((segment, index) => ({
    id: `${segment}-${index}`,
    label: titleize(segment),
    route: `/${segments.slice(0, index + 1).join("/")}`,
  }));
};

const Breadcrumbs = () => {
  const { activeTrail } = useSidebar();
  const auth = useSelector((state) => state.auth);
  const location = useLocation();
  const modules = getEnabledSidebarModules();
  const homeRoute = getDefaultAuthorizedRoute({
    modules,
    pages: auth.pages,
    roles: auth.roles,
    user: auth.user,
  });
  const homeModule = modules.find(
    (module) => normalizeRoute(module.route) === homeRoute,
  );
  const homeLabel = homeModule?.label ?? titleize(homeRoute.split("/").pop());
  const rawTrail =
    activeTrail.length > 0 ? activeTrail : fallbackTrail(location.pathname);
  const trail = rawTrail.filter(
    (item) => normalizeRoute(item.route) !== normalizeRoute(homeRoute),
  );

  return (
    <nav className="flex min-w-0 items-center gap-1 text-xs" aria-label="Breadcrumbs">
      <Link
        to={homeRoute}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Go to ${homeLabel}`}
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {trail.map((item, index) => {
        const last = index === trail.length - 1;

        return (
          <div key={item.id} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            {last || !item.route ? (
              <span className="truncate font-medium text-slate-800">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.route}
                className="truncate font-medium text-slate-500 transition-colors hover:text-slate-800"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
