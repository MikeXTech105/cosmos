import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";

const depthPadding = ["pl-3", "pl-7", "pl-10", "pl-12"];

const SidebarItem = ({ item, depth = 0, onNavigate }) => {
  const Icon = item.Icon;

  if (!item.route) {
    return null;
  }

  return (
    <NavLink
      to={item.route}
      aria-label={item.label}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "group relative flex h-10 items-center gap-3 rounded-lg text-[13px] font-medium outline-none transition-colors",
          `${depthPadding[Math.min(depth, depthPadding.length - 1)]} pr-3`,
          isActive || item.isActive
            ? "text-white"
            : "text-slate-400 hover:bg-slate-800 hover:text-white",
          "focus-visible:ring-2 focus-visible:ring-brand/40",
        ].join(" ")
      }
    >
      {({ isActive }) => {
        const active = isActive || item.isActive;

        return (
          <>
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-lg bg-brand"
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              />
            )}

            <span
              className={[
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors",
                active
                  ? "text-white"
                  : "text-slate-500 group-hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
            </span>

            <span className="relative z-10 min-w-0 flex-1 truncate">
              {item.label}
            </span>
          </>
        );
      }}
    </NavLink>
  );
};

export default SidebarItem;
