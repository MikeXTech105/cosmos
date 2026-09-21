import useCapabilities from "../../hooks/useCapabilities";

const useInventoryCapabilities = ({ label, pageName = label, resource, route }) => {
  const capabilities = useCapabilities({ label, pageName, resource, route });

  return {
    ...capabilities,
    canEdit: capabilities.canUpdate,
  };
};

export default useInventoryCapabilities;
