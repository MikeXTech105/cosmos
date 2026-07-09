import { Command, Search, ShieldCheck } from "lucide-react";

import { useSidebar } from "../../hooks/useSidebar";
import useSidebarTheme from "../../hooks/useSidebarTheme";
import SidebarGroup from "./SidebarGroup";
import SidebarItem from "./SidebarItem";

const SidebarContent = ({ sidebarTheme }) => {
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
  const classes = sidebarTheme.classes;

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex h-[70px] items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
              classes.brandTile,
            ].join(" ")}
          >
            C
          </div>

          <div className="min-w-0">
            <p
              className={[
                "truncate text-sm font-semibold leading-5",
                classes.brandTitle,
              ].join(" ")}
            >
              COSMOS ERP
            </p>
            <p
              className={[
                "whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.06em]",
                classes.brandSubtitle,
              ].join(" ")}
            >
              Enterprise Resource Platform
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <label className="relative block">
          <Search
            className={[
              "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
              classes.searchIcon,
            ].join(" ")}
          />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                resetSearch();
              }
            }}
            placeholder="Search menu"
            className={[
              "h-10 w-full rounded-lg border pl-9 pr-12 text-sm outline-none transition-all focus:ring-2",
              classes.searchInput,
            ].join(" ")}
          />
          <span
            className={[
              "absolute right-2 top-1/2 inline-flex h-6 -translate-y-1/2 items-center gap-1 rounded-md border px-1.5 text-[10px] font-semibold",
              classes.searchShortcut,
            ].join(" ")}
          >
            <Command className="h-3 w-3" /> K
          </span>
        </label>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p
          className={[
            "mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em]",
            classes.menuLabel,
          ].join(" ")}
        >
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
                themeClasses={classes}
              />
            ) : (
              <SidebarItem
                key={item.id}
                item={item}
                themeClasses={classes}
              />
            ),
          )}
        </nav>

        {!hasPages && (
          <div
            className={[
              "mt-4 rounded-xl p-4 text-center",
              classes.emptyCard,
            ].join(" ")}
          >
            <ShieldCheck className={["mx-auto h-5 w-5", classes.iconActive].join(" ")} />
            <p className={["mt-2 text-sm font-semibold", classes.emptyTitle].join(" ")}>
              No pages assigned
            </p>
            <p className={["mt-1 text-xs leading-5", classes.emptyBody].join(" ")}>
              RBAC pages from the API will appear here.
            </p>
          </div>
        )}

        {hasPages && menuTree.length === 0 && (
          <div
            className={[
              "mt-4 rounded-xl p-4 text-center text-sm",
              classes.noMatch,
            ].join(" ")}
          >
            No matching menu items
          </div>
        )}
      </div>

      <div className={["border-t p-4", classes.footer].join(" ")}>
        <div className={["rounded-xl p-3", classes.userCard].join(" ")}>
          <div className="flex items-center gap-3">
            <div
              className={[
                "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
                classes.userAvatar,
              ].join(" ")}
            >
              S
            </div>
            <div className="min-w-0">
              <p className={["truncate text-xs font-semibold", classes.userName].join(" ")}>
                System
              </p>
              <p className={["truncate text-[11px]", classes.userRole].join(" ")}>
                Admin
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const { sidebarTheme } = useSidebarTheme();

  return (
    <aside
      data-sidebar-theme={sidebarTheme.id}
      className={[
        "h-auto max-h-[42dvh] w-full shrink-0 overflow-hidden border-b lg:h-dvh lg:max-h-none lg:w-[280px] lg:border-b-0 lg:border-r",
        sidebarTheme.classes.root,
      ].join(" ")}
    >
      <SidebarContent sidebarTheme={sidebarTheme} />
    </aside>
  );
};

export default Sidebar;
