import workspaceMessages from "../workspaceMessages";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import AppModal from "../../../components/common/AppModal";
import PageHeader from "../../../components/common/PageHeader";
import DataTableShell from "../../../components/common/DataTableShell";
import useCapabilities from "../../../hooks/useCapabilities";
import useProductionText from "../../../hooks/useProductionText";
import { productionWorkspaceService as service } from "../../../services/manufacturing/productionWorkspaceService";
import { physicalInventoryService as physical } from "../../../services/manufacturing/physicalInventoryService";
import { assertBusinessDate, quantityText } from "../../../utils/productionValues";
import { parseProductionJson } from "../../../services/manufacturing/productionApi";
import { PhysicalLookup, SupplierLookup } from "../integrations/PhysicalLookup";
import { BusinessContext, Card, CommandNotice, Notice, Pager, WorkspaceNav } from "../WorkspaceShared";
import { errorMessage, itemLabel, unitLabel, useProductionCapabilities, useProductionRuntime, useWorkspaceCommand, useWorkspaceLookups } from "../workspaceHooks";
import { dispositionLabels, prepareProductionEvidence, rowCanAdvance, sourceEvidence, sourceManifest } from "./productionImportAdapter";
const cell = "px-4 py-3 align-top text-sm";
const blankMap = {
  disposition: "",
  itemId: "",
  sourceUnitId: "",
  sourceQuantity: "",
  businessDate: "",
  sourceReference: "",
  reason: "",
  channelId: "",
  observedFrom: "",
  observedTo: "",
  refreshedOn: "",
  packagingProfileId: "",
  sourceUnitCost: "",
  purchaseOrderLineId: "",
  supplierId: ""
};
const orderLabel = row => row.purchaseOrderNo || `Purchase order ${row.id}`;
const packageLabel = row => `${row.packagingCode || row.profileCode || row.id} · ${row.packagingName || row.name || row.profileName || "Packaging profile"} · ${row.unitsPerBox ?? "Unverified pack"}`;
function MappingDialog({
  row,
  batch,
  lookups,
  onClose,
  onSaved
}) {
  const t = useProductionText(workspaceMessages);
  const access = useProductionCapabilities(),
    command = useWorkspaceCommand();
  const orderAccess = useCapabilities({
    pageName: "PurchaseExpense.PurchaseOrder",
    resource: "purchaseOrders",
    route: "/purchase/orders"
  });
  const packingAccess = useCapabilities({
    pageName: "SupplyChain.PackagingProfiles",
    resource: "scPackaging",
    route: "/supply-chain/packaging-profiles"
  });
  const [form, setForm] = useState(() => {
    let existing = {};
    try {
      existing = row.normalizedJson ? parseProductionJson(row.normalizedJson) : {};
    } catch {/* Keep malformed original evidence visible and repairable. */}
    return {
      ...blankMap,
      ...existing,
      disposition: String(row.disposition || ""),
      sourceQuantity: existing.sourceQuantity == null ? sourceEvidence(row).value || "" : String(existing.sourceQuantity),
      reason: ""
    };
  });
  const [poId, setPoId] = useState(""),
    [poLines, setPoLines] = useState([]),
    [localError, setLocalError] = useState("");
  const set = (key, value) => setForm(current => ({
    ...current,
    [key]: value
  }));
  const loadOrders = useMemo(() => (params, options) => physical.listOrders({
    ...params,
    SupplierId: form.supplierId || undefined
  }, options), [form.supplierId]);
  const loadPackages = useMemo(() => (params, options) => physical.packagingProfiles(params, options), []);
  useEffect(() => {
    if (!poId || !orderAccess.canView) return;
    const controller = new AbortController();
    physical.orderContext(poId, {
      signal: controller.signal
    }).then(result => {
      if (!controller.signal.aborted) setPoLines(result.data.orderLines || []);
    }).catch(error => {
      if (!controller.signal.aborted) setLocalError(errorMessage(error));
    });
    return () => controller.abort();
  }, [poId, orderAccess.canView]);
  const save = () => {
    try {
      setLocalError("");
      if (!form.disposition || !form.sourceReference.trim() || !form.reason.trim()) throw new Error("Choose a disposition and provide a source reference and mapping reason.");
      if (form.businessDate) assertBusinessDate(form.businessDate);
      const payload = {
        ...form,
        disposition: Number(form.disposition),
        rowId: row.id,
        version: batch.version,
        businessDate: form.businessDate || null,
        observedFrom: form.observedFrom || null,
        observedTo: form.observedTo || null,
        refreshedOn: form.refreshedOn || null,
        supplierId: form.supplierId || null
      };
      void command.run("map", payload, body => service.map(batch.batchId, body), async () => {
        const refreshed = await onSaved();
        if (refreshed === false) return false;
        onClose();
        return true;
      }, `import:${batch.batchId}`);
    } catch (error) {
      setLocalError(errorMessage(error));
    }
  };
  const evidence = sourceEvidence(row),
    isEvidence = Number(form.disposition) === 7,
    isMaster = Number(form.disposition) === 5;
  return <AppModal isOpen title={t("Review source mapping", {
    defaultValue: "Review source mapping"
  })} maxWidth="max-w-5xl" isBusy={command.busy} onClose={onClose}><div className="space-y-5"><Notice>{row.tab} {t("\xB7 Row", {
          defaultValue: "\xB7 Row"
        })} {row.rowNumber} · {row.columnName} {t(". Mapping records evidence; validation, reconciliation, approval and posting follow separately.", {
          defaultValue: ". Mapping records evidence; validation, reconciliation, approval and posting follow separately."
        })}</Notice><div className="max-h-48 overflow-auto rounded-xl border p-3"><dl className="grid gap-2 text-sm sm:grid-cols-2">{(evidence.cells || [{
            column: row.columnName,
            header: "Source value",
            value: evidence.value
          }]).map((entry, index) => <div key={index}><dt className="font-medium">{entry.column} · {entry.header || t("Unlabelled", {
                defaultValue: "Unlabelled"
              })}</dt><dd className="whitespace-pre-wrap break-words">{entry.value === "" ? t("Blank", {
                defaultValue: "Blank"
              }) : entry.value}</dd></div>)}</dl></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><AppSelect label={t("Disposition", {
          defaultValue: "Disposition"
        })} required value={form.disposition} options={Object.entries(dispositionLabels).map(([value, label]) => ({
          value,
          label
        }))} onChange={value => set("disposition", value)} /><AppInput label={t("Source reference", {
          defaultValue: "Source reference"
        })} maxLength={100} required value={form.sourceReference} onChange={event => set("sourceReference", event.target.value)} /><AppInput label={t("Mapping / unresolved reason", {
          defaultValue: "Mapping / unresolved reason"
        })} required value={form.reason} onChange={event => set("reason", event.target.value)} />{!isEvidence && <><AppSelect label={t("Existing Item (inactive history included)", {
            defaultValue: "Existing Item (inactive history included)"
          })} value={String(form.itemId || "")} options={lookups.items.map(item => ({
            value: String(item.id),
            label: `${item.itemCode || ""} · ${item.name}${item.isActive === false ? " (inactive history)" : ""}`
          }))} onChange={value => set("itemId", value)} /><SupplierLookup value={form.supplierId} onChange={value => {
            set("supplierId", value);
            setPoId("");
            set("purchaseOrderLineId", "");
          }} />{!isMaster && <><AppSelect label={t("Actual source unit", {
              defaultValue: "Actual source unit"
            })} value={String(form.sourceUnitId || "")} options={lookups.units.map(unit => ({
              value: String(unit.id),
              label: unit.name
            }))} onChange={value => set("sourceUnitId", value)} /><AppInput label={t("Original source quantity (12 decimals)", {
              defaultValue: "Original source quantity (12 decimals)"
            })} inputMode="decimal" value={form.sourceQuantity} onChange={event => set("sourceQuantity", event.target.value)} /><AppInput type="date" label={t("Source business date", {
              defaultValue: "Source business date"
            })} value={form.businessDate || ""} onChange={event => set("businessDate", event.target.value)} /><AppInput label={t("Documented source unit cost (optional)", {
              defaultValue: "Documented source unit cost (optional)"
            })} inputMode="decimal" value={form.sourceUnitCost ?? ""} onChange={event => set("sourceUnitCost", event.target.value)} /><AppSelect label={t("Channel (optional)", {
              defaultValue: "Channel (optional)"
            })} value={String(form.channelId || "")} disabled={!lookups.canReadChannels} options={lookups.channels.map(channel => ({
              value: String(channel.id),
              label: channel.name || channel.channelName
            }))} onChange={value => set("channelId", value)} /><PhysicalLookup label={t("Verified packaging conversion (optional)", {
              defaultValue: "Verified packaging conversion (optional)"
            })} loader={loadPackages} getLabel={packageLabel} allowed={packingAccess.canView} value={form.packagingProfileId} onChange={value => set("packagingProfileId", value)} />{Number(form.disposition) === 3 && ["observedFrom", "observedTo", "refreshedOn"].map(key => <AppInput key={key} label={t(key === "observedFrom" ? "Observed from" : key === "observedTo" ? "Observed to" : "Refreshed on", {
              defaultValue: key === "observedFrom" ? "Observed from" : key === "observedTo" ? "Observed to" : "Refreshed on"
            })} required type="date" value={form[key] || ""} onChange={event => set(key, event.target.value)} />)}{Number(form.disposition) === 6 && <><PhysicalLookup label={t("Existing purchase order", {
                defaultValue: "Existing purchase order"
              })} allowed={orderAccess.canView} loader={loadOrders} getLabel={orderLabel} value={poId} onChange={setPoId} /><AppSelect label={t("Actual purchase order line", {
                defaultValue: "Actual purchase order line"
              })} value={String(form.purchaseOrderLineId || "")} options={poLines.map(line => ({
                value: String(line.id),
                label: `${line.itemName || itemLabel(lookups, line.itemId)} · ${quantityText(line.orderedQuantity)} ${line.unitName || unitLabel(lookups, line.unitId)}`
              }))} onChange={value => set("purchaseOrderLineId", value)} /></>}</>}</>}</div><Notice>{t("Source units and packaging ratio are verified by the server. Historical production/dispatch must precede cutover. Opening is at the start of cutover day. Source role text remains evidence and does not identify the posting user.", {
          defaultValue: "Source units and packaging ratio are verified by the server. Historical production/dispatch must precede cutover. Opening is at the start of cutover day. Source role text remains evidence and does not identify the posting user."
        })}</Notice><Notice error>{localError}</Notice><CommandNotice command={command} /><div className="flex justify-end gap-3"><AppButton variant="secondary" onClick={onClose} disabled={command.busy}>{t("Cancel", {
            defaultValue: "Cancel"
          })}</AppButton><AppButton disabled={!access.canUpdate || command.conflict} isLoading={command.busy} onClick={save}>{t("Save mapping for validation", {
            defaultValue: "Save mapping for validation"
          })}</AppButton></div></div></AppModal>;
}
function AdjustmentPanel({
  lookups,
  context
}) {
  const t = useProductionText(workspaceMessages);
  const access = useCapabilities({
    actions: ["view", "approve"],
    pageName: "Items",
    resource: "items",
    route: "/inventory/items"
  });
  const [itemId, setItemId] = useState(""),
    [balance, setBalance] = useState(null),
    [error, setError] = useState(""),
    [form, setForm] = useState({
      businessDate: "",
      signedQuantity: "",
      reason: "",
      sourceReference: ""
    });
  const command = useWorkspaceCommand();
  const reload = async () => {
    if (!itemId) return false;
    try {
      setBalance((await service.stock(itemId)).data);
      command.clear(true, `stock:${itemId}`);
      setError("");
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    }
  };
  useEffect(() => {
    if (!itemId || !access.canView) return;
    const controller = new AbortController();
    service.stock(itemId, controller.signal).then(result => {
      if (!controller.signal.aborted) setBalance(result.data);
    }).catch(cause => {
      if (!controller.signal.aborted) setError(errorMessage(cause));
    });
    return () => controller.abort();
  }, [itemId, access.canView]);
  const save = () => {
    try {
      assertBusinessDate(form.businessDate, context.runtime);
      if (!form.reason.trim() || !form.sourceReference.trim()) throw new Error("Provide a reason and documented source.");
      void command.run("adjust", {
        ...form,
        unitId: balance.unitId,
        version: balance.version
      }, payload => service.adjust(itemId, payload), reload, `stock:${itemId}`);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };
  return <Card title={t("Controlled signed stock adjustment", {
    defaultValue: "Controlled signed stock adjustment"
  })}><Notice>{t("Current and reserved balances remain read only. Approved cutover openings use the import opening disposition. A later signed adjustment needs its own date, reason and source audit.", {
        defaultValue: "Current and reserved balances remain read only. Approved cutover openings use the import opening disposition. A later signed adjustment needs its own date, reason and source audit."
      })}</Notice><AppSelect label={t("Item", {
      defaultValue: "Item"
    })} value={itemId} disabled={!access.canView || command.busy || command.pending} options={lookups.items.map(item => ({
      value: String(item.id),
      label: `${item.itemCode || ""} · ${item.name}`
    }))} onChange={value => {
      if (!command.clear(false, `stock:${itemId}`)) return;
      setItemId(value);
      setBalance(null);
    }} />{balance && <><p className="text-sm">{t("Physical", {
          defaultValue: "Physical"
        })} {quantityText(balance.currentStock)} {t("\xB7 Reserved", {
          defaultValue: "\xB7 Reserved"
        })} {quantityText(balance.reservedStock)} · {unitLabel(lookups, balance.unitId)}</p><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{["businessDate", "signedQuantity", "reason", "sourceReference"].map(key => <AppInput key={key} required label={t({
          businessDate: "Business date",
          signedQuantity: "Signed quantity (+ / −)",
          reason: "Reason",
          sourceReference: "Source reference"
        }[key], {
          defaultValue: {
            businessDate: "Business date",
            signedQuantity: "Signed quantity (+ / −)",
            reason: "Reason",
            sourceReference: "Source reference"
          }[key]
        })} type={key === "businessDate" ? "date" : "text"} inputMode={key === "signedQuantity" ? "decimal" : undefined} value={form[key]} onChange={event => setForm(current => ({
          ...current,
          [key]: event.target.value
        }))} />)}</div><div className="flex flex-wrap gap-3"><AppButton isLoading={command.busy} disabled={!access.canApprove || command.conflict || !context.runtime} onClick={save}>{t("Post authorized adjustment", {
            defaultValue: "Post authorized adjustment"
          })}</AppButton><AppButton variant="secondary" disabled={command.busy} onClick={reload}>{t("Reload balance and review", {
            defaultValue: "Reload balance and review"
          })}</AppButton></div>{!access.canApprove && <Notice>{t("Items Approve access is required to adjust stock.", {
          defaultValue: "Items Approve access is required to adjust stock."
        })}</Notice>}</>}<Notice error>{error}</Notice><CommandNotice command={command} /></Card>;
}
export default function ImportsPage() {
  const t = useProductionText(workspaceMessages),
    access = useProductionCapabilities(),
    context = useProductionRuntime(),
    lookups = useWorkspaceLookups(),
    command = useWorkspaceCommand();
  const clearCommand = command.clear;
  const [search, setSearch] = useSearchParams(),
    batchId = search.get("batch") || "";
  const [tab, setTab] = useState(""),
    [file, setFile] = useState(null),
    [prepared, setPrepared] = useState(null),
    [firstDataRow, setFirstDataRow] = useState("2"),
    [cutoverDate, setCutoverDate] = useState("");
  const [stageUncertain, setStageUncertain] = useState(false);
  const stageAttempt = useRef(null), stageLock = useRef(false);
  const [storedBatch, setBatch] = useState(null),
    [batchInput, setBatchInput] = useState(batchId),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [selected, setSelected] = useState({}),
    [mapping, setMapping] = useState(null),
    [reason, setReason] = useState("");
  const clearAfterRead = useRef(false);
  const batchGeneration = useRef(0), preparationGeneration = useRef(0);
  const batch = storedBatch && String(storedBatch.batchId).toLowerCase() === batchId.toLowerCase() && storedBatch.__page === page ? storedBatch : null;
  useEffect(() => {
    if (!batchId || !access.canView) return;
    const controller = new AbortController();
    const generation = ++batchGeneration.current;
    void Promise.resolve().then(() => { if (!controller.signal.aborted) { setBusy(true); setSelected({}); setMapping(null); } });
    service.preview(batchId, {
      pageNumber: page,
      pageSize: 50
    }, controller.signal).then(result => {
      if (!controller.signal.aborted && generation === batchGeneration.current) {
        setBatch({ ...result.data, __page: page });
        setBusy(false);
        setError("");
        if (clearAfterRead.current) {
          clearCommand(true, `import:${batchId}`);
          clearAfterRead.current = false;
        }
      }
    }).catch(cause => {
      if (!controller.signal.aborted && generation === batchGeneration.current) {
        setBatch(null);
        setError(errorMessage(cause));
        setBusy(false);
      }
    });
    return () => { controller.abort(); batchGeneration.current += 1; };
  }, [batchId, page, refresh, access.canView, clearCommand]);
  const reload = async () => {
    const generation = ++batchGeneration.current;
    clearAfterRead.current = true;
    setSelected({});
    setBusy(true);
    try {
      const response = await service.preview(batchId, {
        pageNumber: page,
        pageSize: 50
      });
      if (generation !== batchGeneration.current) return false;
      setBatch({ ...response.data, __page: page });
      setError("");
      clearCommand(true, `import:${batchId}`);
      clearAfterRead.current = false;
      return true;
    } catch (cause) {
      if (generation === batchGeneration.current) setError(errorMessage(cause));
      return false;
    } finally {
      if (generation === batchGeneration.current) setBusy(false);
    }
  };
  const prepare = async () => {
    const generation = ++preparationGeneration.current;
    try {
      setError("");
      if (!file || !tab) throw new Error("Choose a tab export and its real tab name.");
      setBusy(true);
      const evidence = await prepareProductionEvidence({
        file,
        tab,
        firstDataRow,
        delimiter: /\.tsv$/i.test(file.name) ? "\t" : ","
      });
      if (generation === preparationGeneration.current) setPrepared(evidence);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  const stage = async () => {
    if (stageLock.current || command.busy || command.uncertain || command.conflict) return;
    try {
      assertBusinessDate(cutoverDate);
      if (!prepared && !stageAttempt.current) throw new Error("Prepare the actual source evidence first.");
      if (!stageAttempt.current) stageAttempt.current = { fileFingerprint: prepared.fileFingerprint, fileName: prepared.fileName, rows: prepared.rows, cutoverDate };
      stageLock.current = true;
      setBusy(true);
      setError("");
      const result = await service.stage(stageAttempt.current);
      stageAttempt.current = null;
      setStageUncertain(false);
      setBatchInput(result.data.batchId);
      setSearch({
        batch: result.data.batchId
      });
      setPrepared(null);
      setPage(1);
      setSelected({});
    } catch (cause) {
      setError(errorMessage(cause));
      if (stageLock.current && !cause.response) setStageUncertain(true);
      else { stageAttempt.current = null; setStageUncertain(false); }
    } finally {
      stageLock.current = false;
      setBusy(false);
    }
  };
  const action = name => {
    if (!batch || busy || clearAfterRead.current) return;
    const rows = Object.values(selected);
    if (!reason.trim() || !rows.length || rows.some(row => !rowCanAdvance(row, name))) {
      setError("Choose only rows eligible for this step and provide a reason. Unresolved rows can remain for repair.");
      return;
    }
    void command.run(name, {
      version: batch.version,
      rowIds: rows.map(row => row.id),
      reason
    }, body => service.importAction(batchId, name, body), reload, `import:${batchId}`);
  };
  if (!access.canView) return <Notice error>{t("Manufacturing Orders View access is required.", {
      defaultValue: "Manufacturing Orders View access is required."
    })}</Notice>;
  const rows = batch?.rows?.items || [];
  return <div className="space-y-6"><PageHeader title={t("imports.title")} description={t("Stage real source evidence, repair positional mappings and post only selected reconciled rows.", {
      defaultValue: "Stage real source evidence, repair positional mappings and post only selected reconciled rows."
    })} /><WorkspaceNav /><BusinessContext context={context} /><Notice error>{error || lookups.error}</Notice>{stageUncertain && <Notice>{t("The staging outcome is unknown. Retry the identical source and cutover to recover its saved batch; source changes stay locked until recovery.")}</Notice>}<Card title={t("1 \xB7 Select and stage source", {
      defaultValue: "1 \xB7 Select and stage source"
    })}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><AppSelect label={t("Actual source tab", {
          defaultValue: "Actual source tab"
        })} value={tab} disabled={busy || command.busy || stageUncertain || command.uncertain || command.conflict} options={sourceManifest.map(source => ({
          value: source.tab,
          label: source.tab
        }))} onChange={value => {
          setTab(value);
          preparationGeneration.current += 1;
          setPrepared(null);
        }} /><AppInput type="file" label={t("CSV / TSV export (one original tab)", {
          defaultValue: "CSV / TSV export (one original tab)"
        })} accept=".csv,.tsv" disabled={busy || command.busy || stageUncertain || command.uncertain || command.conflict} onChange={event => {
          preparationGeneration.current += 1;
          setFile(event.target.files?.[0] || null);
          setPrepared(null);
        }} /><AppInput type="date" required label={t("Start-of-day cutover date", {
          defaultValue: "Start-of-day cutover date"
        })} value={cutoverDate} disabled={busy || command.busy || stageUncertain || command.uncertain || command.conflict} onChange={event => setCutoverDate(event.target.value)} /><AppInput label={t("First data row in original tab")} inputMode="numeric" value={firstDataRow} disabled={busy || command.busy || stageUncertain || command.uncertain || command.conflict} onChange={event => { preparationGeneration.current += 1; setFirstDataRow(event.target.value); setPrepared(null); }} /></div><Notice>{sourceManifest.find(source => source.tab === tab)?.purpose || t("Export each tab without reordering columns. Repeated headers and inactive history remain positional. Blank Sheet6 and canvas dependency exports remain evidence-only unless actual business evidence supports another disposition.", {
          defaultValue: "Export each tab without reordering columns. Repeated headers and inactive history remain positional. Blank Sheet6 and canvas dependency exports remain evidence-only unless actual business evidence supports another disposition."
        })}</Notice><AppButton variant="secondary" disabled={!access.canCreate || stageUncertain || command.busy || command.uncertain || command.conflict} isLoading={busy} onClick={prepare}>{t("Preview positional evidence", {
          defaultValue: "Preview positional evidence"
        })}</AppButton>{prepared && <div className="space-y-3"><p className="text-sm">{prepared.fileName} · {prepared.rows.length} {t("source cells \xB7", {
            defaultValue: "source cells \xB7"
          })} {prepared.headers.length} {t("columns \xB7 fingerprint", {
            defaultValue: "columns \xB7 fingerprint"
          })} {prepared.fileFingerprint.slice(0, 16)}…</p><div className="max-h-40 overflow-auto text-sm">{prepared.headers.map((header, index) => <p key={index}>{t("Column", {
              defaultValue: "Column"
            })} {index + 1}: {header || t("Blank header", {
              defaultValue: "Blank header"
            })}</p>)}</div><AppButton disabled={!access.canCreate || !context.runtime || command.busy || command.uncertain || command.conflict} isLoading={busy} onClick={stage}>{stageUncertain ? t("Retry identical staging request") : t("imports.stage")}</AppButton></div>}</Card>
  <Card title={t("2 \xB7 Resume batch and review", {
      defaultValue: "2 \xB7 Resume batch and review"
    })}><div className="flex flex-wrap items-end gap-3"><AppInput label={t("Saved batch reference", {
          defaultValue: "Saved batch reference"
        })} value={batchInput} onChange={event => setBatchInput(event.target.value)} /><AppButton variant="secondary" onClick={() => {
          if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(batchInput)) {
            setError("Enter a valid saved batch reference.");
            return;
          }
          setSearch({
            batch: batchInput
          });
          setPage(1);
          clearAfterRead.current = true;
          setSelected({});
          setBusy(true);
          setRefresh(value => value + 1);
        }}>{t("Open saved batch", {
            defaultValue: "Open saved batch"
          })}</AppButton>{batchId && <AppButton variant="secondary" disabled={command.busy} onClick={reload}>{t("Reload authoritative batch", {
            defaultValue: "Reload authoritative batch"
          })}</AppButton>}</div>{batch && <><p className="text-sm">{batch.fileName || "Source file unavailable"} · Cutover {batch.cutoverDate || "Unavailable"}</p><p className="text-sm">{t("Status:", {
            defaultValue: "Status:"
          })} {batch.status} · {batch.rows.totalCount} {t("rows \xB7", {
            defaultValue: "rows \xB7"
          })} {batch.rows.summary?.unresolvedRows ?? t("Unavailable", {
            defaultValue: "Unavailable"
          })} {t("unresolved \xB7 Version", {
            defaultValue: "unresolved \xB7 Version"
          })} {batch.version}</p><DataTableShell columnCount={8} loading={busy} emptyTitle={rows.length ? undefined : "No matching source rows"} head={<>{["Select", "Source position", "Original value", "Disposition", "Status / exception", "Balance difference", "Normalized evidence", "Repair"].map(label => <th key={label} className={cell}>{t(label, {
              defaultValue: label
            })}</th>)}</>} minWidth="min-w-[1200px]">{rows.map(row => {
            let normalized = {};
            try {
              normalized = row.normalizedJson ? parseProductionJson(row.normalizedJson) : {};
            } catch {/* Original remains available for repair. */}
            return <tr key={row.id} className="border-t"><td className={cell}><input type="checkbox" aria-label={`Select ${row.tab} row ${row.rowNumber} ${row.columnName}`} checked={Boolean(selected[row.id])} disabled={row.rowStatus === "Posted" || command.busy} onChange={event => setSelected(current => {
                  const next = {
                    ...current
                  };
                  if (event.target.checked) next[row.id] = row;else delete next[row.id];
                  return next;
                })} /></td><td className={cell}>{row.tab}<br />{t("Row", {
                  defaultValue: "Row"
                })} {row.rowNumber} · {row.columnName}<br /><span className="text-xs text-slate-500">{row.eventFingerprint.slice(0, 14)}…</span></td><td className={`${cell} max-w-48 whitespace-pre-wrap break-words`}>{sourceEvidence(row).value || t("Blank evidence", {
                  defaultValue: "Blank evidence"
                })}</td><td className={cell}>{dispositionLabels[row.disposition] || t("Unmapped", {
                  defaultValue: "Unmapped"
                })}</td><td className={cell}>{row.rowStatus}<br />{row.exceptionCode || t("No unresolved exception", {
                  defaultValue: "No unresolved exception"
                })}</td><td className={cell}>{quantityText(row.reconciliationDifference)}</td><td className={cell}>{normalized.itemId ? itemLabel(lookups, normalized.itemId) : t("No Item mapped", {
                  defaultValue: "No Item mapped"
                })}<br />{t("Source", {
                  defaultValue: "Source"
                })} {quantityText(normalized.sourceQuantity, {
                  scale: 12
                })} {unitLabel(lookups, normalized.sourceUnitId)}<br />{t("Base", {
                  defaultValue: "Base"
                })} {quantityText(normalized.baseQuantity)} {t("\xB7 Factor", {
                  defaultValue: "\xB7 Factor"
                })} {quantityText(normalized.conversionFactor, {
                  scale: 12
                })}<br />{normalized.businessDate || ""}<br />{normalized.sourceReference || ""}</td><td className={cell}><AppButton variant="secondary" disabled={!access.canUpdate || ["Approved", "Posted"].includes(row.rowStatus) || command.busy} onClick={() => setMapping(row)}>{t("Review evidence / map", {
                    defaultValue: "Review evidence / map"
                  })}</AppButton></td></tr>;
          })}</DataTableShell><Pager page={page} total={batch.rows.totalCount} busy={busy} onPage={value => {
          setPage(value);
          setBusy(true);
          setSelected({});
        }} /><AppInput label={t("Review / approval / posting reason", {
          defaultValue: "Review / approval / posting reason"
        })} required value={reason} onChange={event => setReason(event.target.value)} /><p className="text-sm">{Object.keys(selected).length} {t("selected. Approval and posting are separate actions; unresolved unrelated rows remain repairable.", {
            defaultValue: "selected. Approval and posting are separate actions; unresolved unrelated rows remain repairable."
          })}</p><div className="flex flex-wrap gap-3">{["validate", "reconcile", "approve", "post"].map(name => <AppButton key={name} variant={name === "post" ? "primary" : "secondary"} isLoading={command.busy} disabled={busy || command.conflict || !Object.values(selected).length || !Object.values(selected).every(row => rowCanAdvance(row, name)) || (["approve", "post"].includes(name) ? !access.canApprove : !access.canUpdate)} onClick={() => action(name)}>{t(`imports.${name}`)}</AppButton>)}</div><CommandNotice command={command} /></>}</Card>
  <AdjustmentPanel lookups={lookups} context={context} /><Card title={t("Source coverage", {
      defaultValue: "Source coverage"
    })}><details><summary className="cursor-pointer text-sm font-medium">{t("All 22 source tabs and their disposition", {
            defaultValue: "All 22 source tabs and their disposition"
          })}</summary><ul className="mt-3 space-y-2 text-sm">{sourceManifest.map(source => <li key={source.tab}><strong>{source.tab}</strong> — {source.purpose}</li>)}</ul></details></Card>{mapping && batch && <MappingDialog key={mapping.id} row={mapping} batch={batch} lookups={lookups} onClose={() => setMapping(null)} onSaved={reload} />}</div>;
}
