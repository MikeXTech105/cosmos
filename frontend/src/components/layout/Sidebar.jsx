import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { Command, Search, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import { useSidebar } from "../../hooks/useSidebar";
import useSidebarTheme from "../../hooks/useSidebarTheme";
import { getDisplayName, getInitial, getRoleName } from "../../utils/userDisplay";
import {
  focusFirstIn,
  restoreFocus,
  trapFocus,
} from "../../utils/focus";
import SidebarGroup from "./SidebarGroup";
import SidebarItem from "./SidebarItem";

const SidebarContent = ({ closeAction, onNavigate, sidebarTheme }) => {
  const { roles, user } = useSelector((state) => state.auth);
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
  const displayName = getDisplayName(user);
  const roleName = getRoleName(user, roles);

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex h-[70px] items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={clsx(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
              classes.brandTile,
            )}
          >
            C
          </div>

          <div className="min-w-0">
            <p
              className={clsx(
                "truncate text-sm font-semibold leading-5",
                classes.brandTitle,
              )}
            >
              COSMOS ERP
            </p>
            <p
              className={clsx(
                "whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.06em]",
                classes.brandSubtitle,
              )}
            >
              Enterprise Resource Platform
            </p>
          </div>
          {closeAction}
        </div>
      </div>

      <div className="px-4 pb-4">
        <label className="relative block">
          <span className={clsx("mb-1.5 block text-xs font-semibold", classes.menuLabel)}>
            Search
          </span>
          <Search aria-hidden="true"
            className={clsx(
              "pointer-events-none absolute left-3 bottom-3 h-4 w-4",
              classes.searchIcon,
            )}
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
            className={clsx(
              "h-11 w-full rounded-lg border pl-9 pr-12 text-base outline-none transition-all focus:ring-2 lg:h-10 lg:text-sm",
              classes.searchInput,
            )}
          />
          <span
            className={clsx(
              "absolute right-2 top-1/2 inline-flex h-6 -translate-y-1/2 items-center gap-1 rounded-md border px-1.5 text-[10px] font-semibold",
              classes.searchShortcut,
            )}
          >
            <Command aria-hidden="true" className="h-3 w-3" /> K
          </span>
        </label>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p
          className={clsx(
            "mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em]",
            classes.menuLabel,
          )}
        >
          Menu
        </p>

        <nav className="space-y-2 lg:space-y-1" aria-label="Primary navigation">
          {menuTree.map((item) =>
            item.children.length > 0 ? (
              <SidebarGroup
                key={item.id}
                item={item}
                expandedGroupIds={expandedGroupIds}
                forceOpen={forceOpen}
                onNavigate={onNavigate}
                onToggle={toggleGroup}
                themeClasses={classes}
              />
            ) : (
              <SidebarItem
                key={item.id}
                item={item}
                onNavigate={onNavigate}
                themeClasses={classes}
              />
            ),
          )}
        </nav>

        {!hasPages && (
          <div
            className={clsx(
              "mt-4 rounded-xl p-4 text-center",
              classes.emptyCard,
            )}
          >
            <ShieldCheck aria-hidden="true" className={clsx("mx-auto h-5 w-5", classes.iconActive)} />
            <p className={clsx("mt-2 text-sm font-semibold", classes.emptyTitle)}>
              No pages assigned
            </p>
            <p className={clsx("mt-1 text-xs leading-5", classes.emptyBody)}>
              RBAC pages from the API will appear here.
            </p>
          </div>
        )}

        {hasPages && menuTree.length === 0 && (
          <div
            className={clsx(
              "mt-4 rounded-xl p-4 text-center text-sm",
              classes.noMatch,
            )}
          >
            No matching menu items
          </div>
        )}
      </div>

      <div className={clsx("border-t p-4", classes.footer)}>
        <div className={clsx("rounded-xl p-3", classes.userCard)}>
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
                classes.userAvatar,
              )}
            >
              {getInitial(displayName)}
            </div>
            <div className="min-w-0">
              <p
                className={clsx("truncate text-xs font-semibold", classes.userName)}
                title={displayName}
              >
                {displayName}
              </p>
              <p
                className={clsx("truncate text-[11px]", classes.userRole)}
                title={roleName}
              >
                {roleName}
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
  const { closeMobileSidebar, mobileOpen } = useSidebar();
  const location = useLocation();
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    closeMobileSidebar();
  }, [closeMobileSidebar, location.pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      focusFirstIn(drawerRef.current);
    });
    const releaseFocusTrap = trapFocus(drawerRef.current);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMobileSidebar();
      }
    };
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const handleDesktopChange = (event) => {
      if (event.matches) closeMobileSidebar();
    };

    document.addEventListener("keydown", handleKeyDown);
    desktopQuery.addEventListener("change", handleDesktopChange);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      releaseFocusTrap();
      document.removeEventListener("keydown", handleKeyDown);
      desktopQuery.removeEventListener("change", handleDesktopChange);
      document.body.style.overflow = previousOverflow;
      restoreFocus(previousFocusRef.current);
    };
  }, [closeMobileSidebar, mobileOpen]);

  return (
    <>
      <aside
        aria-label="Primary sidebar"
        data-sidebar-theme={sidebarTheme.id}
        className={clsx(
          "hidden h-dvh w-[280px] shrink-0 overflow-hidden border-r lg:block",
          sidebarTheme.classes.root,
        )}
      >
        <SidebarContent sidebarTheme={sidebarTheme} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
              onClick={closeMobileSidebar}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              ref={drawerRef}
              id="mobile-sidebar"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              data-sidebar-theme={sidebarTheme.id}
              className={clsx(
                "relative h-dvh w-[min(88vw,320px)] overflow-hidden border-r shadow-2xl",
                sidebarTheme.classes.root,
              )}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <SidebarContent
                sidebarTheme={sidebarTheme}
                onNavigate={closeMobileSidebar}
                closeAction={
                  <button
                    type="button"
                    onClick={closeMobileSidebar}
                    className={clsx(
                      "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/40",
                      sidebarTheme.classes.navInactive,
                    )}
                    aria-label="Close navigation menu"
                  >
                    <X aria-hidden="true" className="h-5 w-5" />
                  </button>
                }
              />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
