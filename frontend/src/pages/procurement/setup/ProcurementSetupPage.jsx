import { GitBranch, Link2, SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

import useUrlFilters from "../../../hooks/useUrlFilters";
import { canPerformAction } from "../../../utils/permissionResolver";
import BomMappingPage from "../bomMapping/BomMappingPage";
import { ProcurementTabs } from "../ProcurementShared";
import ProcurementSettingsPage from "../settings/ProcurementSettingsPage";
import SkuMappingPage from "../skuMapping/SkuMappingPage";

const SETUP_TABS = [
  {
    id: "sku",
    icon: Link2,
    label: "SKU mapping",
    pageName: "ProcurementPlanning.SkuMapping",
    route: "/procurement/sku-mapping",
  },
  {
    id: "bom",
    icon: GitBranch,
    label: "BOM",
    pageName: "ProcurementPlanning.BomMapping",
    route: "/procurement/bom-mapping",
  },
  {
    id: "settings",
    icon: SlidersHorizontal,
    label: "Settings",
    pageName: "ProcurementPlanning.Settings",
    route: "/procurement/settings",
  },
];
const SETUP_URL_OPTIONS = Object.freeze({
  clearOnChange: Object.freeze({
    tab: Object.freeze(["productId"]),
  }),
});

const ProcurementSetupPage = () => {
  const pages = useSelector((state) => state.auth.pages ?? []);
  const roles = useSelector((state) => state.auth.roles ?? []);
  const user = useSelector((state) => state.auth.user);
  const visibleTabs = useMemo(
    () =>
      SETUP_TABS.filter((tab) =>
        canPerformAction({
          action: "view",
          pages,
          roles,
          target: { label: tab.pageName, route: tab.route },
          user,
        }),
    ),
    [pages, roles, user],
  );
  const urlSchema = useMemo(
    () => ({
      tab: {
        default: visibleTabs[0]?.id ?? "",
        options: visibleTabs.map((tab) => tab.id),
        type: "enum",
      },
    }),
    [visibleTabs],
  );
  const { setValue, values } = useUrlFilters(
    urlSchema,
    SETUP_URL_OPTIONS,
  );

  if (visibleTabs.length === 0) {
    return <Navigate replace to="/403" />;
  }

  const activeTab = values.tab;
  const setupTabs = (
    <ProcurementTabs
      active={activeTab}
      tabs={visibleTabs}
      onChange={(tab) => setValue("tab", tab)}
    />
  );

  return (
    <>
      {activeTab === "sku" && <SkuMappingPage moduleTabs={setupTabs} />}
      {activeTab === "bom" && <BomMappingPage moduleTabs={setupTabs} />}
      {activeTab === "settings" && <ProcurementSettingsPage moduleTabs={setupTabs} />}
    </>
  );
};

export default ProcurementSetupPage;
