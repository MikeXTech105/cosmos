import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, KeyRound, LogOut, Settings, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { logoutUser } from "../../services/authService";
import { clearCredentials } from "../../store/slices/authSlice";
import { getApiErrorMessage } from "../../utils/apiError";
import { clearAuthData } from "../../utils/authStorage";
import { getDisplayName, getInitial, getRoleName } from "../../utils/userDisplay";

const accountLinks = [
  {
    description: "Personal details and account info",
    icon: User,
    label: "My Profile",
    to: "/profile",
  },
  {
    description: "Appearance and workspace defaults",
    icon: Settings,
    label: "Preferences",
    to: "/preferences",
  },
  {
    description: "Update your security credentials",
    icon: KeyRound,
    label: "Change Password",
    to: "/change-password",
  },
];

const UserMenu = () => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { refreshToken, roles, user } = useSelector((state) => state.auth);
  const displayName = getDisplayName(user);
  const roleName = getRoleName(user, roles);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    });
    const triggerElement = triggerRef.current;
    const getItems = () =>
      Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? []);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      const items = getItems();
      const currentIndex = items.indexOf(document.activeElement);
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : event.key === "ArrowUp"
              ? (currentIndex - 1 + items.length) % items.length
              : (currentIndex + 1) % items.length;

      items[nextIndex]?.focus();
    };
    const handleOutsidePointer = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handleOutsidePointer);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handleOutsidePointer);
      triggerElement?.focus();
    };
  }, [open]);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logoutUser({ refreshToken });
      }

      toast.success("Signed out successfully");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Signed out locally. Server logout failed."),
      );
    } finally {
      clearAuthData();
      dispatch(clearCredentials());
      navigate("/login", { replace: true });
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={[
          "group flex h-11 items-center gap-3 rounded-xl border px-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 sm:px-2.5",
          open
            ? "border-slate-200 bg-white shadow-sm"
            : "border-transparent hover:border-slate-200/80 hover:bg-white hover:shadow-sm",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="user-account-menu"
        aria-label={`${open ? "Close" : "Open"} account menu for ${displayName}`}
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand to-indigo-700 text-sm font-semibold text-white shadow-sm ring-2 ring-white">
          {getInitial(displayName)}
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
            aria-hidden="true"
          />
        </span>
        <span className="hidden min-w-0 text-left lg:block">
          <span className="block max-w-[140px] truncate text-xs font-semibold text-slate-900">
            {displayName}
          </span>
          <span className="block text-[11px] text-slate-500">{roleName}</span>
        </span>
        <ChevronDown
          className={[
            "hidden h-4 w-4 shrink-0 text-slate-400 transition-transform lg:block",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              tabIndex={-1}
              className="fixed inset-0 z-30 cursor-default"
              aria-label="Close user menu"
              onClick={() => setOpen(false)}
            />

            <motion.div
              id="user-account-menu"
              ref={menuRef}
              role="menu"
              aria-label="Account menu"
              className="absolute right-0 top-[52px] z-40 w-[min(18rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_70px_-24px_rgba(15,23,42,0.5)]"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-indigo-50/70 p-4">
                <div
                  className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-brand/10 blur-2xl"
                  aria-hidden="true"
                />
                <div className="relative flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-indigo-700 text-base font-bold text-white shadow-md shadow-brand/20">
                    {getInitial(displayName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900">
                      {displayName}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {user?.email ?? "COSMOS ERP account"}
                    </span>
                  </span>
                </div>

                <div className="relative mt-3 flex items-center justify-between gap-2">
                  <span className="inline-flex min-w-0 items-center rounded-full border border-brand/10 bg-brand/5 px-2.5 py-1 text-[10px] font-semibold text-brand">
                    <span className="truncate">{roleName}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                      aria-hidden="true"
                    />
                    Signed in
                  </span>
                </div>
              </div>

              <div className="p-2.5">
                <p className="px-2 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Account
                </p>
                {accountLinks.map(({ description, icon: Icon, label, to }) => (
                  <Link
                    key={to}
                    to={to}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="group/item flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 text-slate-600 transition-all hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 focus-visible:border-brand/20 focus-visible:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/15"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover/item:bg-brand/10 group-hover/item:text-brand">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-800">
                        {label}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                        {description}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>

              <div className="border-t border-slate-100 bg-slate-50/70 p-2.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="group/logout flex w-full items-center gap-3 rounded-xl border border-transparent px-2 py-2 text-left text-red-600 transition-all hover:border-red-100 hover:bg-red-50 focus-visible:border-red-200 focus-visible:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-100"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 transition-colors group-hover/logout:bg-white">
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-xs font-semibold">Logout</span>
                    <span className="mt-0.5 block text-[10px] text-red-500/80">
                      End this session securely
                    </span>
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserMenu;
