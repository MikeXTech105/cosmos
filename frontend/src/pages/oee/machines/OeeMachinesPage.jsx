import { CheckCircle2, Cpu, PauseCircle } from "lucide-react";

import OeeMasterPage from "../OeeMasterPage";
import { formatOeeNumber, getOeeBoolean } from "../oeeHelpers";
import { OeeStatusPill } from "../OeeShared";
import {
  createOeeMachine,
  deleteOeeMachine,
  fetchOeeMachineById,
  fetchOeeMachines,
  setOeeMachineFilters,
  setOeeMachinePage,
  setOeeMachinePageSize,
  updateOeeMachine,
} from "../../../store/slices/oee/oeeMachineSlice";

const machineConfig = {
  activeIcon: CheckCircle2,
  addLabel: "Add Machine",
  columns: [
    {
      key: "machineCode",
      label: "Code",
      render: (machine) => (
        <span className="font-semibold text-slate-900">
          {machine.machineCode || "-"}
        </span>
      ),
    },
    {
      key: "machineName",
      label: "Machine",
      render: (machine) => machine.machineName || "-",
    },
    {
      key: "tonnage",
      label: "Tonnage",
      render: (machine) => machine.tonnage || "-",
    },
    {
      key: "location",
      label: "Location",
      render: (machine) => machine.location || "-",
    },
    {
      key: "displayOrder",
      label: "Display Order",
      render: (machine) =>
        formatOeeNumber(machine.displayOrder, { maximumFractionDigits: 0 }),
    },
    {
      key: "isActive",
      label: "Status",
      render: (machine) => (
        <OeeStatusPill isActive={getOeeBoolean(machine.isActive)} />
      ),
    },
  ],
  createEntity: createOeeMachine,
  deleteEntity: deleteOeeMachine,
  description:
    "Maintain injection-molding machines, tonnage, location, and dashboard order.",
  emptyDescription:
    "Create machine masters such as IM-01, IM-02, and IM-03 before entering daily production.",
  entityKey: "machine",
  entityLabel: "Machine",
  fields: [
    {
      name: "machineCode",
      label: "Machine Code",
      required: true,
      placeholder: "IM-01",
    },
    {
      name: "machineName",
      label: "Machine Name",
      required: true,
      placeholder: "Injection Molding 01",
    },
    {
      name: "tonnage",
      label: "Tonnage",
      required: true,
      placeholder: "135T",
    },
    {
      name: "location",
      label: "Location",
      placeholder: "Shop Floor A",
    },
    {
      name: "displayOrder",
      label: "Display Order",
      type: "number",
      allowDecimal: false,
      defaultValue: "0",
      min: 0,
    },
    {
      name: "isActive",
      label: "Active machine",
      type: "checkbox",
      defaultValue: true,
      helpText: "Active machines appear in bulk daily production entry.",
    },
  ],
  fetchById: fetchOeeMachineById,
  fetchList: fetchOeeMachines,
  getName: (machine) => machine?.machineName ?? machine?.machineCode ?? "",
  icon: Cpu,
  inactiveIcon: PauseCircle,
  modalDescription: "Keep machine details aligned with the production floor.",
  permissionLabel: "OEE Machines",
  permissionResource: "oeeMachines",
  pluralLabel: "Machines",
  recordResource: "machine",
  route: "/oee/machines",
  selectState: (state) => state.oeeMachines,
  setFilters: setOeeMachineFilters,
  setPage: setOeeMachinePage,
  setPageSize: setOeeMachinePageSize,
  title: "Machines",
  toPayload: (values) => ({
    machineCode: values.machineCode.trim(),
    machineName: values.machineName.trim(),
    tonnage: values.tonnage.trim(),
    location: values.location.trim(),
    displayOrder: Number(values.displayOrder) || 0,
    isActive: Boolean(values.isActive),
  }),
  updateEntity: updateOeeMachine,
};

const OeeMachinesPage = () => {
  return <OeeMasterPage config={machineConfig} />;
};

export default OeeMachinesPage;
