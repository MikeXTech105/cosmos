import useCapabilities from "../../hooks/useCapabilities";

const CONTENT_ACTIONS = ["view", "create", "edit", "delete"];
const WARRANTY_ACTIONS = ["view", "create", "edit", "approve", "export"];

const useWebsitePageCapabilities = (name, actions = CONTENT_ACTIONS) => {
  const capabilities = useCapabilities({
    actions,
    label: `WebsiteManagement.${name}`,
    resource: `WebsiteManagement.${name}`,
  });
  return {
    ...capabilities,
    canEdit: capabilities.canEdit ?? capabilities.canUpdate ?? false,
  };
};

const useWebsiteCapabilities = () => ({
  announcements: useWebsitePageCapabilities("Announcements"),
  blogs: useWebsitePageCapabilities("Blogs"),
  dashboard: useWebsitePageCapabilities("Dashboard", ["view"]),
  media: useWebsitePageCapabilities("Media", ["view", "create"]),
  products: useWebsitePageCapabilities("Products"),
  settings: useWebsitePageCapabilities("Settings", ["view", "edit"]),
  warranty: useWebsitePageCapabilities("WarrantyClaims", WARRANTY_ACTIONS),
});

export default useWebsiteCapabilities;
