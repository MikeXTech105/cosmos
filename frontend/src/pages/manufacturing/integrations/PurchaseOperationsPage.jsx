import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import useCapabilities from "../../../hooks/useCapabilities";
import useProductionRuntime from "../../../hooks/useProductionRuntime";
import useProductionText from "../../../hooks/useProductionText";
import { physicalMessages } from "./physicalMessages";
import { physicalInventoryService as api } from "../../../services/manufacturing/physicalInventoryService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { businessDate } from "./physicalHelpers";
import { SupplierLookup } from "./PhysicalLookup";
import { PhysicalFeedback, PhysicalSection, PhysicalTable } from "./PhysicalShared";

export default function PurchaseOperationsPage() {
  const t = useProductionText(physicalMessages);
  const permission = useCapabilities({ actions: ["view"], pageName: "PurchaseExpense.PurchaseOrder", resource: "PurchaseExpense.PurchaseOrder" });
  const runtime = useProductionRuntime();
  const [mode, setMode] = useState("followups");
  const [supplierId, setSupplierId] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ data: null, loading: false, error: "" });
  const size = 50;
  useEffect(() => {
    if (!permission.canView || !runtime.runtime?.businessDate) return undefined;
    const controller = new AbortController();
    const load = async () => {
      setState({ data: null, loading: true, error: "" });
      try {
        const params = { SupplierId: supplierId || null, PageNumber: page, PageSize: size };
        let response;
        if (mode === "followups") response = await api.followups({ ...params, AsOfDate: runtime.runtime.businessDate, OverdueOnly: overdueOnly }, { signal: controller.signal });
        else {
          if (!fromDate || !toDate) { setState({ data: null, loading: false, error: "Select the receipt business-date period to view supplier performance." }); return; }
          if (businessDate(toDate) < businessDate(fromDate)) throw new Error("The receipt period end must be on or after its start.");
          response = await api.supplierPerformance({ ...params, FromDate: fromDate, ToDate: toDate }, { signal: controller.signal });
        }
        if (!controller.signal.aborted) setState({ data: response.data, loading: false, error: "" });
      } catch (error) { if (!controller.signal.aborted) setState({ data: null, loading: false, error: getApiErrorMessage(error, "Unable to load purchase operations.") }); }
    };
    void load();
    return () => controller.abort();
  }, [mode, supplierId, overdueOnly, fromDate, toDate, page, revision, permission.canView, runtime.runtime?.businessDate]);
  const items = state.data?.items ?? [];
  const count = state.data?.totalCount ?? 0;
  const summary = Array.isArray(state.data?.summary) ? state.data.summary : [];
  const summaryValue = (row, name) => row[name] ?? row[name[0].toUpperCase() + name.slice(1)] ?? "Unavailable";
  return <section className="space-y-5"><PageHeader title={t("integrations.purchaseOperations", { defaultValue: "Purchase follow-ups and supplier performance" })} description={t("Current accepted-outstanding supply and receipt-based supplier metrics use the company business calendar.")} actions={<Link className="text-sm text-brand underline" to="/purchase/orders">{t("Purchase orders")}</Link>} />{!permission.canView ? <PhysicalSection title="View permission required"><p className="text-sm text-slate-600">{t("Purchase Order View permission is required to read these operations.")}</p></PhysicalSection> : <PhysicalSection title={mode === "followups" ? "Current purchase supply" : "Supplier receipt performance"}><PhysicalFeedback loading={runtime.loading || state.loading} error={runtime.error || state.error} onReload={() => { runtime.reload(); setRevision((value) => value + 1); }} /><div className="grid gap-4 md:grid-cols-3"><AppSelect label={t("View")} value={mode} options={[{ value: "followups", label: t("PO pending / overdue") }, { value: "performance", label: t("Supplier receipt performance") }]} onChange={(value) => { setMode(value); setPage(1); }} /><SupplierLookup value={supplierId} onChange={(value) => { setSupplierId(value); setPage(1); }} /><div className="space-y-3">{mode === "followups" ? <><AppInput label={t("Current company business date")} value={runtime.runtime?.businessDate ?? "Unavailable"} readOnly /><label className="flex gap-2 text-sm text-slate-700"><input type="checkbox" checked={overdueOnly} onChange={(event) => { setOverdueOnly(event.target.checked); setPage(1); }} />{t("Overdue accepted remainder only")}</label></> : <><AppInput type="date" label={t("Receipt business date from")} value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} /><AppInput type="date" label={t("Through")} value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} /></>}</div></div>
      {mode === "followups" ? <><p className="text-xs text-slate-500">{t("The operational follow-up uses today's promise/cancellation state. Returns do not reopen supply. No external messages are sent.")}</p><PhysicalTable headings={[t("Purchase order / source"), t("Item / base unit"), t("Promise"), t("Ordered"), t("Accepted"), t("Rejected / quarantine"), t("Returned"), t("Pending accepted"), t("Overdue")]}>{items.map((row) => <tr key={row.purchaseOrderLineId}><td><Link to={`/purchase/orders/${row.purchaseOrderId}`} className="font-medium text-brand underline">{row.purchaseOrderNo}</Link><p className="text-xs text-slate-500">{row.supplierName ?? row.supplierId}</p></td><td>{row.itemName ?? `Item ${row.itemId}`} · {row.unitName ?? `Unit ${row.unitId}`}</td><td>{row.expectedDate ?? "Undated"}</td><td>{row.orderedQuantity}</td><td>{row.acceptedQuantity}</td><td>{row.rejectedQuantity} / {row.quarantinedQuantity}</td><td>{row.returnedQuantity}</td><td>{row.pendingQuantity ?? "Unavailable"}</td><td>{row.isOverdue ? "Overdue" : "—"}</td></tr>)}</PhysicalTable></> : <><p className="text-xs leading-5 text-slate-500">{t("Supplier delivery performance is separate from the production / dispatch scorecard. On-time percentage uses only accepted quantities with actual promised dates. Missing due dates remain unavailable. Quantities stay grouped by base unit.")}</p><PhysicalTable headings={[t("Supplier"), t("Base unit"), t("Accepted"), t("Returned"), t("On-time accepted"), t("Dated / undated accepted"), t("On-time %"), t("Quantity-weighted lead days")]}>{items.map((row) => <tr key={`${row.supplierId}:${row.unitId}`}><td>{row.supplierName ?? row.supplierId}</td><td>{row.unitName ?? `Unit ${row.unitId}`}</td><td>{row.acceptedQuantity}</td><td>{row.returnedQuantity}</td><td>{row.onTimeAcceptedQuantity}</td><td>{row.datedAcceptedQuantity} / {row.undatedAcceptedQuantity}</td><td>{row.onTimePercent == null ? "Unavailable" : `${row.onTimePercent}%`}</td><td>{row.quantityWeightedLeadDays ?? "Unavailable"}</td></tr>)}</PhysicalTable></>}
      {summary.length > 0 && <div className="space-y-2"><h3 className="text-sm font-semibold text-slate-800">{t("Full-filter totals by base unit")}</h3><PhysicalTable headings={(mode === "followups" ? ["Base unit", "Ordered", "Accepted", "Pending accepted"] : ["Base unit", "Accepted", "Returned", "On-time accepted", "Dated / undated accepted", "On-time %"]).map((label) => t(label))}>{summary.map((row) => <tr key={summaryValue(row, "unitId")}><td>{summaryValue(row, "unitName")}</td>{mode === "followups" ? <><td>{summaryValue(row, "orderedQuantity")}</td><td>{summaryValue(row, "acceptedQuantity")}</td><td>{summaryValue(row, "pendingQuantity")}</td></> : <><td>{summaryValue(row, "acceptedQuantity")}</td><td>{summaryValue(row, "returnedQuantity")}</td><td>{summaryValue(row, "onTimeAcceptedQuantity")}</td><td>{summaryValue(row, "datedAcceptedQuantity")} / {summaryValue(row, "undatedAcceptedQuantity")}</td><td>{summaryValue(row, "onTimePercent") === "Unavailable" ? t("Unavailable") : `${summaryValue(row, "onTimePercent")}%`}</td></>}</tr>)}</PhysicalTable></div>}
      {!state.loading && !items.length && !state.error && <p className="py-5 text-center text-sm text-slate-500">{t("No records match these filters.")}</p>}<div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>{count} {t("records")} · {t("page")} {page}</span><div className="flex gap-2"><AppButton variant="secondary" disabled={page <= 1 || state.loading} onClick={() => setPage((value) => value - 1)}>{t("Previous")}</AppButton><AppButton variant="secondary" disabled={page * size >= count || state.loading} onClick={() => setPage((value) => value + 1)}>{t("Next")}</AppButton></div></div>
    </PhysicalSection>}</section>;
}
