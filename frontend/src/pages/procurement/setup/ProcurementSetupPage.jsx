import { GitBranch, Link2, SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Navigate, useSearchParams } from "react-router-dom";

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

const ProcurementSetupPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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
          target: {
            label: tab.label,
            pageName: tab.pageName,
            route: tab.route,
          },
          user,
        }),
      ),
    [pages, roles, user],
  );

  if (visibleTabs.length === 0) {
    return <Navigate replace to="/403" />;
  }

  const requestedTab = searchParams.get("tab");
  const activeTab = visibleTabs.some((tab) => tab.id === requestedTab)
    ? requestedTab
    : visibleTabs[0].id;
  const setupTabs = (
    <ProcurementTabs
      active={activeTab}
      tabs={visibleTabs}
      onChange={(tab) => setSearchParams({ tab })}
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
