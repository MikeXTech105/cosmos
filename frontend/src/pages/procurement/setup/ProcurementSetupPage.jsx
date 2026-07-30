import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

import useUrlFilters from "../../../hooks/useUrlFilters";
import { canPerformAction } from "../../../utils/permissionResolver";
import BomMappingPage from "../bomMapping/BomMappingPage";
import { ProcurementTabs } from "../ProcurementShared";
import ProcurementSettingsPage from "../settings/ProcurementSettingsPage";
import SkuMappingPage from "../skuMapping/SkuMappingPage";
import { PROCUREMENT_SETUP_TABS } from "./procurementSetupTabs";
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
      PROCUREMENT_SETUP_TABS.filter((tab) =>
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
      id="procurement-setup-tabs"
      tabs={visibleTabs}
      onChange={(tab) => setValue("tab", tab)}
    />
  );

  return (
    <div
      id={`procurement-setup-tabs-panel-${activeTab}`}
      role="tabpanel"
      aria-labelledby={`procurement-setup-tabs-tab-${activeTab}`}
    >
      {activeTab === "sku" && <SkuMappingPage moduleTabs={setupTabs} />}
      {activeTab === "bom" && <BomMappingPage moduleTabs={setupTabs} />}
      {activeTab === "settings" && <ProcurementSettingsPage moduleTabs={setupTabs} />}
    </div>
  );
};

export default ProcurementSetupPage;
