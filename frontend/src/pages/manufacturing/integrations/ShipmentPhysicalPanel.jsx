import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import useCapabilities from "../../../hooks/useCapabilities";
import useProductionText from "../../../hooks/useProductionText";
import { physicalMessages } from "./physicalMessages";
import { physicalInventoryService as api } from "../../../services/manufacturing/physicalInventoryService";
import { buildShipmentLinks, lineLabel, quantityCompare, required, sourceLines } from "./physicalHelpers";
import { PhysicalLookup } from "./PhysicalLookup";
import { PhysicalFeedback, PhysicalSection, PhysicalTable } from "./PhysicalShared";
import { reloadPhysical, reviewPhysical, usePhysicalCommand, usePhysicalContext } from "./physicalHooks";

function PackingVerificationLine({ line, shipment, selected, onChange, allowed }) {
  const t = useProductionText(physicalMessages);
  const inventory = useCapabilities({ actions: ["view"], pageName: "Items", resource: "items", route: "/items" });
  const item = usePhysicalContext(api.itemDetail, line.itemId, allowed && inventory.canView);
  const loader = useCallback((params, options) => api.packagingProfiles({ ...params, ItemId: line.itemId, IsActive: true }, options), [line.itemId]);
  useEffect(() => {
    if (item.data?.unitId) onChange(line.id, { unitId: item.data.unitId });
  }, [item.data?.unitId, line.id, onChange]);
  const effective = (profile) => (!profile.channelId || String(profile.channelId) === String(shipment.channelId)) && (!profile.effectiveFrom || profile.effectiveFrom <= shipment.shipmentDate) && (!profile.effectiveTo || profile.effectiveTo >= shipment.shipmentDate) && quantityCompare(profile.unitsPerBox, "0") > 0;
  return <div className="grid items-start gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_2fr]"><div><p className="font-medium text-slate-800">{lineLabel(line)}</p><p className="mt-1 text-xs text-slate-500">Current Item base unit: {item.data?.unitName ?? item.data?.unitId ?? "Unavailable"} · existing units/box {line.unitsPerBoxSnapshot ?? "Unverified"}</p><PhysicalFeedback loading={item.loading} error={item.error} /></div><PhysicalLookup label={t("Verified packaging profile")} loader={loader} value={selected?.packagingProfileId ?? ""} allowed={allowed && inventory.canView} filter={effective} getLabel={(profile) => `${profile.packagingName ?? profile.packagingCode} · ${profile.unitsPerBox} base units / box`} onChange={(packagingProfileId) => onChange(line.id, { packagingProfileId })} /></div>;
}

export default function ShipmentPhysicalPanel({ shipment, onSaved, packingOnly = false }) {
  const t = useProductionText(physicalMessages);
  const shipmentPermission = useCapabilities({ actions: ["view", "approve"], pageName: "ShipmentOperations.Shipments", resource: "ShipmentOperations.Shipments" });
  const invoicePermission = useCapabilities({ actions: ["view", "approve"], pageName: "Sales.Invoice", resource: "Sales.Invoice" });
  const profilesPermission = useCapabilities({ actions: ["view"], pageName: "SupplyChain.PackagingProfiles", resource: "SupplyChain.PackagingProfiles" });
  const precise = usePhysicalContext(api.shipmentDetail, shipment.id, shipmentPermission.canView);
  const context = usePhysicalContext(api.shipmentLinks, shipment.id, shipmentPermission.canView && invoicePermission.canView);
  const packingContext = usePhysicalContext(api.packingContext, shipment.id, shipmentPermission.canView);
  const [invoiceId, setInvoiceId] = useState("");
  const invoice = usePhysicalContext(api.invoiceOwnership, invoiceId, invoicePermission.canView);
  const invoiceDetail = usePhysicalContext(api.invoiceDetail, invoiceId, invoicePermission.canView);
  const [linkRows, setLinkRows] = useState([{ shipmentItemId: "", invoiceLineId: "", quantity: "" }]);
  const [packing, setPacking] = useState({});
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState(packingOnly ? "packing" : "links");
  const command = usePhysicalCommand(async () => { await reloadPhysical(context.reload, packingContext.reload, precise.reload, invoice.reload, invoiceDetail.reload, onSaved); setLinkRows([{ shipmentItemId: "", invoiceLineId: "", quantity: "" }]); return true; });
  const record = precise.data ?? shipment;
  const canLink = shipmentPermission.canApprove && invoicePermission.canApprove;
  const patchPacking = useCallback((id, values) => setPacking((current) => ({ ...current, [id]: { ...current[id], ...values } })), []);
  const patchLink = (index, values) => setLinkRows((current) => current.map((row, position) => index === position ? { ...row, ...values } : row));
  const save = async () => {
    try {
      if (mode === "packing" && shipmentPermission.canApprove) {
        if (precise.loading || precise.error || !precise.data || packingContext.loading || packingContext.error) throw new Error("Reload the actual shipment and packing context before verification.");
        const lines = Object.entries(packing).filter(([, row]) => row.packagingProfileId).map(([shipmentItemId, row]) => {
          if (!row.unitId) throw new Error("Load each Item's canonical base unit before verifying its packaging.");
          return { shipmentItemId, unitId: row.unitId, packagingProfileId: row.packagingProfileId };
        });
        if (!lines.length) throw new Error("Select at least one effective existing packaging profile.");
        // The shipment-only packing context carries its rowversion; invoice View permission is not needed.
        const version = packingContext.data?.version;
        if (!version) throw new Error("Reload the shipment to obtain its current version.");
        await command.run(`packing:${shipment.id}`, { version, reason: required(reason, "Packing verification reason"), lines }, (body) => api.verifyPacking(shipment.id, body));
      } else if (mode === "links" && canLink && context.data?.version) {
        if (precise.loading || precise.error || !precise.data || packingContext.loading || packingContext.error || !packingContext.data || invoice.loading || invoice.error || !invoice.data || invoiceDetail.loading || invoiceDetail.error || !invoiceDetail.data) throw new Error("Reload the actual shipment, verified packing and selected invoice before saving allocations.");
        const physicalLines = sourceLines(record).map((line) => ({ ...line, unitId: packingContext.data?.lines?.find((entry) => String(entry.shipmentItemId) === String(line.id))?.unitId }));
        const lines = buildShipmentLinks(physicalLines, invoice.data?.lines ?? [], context.data.lines ?? [], linkRows);
        await command.run(`shipment-links:${shipment.id}`, { version: context.data.version, lines }, (body) => api.saveShipmentLinks(shipment.id, body));
      }
    } catch (error) { command.fail(error); }
  };
  const detailReady = !precise.loading && !precise.error && Boolean(precise.data);
  const packingReady = !packingContext.loading && !packingContext.error && Boolean(packingContext.data);
  const invoiceReady = !invoice.loading && !invoice.error && Boolean(invoice.data) && !invoiceDetail.loading && !invoiceDetail.error && Boolean(invoiceDetail.data);
  const undispatched = !record.dispatchedAtUtc && !["Cancelled", "Closed", 15, 16].includes(record.status);
  return <PhysicalSection title={t("integrations.shipmentOwnership", { defaultValue: "Shipment ownership and verified packing" })} description={t("Actual shipment dispatch owns linked physical stock. Use explicit invoice-line allocations for partial shipments. Existing docket, packing, freight, receipt and return flows remain in their tabs.")}><PhysicalFeedback loading={precise.loading || (mode === "links" && context.loading)} error={command.error || precise.error || (mode === "links" && (context.error || packingContext.error || invoice.error || invoiceDetail.error))} conflict={command.conflict} onReload={() => reviewPhysical(command, context.reload, packingContext.reload, precise.reload, invoice.reload, invoiceDetail.reload, onSaved)} />
    {!packingOnly && <AppSelect label={t("Integration action")} value={mode} onChange={(value) => { setMode(value); command.clear(); }} options={[{ value: "links", label: t("Link existing invoice lines") }, { value: "packing", label: t("Verify base units and packaging") }]} />}
    {mode === "links" && <><PhysicalLookup label={t("Existing sales invoice")} loader={api.listInvoices} value={invoiceId} onChange={(value) => { setInvoiceId(value); setLinkRows([{ shipmentItemId: "", invoiceLineId: "", quantity: "" }]); }} allowed={invoicePermission.canView} getLabel={(row) => `${row.invoiceNumber} · ${row.customerName}`} />{invoiceId && <Link className="text-sm text-brand underline" to={`/sales/invoices/${invoiceId}`}>{t("Open selected invoice / declare line ownership")}</Link>}<div className="space-y-3">{linkRows.map((row, index) => <div key={index} className="grid items-end gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_1fr_140px_auto]"><AppSelect label={t("Shipment line")} value={row.shipmentItemId} options={sourceLines(record).map((line) => ({ value: line.id, label: `${lineLabel(line)} · ${line.plannedQuantity}` }))} onChange={(shipmentItemId) => patchLink(index, { shipmentItemId, invoiceLineId: "" })} /><AppSelect label={t("Shipment-owned invoice line")} value={row.invoiceLineId} options={(invoice.data?.lines ?? []).filter((line) => Number(line.owner) === 2 && (!row.shipmentItemId || String(line.itemId) === String(sourceLines(record).find((entry) => String(entry.id) === String(row.shipmentItemId))?.itemId))).map((line) => ({ value: line.invoiceLineId, label: `${lineLabel(sourceLines(invoiceDetail.data).find((entry) => String(entry.id) === String(line.invoiceLineId)) ?? line)} · ${line.quantity}` }))} onChange={(invoiceLineId) => patchLink(index, { invoiceLineId })} /><AppInput label={t("Linked quantity")} inputMode="decimal" value={row.quantity} onChange={(event) => patchLink(index, { quantity: event.target.value })} /><AppButton variant="ghost" disabled={linkRows.length < 2 || command.saving} onClick={() => setLinkRows((current) => current.filter((_, position) => position !== index))}>{t("Remove")}</AppButton></div>)}</div><AppButton variant="secondary" disabled={command.saving} onClick={() => setLinkRows((current) => [...current, { shipmentItemId: "", invoiceLineId: "", quantity: "" }])}>{t("Add line allocation")}</AppButton><PhysicalTable headings={[t("Shipment line"), t("Invoice source"), t("Linked quantity"), t("Owner")]}>{(context.data?.lines ?? []).map((line) => <tr key={`${line.shipmentItemId}:${line.invoiceLineId}`}><td>{lineLabel(sourceLines(record).find((entry) => String(entry.id) === String(line.shipmentItemId)) ?? line)}</td><td>{line.invoiceId ? <Link to={`/sales/invoices/${line.invoiceId}`} className="text-brand underline">{line.invoiceNumber ?? `Invoice ${line.invoiceId}`}</Link> : `Invoice line ${line.invoiceLineId}`}</td><td>{line.quantity}</td><td>{t("Shipment dispatch (2)")}</td></tr>)}</PhysicalTable></>}
    {mode === "packing" && <><PhysicalFeedback loading={packingContext.loading} error={packingContext.error} onReload={packingContext.reload} /><p className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">{t("For legacy draft verification, remove the affected draft package allocations in the Packing tab first, verify the real base unit and effective packaging, then repack. An unverified fallback of one unit per box is never accepted as evidence.")}</p><Link to={`/shipments/work-list/${shipment.id}?tab=packing`} className="text-sm text-brand underline">{t("Open normal packing workflow")}</Link>{sourceLines(record).map((line) => <PackingVerificationLine key={line.id} line={line} shipment={record} selected={packing[line.id]} onChange={patchPacking} allowed={profilesPermission.canView && shipmentPermission.canApprove && undispatched} />)}<AppInput label={t("Verification reason / source")} value={reason} maxLength={1000} onChange={(event) => setReason(event.target.value)} /></>}
    <AppButton disabled={command.conflict || !detailReady || !packingReady || (mode === "links" ? !canLink || !context.data || context.loading || !invoiceId || !invoiceReady : !shipmentPermission.canApprove || !undispatched)} isLoading={command.saving} onClick={save}>{t(mode === "links" ? "Save invoice allocations" : "Verify selected packing")}</AppButton>{mode === "links" && !canLink && <p className="text-xs text-amber-800">{t("Both Shipment and Sales Invoice approval permissions are required.")}</p>}
  </PhysicalSection>;
}
