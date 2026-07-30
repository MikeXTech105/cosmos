import { GitBranch, Link2, SlidersHorizontal } from "lucide-react";

export const PROCUREMENT_SETUP_TABS = Object.freeze([
  Object.freeze({
    icon: Link2,
    id: "sku",
    label: "SKU mapping",
    pageName: "ProcurementPlanning.SkuMapping",
    route: "/procurement/sku-mapping",
  }),
  Object.freeze({
    icon: GitBranch,
    id: "bom",
    label: "BOM",
    pageName: "ProcurementPlanning.BomMapping",
    route: "/procurement/bom-mapping",
  }),
  Object.freeze({
    icon: SlidersHorizontal,
    id: "settings",
    label: "Settings",
    pageName: "ProcurementPlanning.Settings",
    route: "/procurement/settings",
  }),
]);
