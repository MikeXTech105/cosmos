import useCapabilities from "../../hooks/useCapabilities";

const useHrCapabilities = ({ actions, label, pageName, resource, route }) => {
  const capabilities = useCapabilities({ actions, label, pageName, resource, route });

  return {
    ...capabilities,
    canEdit: capabilities.canUpdate,
  };
};

export default useHrCapabilities;
