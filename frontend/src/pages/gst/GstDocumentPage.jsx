import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppModal from "../../components/common/AppModal";
import { gstService } from "../../services/gst/gstService";
import { canManageGstDocument, GENERATION_DEPENDENCY, safeQrImage } from "../../utils/gstCompliance";
import { GstDetails, GstError, GstFrame, GstNotice } from "./GstShared";
import { useGstAccess, useGstOperation } from "./useGst";
import EWayExtensionModal from "./EWayExtensionModal";

function DocumentActionForm({ kind, action, record, onClose, onComplete, onUncertain }) {
  const operation = useGstOperation();
  const [failed, setFailed] = useState(false);
  const vehicle = action === "vehicle";
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { vehicleNumber: record.vehicleNumber ?? "", transportMode: record.transportMode ?? "" } });
  const submit = values => operation.run(async () => {
    const body = { ...values, companyGstRegistrationId: record.companyGstRegistrationId, ...(kind === "invoice" ? { irn: record.irn } : { eWayBillNumber: record.eWayBillNumber }) };
    try {
      const response = vehicle ? await gstService.updateVehicle(body) : kind === "invoice" ? await gstService.cancelInvoice(body) : await gstService.cancelWayBill(body);
      toast.success(vehicle ? "Vehicle update accepted by provider." : "Government-document cancellation accepted.");
      onComplete(response.data);
    } catch (error) {
      // Even an error can follow provider success and a persistence/network failure.
      setFailed(true);
      onUncertain();
      throw error;
    }
  });
  const fields = vehicle ? [["vehicleNumber", "Vehicle number", 50], ["transportMode", "Transport mode code", 50], ["fromPlace", "Current place"], ["fromState", "Current state code"], ["reasonCode", "Provider reason code", 50], ["reasonRemark", "Reason / remarks", 500]] : [["cancelReasonCode", "Provider cancellation reason code", 50], ["cancelRemark", "Cancellation remarks", 500]];
  return <AppModal isOpen title={vehicle ? "Update E-Way Bill vehicle" : `Cancel ${kind === "invoice" ? "E-Invoice" : "E-Way Bill"}`} onClose={onClose} isBusy={operation.busy} maxWidth="max-w-2xl">
    <form className="space-y-5" onSubmit={handleSubmit(submit)}>
      <GstNotice>{vehicle ? "This submits Part B to the provider. The backend does not persist vehicle updates; refresh provider status afterwards." : "This cancels the government document only. The accounting invoice remains unchanged. The provider enforces cancellation eligibility and reason codes."}</GstNotice>
      <p className="break-all font-mono text-xs text-slate-600">{kind === "invoice" ? record.irn : record.eWayBillNumber}</p>
      <div className="grid gap-4 sm:grid-cols-2">{fields.map(([name, label, maxLength]) => <AppInput key={name} label={label} maxLength={maxLength} disabled={failed || operation.busy} required error={errors[name]?.message} {...register(name, { validate: value => Boolean(value?.trim()) || `${label} is required.`, ...(maxLength ? { maxLength: { value: maxLength, message: `Use at most ${maxLength} characters.` } } : {}) })} />)}</div>
      <GstError error={operation.error} />
      {failed && <GstNotice>The outcome needs reconciliation. Close this dialog and refresh provider status before attempting another change.</GstNotice>}
      <div className="flex flex-wrap justify-end gap-2"><AppButton variant="secondary" disabled={operation.busy} onClick={onClose}>{failed ? "Close and reconcile" : "Back"}</AppButton><AppButton type="submit" variant={vehicle ? "primary" : "danger"} disabled={failed} isLoading={operation.busy}>{vehicle ? "Confirm vehicle update" : "Confirm cancellation"}</AppButton></div>
    </form>
  </AppModal>;
}

export default function GstDocumentPage({ kind }) {
  const invoice = kind === "invoice";
  const title = invoice ? "E-Invoice" : "E-Way Bill";
  const pageName = invoice ? "GST.EInvoice" : "GST.EWayBill";
  const access = useGstAccess();
  const [search,setSearch] = useSearchParams();
  const extensionCommand=search.get("extensionCommand");
  const updateExtensionCommand=key=>setSearch(current=>{const next=new URLSearchParams(current);if(key)next.set("extensionCommand",key);else next.delete("extensionCommand");return next;},{replace:true});
  const contextId = search.get("salesInvoiceId") || search.get("purchaseInvoiceId");
  const contextKey = search.has("purchaseInvoiceId") ? "purchaseInvoiceId" : "salesInvoiceId";
  const [identifier, setIdentifier] = useState("");
  const [stored, setStored] = useState(null);
  const [provider, setProvider] = useState(null);
  const [uncertain, setUncertain] = useState(false);
  const [reconciled, setReconciled] = useState(false);
  const [validation, setValidation] = useState("");
  const [dialog, setDialog] = useState(null);
  const operation = useGstOperation();
  const lookup = event => {
    event.preventDefault();
    const value = identifier.trim();
    if (invoice ? value.length !== 64 : !value || value.length > 100) {
      setValidation(invoice ? "Enter the 64-character IRN." : "Enter an E-Way Bill number (up to 100 characters).");
      return;
    }
    operation.run(async () => {
      setStored(null); setProvider(null); setReconciled(false); setValidation("");
      const response = invoice ? await gstService.invoice(value) : await gstService.wayBill(value);
      setStored(response.data);
    });
  };
  const refresh = () => operation.run(async () => {
    setReconciled(false);
    const body = { companyGstRegistrationId: stored.companyGstRegistrationId, ...(invoice ? { irn: stored.irn } : { eWayBillNumber: stored.eWayBillNumber }) };
    const response = invoice ? await gstService.refreshInvoice(body) : await gstService.refreshWayBill(body);
    setProvider(response.data);
    setUncertain(false);
    setReconciled(true);
  });
  const linked = !contextId || String(stored?.[contextKey] ?? "") === contextId;
  const active = canManageGstDocument({ stored, provider, identifier, kind, contextId, contextKey, reconciled, uncertain });
  const record = provider ?? stored;
  const qr = invoice ? record?.signedQrCode || stored?.signedQrCode : null;
  const qrImage = safeQrImage(qr);
  return <GstFrame title={`${title} lookup`} description={`Look up a stored ${title}, refresh provider details and manage supported actions.`}>
    <GstNotice>{GENERATION_DEPENDENCY} A searchable register also requires a backend list API.</GstNotice>
    {contextId && <p className="text-sm text-slate-600">Opened from {contextKey === "salesInvoiceId" ? "Sales Invoice" : "Purchase Bill"} #{contextId}. Enter the government-document identifier to verify its saved association.</p>}
    <form onSubmit={lookup} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end">
      <div className="flex-1"><AppInput label={invoice ? "Invoice reference number (IRN)" : "E-Way Bill number"} value={identifier} required maxLength={invoice ? 64 : 100} disabled={operation.busy || uncertain} error={validation} onChange={event => { setIdentifier(event.target.value); setStored(null); setProvider(null); setReconciled(false); }} /></div>
      <AppButton type="submit" isLoading={operation.busy} disabled={uncertain}>Look up stored record</AppButton>
    </form>
    <GstError error={operation.error} />
    {!stored && !operation.busy && !operation.error && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Enter an existing identifier to view details. No document is generated by this lookup.</p>}
    {stored && <article className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><h2 className="font-semibold text-slate-900">{title} details</h2><AppButton variant="secondary" isLoading={operation.busy} onClick={refresh}>Refresh provider status</AppButton></div>
      <GstDetails entries={[["Stored document status", stored.status], ["Latest provider status", provider?.status], ["Registration ID", stored.companyGstRegistrationId], ["Document number", stored.documentNumber], ["Document date", stored.documentDate], ["Stored generated at", stored.createdAt], ["Stored cancellation date", stored.cancelledAt], ["Latest provider cancellation date", provider?.cancelledAt], ["Cancellation reason", stored.cancelReason]]} />
      {!linked && <GstNotice>The stored record does not confirm a link to this accounting document. Changes are disabled. Verify the identifier and backend association.</GstNotice>}
      {invoice ? <GstDetails entries={[["IRN", stored.irn], ["Acknowledgement number", provider?.ackNumber ?? stored.ackNumber], ["Acknowledgement date", provider?.ackDate ?? stored.ackDate], ["Seller GSTIN", stored.sellerGstin], ["Buyer GSTIN", stored.buyerGstin]]} /> : <GstDetails entries={[["E-Way Bill number", stored.eWayBillNumber], ["Provider valid until", provider?.validUpTo], ["Stored valid until", stored.validUpTo], ["Transporter", record.transporterName ?? stored.transporterName], ["Transporter ID", record.transporterId ?? stored.transporterId], ["Vehicle", record.vehicleNumber ?? stored.vehicleNumber], ["Transport mode", record.transportMode ?? stored.transportMode], ["Distance", record.distance ?? stored.distance]]} />}
      {qr && <div className="space-y-2"><h3 className="text-sm font-semibold text-slate-900">Signed QR code supplied by API</h3>{qrImage ? <img src={qrImage} alt="Signed GST invoice QR code" className="h-48 w-48 object-contain" /> : <><p className="text-xs text-slate-500">The API supplied signed text. An image was not supplied.</p><details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm text-brand">View signed QR text</summary><p className="mt-3 max-h-40 overflow-auto break-all font-mono text-xs text-slate-600">{qr}</p></details></>}</div>}
      {uncertain && <GstNotice>The last change has an uncertain outcome. Refresh provider status before any further change. Do not regenerate this document.</GstNotice>}
      <div className="flex flex-wrap gap-2">
        {access(pageName, "create") && <AppButton disabled title={GENERATION_DEPENDENCY}>Generate {title}</AppButton>}
        {access(pageName, "delete") && <AppButton variant="danger" disabled={!active || operation.busy} onClick={() => setDialog("cancel")}>Cancel {title}</AppButton>}
        {!invoice && access(pageName, "update") && <AppButton variant="secondary" disabled={!active || operation.busy} onClick={() => setDialog("vehicle")}>Update vehicle</AppButton>}
        {!invoice && access(pageName, "update") && <AppButton variant="secondary" disabled={operation.busy || (!extensionCommand && (!active || !stored.concurrencyVersion))} title={!stored.concurrencyVersion ? "Ask an administrator to enable safe extension tracking for this installation." : undefined} onClick={()=>setDialog("extend")}>{extensionCommand?"Reconcile extension":"Extend validity"}</AppButton>}
      </div>
      {!active && <p className="text-sm text-slate-500">Changes require a matching stored record and a fresh provider response with an explicitly active status. Unknown or cancelled states cannot be changed here.</p>}
      <p className="text-xs leading-5 text-slate-500">Provider refresh results are displayed separately and are not saved by the current backend. Accounting invoice status, E-Invoice status and E-Way Bill status are independent. Provider rules determine whether cancellation or updates are accepted.</p>
    </article>}
    {dialog==="extend" && <EWayExtensionModal record={{...stored,validUpTo:provider?.validUpTo??stored.validUpTo,vehicleNumber:provider?.vehicleNumber??stored.vehicleNumber,transportMode:provider?.transportMode??stored.transportMode}} commandKey={extensionCommand} onAttempt={updateExtensionCommand} onRejected={()=>{updateExtensionCommand(null);setUncertain(false);}} onClose={()=>setDialog(null)} onComplete={data=>{setStored(data);setProvider(null);setUncertain(false);setReconciled(false);updateExtensionCommand(null);setDialog(null);}}/>}
    {dialog && dialog!=="extend" && <DocumentActionForm kind={kind} action={dialog} record={{ ...stored, vehicleNumber: provider?.vehicleNumber ?? stored.vehicleNumber, vehicleType: provider?.vehicleType ?? stored.vehicleType, transportMode: provider?.transportMode ?? stored.transportMode }} onClose={() => setDialog(null)} onUncertain={() => { setUncertain(true); setReconciled(false); }} onComplete={data => {
      if (dialog === "cancel") { setStored(data); setProvider(null); }
      else { setProvider(data); }
      setReconciled(false);
      setDialog(null);
    }} />}
  </GstFrame>;
}

