import workspaceMessages from "../workspaceMessages";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageHeader from "../../../components/common/PageHeader";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import AppButton from "../../../components/common/AppButton";
import DataTableShell from "../../../components/common/DataTableShell";
import useProductionText from "../../../hooks/useProductionText";
import { productionWorkspaceService as service } from "../../../services/manufacturing/productionWorkspaceService";
import { quantityText } from "../../../utils/productionValues";
import { BusinessContext, Card, Notice, Pager, WorkspaceNav } from "../WorkspaceShared";
import { errorMessage, itemLabel, unitLabel, useProductionCapabilities, useProductionRuntime, useWorkspaceLookups } from "../workspaceHooks";
import { operationalKinds, reportFieldsFor, sourceDocumentLink } from "./productionReportingHelpers";
const fields = {
  goodOutput: "Good output",
  rejectedOutput: "Rejected output",
  dispatchedQuantity: "Dispatched",
  returnedQuantity: "Returned",
  plannedQuantity: "Planned",
  onHandQuantity: "On hand",
  reservedQuantity: "Reserved",
  availableQuantity: "Available",
  signedQuantity: "Signed movement",
  reconciliationDifference: "Difference",
  requiredMinutes: "Required minutes"
};
const cell = "whitespace-nowrap px-4 py-3 text-sm";
export default function OperationalReportsPage() {
  const t = useProductionText(workspaceMessages),
    access = useProductionCapabilities("Reports"),
    context = useProductionRuntime(),
    lookups = useWorkspaceLookups();
  const [search, setSearch] = useSearchParams();
  const initialKind = operationalKinds[search.get("kind")] ? search.get("kind") : "stock-as-of";
  const [kind, setKind] = useState(initialKind),
    [query, setQuery] = useState({
      asOfDate: search.get("asOfDate") || "",
      fromDate: "",
      toDate: "",
      itemId: "",
      channelId: "",
      search: ""
    });
  const [applied, setApplied] = useState(null),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false),
    [exporting, setExporting] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!applied || !access.canView) return;
    const controller = new AbortController();
    service.report(applied.kind, {
      ...applied.query,
      pageNumber: page,
      pageSize: 50
    }, controller.signal).then(response => {
      if (!controller.signal.aborted) {
        setResult(response.data);
        setBusy(false);
      }
    }).catch(cause => {
      if (!controller.signal.aborted) {
        setError(errorMessage(cause));
        setResult(null);
        setBusy(false);
      }
    });
    return () => controller.abort();
  }, [applied, page, refresh, access.canView]);
  const apply = () => {
    if (kind === "stock-as-of" && !query.asOfDate) {
      setError("Choose the business date for stock as of.");
      return;
    }
    if (query.fromDate && query.toDate && query.fromDate > query.toDate) {
      setError("The end date must follow the start date.");
      return;
    }
    setBusy(true);
    setError("");
    setPage(1);
    setResult(null);
    setApplied({
      kind,
      query: {
        ...query
      }
    });
    setSearch({
      kind,
      ...(query.asOfDate ? {
        asOfDate: query.asOfDate
      } : {})
    });
  };
  const download = async (format = "csv") => {
    if (!applied || !access.canExport) return;
    try {
      setExporting(true);
      setError("");
      const response = await service.exportReport(applied.kind, applied.query, format);
      const url = URL.createObjectURL(response.data),
        anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `production-${applied.kind}${applied.query.asOfDate ? `-${applied.query.asOfDate}` : ""}.${format}`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setExporting(false);
    }
  };
  if (!access.canView) return <Notice error>{t("Manufacturing Reports View access is required.", {
      defaultValue: "Manufacturing Reports View access is required."
    })}</Notice>;
  const shownFields = reportFieldsFor(applied?.kind || kind);
  const summary = result?.summary;
  return <div className="space-y-6"><PageHeader title={t("reports.title")} description={t("Authoritative business-date evidence, unit-separated totals and source document links.", {
      defaultValue: "Authoritative business-date evidence, unit-separated totals and source document links."
    })} /><WorkspaceNav /><BusinessContext context={context} /><Notice error>{error || lookups.error}</Notice><Card title={t("Report filters", {
      defaultValue: "Report filters"
    })}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><AppSelect label={t("View", {
          defaultValue: "View"
        })} value={kind} options={Object.entries(operationalKinds).map(([value, label]) => ({
          value,
          label
        }))} onChange={setKind} />{["asOfDate", "fromDate", "toDate"].map(key => <AppInput key={key} type="date" label={t({
          asOfDate: "Stock as of",
          fromDate: "From business date",
          toDate: "To business date"
        }[key], {
          defaultValue: {
            asOfDate: "Stock as of",
            fromDate: "From business date",
            toDate: "To business date"
          }[key]
        })} value={query[key]} onChange={event => setQuery(current => ({
          ...current,
          [key]: event.target.value
        }))} />)}<AppInput label={t("Item code / name search", {
          defaultValue: "Item code / name search"
        })} value={query.search} onChange={event => setQuery(current => ({
          ...current,
          search: event.target.value
        }))} /><AppSelect label={t("Item", {
          defaultValue: "Item"
        })} value={query.itemId} options={lookups.items.map(item => ({
          value: String(item.id),
          label: `${item.itemCode || ""} · ${item.name}`
        }))} onChange={itemId => setQuery(current => ({
          ...current,
          itemId
        }))} /><AppSelect label={t("Channel", {
          defaultValue: "Channel"
        })} value={query.channelId} disabled={!lookups.canReadChannels} options={lookups.channels.map(row => ({
          value: String(row.id),
          label: row.name || row.channelName
        }))} onChange={channelId => setQuery(current => ({
          ...current,
          channelId
        }))} /></div><div className="flex flex-wrap gap-3"><AppButton isLoading={busy} onClick={apply}>{t("Apply filters", {
            defaultValue: "Apply filters"
          })}</AppButton><AppButton variant="secondary" disabled={!context.runtime || busy} onClick={() => setQuery(current => ({
          ...current,
          asOfDate: context.runtime.businessDate
        }))}>{t("Use company business date", {
            defaultValue: "Use company business date"
          })}</AppButton><AppButton variant="secondary" disabled={!applied || busy} onClick={() => {
          setBusy(true);
          setRefresh(value => value + 1);
        }}>{t("Reload", {
            defaultValue: "Reload"
          })}</AppButton>{access.canExport && <AppButton variant="secondary" isLoading={exporting} disabled={!applied || busy} onClick={() => download("csv")}>Export CSV</AppButton>}{access.canExport && <details className="self-center"><summary className="cursor-pointer text-sm text-slate-500">Advanced export</summary><AppButton variant="secondary" disabled={!applied || busy || exporting} onClick={() => download("ndjson")}>NDJSON</AppButton></details>}<Link className="self-center text-sm font-medium text-brand" to="/reports/manufacturing">{t("Actual production / material reports and CSV", {
            defaultValue: "Actual production / material reports and CSV"
          })}</Link></div></Card>
  <Notice>{t("Missing historical ledger or reservation evidence remains unavailable and carries a quality flag. This export reads all matching pages; concurrent changes may affect it. It is not an immutable historical snapshot. Supplier delivery performance is available in Purchase follow-ups.", {
        defaultValue: "Missing historical ledger or reservation evidence remains unavailable and carries a quality flag. This export reads all matching pages; concurrent changes may affect it. It is not an immutable historical snapshot. Supplier delivery performance is available in Purchase follow-ups."
      })}</Notice>
  {summary && <Card title={t("Totals across all matching rows", {
      defaultValue: "Totals across all matching rows"
    })}><p className="text-xs text-slate-500">{summary.calculationVersion} · {result.totalCount} {t("records \xB7", {
          defaultValue: "records \xB7"
        })} {summary.dataQualityRows ?? t("Unavailable", {
          defaultValue: "Unavailable"
        })} {t("quality flags", {
          defaultValue: "quality flags"
        })}</p>{summary.quantityTotals?.length ? <div className="flex flex-wrap gap-4">{summary.quantityTotals.map(total => <div key={total.unitId} className="rounded-xl border p-4 text-sm"><p className="font-semibold">{total.unitName || unitLabel(lookups, total.unitId)}</p>{Object.entries(fields).filter(([key]) => key !== "requiredMinutes" && Object.hasOwn(total, key)).map(([key, label]) => <p key={key}>{t(label, {
              defaultValue: label
            })}: {quantityText(total[key])}</p>)}</div>)}</div> : <p className="text-sm">{t("Quantity totals are unavailable for this view.", {
          defaultValue: "Quantity totals are unavailable for this view."
        })}</p>}<p className="text-sm">{t("Required minutes:", {
          defaultValue: "Required minutes:"
        })} {quantityText(summary.requiredMinutes)} {t("\xB7 On-time records:", {
          defaultValue: "\xB7 On-time records:"
        })} {summary.onTimeDenominator ? `${summary.onTimeNumerator} / ${summary.onTimeDenominator}` : t("Unavailable (no due-date denominator)", {
          defaultValue: "Unavailable (no due-date denominator)"
        })}</p></Card>}
  <Card title={t(operationalKinds[applied?.kind || kind], {
      defaultValue: operationalKinds[applied?.kind || kind]
    })}><DataTableShell columnCount={shownFields.length + 6} loading={busy} emptyTitle={result?.items?.length ? undefined : applied ? "No matching records" : "Choose filters and load a report"} head={<>{["Business date", "Item / unit", "Channel", "Source", ...shownFields.map(key => fields[key]), "Due / on time", "Quality / calculation"].map(label => <th className={cell} key={label}>{t(label, {
            defaultValue: label
          })}</th>)}</>} minWidth="min-w-[1250px]">{result?.items?.map((row, index) => <tr key={`${row.sourceType}-${row.sourceId}-${row.itemId}-${row.sourceLineId || index}`} className="border-t"><td className={cell}>{row.businessDate || t("Undated evidence", {
              defaultValue: "Undated evidence"
            })}</td><td className={cell}>{row.itemCode || itemLabel(lookups, row.itemId)} · {row.itemName || ""}<br />{row.unitName || unitLabel(lookups, row.unitId)}</td><td className={cell}>{row.channelId ? (lookups.channels.find(channel => String(channel.id) === String(row.channelId))?.name || lookups.channels.find(channel => String(channel.id) === String(row.channelId))?.channelName || `#${row.channelId}`) : "—"}</td><td className={cell}>{sourceDocumentLink(row) ? <Link className="font-medium text-brand" to={sourceDocumentLink(row)}>{row.sourceType} · {row.sourceId}</Link> : `${row.sourceType} · ${row.sourceId}`}<br />{row.sourceLineId ? `Line ${row.sourceLineId}` : ""}</td>{shownFields.map(key => <td className={cell} key={key}>{quantityText(row[key])}</td>)}<td className={cell}>{row.dueDate || t("No due-date evidence", {
              defaultValue: "No due-date evidence"
            })}<br />{row.onTime == null ? t("Unavailable", {
              defaultValue: "Unavailable"
            }) : row.onTime ? "On time" : "Late"}</td><td className={`${cell} max-w-72 whitespace-normal`}>{row.dataQualityFlag || t("No flagged exception", {
              defaultValue: "No flagged exception"
            })}<br /><span className="text-xs text-slate-500">{row.calculationVersion}</span></td></tr>)}</DataTableShell><Pager page={page} total={result?.totalCount} busy={busy} onPage={value => {
        setBusy(true);
        setPage(value);
      }} /></Card></div>;
}
