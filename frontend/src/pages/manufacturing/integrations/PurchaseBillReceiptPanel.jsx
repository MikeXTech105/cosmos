import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import useCapabilities from "../../../hooks/useCapabilities";
import useProductionText from "../../../hooks/useProductionText";
import { physicalMessages } from "./physicalMessages";
import { physicalInventoryService as api } from "../../../services/manufacturing/physicalInventoryService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { buildBillReceiptLinks, lineLabel, quantityCompare, quantityDifference, sourceLines } from "./physicalHelpers";
import { PhysicalLookup } from "./PhysicalLookup";
import { PhysicalFeedback, PhysicalSection, PhysicalTable } from "./PhysicalShared";
import { reloadPhysical, reviewPhysical, usePhysicalCommand, usePhysicalContext } from "./physicalHooks";

export default function PurchaseBillReceiptPanel({ record, onSaved }) {
  const t = useProductionText(physicalMessages);
  const bill = useCapabilities({ actions: ["view", "approve"], pageName: "PurchaseExpense.PurchaseBill", resource: "PurchaseExpense.PurchaseBill" });
  const order = useCapabilities({ actions: ["view"], pageName: "PurchaseExpense.PurchaseOrder", resource: "PurchaseExpense.PurchaseOrder" });
  const context = usePhysicalContext(api.billContext, record.id, bill.canView);
  const preciseBill = usePhysicalContext(api.billDetail, record.id, bill.canView);
  const [orderId, setOrderId] = useState("");
  const receipts = usePhysicalContext(api.orderContext, orderId, order.canView);
  const [receiptSources, setReceiptSources] = useState({});
  const [sourceError, setSourceError] = useState("");
  const [rows, setRows] = useState([{ receiptLineId: "", billItemId: "", quantity: "" }]);
  const reloadReceiptSources = async () => {
    try {
      const ids = [...new Set([...Object.keys(receiptSources), orderId].filter(Boolean))];
      const response = await Promise.all(ids.map((id) => api.orderContext(id)));
      setReceiptSources(Object.fromEntries(response.map((entry) => [entry.data.id, entry.data])));
      setSourceError("");
      return true;
    } catch (error) { setSourceError(getApiErrorMessage(error, "Unable to refresh selected receipt sources.")); return false; }
  };
  const command = usePhysicalCommand(async () => { await reloadPhysical(context.reload, receipts.reload, preciseBill.reload, reloadReceiptSources, onSaved); setRows([{ receiptLineId: "", billItemId: "", quantity: "" }]); return true; });
  const loader = useCallback((params, options) => api.listOrders({ ...params, SupplierId: record.supplierId }, options), [record.supplierId]);
  const billLines = sourceLines(preciseBill.data);
  const receiptChoices = [...new Map([...Object.values(receiptSources).flatMap((source) => source.lines ?? []), ...(receipts.data?.lines ?? [])].map((line) => [String(line.id), line])).values()];
  const patch = (index, values) => setRows((current) => current.map((row, position) => position === index ? { ...row, ...values } : row));
  const save = async () => {
    if (!bill.canApprove || !context.data?.version) return;
    try {
      const lines = buildBillReceiptLinks(billLines, receiptChoices, context.data.billLinks ?? [], rows);
      await command.run(`bill-links:${record.id}`, { version: context.data.version, lines }, (body) => api.linkBill(record.id, body));
    } catch (error) { command.fail(error); }
  };
  return <PhysicalSection title={t("integrations.receiptBill", { defaultValue: "Link this bill to physical receipts" })} description={t("Link accepted receipt quantities while this bill is a draft, then use existing bill confirmation. Receipt-owned bill lines are financial and do not receive the same stock again.")}><PhysicalFeedback loading={context.loading || preciseBill.loading} error={command.error || context.error || preciseBill.error || receipts.error || sourceError} conflict={command.conflict} onReload={() => reviewPhysical(command, context.reload, receipts.reload, preciseBill.reload, reloadReceiptSources, onSaved)} />
    {Number(record.status) === 1 && <><PhysicalLookup label={t("Supplier purchase order")} loader={loader} allowed={order.canView} value={orderId} onChange={(value) => { if (receipts.data) setReceiptSources((current) => ({ ...current, [receipts.data.id]: receipts.data })); setOrderId(value); }} getLabel={(row) => `${row.purchaseOrderNo} · ${row.supplierName}`} /><PhysicalFeedback loading={receipts.loading && Boolean(orderId)} /><p className="text-xs text-slate-500">{t("Choose another supplier PO to add its receipts; allocations from previously selected POs stay available.")}</p><div className="space-y-3">{rows.map((row, index) => {
      const source = billLines.find((line) => String(line.id) === String(row.billItemId));
      return <div key={index} className="grid items-end gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_1fr_160px_auto]"><AppSelect label={t("Existing bill line")} value={row.billItemId} onChange={(billItemId) => patch(index, { billItemId, receiptLineId: "" })} options={billLines.map((line) => ({ value: line.id, label: `${lineLabel(line)} · ${line.quantity}` }))} /><AppSelect label={t("Original accepted receipt line")} value={row.receiptLineId} onChange={(receiptLineId) => patch(index, { receiptLineId })} options={receiptChoices.filter((line) => (!source || String(line.itemId) === String(source.itemId)) && quantityCompare(line.acceptedQuantity, line.billedQuantity) > 0).map((line) => ({ value: line.id, label: `${line.sourceReference ?? `Receipt ${line.receiptId}`} · ${line.businessDate} · available ${quantityDifference(line.acceptedQuantity, line.billedQuantity)}` }))} /><AppInput label={t("Linked quantity")} inputMode="decimal" value={row.quantity} onChange={(event) => patch(index, { quantity: event.target.value })} /><AppButton variant="ghost" disabled={rows.length === 1 || command.saving} onClick={() => setRows((current) => current.filter((_, position) => position !== index))}>{t("Remove")}</AppButton></div>;
    })}</div><div className="flex flex-wrap gap-3"><AppButton variant="secondary" disabled={command.saving} onClick={() => setRows((current) => [...current, { receiptLineId: "", billItemId: "", quantity: "" }])}>{t("Add receipt allocation")}</AppButton><AppButton disabled={!bill.canApprove || !orderId || command.conflict || context.loading || receipts.loading || preciseBill.loading || !preciseBill.data || Boolean(context.error || receipts.error || preciseBill.error || sourceError)} isLoading={command.saving} onClick={save}>{t("Link accepted receipts")}</AppButton></div></>}
    <PhysicalTable headings={[t("Receipt source"), t("Date"), t("Accepted / billed"), t("Purchase order line")]}>{(context.data?.lines ?? []).map((line) => <tr key={line.id}><td>{line.sourceReference ?? `Receipt ${line.receiptId}`}</td><td>{line.businessDate}</td><td>{line.acceptedQuantity} / {line.billedQuantity}</td><td>{line.purchaseOrderLineId}</td></tr>)}</PhysicalTable>{!context.data?.lines?.length && <p className="text-sm text-slate-500">{t("No physical receipt links yet. Direct bill lines retain their existing inventory policy.")}</p>}{(context.data?.billLinks ?? []).map((link) => <p key={link.id} className="text-xs text-slate-500">Receipt line {link.receiptLineId} → bill line {link.billItemId}, quantity {link.quantity} · <Link to={`/purchase/bills/${link.purchaseBillId}`} className="text-brand underline">{t("Bill")}</Link></p>)}
  </PhysicalSection>;
}
