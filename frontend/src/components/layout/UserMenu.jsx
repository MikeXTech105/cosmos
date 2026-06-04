import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, KeyRound, LogOut, Settings, User } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { logoutUser } from "../../services/authService";
import { clearCredentials } from "../../store/slices/authSlice";
import { clearAuthData } from "../../utils/authStorage";

const getDisplayName = (user) => {
  return (
    user?.fullName ??
    user?.name ??
    user?.username ??
    user?.email ??
    "System Admin"
  );
};

const getInitial = (name) => {
  return name.trim().charAt(0).toUpperCase() || "S";
};

const getRoleName = (user, roles) => {
  return user?.role ?? user?.roleName ?? roles?.[0]?.name ?? roles?.[0] ?? "Admin";
};

const UserMenu = () => {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { refreshToken, roles, user } = useSelector((state) => state.auth);
  const displayName = getDisplayName(user);
  const roleName = getRoleName(user, roles);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logoutUser({ refreshToken });
      }

      toast.success("Signed out successfully");
    } catch (error) {
      toast.error(
        error.response?.data?.message ??
          "Signed out locally. Server logout failed.",
      );
    } finally {
      clearAuthData();
      dispatch(clearCredentials());
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 items-center gap-3 rounded-2xl px-1.5 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 sm:px-2.5"
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
              className="fixed inset-0 z-30 cursor-default"
              aria-label="Close user menu"
              onClick={() => setOpen(false)}
            />

            <motion.div
              role="menu"
              className="absolute right-0 top-12 z-40 w-[min(16rem,calc(100vw-1rem))] overflow-hidden rounded-2xl glass-strong shadow-[0_24px_70px_rgba(79,70,229,0.14)]"
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
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white/70 hover:text-slate-900"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  My Profile
                </Link>
                <Link
                  to="/preferences"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white/70 hover:text-slate-900"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  Preferences
                </Link>
                <Link
                  to="/change-password"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white/70 hover:text-slate-900"
                >
                  <KeyRound className="h-4 w-4 text-slate-400" />
                  Change Password
                </Link>
              </div>

              <div className="border-t border-slate-100 p-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
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
