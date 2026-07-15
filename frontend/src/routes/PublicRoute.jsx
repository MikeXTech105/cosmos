import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

import { getAuthData } from "../utils/authStorage";
import { getDefaultAuthorizedRoute } from "../utils/authorizedRoute";

const PublicRoute = ({ children }) => {
  const auth = useSelector((state) => state.auth);
  const token = auth.accessToken ?? getAuthData().accessToken;
  const defaultRoute = getDefaultAuthorizedRoute(auth);

  return token ? <Navigate to={defaultRoute} replace /> : children;
};

export default PublicRoute;
