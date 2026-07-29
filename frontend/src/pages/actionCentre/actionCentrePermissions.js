export const ACTION_SIGNAL_PERMISSIONS = Object.freeze({
  dispatchSettings: Object.freeze({
    action: "view",
    key: "dispatchSettings",
    label: "DispatchPlanning.SkuSettings",
    page: "DispatchPlanning.SkuSettings",
    route: "/dispatch/settings",
  }),
  inventoryItems: Object.freeze({
    action: "view",
    key: "inventoryItems",
    label: "Items",
    page: "Items",
    route: "/items",
  }),
  procurementBom: Object.freeze({
    action: "view",
    key: "procurementBom",
    label: "ProcurementPlanning.BomMapping",
    page: "ProcurementPlanning.BomMapping",
    route: "/procurement/bom-mapping",
  }),
  procurementPlanningHistory: Object.freeze({
    action: "view",
    key: "procurementPlanningHistory",
    label: "ProcurementPlanning.PlanningHistory",
    page: "ProcurementPlanning.PlanningHistory",
    route: "/procurement/planning-history",
  }),
  procurementSettings: Object.freeze({
    action: "view",
    key: "procurementSettings",
    label: "ProcurementPlanning.Settings",
    page: "ProcurementPlanning.Settings",
    route: "/procurement/settings",
  }),
  supplyChainMappings: Object.freeze({
    action: "view",
    key: "supplyChainMappings",
    label: "SupplyChain.ItemMappings",
    page: "SupplyChain.ItemMappings",
    route: "/supply-chain/item-mappings",
  }),
});

export const ACTION_CENTRE_PERMISSION_TARGETS = Object.freeze(
  Object.values(ACTION_SIGNAL_PERMISSIONS).map(
    ({ action, label, page, route }) =>
      Object.freeze({ action, label, page, route }),
  ),
);
