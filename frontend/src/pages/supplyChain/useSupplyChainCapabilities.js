import useCapabilities from "../../hooks/useCapabilities";

const SUPPLY_CHAIN_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "export",
  "approve",
];

const useSupplyChainCapabilities = ({ label, resource, route }) => {
  const capabilities = useCapabilities({
    actions: SUPPLY_CHAIN_ACTIONS,
    label,
    resource,
    route,
  });

  return {
    ...capabilities,
    canEdit: capabilities.canUpdate,
  };
};

export default useSupplyChainCapabilities;
