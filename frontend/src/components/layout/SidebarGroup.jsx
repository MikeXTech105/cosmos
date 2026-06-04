import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import SidebarItem from "./SidebarItem";

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
          "group relative flex h-10 w-full items-center gap-3 rounded-xl text-[13px] font-medium outline-none transition-colors",
          collapsed ? "justify-center px-0" : "px-3",
          active
            ? "bg-blue-50 text-blue-700"
            : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950",
          "focus-visible:ring-2 focus-visible:ring-blue-500/20",
        ].join(" ")}
        style={{ paddingLeft: collapsed ? undefined : `${12 + depth * 14}px` }}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />
        )}

        <span
          className={[
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors",
            active
              ? "text-blue-600"
              : "text-slate-400 group-hover:text-slate-700",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </span>

        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
            <ChevronDown
              className={[
                "h-4 w-4 text-slate-400 transition-transform duration-200",
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
