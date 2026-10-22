import { Link } from "react-router-dom";
import AppButton from "../../components/common/AppButton";
import { GENERATION_DEPENDENCY } from "../../utils/gstCompliance";
import { useGstAccess } from "./useGst";

export default function GstDocumentLinks({ id, purchase = false }) {
  const access = useGstAccess();
  const invoice = !purchase && access("GST.EInvoice");
  const wayBill = access("GST.EWayBill");
  if (!invoice && !wayBill) return null;
  const validId = Number.isSafeInteger(Number(id)) && Number(id) > 0;
  const context = `${purchase ? "purchaseInvoiceId" : "salesInvoiceId"}=${encodeURIComponent(id)}`;
  return <section className="no-print space-y-4 rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="font-semibold text-slate-900">GST compliance</h2>
    <p className="text-sm leading-6 text-slate-500">Government-document status is separate from this {purchase ? "bill" : "invoice"}. Linked identifiers are unavailable here; look up {purchase ? "an existing E-Way Bill number" : "an existing IRN or E-Way Bill number"} to verify its association.</p>
    <div className="grid gap-4 sm:grid-cols-2">{[[invoice, "GST.EInvoice", "E-Invoice", "/gst/e-invoices"], [wayBill, "GST.EWayBill", "E-Way Bill", "/gst/eway-bills"]].filter(([visible]) => visible).map(([, permission, title, route]) => <div key={permission} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3><p className="text-xs text-slate-500">Linked status unavailable</p>
      <div className="flex flex-wrap items-center gap-2">{validId ? <Link className="rounded-lg border border-brand/20 px-3 py-2 text-sm font-medium text-brand hover:bg-brand-light focus-visible:outline-2 focus-visible:outline-brand" to={`${route}?${context}`}>View {title} by identifier</Link> : <AppButton variant="secondary" disabled title="A valid accounting-document ID is required.">View {title} by identifier</AppButton>}
        {access(permission, "create") && <AppButton variant="secondary" disabled title={GENERATION_DEPENDENCY}>Generate {title}</AppButton>}</div>
    </div>)}</div>
    {!validId && <p role="alert" className="text-sm text-red-700">This record has no valid accounting-document ID. Contact your administrator before linking GST documents.</p>}
    <p className="text-xs leading-5 text-amber-800">{GENERATION_DEPENDENCY}</p>
  </section>;
}

