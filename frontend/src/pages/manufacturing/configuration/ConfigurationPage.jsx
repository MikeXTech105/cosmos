import { useCommand, useConfigurationCapabilities, useConfigurationLookups, useConfigurationRead } from "./configurationHooks";
import useProductionText from "../../../hooks/useProductionText";
import configurationMessages from "./configurationMessages";
import { useCallback, useState } from "react";
import { Factory, Plus } from "lucide-react";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import ConfigurationLookup, { ConfigurationReferenceLabel } from "./ConfigurationLookup";
import PageHeader from "../../../components/common/PageHeader";
import useProductionRuntime from "../../../hooks/useProductionRuntime";
import { assertBusinessDate } from "../../../utils/productionValues";
import { productionConfigurationService as service } from "../../../services/manufacturing/productionConfigurationService";
import { ManufacturingCard } from "../ManufacturingShared";
import { RATE_BASES, isDecimal, lookupOptions, rowsOf, validDateRange, validateIntervals } from "./configurationHelpers";
import { CommandRecovery, ActiveField, DateFields, EffectiveDates, EffectivityDialog, EmptyRows, InlineMessage, RefreshButton, Version } from "./ConfigurationShared";
const MasterEditor = ({
  kind,
  record,
  shifts,
  lookupContext,
  onClose,
  onSaved
}) => {
  const t = useProductionText(configurationMessages);
  const [form, setForm] = useState(() => ({
    code: record?.code ?? "",
    name: record?.name ?? "",
    isActive: record?.isActive ?? true,
    notes: record?.notes ?? "",
    defaultShiftId: record?.defaultShiftId ?? "",
    capacityBasis: "Minutes",
    rateBasis: record?.rateBasis ?? 1,
    defaultRate: record?.defaultRate ?? ""
  }));
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
    if (!form.code.trim() || !form.name.trim()) {
      command.setError("Code and name are required.");
      return;
    }
    if (kind === "operations" && form.defaultRate !== "" && !isDecimal(form.defaultRate)) {
      command.setError("Default rate must be positive with up to six decimal places.");
      return;
    }
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      isActive: form.isActive,
      notes: form.notes.trim() || null,
      ...(record ? {
        version: record.version
      } : {}),
      ...(kind === "work-centres" ? {
        capacityBasis: "Minutes",
        defaultShiftId: form.defaultShiftId || null
      } : {
        rateBasis: Number(form.rateBasis),
        defaultRate: form.defaultRate === "" ? null : String(form.defaultRate)
      })
    };
    void command.run(() => service.saveMaster(kind, record?.id, payload));
  };
  return <AppModal isOpen title={`${t(record ? "Edit" : "Create", {
    defaultValue: record ? "Edit" : "Create"
  })} ${t(kind === "work-centres" ? "Work centre" : "Operation", {
    defaultValue: kind === "work-centres" ? "Work centre" : "Operation"
  })}`} onClose={() => { if (!command.committed && !command.uncertain && !command.conflict) onClose(); }} isBusy={command.busy}><div className="space-y-4"><Version value={record?.version} /><div className="grid gap-4 sm:grid-cols-2"><AppInput required label={t("Code", {
          defaultValue: "Code"
        })} maxLength={50} value={form.code} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={event => setField("code", event.target.value)} /><AppInput required label={t("Name", {
          defaultValue: "Name"
        })} maxLength={200} value={form.name} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={event => setField("name", event.target.value)} /></div>{kind === "work-centres" ? <><AppInput label={t("Capacity basis", {
          defaultValue: "Capacity basis"
        })} value="Minutes" disabled /><ConfigurationLookup kind="shifts" lookupContext={lookupContext} label={t("Default HR shift (optional)", {
          defaultValue: "Default HR shift (optional)"
        })} options={[{
          value: "",
          label: t("No default shift", {
            defaultValue: "No default shift"
          })
        }, ...lookupOptions(shifts, form.defaultShiftId)]} value={form.defaultShiftId} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={value => setField("defaultShiftId", value)} /></> : <><AppSelect label={t("Rate basis", {
          defaultValue: "Rate basis"
        })} options={RATE_BASES.map(entry => ({
          ...entry,
          label: t(entry.label, {
            defaultValue: entry.label
          })
        }))} value={form.rateBasis} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={value => setField("rateBasis", value)} /><AppInput label={t("Default rate (optional)", {
          defaultValue: "Default rate (optional)"
        })} inputMode="decimal" value={form.defaultRate} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={event => setField("defaultRate", event.target.value)} /></>}<AppInput label={t("Notes", {
        defaultValue: "Notes"
      })} maxLength={1000} value={form.notes} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={event => setField("notes", event.target.value)} /><ActiveField checked={form.isActive} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={value => setField("isActive", value)} /><InlineMessage error>{command.error}</InlineMessage><CommandRecovery command={command} onReload={onSaved} onRecovered={onClose} /><div className="flex justify-end gap-2"><AppButton variant="secondary" disabled={command.busy || command.committed || command.conflict || command.uncertain} onClick={onClose}>{t("Cancel", {
            defaultValue: "Cancel"
          })}</AppButton><AppButton isLoading={command.busy} disabled={command.uncertain || command.conflict || command.committed} onClick={submit}>{t("Save", {
            defaultValue: "Save"
          })}</AppButton></div></div></AppModal>;
};
const ShiftEditor = ({
  centre,
  shifts,
  lookupContext,
  onClose,
  onSaved
}) => {
  const t = useProductionText(configurationMessages);
  const [form, setForm] = useState({
    shiftId: "",
    effectiveFrom: "",
    effectiveTo: "",
    breakMinutes: "0",
    capacityFactor: "1",
    isActive: true
  });
  const setField = (key, value) => setForm(current => ({
    ...current,
    [key]: value
  }));
  const command = useCommand(async () => {
    const refreshed = await onSaved();
    if (refreshed === false) return false;
    onClose();
    return true;
  });
  const submit = () => {
    if (!form.shiftId || !validDateRange(form.effectiveFrom, form.effectiveTo) || !/^\d+$/.test(form.breakMinutes) || !isDecimal(form.capacityFactor, {
      atMostOne: true
    })) {
      command.setError("Select a real HR shift, effective dates, whole nonnegative break minutes and a capacity factor greater than zero and at most one.");
      return;
    }
    void command.run(() => service.createShift(centre.id, {
      ...form,
      effectiveTo: form.effectiveTo || null,
      breakMinutes: Number(form.breakMinutes)
    }));
  };
  return <AppModal isOpen title={`${t("Add shift capacity", {
    defaultValue: "Add shift capacity"
  })} · ${centre.name}`} isBusy={command.busy} onClose={() => { if (!command.committed && !command.uncertain && !command.conflict) onClose(); }}><div className="space-y-4"><ConfigurationLookup kind="shifts" lookupContext={lookupContext} required label={t("HR shift", {
        defaultValue: "HR shift"
      })} options={lookupOptions(shifts, form.shiftId)} value={form.shiftId} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={value => setField("shiftId", value)} /><DateFields form={form} setField={setField} disabled={command.busy || command.committed || command.conflict || command.uncertain} /><div className="grid gap-4 sm:grid-cols-2"><AppInput required label={t("Break minutes", {
          defaultValue: "Break minutes"
        })} inputMode="numeric" value={form.breakMinutes} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={event => setField("breakMinutes", event.target.value)} /><AppInput required label={t("Capacity factor (0\u20131)", {
          defaultValue: "Capacity factor (0\u20131)"
        })} inputMode="decimal" value={form.capacityFactor} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={event => setField("capacityFactor", event.target.value)} /></div><ActiveField checked={form.isActive} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={value => setField("isActive", value)} /><InlineMessage error>{command.error}</InlineMessage><CommandRecovery command={command} onReload={onSaved} onRecovered={onClose} /><div className="flex justify-end gap-2"><AppButton variant="secondary" onClick={onClose} disabled={command.busy || command.committed || command.conflict || command.uncertain}>{t("Cancel", {
            defaultValue: "Cancel"
          })}</AppButton><AppButton isLoading={command.busy} disabled={command.uncertain || command.conflict || command.committed} onClick={submit}>{t("Save shift capacity", {
            defaultValue: "Save shift capacity"
          })}</AppButton></div></div></AppModal>;
};
const CalendarEditor = ({
  record,
  onClose,
  onSaved
}) => {
  const t = useProductionText(configurationMessages);
  const context = useProductionRuntime();
  const [businessDate, setBusinessDate] = useState("");
  const [edits, setEdits] = useState(null);
  const load = useCallback(options => service.calendarContext(record.id, businessDate, options), [record.id, businessDate]);
  const read = useConfigurationRead(load, JSON.stringify([record.id, businessDate]), validDateRange(businessDate, ""));
  const calendar = { loading: read.loading, loaded: Boolean(read.data), error: read.error, version: read.data?.version ?? "" };
  const formKey = JSON.stringify([record.id, businessDate, calendar.version]);
  const savedIntervals = [...(read.data?.breaks ?? []).map(entry => ({ ...entry, kind: "break" })), ...(read.data?.downtime ?? []).map(entry => ({ ...entry, kind: "downtime" }))];
  const intervals = edits?.key === formKey ? edits.rows : savedIntervals;
  const setIntervals = update => setEdits({ key: formKey, rows: typeof update === "function" ? update(intervals) : update });
  const command = useCommand(async () => {
    if (!await read.reload()) return false;
    if (await onSaved() === false) return false;
    onClose(); return true;
  });
  const reloadDate = async () => {
    const refreshed = await read.reload();
    if (!refreshed) return false;
    setEdits(null); command.clearAfterRead(); return true;
  };
  const selectDate = value => { if (value === businessDate) { void reloadDate(); return; } setEdits(null); setBusinessDate(value); };
  const update = (index, key, value) => setIntervals(current => current.map((entry, position) => index === position ? {
    ...entry,
    [key]: value
  } : entry));
  const submit = () => {
    if (!calendar.loaded || !calendar.version || calendar.loading) { command.setError("Load the saved calendar for this business date before replacing intervals."); return; }
    const error = validateIntervals(intervals);
    if (!businessDate || error) {
      command.setError(error || "Select the capacity business date.");
      return;
    }
    try {
      if (!context.runtime) throw new Error(context.error || "Load the company business context before changing a calendar.");
      assertBusinessDate(businessDate, context.runtime);
      const breakMilliseconds = intervals.filter(entry => entry.kind === "break").reduce((total, entry) => total + Date.parse(entry.to) - Date.parse(entry.from), 0);
      if (breakMilliseconds !== Number(record.breakMinutes) * 60000) throw new Error(`Break intervals must total exactly ${record.breakMinutes} configured minutes.`);
    } catch (cause) {
      command.setError(cause.message);
      return;
    }
    const payload = {
      version: calendar.version,
      businessDate,
      breaks: intervals.filter(entry => entry.kind === "break").map(({
        from,
        to,
        reason
      }) => ({
        from,
        to,
        reason: reason.trim()
      })),
      downtime: intervals.filter(entry => entry.kind === "downtime").map(({
        from,
        to,
        reason
      }) => ({
        from,
        to,
        reason: reason.trim()
      }))
    };
    void command.run(() => service.calendar(record.id, payload));
  };
  return <AppModal isOpen maxWidth="max-w-4xl" title={t("Replace shift calendar exceptions", {
    defaultValue: "Replace shift calendar exceptions"
  })} isBusy={command.busy} onClose={() => { if (!command.committed && !command.uncertain && !command.conflict) onClose(); }}><div className="space-y-4"><InlineMessage>{t("Read saved intervals for the selected business date before replacing the complete set. Break intervals must match configured minutes. Use explicit UTC offsets for overnight and daylight-saving boundaries.", {
          defaultValue: "Read saved intervals for the selected business date before replacing the complete set. Break intervals must match configured minutes. Use explicit UTC offsets for overnight and daylight-saving boundaries."
        })}</InlineMessage><InlineMessage error>{context.error || calendar.error}</InlineMessage><p className="text-xs text-slate-600">{context.runtime ? `${context.runtime.companyKey} · ${context.runtime.businessTimeZone} · ${t("Closed through", { defaultValue: "Closed through" })}: ${context.runtime.closedThroughDate || "—"}` : t("Loading company business context…", { defaultValue: "Loading company business context…" })} · {t("Break total {{minutes}} minutes inside the HR shift window.", { defaultValue: "Break total {{minutes}} minutes inside the HR shift window.", minutes: record.breakMinutes })}</p><Version value={calendar.version} /><AppInput required label={t("Business date", {
        defaultValue: "Business date"
      })} type="date" value={businessDate} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={event => selectDate(event.target.value)} /><div className="flex flex-wrap gap-2"><AppButton variant="secondary" disabled={!context.runtime || command.busy} onClick={() => selectDate(context.runtime.businessDate)}>{t("Use company business date", { defaultValue: "Use company business date" })}</AppButton><AppButton variant="secondary" disabled={!businessDate || calendar.loading || command.busy} onClick={reloadDate}>{t("Reload saved intervals", { defaultValue: "Reload saved intervals" })}</AppButton></div>{calendar.loading && <InlineMessage>{t("Loading saved calendar…", { defaultValue: "Loading saved calendar…" })}</InlineMessage>}{intervals.map((interval, index) => <fieldset disabled={command.busy || !calendar.loaded} key={index} className="space-y-3 rounded-xl border border-slate-200 p-4"><legend className="px-2 text-sm font-semibold">{t("Interval", {
            defaultValue: "Interval"
          })} {index + 1}</legend><div className="grid gap-3 sm:grid-cols-2"><AppSelect label={t("Kind", {
            defaultValue: "Kind"
          })} options={[{
            value: "break",
            label: t("Break", {
              defaultValue: "Break"
            })
          }, {
            value: "downtime",
            label: t("Downtime", {
              defaultValue: "Downtime"
            })
          }]} value={interval.kind} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={value => update(index, "kind", value)} /><AppInput required label={t("Reason", {
            defaultValue: "Reason"
          })} value={interval.reason} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={event => update(index, "reason", event.target.value)} /><AppInput required label={t("From (ISO with offset)", {
            defaultValue: "From (ISO with offset)"
          })} placeholder={t("2026-10-27T23:00:00+05:30", {
            defaultValue: "2026-10-27T23:00:00+05:30"
          })} value={interval.from} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={event => update(index, "from", event.target.value)} /><AppInput required label={t("To (ISO with offset)", {
            defaultValue: "To (ISO with offset)"
          })} placeholder={t("2026-10-28T00:00:00+05:30", {
            defaultValue: "2026-10-28T00:00:00+05:30"
          })} value={interval.to} disabled={command.busy || command.committed || command.conflict || command.uncertain} onChange={event => update(index, "to", event.target.value)} /></div><AppButton variant="secondary" disabled={command.busy || command.committed || command.conflict || command.uncertain} onClick={() => setIntervals(current => current.filter((_, position) => position !== index))}>{t("Remove interval", {
            defaultValue: "Remove interval"
          })} {index + 1}</AppButton></fieldset>)}<AppButton variant="secondary" disabled={command.busy || !calendar.loaded || calendar.loading} onClick={() => setIntervals(current => [...current, {
        kind: "break",
        from: "",
        to: "",
        reason: ""
      }])}><Plus className="h-4 w-4" />{t("Add interval", {
          defaultValue: "Add interval"
        })}</AppButton><InlineMessage error>{command.error}</InlineMessage><CommandRecovery command={command} onReload={reloadDate} onRecovered={onClose} /><div className="flex justify-end gap-2"><AppButton variant="secondary" disabled={command.busy || command.committed || command.conflict || command.uncertain} onClick={onClose}>{t("Cancel", {
            defaultValue: "Cancel"
      })}</AppButton><AppButton isLoading={command.busy} disabled={command.uncertain || command.conflict || command.committed || context.loading || !context.runtime || !calendar.loaded || calendar.loading} onClick={submit}>{t("Replace date calendar", {
            defaultValue: "Replace date calendar"
          })}</AppButton></div></div></AppModal>;
};
const WorkCentreCapacity = ({
  centre,
  lookups,
  capabilities
}) => {
  const t = useProductionText(configurationMessages);
  const [editor, setEditor] = useState(false);
  const [calendar, setCalendar] = useState(null);
  const [closing, setClosing] = useState(null);
  const load = useCallback(options => service.shifts(centre.id, options), [centre.id]);
  const state = useConfigurationRead(load, String(centre.id), capabilities.canView);
  const records = state.data?.shifts ?? [];
  const reload = state.reload;
  return <ManufacturingCard title={`${t("Shifts & capacity", {
    defaultValue: "Shifts & capacity"
  })} · ${centre.name}`} description={t("Effective dated capacity uses existing HR shifts. Add a revision and close historical effectivity through approval.", {
    defaultValue: "Effective dated capacity uses existing HR shifts. Add a revision and close historical effectivity through approval."
  })} actions={<><RefreshButton onClick={reload} busy={state.loading} />{capabilities.canUpdate && <AppButton disabled={!lookups.canReadShifts || lookups.loading || !centre.isActive} onClick={() => setEditor(true)}>{t("Add shift capacity", {
        defaultValue: "Add shift capacity"
      })}</AppButton>}</>}><div className="space-y-3 p-4"><InlineMessage error>{state.error || lookups.error}</InlineMessage>{!lookups.canReadShifts && <InlineMessage>{t("HR.Shift view permission is required to choose an existing shift.", {
          defaultValue: "HR.Shift view permission is required to choose an existing shift."
        })}</InlineMessage>}{state.loading && <InlineMessage>{t("Loading shift capacity\u2026", {
          defaultValue: "Loading shift capacity\u2026"
        })}</InlineMessage>}{!state.loading && !records.length && <EmptyRows>{t("No shift capacity configured.", {
          defaultValue: "No shift capacity configured."
        })}</EmptyRows>}{records.map(record => <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row" key={record.id}><div><h3 className="font-medium text-slate-900"><ConfigurationReferenceLabel kind="shifts" id={record.shiftId} lookupContext={lookups} /></h3><EffectiveDates record={record} /><p className="mt-2 text-sm text-slate-700">{t("Break:", {
              defaultValue: "Break:"
            })} {record.breakMinutes} {t("minutes \xB7 Capacity factor:", {
              defaultValue: "minutes \xB7 Capacity factor:"
            })} {record.capacityFactor}</p><Version value={record.version} /></div>{capabilities.canApprove && <div className="flex flex-wrap items-start gap-2"><AppButton variant="secondary" onClick={() => setCalendar(record)}>{t("Calendar", {
              defaultValue: "Calendar"
            })}</AppButton><AppButton variant="secondary" onClick={() => setClosing({
            kind: "shift",
            record
          })}>{t("Close effectivity", {
              defaultValue: "Close effectivity"
            })}</AppButton></div>}</div>)}</div>{capabilities.canUpdate && editor && <ShiftEditor centre={centre} shifts={lookups.shifts} lookupContext={lookups} onClose={() => setEditor(false)} onSaved={reload} />}{capabilities.canApprove && calendar && <CalendarEditor record={calendar} onClose={() => setCalendar(null)} onSaved={reload} />}{capabilities.canApprove && closing && <EffectivityDialog target={closing} onClose={() => setClosing(null)} onSaved={reload} />}</ManufacturingCard>;
};
const ConfigurationPage = () => {
  const t = useProductionText(configurationMessages);
  const capabilities = useConfigurationCapabilities();
  const lookups = useConfigurationLookups({
    shifts: true
  });
  const [kind, setKind] = useState("work-centres");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({
    search: "",
    pageNumber: 1,
    pageSize: 20
  });
  const [editor, setEditor] = useState(null);
  const [centre, setCentre] = useState(null);
  const load = useCallback(options => service.listMasters(kind, query, options), [kind, query]);
  const state = useConfigurationRead(load, JSON.stringify([kind, query]), capabilities.canView);
  const page = { items: rowsOf(state.data), totalCount: state.data?.totalCount ?? 0, totalPages: state.data?.totalPages ?? Math.max(1, Math.ceil((state.data?.totalCount ?? 0) / query.pageSize)) };
  const reload = state.reload;
  if (!capabilities.canView) return <InlineMessage error>{t("Manufacturing.Configuration view permission is required.", {
      defaultValue: "Manufacturing.Configuration view permission is required."
    })}</InlineMessage>;
  return <div className="space-y-5"><PageHeader icon={Factory} title={t("Production configuration", {
      defaultValue: "Production configuration"
    })} description={t("Manage work centres and operations. Item routing and machine\u2013mould eligibility remain in Item \u2192 Manufacturing.", {
      defaultValue: "Manage work centres and operations. Item routing and machine\u2013mould eligibility remain in Item \u2192 Manufacturing."
    })} actions={<><RefreshButton onClick={() => {
        void reload();
        void lookups.refresh();
      }} busy={state.loading} />{capabilities.canCreate && <AppButton onClick={() => setEditor({
        record: null
      })}><Plus className="h-4 w-4" />{t("Create", {
          defaultValue: "Create"
        })} {kind === "work-centres" ? "work centre" : "operation"}</AppButton>}</>} /><div role="tablist" aria-label={t("Production masters", {
      defaultValue: "Production masters"
    })} className="flex flex-wrap gap-2">{[["work-centres", "Work centres"], ["operations", "Operations"]].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={kind === value} className={`rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand ${kind === value ? "bg-brand text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => {
        setKind(value);
        setQuery(current => ({
          ...current,
          pageNumber: 1
        }));
        setCentre(null);
      }}>{t(label, {
          defaultValue: label
        })}</button>)}</div><form className="flex items-end gap-2" onSubmit={event => {
      event.preventDefault();
      setQuery(current => ({
        ...current,
        search: search.trim(),
        pageNumber: 1
      }));
    }}><AppInput className="flex-1" label={t("Search code or name", {
        defaultValue: "Search code or name"
      })} value={search} onChange={event => setSearch(event.target.value)} /><AppButton type="submit" disabled={state.loading}>{t("Search", {
          defaultValue: "Search"
        })}</AppButton></form><InlineMessage error>{state.error}</InlineMessage><ManufacturingCard title={t(kind === "work-centres" ? "Work centres" : "Operations", {
      defaultValue: kind === "work-centres" ? "Work centres" : "Operations"
    })}>{state.loading ? <EmptyRows>{t("Loading configuration\u2026", {
          defaultValue: "Loading configuration\u2026"
        })}</EmptyRows> : !page.items.length ? <EmptyRows>{t("No records match this search.", {
          defaultValue: "No records match this search."
        })}</EmptyRows> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Code / name", "Configuration", "Status", "Actions"].map(label => <th scope="col" className="p-4" key={label}>{t(label, {
                  defaultValue: label
                })}</th>)}</tr></thead><tbody>{page.items.map(record => <tr key={record.id} className="border-t border-slate-100"><td className="p-4"><p className="font-semibold text-slate-900">{record.code} · {record.name}</p><Version value={record.version} /></td><td className="p-4">{kind === "work-centres" ? <>{record.capacityBasis ?? "Minutes"} · <ConfigurationReferenceLabel kind="shifts" id={record.defaultShiftId} lookupContext={lookups} /></> : `${RATE_BASES.find(entry => entry.value === Number(record.rateBasis))?.label ?? "—"} · ${record.defaultRate ?? "No default rate"}`}</td><td className="p-4">{t(record.isActive ? "Active" : "Inactive", {
                  defaultValue: record.isActive ? "Active" : "Inactive"
                })}</td><td className="p-4"><div className="flex gap-2">{capabilities.canUpdate && <AppButton variant="secondary" onClick={() => setEditor({
                    record
                  })}>{t("Edit", {
                      defaultValue: "Edit"
                    })}</AppButton>}{kind === "work-centres" && <AppButton variant="secondary" onClick={() => setCentre(record)}>{t("Shifts & capacity", {
                      defaultValue: "Shifts & capacity"
                    })}</AppButton>}</div></td></tr>)}</tbody></table></div>}<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4"><span className="text-xs text-slate-500">{page.totalCount} {t("records \xB7 Page", {
            defaultValue: "records \xB7 Page"
          })} {query.pageNumber} / {page.totalPages}</span><div className="flex gap-2"><AppSelect aria-label={t("Records per page", {
            defaultValue: "Records per page"
          })} options={[20, 50, 100].map(value => ({
            value,
            label: `${value} rows`
          }))} value={query.pageSize} disabled={state.loading} onChange={value => setQuery(current => ({
            ...current,
            pageSize: Number(value),
            pageNumber: 1
          }))} /><AppButton variant="secondary" disabled={state.loading || query.pageNumber <= 1} onClick={() => setQuery(current => ({
            ...current,
            pageNumber: current.pageNumber - 1
          }))}>{t("Previous", {
              defaultValue: "Previous"
            })}</AppButton><AppButton variant="secondary" disabled={state.loading || query.pageNumber >= page.totalPages} onClick={() => setQuery(current => ({
            ...current,
            pageNumber: current.pageNumber + 1
          }))}>{t("Next", {
              defaultValue: "Next"
            })}</AppButton></div></div></ManufacturingCard>{centre && kind === "work-centres" && <WorkCentreCapacity key={centre.id} centre={centre} lookups={lookups} capabilities={capabilities} />}{editor && (editor.record ? capabilities.canUpdate : capabilities.canCreate) && <MasterEditor kind={kind} record={editor.record} shifts={lookups.shifts} lookupContext={lookups} onClose={() => setEditor(null)} onSaved={async () => {
      const refreshed = await reload();
      const references = await lookups.refresh();
      return refreshed && references;
    }} />}</div>;
};
export default ConfigurationPage;
