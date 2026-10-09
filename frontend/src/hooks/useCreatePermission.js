import useCapabilities from "./useCapabilities";

const useCreatePermission = ({ label, pageName = label, resource, route }) => {
  return useCapabilities({
    actions: ["create"],
    label,
    pageName,
    resource,
    route,
  }).canCreate;
};

export default useCreatePermission;
