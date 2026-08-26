import useCapabilities from "../../hooks/useCapabilities";

const useOeeCapabilities = ({ actions, label, resource, route }) => {
  const capabilities = useCapabilities({ actions, label, resource, route });

  return {
    ...capabilities,
    canEdit: capabilities.canUpdate,
  };
};

export default useOeeCapabilities;
