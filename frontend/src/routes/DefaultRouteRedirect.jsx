import { Navigate } from "react-router-dom";

import useDefaultAuthorizedRoute from "../hooks/useDefaultAuthorizedRoute";

const DefaultRouteRedirect = () => {
  const defaultRoute = useDefaultAuthorizedRoute();

  return <Navigate to={defaultRoute} replace />;
};

export default DefaultRouteRedirect;

