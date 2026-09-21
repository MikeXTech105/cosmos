import { useMemo } from "react";
import { useSelector } from "react-redux";

import { canPerformAction, normalizeAction } from "../utils/permissionResolver";

const toCapabilityName = (action) => {
  const normalizedAction = normalizeAction(action);

  return `can${normalizedAction.charAt(0).toUpperCase()}${normalizedAction.slice(1)}`;
};

const useCapabilities = ({ actions, label, pageName, resource, route }) => {
  const pages = useSelector((state) => state.auth.pages ?? []);
  const roles = useSelector((state) => state.auth.roles ?? []);
  const user = useSelector((state) => state.auth.user);
  const actionList = useMemo(() => {
    if (Array.isArray(actions)) {
      return actions;
    }

    if (actions && typeof actions === "object") {
      return Object.values(actions);
    }

    return ["view", "create", "update", "delete"];
  }, [actions]);

  return useMemo(() => {
    return Object.fromEntries(
      actionList.map((action) => {
        return [
          toCapabilityName(action),
          canPerformAction({
            action,
            pages,
            resource,
            roles,
            target: { label, pageName, route },
            user,
          }),
        ];
      }),
    );
  }, [actionList, label, pageName, pages, resource, roles, route, user]);
};

export default useCapabilities;

