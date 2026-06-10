import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import SidebarItem from "./SidebarItem";

const depthPadding = ["pl-3", "pl-7", "pl-10", "pl-12"];

const SidebarGroup = ({
  item,
  collapsed = false,
  depth = 0,
  expandedGroupIds,
  forceOpen = false,
  onNavigate,
  onToggle,
}) => {
  const Icon = item.Icon;
  const active = item.isActive || item.hasActiveChild;
  const open = forceOpen || item.hasActiveChild || expandedGroupIds[item.id];

  return (
    <div>
      <button
        type="button"
        title={collapsed ? item.label : undefined}
        aria-label={item.label}
        aria-expanded={Boolean(open)}
        onClick={() => onToggle(item.id)}
        className={[
          "group relative flex h-10 w-full items-center gap-3 rounded-lg text-[13px] font-medium outline-none transition-colors",
          collapsed
            ? "justify-center px-0"
            : `${depthPadding[Math.min(depth, depthPadding.length - 1)]} pr-3`,
          active
            ? "bg-brand text-white"
            : "text-slate-400 hover:bg-slate-800 hover:text-white",
          "focus-visible:ring-2 focus-visible:ring-brand/40",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors",
            active
              ? "text-white"
              : "text-slate-500 group-hover:text-white",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </span>

        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
            <ChevronDown
              className={[
                "h-4 w-4 text-current transition-transform duration-200",
                open ? "rotate-180" : "",
              ].join(" ")}
            />
          </>
        )}

        {collapsed && (
          <span className="pointer-events-none absolute left-[calc(100%+10px)] z-30 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            {item.label}
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1">
              {item.children.map((child) =>
                child.children.length > 0 ? (
                  <SidebarGroup
                    key={child.id}
                    item={child}
                    collapsed={collapsed}
                    depth={depth + 1}
                    expandedGroupIds={expandedGroupIds}
                    forceOpen={forceOpen}
                    onNavigate={onNavigate}
                    onToggle={onToggle}
                  />
                ) : (
                  <SidebarItem
                    key={child.id}
                    item={child}
                    collapsed={collapsed}
                    depth={depth + 1}
                    onNavigate={onNavigate}
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
