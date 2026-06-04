import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";

const SidebarItem = ({ item, collapsed = false, depth = 0, onNavigate }) => {
  const Icon = item.Icon;

  if (!item.route) {
    return null;
  }

  return (
    <NavLink
      to={item.route}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "group relative flex h-10 items-center gap-3 rounded-xl text-[13px] font-medium outline-none transition-colors",
          collapsed ? "justify-center px-0" : "px-3",
          isActive || item.isActive
            ? "text-brand"
            : "text-slate-600 hover:bg-white/70 hover:text-gray-900",
          "focus-visible:ring-2 focus-visible:ring-brand/20",
        ].join(" ")
      }
      style={{ paddingLeft: collapsed ? undefined : `${12 + depth * 14}px` }}
    >
      {({ isActive }) => {
        const active = isActive || item.isActive;

        return (
          <>
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-xl bg-brand-light shadow-[inset_0_0_0_1px_rgba(79,70,229,0.08)]"
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              />
            )}

            {active && (
              <span className="absolute left-0 top-1/2 z-10 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand" />
            )}

            <span
              className={[
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors",
                active
                  ? "text-brand"
                  : "text-slate-400 group-hover:text-slate-700",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
            </span>

            {!collapsed && (
              <span className="relative z-10 min-w-0 flex-1 truncate">
                {item.label}
              </span>
            )}

            {collapsed && (
              <span className="pointer-events-none absolute left-[calc(100%+10px)] z-30 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            )}
          </>
        );
      }}
    </NavLink>
  );
};

export default SidebarItem;
