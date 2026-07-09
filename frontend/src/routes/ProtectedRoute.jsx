import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

import { getAuthData } from "../utils/authStorage";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const token =
    useSelector((state) => state.auth.accessToken) ?? getAuthData().accessToken;

  return token ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
};

export default ProtectedRoute;
