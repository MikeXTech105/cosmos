import { Box, CheckCircle2, PauseCircle } from "lucide-react";

import OeeMasterPage from "../OeeMasterPage";
import { formatOeeNumber, getOeeBoolean } from "../oeeHelpers";
import { OeeStatusPill } from "../OeeShared";
import {
  createOeeMould,
  deleteOeeMould,
  fetchOeeMouldById,
  fetchOeeMoulds,
  setOeeMouldFilters,
  setOeeMouldPage,
  setOeeMouldPageSize,
  updateOeeMould,
} from "../../../store/slices/oee/oeeMouldSlice";

const nullableNumber = (value) => {
  const trimmed = String(value ?? "").trim();

  return trimmed === "" ? null : Number(trimmed);
};

const mouldConfig = {
  activeIcon: CheckCircle2,
  addLabel: "Add Mould",
  columns: [
    {
      key: "mouldName",
      label: "Mould",
      render: (mould) => (
        <span className="font-semibold text-slate-900">
          {mould.mouldName || "-"}
        </span>
      ),
    },
    {
      key: "targetShotPerDay",
      label: "Target Shots/Day",
      render: (mould) =>
        formatOeeNumber(mould.targetShotPerDay, {
          maximumFractionDigits: 2,
        }),
    },
    {
      key: "cavity",
      label: "Cavity",
      render: (mould) =>
        mould.cavity === null || mould.cavity === undefined
          ? "-"
          : formatOeeNumber(mould.cavity, { maximumFractionDigits: 0 }),
    },
    {
      key: "cycleTime",
      label: "Cycle Time",
      render: (mould) =>
        mould.cycleTime === null || mould.cycleTime === undefined
          ? "-"
          : `${formatOeeNumber(mould.cycleTime)} sec`,
    },
    {
      key: "isActive",
      label: "Status",
      render: (mould) => (
        <OeeStatusPill isActive={getOeeBoolean(mould.isActive)} />
      ),
    },
  ],
  createEntity: createOeeMould,
  deleteEntity: deleteOeeMould,
  description:
    "Maintain mould targets, cavity count, and cycle time for production OEE.",
  emptyDescription:
    "Create mould masters such as RYNO CLIP, STANDARD HANGER, and FLEXI HANGER before entering shots.",
  entityKey: "mould",
  entityLabel: "Mould",
  fields: [
    {
      name: "mouldName",
      label: "Mould Name",
      required: true,
      placeholder: "RYNO CLIP",
    },
    {
      name: "targetShotPerDay",
      label: "Target Shots/Day",
      type: "number",
      allowDecimal: true,
      required: true,
      defaultValue: "0",
      min: 0,
    },
    {
      name: "cavity",
      label: "Cavity",
      type: "number",
      allowDecimal: false,
      min: 0,
    },
    {
      name: "cycleTime",
      label: "Cycle Time",
      type: "number",
      allowDecimal: true,
      min: 0,
    },
    {
      name: "isActive",
      label: "Active mould",
      type: "checkbox",
      defaultValue: true,
      helpText: "Active moulds are available in production entry dropdowns.",
    },
  ],
  fetchById: fetchOeeMouldById,
  fetchList: fetchOeeMoulds,
  getName: (mould) => mould?.mouldName ?? "",
  icon: Box,
  inactiveIcon: PauseCircle,
  modalDescription: "Set the production target inputs used by backend OEE calculations.",
  permissionLabel: "OEE Moulds",
  permissionPageName: "OEE.Moulds",
  permissionResource: "oeeMoulds",
  pluralLabel: "Moulds",
  recordResource: "mould",
  route: "/oee/moulds",
  selectState: (state) => state.oeeMoulds,
  setFilters: setOeeMouldFilters,
  setPage: setOeeMouldPage,
  setPageSize: setOeeMouldPageSize,
  title: "Moulds",
  toPayload: (values) => ({
    mouldName: values.mouldName.trim(),
    targetShotPerDay: Number(values.targetShotPerDay) || 0,
    cavity: nullableNumber(values.cavity),
    cycleTime: nullableNumber(values.cycleTime),
    isActive: Boolean(values.isActive),
  }),
  updateEntity: updateOeeMould,
};

const OeeMouldsPage = () => {
  return <OeeMasterPage config={mouldConfig} />;
};

export default OeeMouldsPage;
