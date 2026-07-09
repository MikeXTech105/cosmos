import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

import { getAuthData } from "../utils/authStorage";

const PublicRoute = ({ children }) => {
  const token =
    useSelector((state) => state.auth.accessToken) ?? getAuthData().accessToken;

  return token ? <Navigate to="/dashboard" replace /> : children;
};

export default PublicRoute;
