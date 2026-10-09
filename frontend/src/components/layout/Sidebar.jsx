import { AnimatePresence, motion } from "framer-motion";
import { Search, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import CosmosBrand from "../branding/CosmosBrand";
import { useSidebar } from "../../hooks/useSidebar";
import useSidebarTheme from "../../hooks/useSidebarTheme";
import { getDisplayName, getInitial, getRoleName } from "../../utils/userDisplay";
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
      <div
        className={[
          "relative flex h-[72px] items-center justify-center border-b px-14",
          classes.footer,
        ].join(" ")}
      >
        <CosmosBrand
          className="py-1"
          subtitleClassName={classes.brandSubtitle}
          titleClassName={classes.brandTitle}
        />
        {closeAction && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {closeAction}
          </div>
        )}
      </div>

      <div className="px-3 py-3">
        <label className="relative block">
          <Search
            className={[
              "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
              classes.searchIcon,
            ].join(" ")}
          />
          <input
            aria-label="Search navigation"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                resetSearch();
              }
            }}
            placeholder="Search menu"
            className={[
              "h-10 w-full rounded-lg border pl-9 pr-3 text-sm outline-none transition-all focus:ring-2",
              classes.searchInput,
            ].join(" ")}
          />
        </label>
      </div>

      <div className="sidebar-scroll flex-1 overflow-y-auto px-3 pb-4 pt-1">
        <p
          className={[
            "mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em]",
            classes.menuLabel,
          ].join(" ")}
        >
          Menu
        </p>

        <nav className="isolate space-y-1" aria-label="Primary navigation">
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

      <div className={["border-t p-3", classes.footer].join(" ")}>
        <div className={["rounded-xl p-3", classes.userCard].join(" ")}>
          <div className="flex items-center gap-3">
            <div
              className={[
                "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
                classes.userAvatar,
              ].join(" ")}
            >
              {getInitial(displayName)}
            </div>
            <div className="min-w-0">
              <p
                className={["truncate text-xs font-semibold", classes.userName].join(" ")}
                title={displayName}
              >
                {displayName}
              </p>
              <p
                className={["truncate text-[11px]", classes.userRole].join(" ")}
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
      drawerRef.current
        ?.querySelector("button, input, a[href]")
        ?.focus();
    });
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMobileSidebar();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = Array.from(
        drawerRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
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
      document.removeEventListener("keydown", handleKeyDown);
      desktopQuery.removeEventListener("change", handleDesktopChange);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [closeMobileSidebar, mobileOpen]);

  return (
    <>
      <aside
        aria-label="Primary sidebar"
        data-sidebar-theme={sidebarTheme.id}
        className={[
          "hidden h-dvh w-[280px] shrink-0 overflow-hidden border-r lg:block",
          sidebarTheme.classes.root,
        ].join(" ")}
      >
        <SidebarContent sidebarTheme={sidebarTheme} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              type="button"
              aria-label="Close navigation menu"
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
              className={[
                "relative h-dvh w-[min(88vw,320px)] overflow-hidden border-r shadow-2xl",
                sidebarTheme.classes.root,
              ].join(" ")}
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
                    className={[
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/40",
                      sidebarTheme.classes.navInactive,
                    ].join(" ")}
                    aria-label="Close navigation menu"
                  >
                    <X className="h-5 w-5" />
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
