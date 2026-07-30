import clsx from "clsx";
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
        className="flex h-11 items-center gap-3 rounded-xl px-1.5 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 sm:px-2.5"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white shadow-sm">
          {getInitial(displayName)}
        </span>
        <span className="hidden min-w-0 text-left lg:block">
          <span className="block max-w-[140px] truncate text-xs font-semibold text-slate-900">
            {displayName}
          </span>
          <span className="block text-[11px] text-slate-500">{roleName}</span>
        </span>
        <ChevronDown aria-hidden="true"
          className={clsx(
            "hidden h-4 w-4 shrink-0 text-slate-500 transition-transform lg:block",
            open && "rotate-180",
          )}
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
              ref={menuRef}
              role="menu"
              className="absolute right-0 top-12 z-40 w-[min(16rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="border-b border-slate-100 p-4">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {displayName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {user?.email ?? "COSMOS ERP account"}
                </p>
              </div>

              <div className="p-2">
                <Link
                  to="/profile"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:min-h-0"
                >
                  <User aria-hidden="true" className="h-4 w-4 text-slate-500" />
                  My Profile
                </Link>
                <Link
                  to="/preferences"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:min-h-0"
                >
                  <Settings aria-hidden="true" className="h-4 w-4 text-slate-500" />
                  Preferences
                </Link>
                <Link
                  to="/change-password"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:min-h-0"
                >
                  <KeyRound aria-hidden="true" className="h-4 w-4 text-slate-500" />
                  Change Password
                </Link>
              </div>

              <div className="border-t border-slate-100 p-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 lg:min-h-0"
                >
                  <LogOut aria-hidden="true" className="h-4 w-4" />
                  Logout
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
