import { Command, Search, ShieldCheck } from "lucide-react";

import { useSidebar } from "../../hooks/useSidebar";
import SidebarGroup from "./SidebarGroup";
import SidebarItem from "./SidebarItem";

const SidebarContent = () => {
  const {
    expandedGroupIds,
    hasPages,
    menuTree,
    resetSearch,
    searchQuery,
    setSearchQuery,
    toggleGroup,
  } = useSidebar();
  const forceOpen = searchQuery.trim().length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex h-[70px] items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white shadow-sm">
            C
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-5 text-white">
              COSMOS ERP
            </p>
            <p className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-500">
              Enterprise Resource Platform
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                resetSearch();
              }
            }}
            placeholder="Search menu"
            className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-12 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <span className="absolute right-2 top-1/2 inline-flex h-6 -translate-y-1/2 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-1.5 text-[10px] font-semibold text-slate-500">
            <Command className="h-3 w-3" /> K
          </span>
        </label>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Menu
        </p>

        <nav className="space-y-1" aria-label="Primary navigation">
          {menuTree.map((item) =>
            item.children.length > 0 ? (
              <SidebarGroup
                key={item.id}
                item={item}
                expandedGroupIds={expandedGroupIds}
                forceOpen={forceOpen}
                onToggle={toggleGroup}
              />
            ) : (
              <SidebarItem
                key={item.id}
                item={item}
              />
            ),
          )}
        </nav>

        {!hasPages && (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-800 p-4 text-center">
            <ShieldCheck className="mx-auto h-5 w-5 text-brand" />
            <p className="mt-2 text-sm font-semibold text-slate-200">
              No pages assigned
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              RBAC pages from the API will appear here.
            </p>
          </div>
        )}

        {hasPages && menuTree.length === 0 && (
          <div className="mt-4 rounded-xl bg-slate-800 p-4 text-center text-sm text-slate-400">
            No matching menu items
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 p-4">
        <div className="rounded-xl bg-slate-800 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              S
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-200">
                System
              </p>
              <p className="truncate text-[11px] text-slate-500">Admin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Sidebar = () => {
  return (
    <aside className="h-auto max-h-[42dvh] w-full shrink-0 overflow-hidden border-b border-slate-800 bg-slate-900 lg:h-dvh lg:max-h-none lg:w-[280px] lg:border-b-0 lg:border-r">
      <SidebarContent />
    </aside>
  );
};

export default Sidebar;
