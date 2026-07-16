import useCapabilities from "./useCapabilities";

const useCreatePermission = ({ label, resource, route }) => {
  return useCapabilities({
    actions: ["create"],
    label,
    resource,
    route,
  }).canCreate;
};

export default useCreatePermission;
