import { useCommand, useConfigurationRead } from "./configurationHooks";
import useProductionText from "../../../hooks/useProductionText";
import configurationMessages from "./configurationMessages";
import { useCallback, useRef, useState } from "react";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import ConfigurationLookup, { ConfigurationReferenceLabel } from "./ConfigurationLookup";
import useCapabilities from "../../../hooks/useCapabilities";
import { productionConfigurationService as service } from "../../../services/manufacturing/productionConfigurationService";
import { ManufacturingCard } from "../ManufacturingShared";
import { isDecimal, nameOf } from "./configurationHelpers";
import { CommandRecovery, InlineMessage, RefreshButton, Version } from "./ConfigurationShared";
import { generateUUID } from "../../../utils/uuid";
const actions = ["view", "approve"];
const PackagingConversionEditor = ({
  profileId,
  readOnly = false
}) => {
  const t = useProductionText(configurationMessages);
  const permissions = useCapabilities({
    actions,
    pageName: "SupplyChain.PackagingProfiles",
    resource: "SupplyChain.PackagingProfiles",
    route: "/supply-chain/packaging-profiles"
  });
  const unitPermission = useCapabilities({
    label: "Units",
    resource: "units",
    route: "/units"
  });
  const [edits, setEdits] = useState(null);
  const attempt = useRef(null);
  const load = useCallback(async ({ signal }) => {
    const response = await service.packagingConversion(profileId, { signal });
    const ids = [...new Set([response.data?.sourceUnitId, response.data?.baseUnitId].filter(Boolean).map(String))];
    const units = unitPermission.canView ? await Promise.all(ids.map(async (id) => (await service.unit(id, { signal })).data)) : [];
    return { conversion: response.data, units };
  }, [profileId, unitPermission.canView]);
  const state = useConfigurationRead(load, JSON.stringify([profileId, unitPermission.canView]), permissions.canView && Boolean(profileId));
  const conversion = state.data?.conversion;
  const units = state.data?.units ?? [];
  const formKey = conversion ? String(profileId) + ":" + conversion.version : "";
  const form = edits?.key === formKey ? edits.values : { sourceUnitId: conversion?.sourceUnitId ?? "", sourceQuantityBasis: conversion?.sourceQuantityBasis ?? "", baseQuantityBasis: conversion?.baseQuantityBasis ?? "", sourceReference: conversion?.sourceReference ?? "" };
  const command = useCommand(async () => {
    const refreshed = await state.reload();
    if (!refreshed) return false;
    attempt.current = null; setEdits(null);
    return true;
  });
  const reload = async () => {
    const refreshed = await state.reload();
    if (!refreshed) return false;
    attempt.current = null; setEdits(null); command.clearAfterRead();
    return true;
  };
  const setField = (key, value) => setEdits({ key: formKey, values: { ...form, [key]: value } });
  const submit = () => {
    if (!permissions.canApprove || readOnly || !conversion || !unitPermission.canView) return;
    if (!form.sourceUnitId || !isDecimal(form.sourceQuantityBasis) || !isDecimal(form.baseQuantityBasis) || !form.sourceReference.trim()) {
      command.setError("Select the actual source unit, enter positive source/base quantity bases (up to six decimals), and provide verification provenance.");
      return;
    }
    const fingerprint = JSON.stringify({
      ...form,
      version: conversion.version
    });
    if (attempt.current && attempt.current.fingerprint !== fingerprint) {
      command.setError("Reload and verify the previous conversion outcome before changing a retried command.");
      return;
    }
    if (!attempt.current) attempt.current = {
      fingerprint,
      key: generateUUID()
    };
    void command.run(() => service.savePackagingConversion(profileId, {
      ...form,
      version: conversion.version,
      idempotencyKey: attempt.current.key,
      sourceReference: form.sourceReference.trim()
    }), {
      retrySafe: true
    });
  };
  if (!profileId || !permissions.canView) return null;
  const disabled = readOnly || !permissions.canApprove || !unitPermission.canView || command.busy || command.committed || command.conflict || command.uncertain || state.loading || !conversion;
  return <ManufacturingCard title={t("Verified source-to-base conversion", {
    defaultValue: "Verified source-to-base conversion"
  })} description={t("Conversion uses an explicit verified quantity basis and source evidence. Missing conversion remains unresolved.", {
    defaultValue: "Conversion uses an explicit verified quantity basis and source evidence. Missing conversion remains unresolved."
  })} actions={<RefreshButton busy={state.loading || command.busy} onClick={reload} />}><div className="space-y-4 p-5"><InlineMessage error>{state.error || command.error}</InlineMessage><CommandRecovery command={command} onReload={reload} />{state.loading ? <InlineMessage>{t("Loading packaging conversion\u2026", {
          defaultValue: "Loading packaging conversion\u2026"
        })}</InlineMessage> : conversion && <><Version value={conversion.version} /><p className="text-sm text-slate-600">{t("Item #", {
            defaultValue: "Item #"
          })} {conversion.itemId} {t("\xB7 Base unit:", {
            defaultValue: "\xB7 Base unit:"
          })} {nameOf(units, conversion.baseUnitId)}</p>{(!conversion.sourceUnitId || !conversion.sourceQuantityBasis || !conversion.baseQuantityBasis) && <InlineMessage>{t("No verified conversion is recorded. Resolve the source unit and evidence before using this profile in production, dispatch or import normalization.", {
            defaultValue: "No verified conversion is recorded. Resolve the source unit and evidence before using this profile in production, dispatch or import normalization."
          })}</InlineMessage>}{!unitPermission.canView && <InlineMessage>{t("Unit view permission is required to choose a source unit.", {
            defaultValue: "Unit view permission is required to choose a source unit."
          })}</InlineMessage>}<div className="grid gap-4 sm:grid-cols-2"><ConfigurationLookup kind="units" lookupContext={{ units, canReadUnits: unitPermission.canView }} required label={t("Source unit", {
            defaultValue: "Source unit"
          })} value={form.sourceUnitId} options={units.map(unit => ({
            value: unit.id,
            label: unit.name,
            disabled: unit.isActive === false
          }))} disabled={disabled} onChange={value => setField("sourceUnitId", value)} /><AppInput label={t("Base unit", {
            defaultValue: "Base unit"
          })} value={nameOf(units, conversion.baseUnitId)} disabled /><AppInput required label={t("Source quantity basis", {
            defaultValue: "Source quantity basis"
          })} inputMode="decimal" value={form.sourceQuantityBasis} disabled={disabled} onChange={event => setField("sourceQuantityBasis", event.target.value)} /><AppInput required label={t("Base quantity basis", {
            defaultValue: "Base quantity basis"
          })} inputMode="decimal" value={form.baseQuantityBasis} disabled={disabled} onChange={event => setField("baseQuantityBasis", event.target.value)} /></div><AppInput required label={t("Verification source / reference", {
          defaultValue: "Verification source / reference"
        })} maxLength={200} value={form.sourceReference} disabled={disabled} onChange={event => setField("sourceReference", event.target.value)} /><p className="text-xs text-slate-500">{t("Verified relationship:", {
            defaultValue: "Verified relationship:"
          })} {form.sourceQuantityBasis || "?"} <ConfigurationReferenceLabel kind="units" id={form.sourceUnitId} lookupContext={{ units, canReadUnits: unitPermission.canView }} /> = {form.baseQuantityBasis || "?"} {nameOf(units, conversion.baseUnitId)} {t(". Dimension or identity conflicts are returned by the API.", {
            defaultValue: ". Dimension or identity conflicts are returned by the API."
          })}</p>{!readOnly && (permissions.canApprove ? <AppButton disabled={readOnly || !permissions.canApprove || !unitPermission.canView || !conversion || state.loading || command.conflict || command.committed} isLoading={command.busy} onClick={submit}>{t("Verify and save conversion", {
            defaultValue: "Verify and save conversion"
          })}</AppButton> : <InlineMessage>{t("Approve permission for SupplyChain.PackagingProfiles is required to change verified conversion.", {
            defaultValue: "Approve permission for SupplyChain.PackagingProfiles is required to change verified conversion."
          })}</InlineMessage>)}</>}</div></ManufacturingCard>;
};
export default function PackagingConversionPanel(props) { return <PackagingConversionEditor key={props.profileId} {...props} />; }
