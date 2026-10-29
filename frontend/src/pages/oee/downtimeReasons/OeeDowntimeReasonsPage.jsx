import { AlertTriangle, CheckCircle2, PauseCircle } from "lucide-react";

import OeeMasterPage from "../OeeMasterPage";
import { getOeeBoolean } from "../oeeHelpers";
import { OeeStatusPill } from "../OeeShared";
import {
  createOeeDowntimeReason,
  deleteOeeDowntimeReason,
  fetchOeeDowntimeReasonById,
  fetchOeeDowntimeReasons,
  setOeeDowntimeReasonFilters,
  setOeeDowntimeReasonPage,
  setOeeDowntimeReasonPageSize,
  updateOeeDowntimeReason,
} from "../../../store/slices/oee/oeeDowntimeReasonSlice";

const downtimeReasonConfig = {
  compact: true,
  modalWidth: "max-w-lg",
  searchPlaceholder: "Find a downtime or production reason…",
  activeIcon: CheckCircle2,
  addLabel: "Add Reason",
  columns: [
    {
      key: "reasonName",
      label: "Reason",
      render: (reason) => (
        <span className="font-semibold text-slate-900">
          {reason.reasonName || "-"}
        </span>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (reason) => (
        <OeeStatusPill isActive={getOeeBoolean(reason.isActive)} />
      ),
    },
  ],
  createEntity: createOeeDowntimeReason,
  deleteEntity: deleteOeeDowntimeReason,
  description:
    "Maintain downtime/problem reasons used in daily production entries.",
  emptyDescription:
    "Create reasons such as NONE, LIGHT CHALI GAYI, MACHINE KHARAB HUA, and MOULD CHANGE HUA.",
  entityKey: "downtimeReason",
  entityLabel: "Downtime Reason",
  fields: [
    {
      name: "reasonName",
      label: "Reason Name",
      required: true,
      placeholder: "NONE",
    },
    {
      name: "isActive",
      label: "Active reason",
      type: "checkbox",
      defaultValue: true,
      helpText: "Active reasons are available in production entry dropdowns.",
    },
  ],
  fetchById: fetchOeeDowntimeReasonById,
  fetchList: fetchOeeDowntimeReasons,
  getName: (reason) => reason?.reasonName ?? "",
  icon: AlertTriangle,
  inactiveIcon: PauseCircle,
  modalDescription: "Standardize downtime choices for shop-floor reporting.",
  permissionLabel: "OEE Downtime Reasons",
  permissionPageName: "OEE.DowntimeReasons",
  permissionResource: "oeeDowntimeReasons",
  pluralLabel: "Downtime Reasons",
  recordResource: "downtimeReason",
  route: "/oee/downtime-reasons",
  selectState: (state) => state.oeeDowntimeReasons,
  setFilters: setOeeDowntimeReasonFilters,
  setPage: setOeeDowntimeReasonPage,
  setPageSize: setOeeDowntimeReasonPageSize,
  title: "Downtime Reasons",
  toPayload: (values) => ({
    reasonName: values.reasonName.trim(),
    isActive: Boolean(values.isActive),
  }),
  updateEntity: updateOeeDowntimeReason,
};

const OeeDowntimeReasonsPage = () => {
  return <OeeMasterPage config={downtimeReasonConfig} />;
};

export default OeeDowntimeReasonsPage;
