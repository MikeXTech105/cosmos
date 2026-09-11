import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

import CosmosLoader from "../components/common/CosmosLoader";
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
      <div role="status" aria-live="polite">
        <CosmosLoader fullScreen size="md" label="Refreshing your session…" />
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
