import { KeyRound, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";

import { logoutUser } from "../../services/authService";
import { clearCredentials } from "../../store/slices/authSlice";
import { clearAuthData } from "../../utils/authStorage";

const getDisplayName = (user) => {
  return (
    user?.fullName ??
    user?.name ??
    user?.username ??
    user?.email ??
    "COSMOS user"
  );
};

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { refreshToken, user } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logoutUser({ refreshToken });
      }

      toast.success("Signed out successfully");
    } catch (error) {
      toast.error(
        error.response?.data?.message ?? "Signed out locally. Server logout failed.",
      );
    } finally {
      clearAuthData();
      dispatch(clearCredentials());
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        <p className="text-sm font-semibold text-gray-900">COSMOS ERP</p>
        <p className="text-xs text-gray-500">{getDisplayName(user)}</p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          to="/change-password"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <KeyRound className="h-4 w-4" />
          Password
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
