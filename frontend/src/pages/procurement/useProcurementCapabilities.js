import useCapabilities from "../../hooks/useCapabilities";

const PROCUREMENT_ACTIONS = [
  "view",
  "create",
  "update",
  "delete",
  "export",
  "approve",
];

const useProcurementCapabilities = ({ label, resource, route }) => {
  const capabilities = useCapabilities({
    actions: PROCUREMENT_ACTIONS,
    label,
    resource,
    route,
  });

  return {
    ...capabilities,
    canEdit: capabilities.canUpdate,
  };
};

export default useProcurementCapabilities;
