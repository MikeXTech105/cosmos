import useCapabilities from "../../hooks/useCapabilities";

const useHrCapabilities = ({ actions, label, resource, route }) => {
  const capabilities = useCapabilities({ actions, label, resource, route });

  return {
    ...capabilities,
    canEdit: capabilities.canUpdate,
  };
};

export default useHrCapabilities;
