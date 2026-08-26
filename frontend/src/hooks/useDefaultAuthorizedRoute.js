import { useMemo } from "react";
import { useSelector } from "react-redux";

import { getDefaultAuthorizedRoute } from "../utils/authorizedRoute";

const useDefaultAuthorizedRoute = () => {
  const pages = useSelector((state) => state.auth.pages ?? []);
  const roles = useSelector((state) => state.auth.roles ?? []);
  const user = useSelector((state) => state.auth.user);

  return useMemo(
    () => getDefaultAuthorizedRoute({ pages, roles, user }),
    [pages, roles, user],
  );
};

export default useDefaultAuthorizedRoute;

