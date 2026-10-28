import { useState } from "react";
import { Link } from "react-router-dom";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import useCapabilities from "../../../hooks/useCapabilities";
import useProductionRuntime from "../../../hooks/useProductionRuntime";
import useProductionText from "../../../hooks/useProductionText";
import { physicalMessages } from "./physicalMessages";
import { physicalInventoryService as api } from "../../../services/manufacturing/physicalInventoryService";
import { buildReceiptCredit, buildReceiptLines, businessDate, decimal, lineLabel, quantityCompare, quantityDifference, quantitySum, receiptCreditSources, required, sourceLines } from "./physicalHelpers";
import { PhysicalFeedback, PhysicalSection, PhysicalTable } from "./PhysicalShared";
import { reloadPhysical, reviewPhysical, usePhysicalCommand, usePhysicalContext } from "./physicalHooks";

export default function PurchasePhysicalPanel({ record, onSaved }) {
  const t = useProductionText(physicalMessages);
  const permission = useCapabilities({ actions: ["view", "update", "approve"], pageName: "PurchaseExpense.PurchaseOrder", resource: "PurchaseExpense.PurchaseOrder" });
  const returns = useCapabilities({ actions: ["approve"], pageName: "PurchaseExpense.PurchaseReturn", resource: "PurchaseExpense.PurchaseReturn" });
  const context = usePhysicalContext(api.orderContext, record.id, permission.canView);
  const { runtime } = useProductionRuntime();
  const [mode, setMode] = useState("receive");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [reference, setReference] = useState("");
  const [attachment, setAttachment] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [entries, setEntries] = useState({});
  const [returnLineId, setReturnLineId] = useState("");
  const [returnQuantities, setReturnQuantities] = useState({ accepted: "0", rejected: "0", quarantined: "0" });
  const [creditReturnId, setCreditReturnId] = useState("");
  const [billItemId, setBillItemId] = useState("");
  const command = usePhysicalCommand(async () => { await reloadPhysical(context.reload, onSaved); setEntries({}); setReason(""); return true; });
  const data = context.data;
  const lines = (data?.orderLines ?? sourceLines(record)).map((line) => ({ ...line, quantity: line.orderedQuantity ?? line.quantity }));
  const received = data?.lines ?? [];
  const selectedReturn = received.find((line) => String(line.id) === String(returnLineId));
  const selectedCredit = data?.returns?.find((entry) => String(entry.id) === String(creditReturnId));
  const creditLinks = receiptCreditSources(data, creditReturnId);
  const currentDate = date || runtime?.businessDate || "";
  const open = [1, 2, 3].includes(Number(record.status));
  const patchLine = (id, patch) => setEntries((current) => ({ ...current, [id]: { accepted: "0", rejected: "0", quarantined: "0", cost: "", ...current[id], ...patch } }));
  const execute = async () => {
    if (!data?.version) return;
    try {
      if (mode === "receive" && permission.canApprove) {
        const selected = buildReceiptLines(lines, entries, received);
        if (!selected.length) throw new Error("Select at least one actual PO line to receive.");
        await command.run(`receive:${record.id}`, { version: data.version, businessDate: businessDate(currentDate), supplierId: record.supplierId, sourceReference: required(reference, "Supplier receipt reference", 200), attachmentReference: attachment.trim() || null, lines: selected }, (payload) => api.receive(record.id, payload));
      } else if (mode === "return" && returns.canApprove) {
        if (!selectedReturn?.receiptId || !selectedReturn?.receiptVersion) throw new Error("Reload receipt context to select a real original receipt and its current version.");
        const payload = { version: selectedReturn.receiptVersion, businessDate: businessDate(currentDate), receiptLineId: selectedReturn.id, acceptedQuantity: decimal(returnQuantities.accepted), rejectedQuantity: decimal(returnQuantities.rejected), quarantinedQuantity: decimal(returnQuantities.quarantined), reason: required(reason, "Supplier return reason", 1000) };
        if (quantityCompare(quantitySum([payload.acceptedQuantity, payload.rejectedQuantity, payload.quarantinedQuantity]), "0") <= 0) throw new Error("Enter a positive original receipt disposition to return.");
        for (const [quantity, original, returned] of [[payload.acceptedQuantity, "acceptedQuantity", "returnedAcceptedQuantity"], [payload.rejectedQuantity, "rejectedQuantity", "returnedRejectedQuantity"], [payload.quarantinedQuantity, "quarantinedQuantity", "returnedQuarantinedQuantity"]]) if (quantityCompare(quantity, quantityDifference(selectedReturn[original], selectedReturn[returned])) > 0) throw new Error("Return quantity exceeds its original receipt disposition balance.");
        await command.run(`return:${selectedReturn.receiptId}`, payload, (body) => api.returnReceipt(selectedReturn.receiptId, body));
      } else if (mode === "credit" && returns.canApprove) {
        const payload = buildReceiptCredit(data, { returnId: creditReturnId, billItemId, businessDate: currentDate, reason });
        await command.run(`credit:${selectedCredit.id}`, payload, (body) => api.creditReturn(selectedCredit.id, body));
      } else if (mode === "promise" && permission.canUpdate) {
        await command.run(`promise:${record.id}`, { version: data.version, expectedDate: businessDate(expectedDate), reason: required(reason, "Promise revision reason") }, (body) => api.revisePromise(record.id, body));
      } else if (["approve", "close"].includes(mode) && permission.canApprove) {
        await command.run(`${mode}:${record.id}`, { version: data.version, reason: required(reason, mode === "close" ? "Unreceived remainder closure reason" : "Approval review reason") }, (body) => mode === "approve" ? api.approveOrder(record.id, body) : api.closeRemainder(record.id, body));
      }
    } catch (error) { command.fail(error); }
  };
  const canWrite = mode === "return" || mode === "credit" ? returns.canApprove : mode === "promise" ? permission.canUpdate && open : permission.canApprove && open && (mode !== "approve" || Number(record.status) === 1);
  return <PhysicalSection title={t("integrations.purchasePhysical", { defaultValue: "Purchase receipt and supply continuity" })} description={t("Accepted receipts post stock once. Rejected and quarantined goods remain separate. Supplier returns do not reopen the PO. Accepted over-receipt tolerance is zero.")} actions={<Link className="text-sm font-medium text-brand underline" to="/purchase/operations">{t("Follow-ups & supplier performance")}</Link>}>
    <PhysicalFeedback loading={context.loading} error={command.error || context.error} conflict={command.conflict} onReload={() => reviewPhysical(command, context.reload, onSaved)} />
    {data && <><div className="grid gap-3 md:grid-cols-3"><AppSelect label={t("Purchase action")} value={mode} options={[{ value: "receive", label: t("Receive PO lines") }, { value: "approve", label: t("Approve draft into Sent") }, { value: "promise", label: t("Revise expected receipt promise") }, { value: "return", label: t("Return original receipt goods") }, { value: "credit", label: t("Credit billed physical return") }, { value: "close", label: t("Close unreceived remainder") }]} onChange={(value) => { setMode(value); command.clear(); }} />{["receive", "return", "credit"].includes(mode) && <AppInput label={t("Business date")} type="date" max={runtime?.businessDate} value={currentDate} onChange={(event) => setDate(event.target.value)} />}{mode === "promise" && <AppInput label={t("Revised expected receipt date")} type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} />}</div>
      {mode === "receive" && <><div className="grid gap-3 md:grid-cols-2"><AppInput label={t("Supplier receipt / source reference")} value={reference} maxLength={200} onChange={(event) => setReference(event.target.value)} /><AppInput label={t("Attachment reference (optional)")} value={attachment} onChange={(event) => setAttachment(event.target.value)} /></div><PhysicalTable headings={[t("Select"), t("PO material / base unit"), t("Accepted outstanding"), t("Accepted"), t("Rejected"), t("Quarantined"), t("Source cost (optional)")]}>{lines.map((line) => {
        const accepted = quantitySum(received.filter((row) => String(row.purchaseOrderLineId) === String(line.id)).map((row) => row.acceptedQuantity));
        return <tr key={line.id}><td><input type="checkbox" aria-label={`Receive ${lineLabel(line)}`} checked={Boolean(entries[line.id]?.selected)} onChange={(event) => patchLine(line.id, { selected: event.target.checked })} /></td><td>{lineLabel(line)}<p className="text-xs text-slate-500">{line.unitName ?? `Base unit ${line.unitId ?? "unavailable"}`}</p></td><td className="tabular-nums">{quantityDifference(line.quantity, accepted)}</td>{[["accepted", "Accepted"], ["rejected", "Rejected"], ["quarantined", "Quarantined"], ["cost", "Source cost"]].map(([key, label]) => <td key={key}><AppInput className="min-w-28" aria-label={`${label} ${lineLabel(line)}`} inputMode="decimal" value={entries[line.id]?.[key] ?? (key === "cost" ? "" : "0")} onChange={(event) => patchLine(line.id, { [key]: event.target.value })} /></td>)}</tr>;
      })}</PhysicalTable><p className="text-xs text-slate-500">{t("A blank source cost remains unknown. Each receipt owns only its accepted stock movement.")}</p></>}
      {mode === "return" && <><AppSelect label={t("Original receipt line")} value={returnLineId} onChange={setReturnLineId} options={received.map((line) => ({ value: line.id, label: `${line.sourceReference ?? `Receipt ${line.receiptId ?? "unavailable"}`} · ${line.businessDate} · ${lineLabel(lines.find((entry) => String(entry.id) === String(line.purchaseOrderLineId)) ?? line)}` }))} />{selectedReturn && <div className="grid gap-3 md:grid-cols-3">{[["accepted", "Accepted", "acceptedQuantity", "returnedAcceptedQuantity"], ["rejected", "Rejected", "rejectedQuantity", "returnedRejectedQuantity"], ["quarantined", "Quarantined", "quarantinedQuantity", "returnedQuarantinedQuantity"]].map(([key, label, original, returned]) => <AppInput key={key} label={`${label} return (balance ${quantityDifference(selectedReturn[original], selectedReturn[returned])})`} inputMode="decimal" value={returnQuantities[key]} onChange={(event) => setReturnQuantities((current) => ({ ...current, [key]: event.target.value }))} />)}</div>}</>}
      {mode === "credit" && <><p className="text-xs text-slate-500">{t("Each implemented credit uses one posted accepted return against one actual bill line. When goods span multiple bills, record separate return allocations with their original receipt evidence.")}</p><AppSelect label={t("Posted physical supplier return")} value={creditReturnId} onChange={(value) => { setCreditReturnId(value); setBillItemId(""); }} options={(data.returns ?? []).filter((entry) => !entry.purchaseReturnId && quantityCompare(entry.acceptedQuantity, "0") > 0).map((entry) => ({ value: entry.id, label: `${entry.businessDate} · accepted ${entry.acceptedQuantity} · ${entry.reason}` }))} /><AppSelect label={t("Actual receipt-linked confirmed bill line")} value={billItemId} onChange={setBillItemId} options={creditLinks.filter((link) => selectedCredit && quantityCompare(link.creditableQuantity, selectedCredit.acceptedQuantity) >= 0).map((link) => ({ value: link.billItemId, label: `${link.purchaseBillNo ?? `Bill ${link.purchaseBillId}`} · line ${link.billItemId} · available ${link.creditableQuantity}` }))} /><p className="text-xs text-slate-500">{t("Financial credit uses the actual accepted return and billed receipt link. Rejected/quarantined unbilled goods have no fabricated credit.")}</p>{selectedCredit && !creditLinks.some((link) => quantityCompare(link.creditableQuantity, selectedCredit.acceptedQuantity) >= 0) && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t("No one confirmed bill line covers this posted return. It may be unbilled or span several bills. The implemented credit API needs one complete accepted return per actual bill line; preserve this history and reconcile the financial allocation.")}</p>}</>}
      {mode !== "receive" && <AppInput label={t("Review / action reason")} value={reason} maxLength={mode === "credit" ? 500 : 1000} onChange={(event) => setReason(event.target.value)} />}
      {mode === "close" && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t("Closing cancels only the outstanding PO supply. Existing receipts, bill links and stock history remain authoritative.")}</p>}
      <AppButton disabled={!canWrite || context.loading || command.conflict} isLoading={command.saving} onClick={execute}>{t(({ receive: "Post selected receipt", approve: "Approve into Sent", promise: "Save revised promise", return: "Post supplier return", credit: "Create financial credit", close: "Close remaining supply" })[mode])}</AppButton>{!canWrite && <p className="text-xs text-amber-800">{t("This action requires its purchase permission and a valid source document state.")}</p>}
      <details className="space-y-3 rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer font-medium text-slate-800">{t("Receipt, promise and financial history")}</summary><PhysicalTable headings={[t("Receipt / source"), t("Date"), t("Accepted"), t("Rejected"), t("Quarantined"), t("Returned A / R / Q"), t("Billed")]}>{received.map((line) => <tr key={line.id}><td>{line.sourceReference ?? `Receipt ${line.receiptId ?? "unavailable"}`}<p className="text-xs text-slate-500">Line {line.id}</p></td><td>{line.businessDate}</td><td>{line.acceptedQuantity}</td><td>{line.rejectedQuantity}</td><td>{line.quarantinedQuantity}</td><td>{line.returnedAcceptedQuantity} / {line.returnedRejectedQuantity} / {line.returnedQuarantinedQuantity}</td><td>{line.billedQuantity}</td></tr>)}</PhysicalTable>{!received.length && <p className="text-sm text-slate-500">{t("No physical receipts recorded.")}</p>}<ul className="space-y-2 text-sm text-slate-600">{(data.promiseHistory ?? []).map((entry, index) => <li key={entry.id ?? index}>{entry.previousDate ?? "Undated"} → {entry.expectedDate} · {entry.reason}</li>)}{(data.returns ?? []).map((entry) => <li key={entry.id}>{entry.businessDate}: supplier return {entry.id} · {entry.acceptedQuantity} accepted / {entry.rejectedQuantity} rejected / {entry.quarantinedQuantity} quarantined · {entry.reason}{entry.purchaseReturnId && <> · <Link className="text-brand underline" to={`/purchase/returns/${entry.purchaseReturnId}`}>{t("Financial credit")}</Link></>}</li>)}</ul></details>
    </>}
  </PhysicalSection>;
}
