import { useCommand, useConfigurationCapabilities, useConfigurationLookups, useConfigurationRead } from "./configurationHooks";
import useProductionText from "../../../hooks/useProductionText";
import configurationMessages from "./configurationMessages";
import { useCallback, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import { productionConfigurationService as service } from "../../../services/manufacturing/productionConfigurationService";
import { ManufacturingCard } from "../ManufacturingShared";
import { RATE_BASES, isDecimal, lookupOptions, moveStep, nameOf, validDateRange, validateRouting, validateRoutingReferences } from "./configurationHelpers";
import { CommandRecovery, ActiveField, DateFields, EffectiveDates, EffectivityDialog, EmptyRows, InlineMessage, RefreshButton, Version } from "./ConfigurationShared";
const emptyStep = () => ({
  operationId: "",
  workCentreId: "",
  rateBasis: 1,
  rate: "",
  setupMinutes: "0",
  quantityBasis: "",
  machineId: "",
  mouldId: "",
  key: crypto.randomUUID()
});
const RoutingEditor = ({
  itemId,
  lookups,
  onClose,
  onSaved
}) => {
  const t = useProductionText(configurationMessages);
  const [form, setForm] = useState({
    revision: "",
    effectiveFrom: "",
    effectiveTo: "",
    steps: [emptyStep()]
  });
  const command = useCommand(async () => {
    const refreshed = await onSaved();
    if (refreshed === false) return false;
    onClose();
    return true;
  });
  const setField = (key, value) => setForm(current => ({
    ...current,
    [key]: value
  }));
  const update = (index, key, value) => setForm(current => ({
    ...current,
    steps: current.steps.map((step, position) => index === position ? {
      ...step,
      [key]: value
    } : step)
  }));
  const chooseOperation = (index, id) => {
    const operation = lookups.operations.find(entry => String(entry.id) === String(id));
    setForm(current => ({
      ...current,
      steps: current.steps.map((step, position) => position === index ? {
        ...step,
        operationId: id,
        rateBasis: operation?.rateBasis ?? step.rateBasis,
        rate: operation?.defaultRate ?? ""
      } : step)
    }));
  };
  const submit = () => {
    const error = validateRouting(form) || validateRoutingReferences(form, lookups);
    if (error) {
      command.setError(error);
      return;
    }
    const payload = {
      revision: form.revision.trim(),
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || null,
      steps: form.steps.map((step, index) => ({
        operationId: step.operationId,
        workCentreId: step.workCentreId,
        rate: step.rate,
        setupMinutes: step.setupMinutes,
        quantityBasis: step.quantityBasis,
        sequence: index + 1,
        rateBasis: Number(step.rateBasis),
        machineId: step.machineId || null,
        mouldId: step.mouldId || null
      }))
    };
    void command.run(() => service.createRouting(itemId, payload));
  };
  return <AppModal isOpen maxWidth="max-w-5xl" title={t("Add item routing revision", {
    defaultValue: "Add item routing revision"
  })} onClose={() => { if (!command.committed && !command.uncertain && !command.conflict) onClose(); }} isBusy={command.busy}><div className="space-y-5"><InlineMessage error>{lookups.error}</InlineMessage><InlineMessage>{t("Step order controls the production route. Quantity basis declares the verified output quantity to which each rate applies. Existing revisions remain historical evidence.", {
          defaultValue: "Step order controls the production route. Quantity basis declares the verified output quantity to which each rate applies. Existing revisions remain historical evidence."
        })}</InlineMessage><AppInput required label={t("Revision", {
        defaultValue: "Revision"
      })} maxLength={50} disabled={command.busy || command.committed || command.conflict || command.uncertain} value={form.revision} onChange={event => setField("revision", event.target.value)} /><DateFields form={form} setField={setField} disabled={command.busy || command.committed || command.conflict || command.uncertain} />{form.steps.map((step, index) => <fieldset key={step.key} className="space-y-4 rounded-xl border border-slate-200 p-4"><legend className="px-2 text-sm font-semibold">{t("Step", {
            defaultValue: "Step"
          })} {index + 1}</legend><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><AppSelect required label={t("Operation", {
            defaultValue: "Operation"
          })} options={lookupOptions(lookups.operations, step.operationId)} value={step.operationId} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={id => chooseOperation(index, id)} /><AppSelect required label={t("Work centre", {
            defaultValue: "Work centre"
          })} options={lookupOptions(lookups.workCentres, step.workCentreId)} value={step.workCentreId} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={value => update(index, "workCentreId", value)} /><AppSelect required label={t("Rate basis", {
            defaultValue: "Rate basis"
          })} options={RATE_BASES.map(entry => ({
            ...entry,
            label: t(entry.label, {
              defaultValue: entry.label
            })
          }))} value={step.rateBasis} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={value => update(index, "rateBasis", value)} /><AppInput required label={t("Rate", {
            defaultValue: "Rate"
          })} inputMode="decimal" value={step.rate} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={event => update(index, "rate", event.target.value)} /><AppInput required label={t("Setup minutes", {
            defaultValue: "Setup minutes"
          })} inputMode="decimal" value={step.setupMinutes} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={event => update(index, "setupMinutes", event.target.value)} /><AppInput required label={t("Quantity basis (base units)", {
            defaultValue: "Quantity basis (base units)"
          })} inputMode="decimal" value={step.quantityBasis} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={event => update(index, "quantityBasis", event.target.value)} /><AppSelect label={t("Machine (optional except shot rates)", {
            defaultValue: "Machine (optional except shot rates)"
          })} options={[{
            value: "",
            label: t("No machine restriction", {
              defaultValue: "No machine restriction"
            })
          }, ...lookupOptions(lookups.machines, step.machineId)]} value={step.machineId} disabled={command.busy || command.committed || command.conflict || command.uncertain || !lookups.canReadMachines} onChange={value => update(index, "machineId", value)} /><AppSelect label={t("Mould (optional except shot rates)", {
            defaultValue: "Mould (optional except shot rates)"
          })} options={[{
            value: "",
            label: t("No mould restriction", {
              defaultValue: "No mould restriction"
            })
          }, ...lookupOptions(lookups.moulds, step.mouldId)]} value={step.mouldId} disabled={command.busy || command.committed || command.conflict || command.uncertain || !lookups.canReadMoulds} onChange={value => update(index, "mouldId", value)} /></div><div className="flex flex-wrap gap-2"><AppButton variant="secondary" aria-label={`Move step ${index + 1} up`} disabled={command.busy || index === 0} onClick={() => setField("steps", moveStep(form.steps, index, -1))}><ArrowUp className="h-4 w-4" />{t("Up", {
              defaultValue: "Up"
            })}</AppButton><AppButton variant="secondary" aria-label={`Move step ${index + 1} down`} disabled={command.busy || index === form.steps.length - 1} onClick={() => setField("steps", moveStep(form.steps, index, 1))}><ArrowDown className="h-4 w-4" />{t("Down", {
              defaultValue: "Down"
            })}</AppButton><AppButton variant="secondary" aria-label={`Remove step ${index + 1}`} disabled={command.busy || form.steps.length === 1} onClick={() => setField("steps", form.steps.filter((_, position) => position !== index))}><Trash2 className="h-4 w-4" />{t("Remove", {
              defaultValue: "Remove"
            })}</AppButton></div></fieldset>)}<AppButton variant="secondary" disabled={command.busy || command.committed || command.conflict || command.uncertain} onClick={() => setField("steps", [...form.steps, emptyStep()])}><Plus className="h-4 w-4" />{t("Add step", {
          defaultValue: "Add step"
        })}</AppButton><InlineMessage error>{command.error}</InlineMessage><CommandRecovery command={command} onReload={onSaved} onRecovered={onClose} /><div className="flex justify-end gap-2"><AppButton variant="secondary" onClick={onClose} disabled={command.busy || command.committed || command.conflict || command.uncertain}>{t("Cancel", {
            defaultValue: "Cancel"
          })}</AppButton><AppButton isLoading={command.busy} disabled={command.uncertain || command.conflict || command.committed || lookups.loading || Boolean(lookups.error)} onClick={submit}>{t("Save routing revision", {
            defaultValue: "Save routing revision"
          })}</AppButton></div></div></AppModal>;
};
const EligibilityEditor = ({
  itemId,
  lookups,
  onClose,
  onSaved
}) => {
  const t = useProductionText(configurationMessages);
  const [form, setForm] = useState({
    machineId: "",
    mouldId: "",
    skuOutputPerShot: "",
    effectiveFrom: "",
    effectiveTo: "",
    isActive: true
  });
  const command = useCommand(async () => {
    const refreshed = await onSaved();
    if (refreshed === false) return false;
    onClose();
    return true;
  });
  const setField = (key, value) => setForm(current => ({
    ...current,
    [key]: value
  }));
  const submit = () => {
    if (lookups.loading || lookups.error || !lookups.canReadMachines || !lookups.canReadMoulds || !lookups.machines.some(entry => String(entry.id) === String(form.machineId) && entry.isActive !== false) || !lookups.moulds.some(entry => String(entry.id) === String(form.mouldId) && entry.isActive !== false)) { command.setError("Reload and select permitted active machine and mould references."); return; }
    if (!form.machineId || !form.mouldId || !isDecimal(form.skuOutputPerShot) || !validDateRange(form.effectiveFrom, form.effectiveTo)) {
      command.setError("Select the actual machine and mould, positive verified SKU output per shot, and valid effective dates.");
      return;
    }
    void command.run(() => service.createEligibility(itemId, {
      ...form,
      effectiveTo: form.effectiveTo || null
    }));
  };
  return <AppModal isOpen title={t("Add machine\u2013mould eligibility", {
    defaultValue: "Add machine\u2013mould eligibility"
  })} onClose={() => { if (!command.committed && !command.uncertain && !command.conflict) onClose(); }} isBusy={command.busy}><div className="space-y-4"><InlineMessage error>{lookups.error}</InlineMessage><AppSelect required label={t("OEE machine", {
        defaultValue: "OEE machine"
      })} options={lookupOptions(lookups.machines, form.machineId)} value={form.machineId} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={value => setField("machineId", value)} /><AppSelect required label={t("OEE mould", {
        defaultValue: "OEE mould"
      })} options={lookupOptions(lookups.moulds, form.mouldId)} value={form.mouldId} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={value => setField("mouldId", value)} /><AppInput required label={t("Verified SKU output per shot (base units)", {
        defaultValue: "Verified SKU output per shot (base units)"
      })} inputMode="decimal" value={form.skuOutputPerShot} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={event => setField("skuOutputPerShot", event.target.value)} /><DateFields form={form} setField={setField} disabled={command.busy || command.committed || command.conflict || command.uncertain} /><ActiveField checked={form.isActive} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={value => setField("isActive", value)} /><InlineMessage error>{command.error}</InlineMessage><CommandRecovery command={command} onReload={onSaved} onRecovered={onClose} /><div className="flex justify-end gap-2"><AppButton variant="secondary" disabled={command.busy || command.committed || command.conflict || command.uncertain} onClick={onClose}>{t("Cancel", {
            defaultValue: "Cancel"
          })}</AppButton><AppButton isLoading={command.busy} disabled={command.uncertain || command.conflict || command.committed || lookups.loading || Boolean(lookups.error) || !lookups.canReadMachines || !lookups.canReadMoulds} onClick={submit}>{t("Save eligibility", {
            defaultValue: "Save eligibility"
          })}</AppButton></div></div></AppModal>;
};
const ItemProductionConfigurationContent = ({
  itemId,
  disabled = false
}) => {
  const t = useProductionText(configurationMessages);
  const capabilities = useConfigurationCapabilities();
  const lookups = useConfigurationLookups({
    masters: true,
    resources: true
  });
  const [editor, setEditor] = useState(null);
  const [closing, setClosing] = useState(null);
  const load = useCallback(options => service.itemConfiguration(itemId, options), [itemId]);
  const state = useConfigurationRead(load, String(itemId), capabilities.canView && Boolean(itemId));
  const configuration = state.data ?? { routings: [], eligibility: [] };
  const reload = state.reload;
  if (!itemId) return <InlineMessage>{t("Save the item to configure its routing and machine\u2013mould eligibility.", {
      defaultValue: "Save the item to configure its routing and machine\u2013mould eligibility."
    })}</InlineMessage>;
  if (!capabilities.canView) return <InlineMessage>{t("Manufacturing.Configuration view permission is required to view item routing and resource eligibility.", {
      defaultValue: "Manufacturing.Configuration view permission is required to view item routing and resource eligibility."
    })}</InlineMessage>;
  return <div className="space-y-4"><InlineMessage error>{state.error || lookups.error}</InlineMessage>{(!lookups.canReadMachines || !lookups.canReadMoulds) && <InlineMessage>{t("OEE machine and mould view permissions are required to choose existing resources.", {
        defaultValue: "OEE machine and mould view permissions are required to choose existing resources."
      })}</InlineMessage>}<ManufacturingCard title={t("Production routing", {
      defaultValue: "Production routing"
    })} description={t("Ordered operation steps and effective revisions for this item.", {
      defaultValue: "Ordered operation steps and effective revisions for this item."
    })} actions={<><RefreshButton busy={state.loading} onClick={() => {
        void reload();
        void lookups.refresh();
      }} />{capabilities.canUpdate && <AppButton disabled={disabled || lookups.loading || !lookups.operations.some(entry => entry.isActive) || !lookups.workCentres.some(entry => entry.isActive)} onClick={() => setEditor({ kind: "routing", itemId })}>{t("Add routing revision", {
          defaultValue: "Add routing revision"
        })}</AppButton>}</>}><div className="space-y-4 p-4">{state.loading ? <EmptyRows>{t("Loading item configuration\u2026", {
            defaultValue: "Loading item configuration\u2026"
          })}</EmptyRows> : !(configuration.routings ?? []).length ? <EmptyRows>{t("No routing revision. Create operations and work centres in Production configuration before adding ordered steps.", {
            defaultValue: "No routing revision. Create operations and work centres in Production configuration before adding ordered steps."
          })}</EmptyRows> : configuration.routings.map(routing => <article key={routing.id} className="overflow-hidden rounded-xl border border-slate-200"><div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4"><div><h3 className="font-semibold text-slate-900">{routing.revision}</h3><EffectiveDates record={routing} /><Version value={routing.version} /></div>{capabilities.canApprove && !disabled && <AppButton variant="secondary" onClick={() => setClosing({
              parentId: itemId,
              kind: "routing",
              record: routing
            })}>{t("Close effectivity", {
                defaultValue: "Close effectivity"
              })}</AppButton>}</div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-xs"><thead><tr>{["Sequence", "Operation / work centre", "Rate", "Setup minutes", "Quantity basis", "Machine / mould"].map(label => <th scope="col" className="p-3 text-slate-500" key={label}>{t(label, {
                      defaultValue: label
                    })}</th>)}</tr></thead><tbody>{[...routing.steps].sort((a, b) => a.sequence - b.sequence).map(step => <tr key={step.sequence} className="border-t border-slate-100"><td className="p-3">{step.sequence}</td><td className="p-3">{nameOf(lookups.operations, step.operationId)}<br />{nameOf(lookups.workCentres, step.workCentreId)}</td><td className="p-3">{step.rate} {RATE_BASES.find(entry => entry.value === Number(step.rateBasis))?.label}</td><td className="p-3">{step.setupMinutes}</td><td className="p-3">{step.quantityBasis}</td><td className="p-3">{nameOf(lookups.machines, step.machineId)}<br />{nameOf(lookups.moulds, step.mouldId)}</td></tr>)}</tbody></table></div></article>)}</div></ManufacturingCard><ManufacturingCard title={t("Machine\u2013mould eligibility", {
      defaultValue: "Machine\u2013mould eligibility"
    })} description={t("Verified SKU output per shot and effective resource combinations.", {
      defaultValue: "Verified SKU output per shot and effective resource combinations."
    })} actions={capabilities.canUpdate && <AppButton disabled={disabled || lookups.loading || !lookups.canReadMachines || !lookups.canReadMoulds} onClick={() => setEditor({ kind: "eligibility", itemId })}>{t("Add eligibility", {
        defaultValue: "Add eligibility"
      })}</AppButton>}><div className="space-y-3 p-4">{state.loading ? <EmptyRows>{t("Loading eligibility\u2026", {
            defaultValue: "Loading eligibility\u2026"
          })}</EmptyRows> : !(configuration.eligibility ?? []).length ? <EmptyRows>{t("No verified resource combination.", {
            defaultValue: "No verified resource combination."
          })}</EmptyRows> : configuration.eligibility.map(record => <div key={record.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row"><div><h3 className="font-medium">{nameOf(lookups.machines, record.machineId)} / {nameOf(lookups.moulds, record.mouldId)}</h3><p className="text-sm text-slate-700">{t("SKU output per shot:", {
                defaultValue: "SKU output per shot:"
              })} {record.skuOutputPerShot} {t("base units", {
                defaultValue: "base units"
              })}</p><EffectiveDates record={record} /><Version value={record.version} /></div>{capabilities.canApprove && !disabled && <AppButton variant="secondary" onClick={() => setClosing({
            parentId: itemId,
            kind: "eligibility",
            record
          })}>{t("Close effectivity", {
              defaultValue: "Close effectivity"
            })}</AppButton>}</div>)}</div></ManufacturingCard>{capabilities.canUpdate && editor?.kind === "routing" && String(editor.itemId) === String(itemId) && <RoutingEditor itemId={itemId} lookups={lookups} onClose={() => setEditor("")} onSaved={reload} />}{capabilities.canUpdate && editor?.kind === "eligibility" && String(editor.itemId) === String(itemId) && <EligibilityEditor itemId={itemId} lookups={lookups} onClose={() => setEditor("")} onSaved={reload} />}{capabilities.canApprove && closing && String(closing.parentId) === String(itemId) && <EffectivityDialog target={closing} onClose={() => setClosing(null)} onSaved={reload} />}</div>;
};
export default function ItemProductionConfiguration(props) { return <ItemProductionConfigurationContent key={props.itemId} {...props} />; }
