import { useState } from "react";
import AppButton from "../../../components/common/AppButton";
import AppSelect from "../../../components/common/AppSelect";
import useCapabilities from "../../../hooks/useCapabilities";
import useProductionText from "../../../hooks/useProductionText";
import { physicalMessages } from "./physicalMessages";
import { physicalInventoryService as api } from "../../../services/manufacturing/physicalInventoryService";
import { lineLabel, sourceLines } from "./physicalHelpers";
import { PhysicalFeedback, PhysicalSection, PhysicalTable } from "./PhysicalShared";
import { reloadPhysical, reviewPhysical, usePhysicalCommand, usePhysicalContext } from "./physicalHooks";

export default function InvoiceOwnershipPanel({ invoice, onSaved }) {
  const t = useProductionText(physicalMessages);
  const permission = useCapabilities({ actions: ["view", "approve"], pageName: "Sales.Invoice", resource: "Sales.Invoice" });
  const context = usePhysicalContext(api.invoiceOwnership, invoice.id, permission.canView);
  const [owners, setOwners] = useState({});
  const command = usePhysicalCommand(async () => { await reloadPhysical(context.reload, onSaved); setOwners({}); return true; });
  const save = async () => {
    if (!permission.canApprove || !context.data) return;
    try {
      const lines = context.data.lines.map((line) => {
        const owner = Number(owners[line.invoiceLineId] ?? line.owner);
        if (![1, 2].includes(owner)) throw new Error("Declare one inventory owner for every invoice line.");
        return { invoiceLineId: line.invoiceLineId, owner };
      });
      await command.run(`invoice-owner:${invoice.id}`, { version: context.data.version, lines }, (body) => api.saveInvoiceOwnership(invoice.id, body));
    } catch (error) { command.fail(error); }
  };
  return <PhysicalSection title={t("integrations.invoiceOwnership", { defaultValue: "Invoice line inventory ownership" })} description={t("Declare shipment-owned lines on the invoice draft before linking actual shipment lines. Shipment-owned invoices are financial; confirmed dispatch owns their physical stock-out. Standalone lines retain the existing invoice stock policy.")}><PhysicalFeedback loading={context.loading} error={command.error || context.error} conflict={command.conflict} onReload={async () => { if (await reviewPhysical(command, context.reload, onSaved)) setOwners({}); }} /><PhysicalTable headings={[t("Invoice material"), t("Quantity / unit"), t("Physical stock owner")]}>{(context.data?.lines ?? []).map((line) => <tr key={line.invoiceLineId}><td>{lineLabel(sourceLines(invoice).find((entry) => String(entry.id) === String(line.invoiceLineId)) ?? line)}</td><td>{line.quantity} · {line.unitName ?? `Unit ${line.unitId ?? "unavailable"}`}</td><td><AppSelect aria-label={`Physical owner invoice line ${line.invoiceLineId}`} disabled={Number(invoice.status) !== 1 || !permission.canApprove || command.saving} value={owners[line.invoiceLineId] ?? line.owner ?? ""} options={[{ value: 1, label: t("Standalone invoice (1)") }, { value: 2, label: t("Shipment dispatch (2)") }]} onChange={(owner) => setOwners((current) => ({ ...current, [line.invoiceLineId]: owner }))} /></td></tr>)}</PhysicalTable>{!context.loading && !context.data?.lines?.length && <p className="text-sm text-slate-500">{t("No invoice lines available for ownership declaration.")}</p>}{Number(invoice.status) === 1 && <AppButton disabled={!permission.canApprove || !context.data?.lines?.length || command.conflict || context.loading} isLoading={command.saving} onClick={save}>{t("Save physical ownership")}</AppButton>}<p className="text-xs leading-5 text-slate-500">{t("Invoice confirmation can occur before or after dispatch when the required declaration and line links are present. Existing stock-posted invoice history requires reconciliation; changing a label cannot reverse it.")}</p></PhysicalSection>;
}
