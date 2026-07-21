import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

import { refreshSession } from "../services/sessionService";
import { getAuthData } from "../utils/authStorage";
import { isJwtExpired } from "../utils/jwt";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const auth = useSelector((state) => state.auth);
  const storedAuth = getAuthData();
  const token = auth.accessToken ?? storedAuth.accessToken;
  const refreshToken = auth.refreshToken ?? storedAuth.refreshToken;
  const needsRefresh = Boolean(token && isJwtExpired(token));
  const [refreshFailed, setRefreshFailed] = useState(false);

  useEffect(() => {
    if (!needsRefresh || !refreshToken) {
      return undefined;
    }

    let active = true;

    refreshSession().catch(() => {
      if (active) setRefreshFailed(true);
    });

    return () => {
      active = false;
    };
  }, [needsRefresh, refreshToken]);

  if (!token || refreshFailed || (needsRefresh && !refreshToken)) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (needsRefresh) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-slate-50"
        role="status"
        aria-live="polite"
      >
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
        <span className="sr-only">Refreshing your session…</span>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
