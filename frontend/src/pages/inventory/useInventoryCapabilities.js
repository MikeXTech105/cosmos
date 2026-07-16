import useCapabilities from "../../hooks/useCapabilities";

const useInventoryCapabilities = ({ label, resource, route }) => {
  const capabilities = useCapabilities({ label, resource, route });

  return {
    ...capabilities,
    canEdit: capabilities.canUpdate,
  };
};

export default useInventoryCapabilities;
