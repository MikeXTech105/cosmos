import clsx from "clsx";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const depthPadding = ["pl-3", "pl-7", "pl-10", "pl-12"];

const SidebarItem = ({ item, depth = 0, onNavigate, themeClasses }) => {
  const Icon = item.Icon;
  const active = item.isActive;

  if (!item.route) {
    return null;
  }

  return (
    <Link
      to={item.route}
      aria-label={item.label}
      aria-current={item.isActive ? "page" : undefined}
      onClick={onNavigate}
      className={clsx(
        "group relative flex h-11 items-center gap-3 rounded-lg text-[13px] font-medium outline-none transition-colors lg:h-10",
        `${depthPadding[Math.min(depth, depthPadding.length - 1)]} pr-3`,
        item.isActive
          ? themeClasses.navActive
          : themeClasses.navInactive,
        "focus-visible:ring-2 focus-visible:ring-brand/40",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className={clsx(
            "absolute inset-0 rounded-lg",
            themeClasses.activePill,
          )}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        />
      )}

      <span
        className={clsx(
          "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors",
          active ? themeClasses.iconActive : themeClasses.iconInactive,
        )}
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>

      <span className="relative z-10 min-w-0 flex-1 truncate">
        {item.label}
      </span>
    </Link>
  );
};

export default SidebarItem;
