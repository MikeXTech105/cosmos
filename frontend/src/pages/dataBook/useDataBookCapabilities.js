import useCapabilities from "../../hooks/useCapabilities";

const useDataBookCapabilities = () => {
  const capabilities = useCapabilities({
    actions: ["view", "create", "edit", "delete", "export"],
    label: "DataBook.Entries",
    pageName: "DataBook.Entries",
    resource: "DataBook.Entries",
    route: "/data-book",
  });

  return {
    ...capabilities,
    canEdit: capabilities.canUpdate,
  };
};

export default useDataBookCapabilities;
