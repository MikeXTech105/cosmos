import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import SidebarItem from "./SidebarItem";

const depthPadding = ["pl-3", "pl-7", "pl-10", "pl-12"];

const SidebarGroup = ({
  item,
  depth = 0,
  expandedGroupIds,
  forceOpen = false,
  onNavigate,
  onToggle,
  themeClasses,
}) => {
  const Icon = item.Icon;
  const active = item.isActive || item.hasActiveChild;
  const open = forceOpen || item.hasActiveChild || expandedGroupIds[item.id];

  return (
    <div>
      <button
        type="button"
        aria-label={item.label}
        aria-expanded={Boolean(open)}
        onClick={() => onToggle(item.id)}
        className={clsx(
          "group relative flex h-11 w-full items-center gap-3 rounded-lg text-[13px] font-medium outline-none transition-colors lg:h-10",
          `${depthPadding[Math.min(depth, depthPadding.length - 1)]} pr-3`,
          active ? themeClasses.navGroupActive : themeClasses.navInactive,
          "focus-visible:ring-2 focus-visible:ring-brand/40",
        )}
      >
        <span
          className={clsx(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors",
            active ? themeClasses.iconActive : themeClasses.iconInactive,
          )}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>

        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        <ChevronDown aria-hidden="true"
          className={clsx(
            "h-4 w-4 text-current transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2 lg:mt-1 lg:space-y-1">
              {item.children.map((child) =>
                child.children.length > 0 ? (
                  <SidebarGroup
                    key={child.id}
                    item={child}
                    depth={depth + 1}
                    expandedGroupIds={expandedGroupIds}
                    forceOpen={forceOpen}
                    onNavigate={onNavigate}
                    onToggle={onToggle}
                    themeClasses={themeClasses}
                  />
                ) : (
                  <SidebarItem
                    key={child.id}
                    item={child}
                    depth={depth + 1}
                    onNavigate={onNavigate}
                    themeClasses={themeClasses}
                  />
                ),
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SidebarGroup;
