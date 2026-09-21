import useCapabilities from "../../hooks/useCapabilities";

const useActivityLogsCapabilities = () => {
  const capabilities = useCapabilities({
    actions: ["view", "export"],
    label: "ActivityLogs",
    pageName: "ActivityLogs",
    resource: "ActivityLogs",
    route: "/activity-logs",
  });

  return {
    canExport: Boolean(capabilities.canExport),
    canView: Boolean(capabilities.canView),
  };
};

export default useActivityLogsCapabilities;
