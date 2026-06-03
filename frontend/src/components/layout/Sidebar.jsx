import { useSelector } from "react-redux";
import { NavLink } from "react-router-dom";

const canViewPage = (page) => {
  return page.canView ?? page.permissions?.canView ?? page.view ?? true;
};

const getPageRoute = (page) => {
  return page.route ?? page.path ?? page.url;
};

const getPageLabel = (page) => {
  return page.displayName ?? page.name ?? page.title ?? page.route ?? "Untitled";
};

const Sidebar = () => {
  const pages = useSelector((state) => state.auth.pages);
  const visiblePages = pages.filter((page) => canViewPage(page) && getPageRoute(page));

  return (
    <aside className="w-64 shrink-0 bg-slate-900 text-white">
      <div className="p-4 text-xl font-bold">Cosmos ERP</div>

      <nav className="mt-4">
        {visiblePages.map((page) => {
          const route = getPageRoute(page);

          return (
            <NavLink
              key={page.pageId ?? page.id ?? route}
              to={route}
              className={({ isActive }) =>
                [
                  "block px-4 py-3 text-sm transition-colors",
                  isActive ? "bg-slate-800 text-white" : "text-slate-300",
                  "hover:bg-slate-800 hover:text-white",
                ].join(" ")
              }
            >
              {getPageLabel(page)}
            </NavLink>
          );
        })}

        {visiblePages.length === 0 && (
          <p className="px-4 py-3 text-sm text-slate-500">
            No pages assigned
          </p>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
