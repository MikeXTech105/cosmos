import workspaceMessages from "../workspaceMessages";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import DataTableShell from "../../../components/common/DataTableShell";
import useProductionText from "../../../hooks/useProductionText";
import { productionWorkspaceService as service } from "../../../services/manufacturing/productionWorkspaceService";
import { assertBusinessDate, decimalWire, quantityText } from "../../../utils/productionValues";
import { BusinessContext, Card, CommandNotice, Notice, Pager, WorkspaceNav } from "../WorkspaceShared";
import { errorMessage, itemLabel, unitLabel, useProductionCapabilities, useProductionRuntime, useWorkspaceCommand, useWorkspaceLookups } from "../workspaceHooks";
import { freshnessLabel, selectablePlanningLine } from "./productionPlanningHelpers";
const fieldClass = "whitespace-nowrap px-4 py-3 text-sm";
export default function PlanningPage() {
  const t = useProductionText(workspaceMessages),
    access = useProductionCapabilities(),
    context = useProductionRuntime(),
    lookups = useWorkspaceLookups();
  const [search, setSearch] = useSearchParams(),
    snapshotId = search.get("snapshot") || "";
  const [filters, setFilters] = useState({
    asOfDate: "",
    demandFrom: "",
    demandTo: "",
    freshnessDays: "30",
    channelId: ""
  });
  const [storedSnapshot, setSnapshot] = useState(null),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [selected, setSelected] = useState({}),
    [material, setMaterial] = useState(null),
    [refresh, setRefresh] = useState(0);
  const [demand, setDemand] = useState({
    itemId: "",
    unitId: "",
    channelId: "",
    observedFrom: "",
    observedTo: "",
    refreshedOn: "",
    sourceQuantity: "",
    sourceReference: ""
  });
  const [observations, setObservations] = useState(null),
    [demandPage, setDemandPage] = useState(1);
  const command = useWorkspaceCommand();
  const clearCommand = command.clear;
  const clearDemandAfterRead = useRef(false);
  const snapshotGeneration = useRef(0), materialGeneration = useRef(0);
  const selectionScope = useRef(null);
  const snapshot = storedSnapshot && String(storedSnapshot.id).toLowerCase() === snapshotId.toLowerCase() ? storedSnapshot : null;
  const setFilter = (key, value) => setFilters(current => ({
    ...current,
    [key]: value
  }));
  const lines = Array.isArray(snapshot?.lines) ? snapshot.lines : snapshot?.lines?.items || [];
  const total = Array.isArray(snapshot?.lines) ? snapshot.lines.length : snapshot?.lines?.totalCount || 0;
  useEffect(() => {
    if (!snapshotId || !access.canView) return;
    const controller = new AbortController();
    const generation = ++snapshotGeneration.current;
    const sourceChanged = selectionScope.current?.id !== snapshotId || selectionScope.current?.refresh !== refresh;
    selectionScope.current = { id: snapshotId, refresh };
    materialGeneration.current += 1;
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) { setLoading(true); if (sourceChanged) { setSelected({}); setMaterial(null); } setError(""); }
    });
    service.snapshot(snapshotId, {
      pageNumber: page,
      pageSize: 50
    }, controller.signal).then(result => {
      if (!controller.signal.aborted && generation === snapshotGeneration.current) {
        setSnapshot(result.data);
        setLoading(false);
      }
    }).catch(cause => {
      if (!controller.signal.aborted && generation === snapshotGeneration.current) {
        setSnapshot(null);
        setError(errorMessage(cause));
        setLoading(false);
      }
    });
    return () => { controller.abort(); materialGeneration.current += 1; };
  }, [snapshotId, page, refresh, access.canView]);
  useEffect(() => {
    if (!access.canView) return;
    const controller = new AbortController();
    service.demand({
      pageNumber: demandPage,
      pageSize: 20
    }, controller.signal).then(result => {
      if (!controller.signal.aborted) {
        setObservations(result.data);
        if (clearDemandAfterRead.current) {
          clearCommand(true, "demand");
          clearDemandAfterRead.current = false;
          setError("");
        }
      }
    }).catch(cause => {
      if (!controller.signal.aborted) setError(errorMessage(cause));
    });
    return () => controller.abort();
  }, [demandPage, refresh, access.canView, clearCommand]);
  const calculate = async () => {
    setError("");
    try {
      assertBusinessDate(filters.asOfDate);
      assertBusinessDate(filters.demandFrom);
      assertBusinessDate(filters.demandTo);
      if (filters.demandTo < filters.demandFrom || filters.demandTo > filters.asOfDate) throw new Error("Demand period must end on or before the stock date.");
      const freshnessDays = Number(filters.freshnessDays);
      if (!Number.isInteger(freshnessDays) || freshnessDays < 1 || freshnessDays > 3650) throw new Error("Enter a valid freshness window.");
      setLoading(true);
      const response = await service.plan({
        ...filters,
        freshnessDays
      });
      setSnapshot(response.data);
      setSelected({});
      setMaterial(null);
      setPage(1);
      setSearch({
        snapshot: response.data.id
      });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  };
  const assessMaterials = async () => {
    const generation = ++materialGeneration.current;
    try {
      setError("");
      if (!snapshot || loading) throw new Error("Load the current saved snapshot successfully before assessing its outputs.");
      const outputs = Object.entries(selected).map(([itemId, row]) => ({
        itemId,
        quantity: row.quantity
      }));
      if (!outputs.length) throw new Error("Select at least one output and quantity.");
      outputs.forEach(row => decimalWire(row.quantity, {
        positive: true
      }));
      setLoading(true);
      const response = await service.materials(snapshotId, outputs);
      if (generation === materialGeneration.current) setMaterial(response.data);
    } catch (cause) {
      if (generation === materialGeneration.current) setError(errorMessage(cause));
    } finally {
      if (generation === materialGeneration.current) setLoading(false);
    }
  };
  const reloadDemand = async () => {
    clearDemandAfterRead.current = true;
    try {
      const response = await service.demand({
        pageNumber: demandPage,
        pageSize: 20
      });
      setObservations(response.data);
      setError("");
      clearCommand(true, "demand");
      clearDemandAfterRead.current = false;
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    }
  };
  const saveDemand = () => {
    try {
      if (clearDemandAfterRead.current) throw new Error("Wait for a successful authoritative demand reload before submitting another command.");
      assertBusinessDate(demand.observedFrom);
      assertBusinessDate(demand.observedTo);
      assertBusinessDate(demand.refreshedOn);
      if (demand.observedTo < demand.observedFrom || demand.refreshedOn < demand.observedTo || !demand.sourceReference.trim()) throw new Error("Check the observed period, refresh date and source reference.");
      if (!context.runtime || demand.refreshedOn > context.runtime.businessDate) throw new Error("Load the company business date and choose a refresh date on or before it.");
      decimalWire(demand.sourceQuantity);
      void command.run("demand", demand, service.observe, reloadDemand, "demand");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };
  if (!access.canView) return <Notice error>{t("Production planning requires Manufacturing Orders View access.", {
      defaultValue: "Production planning requires Manufacturing Orders View access."
    })}</Notice>;
  return <div className="space-y-6"><PageHeader title={t("planning.title")} description={t("Review observed demand, frozen stock basis and shared material requirements before drafting production.", {
      defaultValue: "Review observed demand, frozen stock basis and shared material requirements before drafting production."
    })} /><WorkspaceNav /><BusinessContext context={context} /><Notice error>{error || lookups.error}</Notice>
    <Card title={t("Planning basis", {
      defaultValue: "Planning basis"
    })}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{["asOfDate", "demandFrom", "demandTo"].map(key => <AppInput key={key} label={t(`planning.${key === "asOfDate" ? "asOf" : key}`)} type="date" required value={filters[key]} onChange={event => setFilter(key, event.target.value)} />)}<AppInput label={t("planning.freshness")} inputMode="numeric" value={filters.freshnessDays} onChange={event => setFilter("freshnessDays", event.target.value)} /><AppSelect label={t("Channel (optional)", {
          defaultValue: "Channel (optional)"
        })} options={lookups.channels.map(row => ({
          value: String(row.id),
          label: row.name || row.channelName
        }))} value={filters.channelId} onChange={value => setFilter("channelId", value)} disabled={!lookups.canReadChannels} /></div><div className="flex flex-wrap gap-3"><AppButton onClick={calculate} isLoading={loading}>{t("planning.run")}</AppButton><AppButton variant="secondary" disabled={!context.runtime || loading} onClick={() => setFilter("asOfDate", context.runtime.businessDate)}>{t("Use company business date", {
            defaultValue: "Use company business date"
          })}</AppButton>{snapshotId && <AppButton variant="secondary" onClick={() => {
          setLoading(true);
          setSelected({});
          setMaterial(null);
          clearDemandAfterRead.current = true;
          setRefresh(value => value + 1);
        }}>{t("Reload saved snapshot", {
            defaultValue: "Reload saved snapshot"
          })}</AppButton>}</div></Card>
    {snapshot && <Card title={t("planning.saved")}><p className="break-all text-xs text-slate-500">{snapshot.id} · {snapshot.asOfDate} · {snapshot.calculationVersion} · {snapshot.inventoryBasis}</p><Notice>{t("Target = 21 days total demand. Warning = 15 days. True 7-day demand and a quarter of normalized month are separate. Stale, missing and zero demand are distinct. Recalculate to create a fresh snapshot; reload preserves this saved basis.", {
          defaultValue: "Target = 21 days total demand. Warning = 15 days. True 7-day demand and a quarter of normalized month are separate. Stale, missing and zero demand are distinct. Recalculate to create a fresh snapshot; reload preserves this saved basis."
        })}</Notice>
      <DataTableShell columnCount={15} loading={loading} emptyTitle={lines.length ? undefined : "No matching planning lines"} head={<>{["Select", "Item / unit", "Demand / refresh", "Freshness", "Physical", "Reserved", "Open output", "Inbound / quality", "Daily", "Target 21", "Warning 15", "True 7 days", "¼ month / 30 days", "Cover days", "Suggested / draft quantity"].map(label => <th key={label} className={fieldClass}>{t(label, {
            defaultValue: label
          })}</th>)}</>} minWidth="min-w-[1650px]">{lines.map(line => {
          const id = String(line.itemId),
            picked = selected[id];
          return <tr key={id} className="border-t border-slate-100"><td className={fieldClass}><input type="checkbox" aria-label={`Select ${itemLabel(lookups, id)}`} checked={Boolean(picked)} disabled={loading || !selectablePlanningLine(line)} onChange={event => setSelected(current => {
                const next = {
                  ...current
                };
                if (event.target.checked) next[id] = {
                  line,
                  quantity: String(line.suggestedProduction)
                };else delete next[id];
                return next;
              })} /></td><td className={fieldClass}>{itemLabel(lookups, id)}<br />{unitLabel(lookups, line.unitId)}</td><td className={fieldClass}>{quantityText(line.demandQuantity)}<br />{line.refreshedOn || t("No refresh evidence", {
                defaultValue: "No refresh evidence"
              })}</td><td className={fieldClass}>{t(freshnessLabel(line.freshness),{defaultValue:freshnessLabel(line.freshness)})}</td>{["physicalStock", "reservedStock", "openReleasedOutput"].map(key => <td key={key} className={fieldClass}>{quantityText(line[key])}</td>)}<td className={fieldClass}>{quantityText(line.eligibleInboundQuantity)}<br />{line.inboundDataQualityFlag || ""}</td>{["dailyDemand", "target21", "warning15", "sevenDayDemand"].map(key => <td key={key} className={fieldClass}>{quantityText(line[key])}</td>)}<td className={fieldClass}>{quantityText(line.fourWeekSlice)} / {quantityText(line.monthly30Demand)}</td><td className={fieldClass}>{quantityText(line.coverageDays)}</td><td className={fieldClass}>{quantityText(line.suggestedProduction)}{picked && <AppInput label={t("Proposed output", {
                defaultValue: "Proposed output"
              })} inputMode="decimal" value={picked.quantity} onChange={event => setSelected(current => ({
                ...current,
                [id]: {
                  ...picked,
                  quantity: event.target.value
                }
              }))} />}</td></tr>;
        })}</DataTableShell><Pager page={page} total={total} busy={loading} onPage={value => {
        setLoading(true);
        setPage(value);
      }} /><AppButton disabled={!Object.keys(selected).length || loading} onClick={assessMaterials}>{t("planning.materials")}</AppButton></Card>}
    {material && String(material.sourceSnapshotId).toLowerCase() === snapshotId.toLowerCase() && <Card title={t("Shared material allocation", {
      defaultValue: "Shared material allocation"
    })}><p className="text-xs text-slate-500">{material.calculationVersion} {t("\xB7 Snapshot", {
          defaultValue: "\xB7 Snapshot"
        })} {material.sourceSnapshotId}</p><Notice>{t("This is one shared material pool across all selected outputs. Feasibility does not reserve stock. Resource capacity must be checked on each order.", {
          defaultValue: "This is one shared material pool across all selected outputs. Feasibility does not reserve stock. Resource capacity must be checked on each order."
        })}</Notice><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{["Material / unit", "Required", "Allocated", "Available", "Remaining", "Shortage"].map(label => <th className={fieldClass} key={label}>{t(label, {
                  defaultValue: label
                })}</th>)}</tr></thead><tbody>{material.materials.map(row => <tr key={row.itemId}><td className={fieldClass}>{itemLabel(lookups, row.itemId)} · {unitLabel(lookups, row.unitId)}</td>{["requiredQuantity", "proposedAllocation", "availableQuantity", "remainingQuantity", "shortage"].map(key => <td className={fieldClass} key={key}>{quantityText(row[key])}</td>)}</tr>)}</tbody></table></div>{material.products.map(product => <div key={product.itemId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><p>{itemLabel(lookups, product.itemId)} {t("\xB7 Requested", {
            defaultValue: "\xB7 Requested"
          })} {quantityText(product.requestedOutput)} {t("\xB7 Feasible", {
            defaultValue: "\xB7 Feasible"
          })} {quantityText(product.feasibleOutput)}{product.bottleneckItemId ? ` · Bottleneck ${itemLabel(lookups, product.bottleneckItemId)}` : ""} {product.conflictCode || ""}</p>{access.canCreate && <Link className="font-medium text-brand" to={`/manufacturing/orders/new?${new URLSearchParams({
          sourcePlanId: snapshotId,
          sourceLineId: String(product.itemId),
          itemId: String(product.itemId),
          quantity: String(product.requestedOutput)
        })}`}>{t("Review production draft", {
            defaultValue: "Review production draft"
          })}</Link>}</div>)}</Card>}
    <Card title={t("planning.demand")}><Notice>{t("Aggregates retain their real observed period and refresh date. Zero is a valid no-demand observation; leave missing evidence unavailable.", {
          defaultValue: "Aggregates retain their real observed period and refresh date. Zero is a valid no-demand observation; leave missing evidence unavailable."
        })}</Notice>{access.canUpdate && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><AppSelect label={t("Item", {
            defaultValue: "Item"
          })} required value={demand.itemId} options={lookups.items.map(row => ({
            value: String(row.id),
            label: `${row.itemCode || ""} ${row.name}`
          }))} onChange={itemId => {
            const item = lookups.items.find(row => String(row.id) === itemId);
            setDemand(current => ({
              ...current,
              itemId,
              unitId: item?.unitId ? String(item.unitId) : ""
            }));
          }} /><AppSelect label={t("Source unit", {
            defaultValue: "Source unit"
          })} required value={demand.unitId} options={lookups.units.map(row => ({
            value: String(row.id),
            label: row.name
          }))} onChange={unitId => setDemand(current => ({
            ...current,
            unitId
          }))} /><AppSelect label={t("Channel (optional)", {
            defaultValue: "Channel (optional)"
          })} value={demand.channelId} disabled={!lookups.canReadChannels} options={lookups.channels.map(row => ({
            value: String(row.id),
            label: row.name || row.channelName
          }))} onChange={channelId => setDemand(current => ({
            ...current,
            channelId
          }))} />{["observedFrom", "observedTo", "refreshedOn"].map(key => <AppInput key={key} label={t(key === "observedFrom" ? "Observed from" : key === "observedTo" ? "Observed to" : "Refreshed on", {
            defaultValue: key === "observedFrom" ? "Observed from" : key === "observedTo" ? "Observed to" : "Refreshed on"
          })} required type="date" value={demand[key]} onChange={event => setDemand(current => ({
            ...current,
            [key]: event.target.value
          }))} />)}<AppInput label={t("Source quantity (up to 6 decimals)", {
            defaultValue: "Source quantity (up to 6 decimals)"
          })} required inputMode="decimal" value={demand.sourceQuantity} onChange={event => setDemand(current => ({
            ...current,
            sourceQuantity: event.target.value
          }))} /><AppInput label={t("Source reference", {
            defaultValue: "Source reference"
          })} required value={demand.sourceReference} onChange={event => setDemand(current => ({
            ...current,
            sourceReference: event.target.value
          }))} /></div><AppButton disabled={command.conflict || lookups.loading || !context.runtime} isLoading={command.busy} onClick={saveDemand}>{t("Save demand observation", {
            defaultValue: "Save demand observation"
          })}</AppButton><AppButton variant="secondary" onClick={() => {
          void reloadDemand();
        }}>{t("Reload and review", {
            defaultValue: "Reload and review"
          })}</AppButton><CommandNotice command={command} /></div>}
    <DataTableShell columnCount={7} loading={!observations && !error} emptyTitle={observations?.items?.length ? undefined : "No demand observations"} head={<>{["Item / unit", "Observed period", "Refresh", "Source quantity", "Base quantity / factor", "Source", "State"].map(label => <th className={fieldClass} key={label}>{t(label, {
            defaultValue: label
          })}</th>)}</>}>{observations?.items?.map(row => <tr key={row.id}><td className={fieldClass}>{itemLabel(lookups, row.itemId)} · {unitLabel(lookups, row.unitId)}</td><td className={fieldClass}>{row.observedFrom} → {row.observedTo}</td><td className={fieldClass}>{row.refreshedOn}</td><td className={fieldClass}>{quantityText(row.sourceQuantity, {
              scale: 12
            })}</td><td className={fieldClass}>{quantityText(row.baseQuantity)} / {quantityText(row.conversionFactor, {
              scale: 12
            })}</td><td className={fieldClass}>{row.sourceReference}</td><td className={fieldClass}>{row.isSuperseded ? t("Superseded history", {
              defaultValue: "Superseded history"
            }) : t("Current observation", {
              defaultValue: "Current observation"
            })}</td></tr>)}</DataTableShell><Pager page={demandPage} pageSize={20} total={observations?.totalCount} onPage={setDemandPage} /></Card>
  </div>;
}
