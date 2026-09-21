import useCapabilities from "../../hooks/useCapabilities";

const ACTIONS = ["view", "create", "update", "delete", "export", "approve"];

const useDispatchCapabilities = ({ label, pageName = label, resource = label, route }) => {
  const capabilities = useCapabilities({
    actions: ACTIONS,
    label,
    pageName,
    resource,
    route,
  });
  const allocation = useCapabilities({
    actions: ["update"],
    label: "DispatchPlanning.Allocation",
    pageName: "DispatchPlanning.Allocation",
    resource: "DispatchPlanning.Allocation",
    route: "/dispatch/runs",
  });

  return {
    ...capabilities,
    canAllocate: allocation.canUpdate,
    canEdit: capabilities.canUpdate,
  };
};

export default useDispatchCapabilities;
