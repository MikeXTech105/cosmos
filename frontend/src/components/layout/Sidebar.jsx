import { AnimatePresence, motion } from "framer-motion";
import {
  Command,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useSidebar } from "../../hooks/useSidebar";
import SidebarGroup from "./SidebarGroup";
import SidebarItem from "./SidebarItem";

const SidebarContent = ({ compact = false, mobile = false }) => {
  const {
    closeMobileSidebar,
    expandedGroupIds,
    hasPages,
    isCollapsed,
    menuTree,
    resetSearch,
    searchQuery,
    setSearchQuery,
    toggleCollapsed,
    toggleGroup,
  } = useSidebar();
  const collapsed = !mobile && (compact || isCollapsed);
  const forceOpen = searchQuery.trim().length > 0;

  const handleNavigate = () => {
    if (mobile) {
      closeMobileSidebar();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div
        className={[
          "relative flex h-[70px] items-center",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white shadow-sm">
            C
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-5 text-slate-950">
                COSMOS ERP
              </p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Enterprise Resource Platform
              </p>
            </div>
          )}
        </div>

        {mobile ? (
          <button
            type="button"
            onClick={closeMobileSidebar}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          !compact && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className={[
                "hidden items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 md:inline-flex",
                collapsed
                  ? "absolute right-1 top-5 h-7 w-7"
                  : "h-8 w-8",
              ].join(" ")}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )
        )}
      </div>

      {compact && (
        <div className="flex justify-center pb-4">
          <span className="h-px w-8 bg-slate-200" />
        </div>
      )}

      {!collapsed && (
        <div className="px-4 pb-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  resetSearch();
                }
              }}
              placeholder="Search menu"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white/60 pl-9 pr-12 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-brand/30 focus:bg-white focus:ring-4 focus:ring-brand/10"
            />
            <span className="absolute right-2 top-1/2 inline-flex h-6 -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 text-[10px] font-semibold text-slate-400">
              <Command className="h-3 w-3" /> K
            </span>
          </label>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {!collapsed && (
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Menu
          </p>
        )}

        <nav className="space-y-1" aria-label="Primary navigation">
          {menuTree.map((item) =>
            item.children.length > 0 ? (
              <SidebarGroup
                key={item.id}
                item={item}
                collapsed={collapsed}
                expandedGroupIds={expandedGroupIds}
                forceOpen={forceOpen}
                onNavigate={handleNavigate}
                onToggle={toggleGroup}
              />
            ) : (
              <SidebarItem
                key={item.id}
                item={item}
                collapsed={collapsed}
                onNavigate={handleNavigate}
              />
            ),
          )}
        </nav>

        {!hasPages && (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
            <ShieldCheck className="mx-auto h-5 w-5 text-brand" />
            {!collapsed && (
              <>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  No pages assigned
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  RBAC pages from the API will appear here.
                </p>
              </>
            )}
          </div>
        )}

        {hasPages && menuTree.length === 0 && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
            No matching menu items
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="border-t border-slate-100/60 p-4">
          <div className="glass-card rounded-2xl p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                S
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">
                  System
                </p>
                <p className="truncate text-[11px] text-slate-500">Admin</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Sidebar = () => {
  const { closeMobileSidebar, isCollapsed, isMobileOpen, openMobileSidebar } =
    useSidebar();
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const syncTabletState = () => setIsTablet(mediaQuery.matches);

    syncTabletState();
    mediaQuery.addEventListener("change", syncTabletState);

    return () => mediaQuery.removeEventListener("change", syncTabletState);
  }, []);

  return (
    <>
      <motion.aside
        animate={{ width: isTablet || isCollapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="hidden h-dvh shrink-0 border-r border-slate-100/60 glass-strong md:block"
      >
        <SidebarContent compact={isTablet} />
      </motion.aside>

      <button
        type="button"
        onClick={openMobileSidebar}
        className="fixed left-4 top-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 glass text-slate-700 shadow-sm md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation overlay"
              className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileSidebar}
            />

            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[min(86vw,320px)] border-r border-slate-100/60 glass-strong shadow-2xl md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <SidebarContent mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
