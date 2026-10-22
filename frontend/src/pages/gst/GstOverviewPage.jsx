import { useCallback } from "react";
import { Link } from "react-router-dom";
import AppButton from "../../components/common/AppButton";
import { gstService } from "../../services/gst/gstService";
import { GENERATION_DEPENDENCY } from "../../utils/gstCompliance";
import useCapabilities from "../../hooks/useCapabilities";
import { GstDetails, GstError, GstFrame, GstNotice } from "./GstShared";
import { useGstQuery } from "./useGst";

export default function GstOverviewPage() {
  const load = useCallback(options => gstService.configuration(options), []);
  const query = useGstQuery(load);
  const items = useCapabilities({ route: "/items", pageName: "Items", actions: ["view"] });
  return <GstFrame title="GST overview" description="Company registrations, provider configuration and compliance workflows." actions={<AppButton variant="secondary" disabled={query.loading} onClick={query.retry}>Refresh configuration</AppButton>}>
    <GstError error={query.error} retry={query.retry} />
    {query.loading && <div role="status" className="h-32 animate-pulse rounded-xl bg-slate-100 p-5">Loading GST configuration…</div>}
    {query.data && <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">Provider configuration</h2>
      <GstDetails entries={[["Environment", query.data.environment], ["Configured features", query.data.enabledFeatures?.join(", ")], ["Missing setting names", query.data.missingSettings?.join(", ") || "None reported"], ["Configured setting names", query.data.configuredSettings?.join(", ")]]} />
      <p className="text-sm text-slate-500">These are server configuration indicators. They do not confirm provider availability, registration eligibility or permission to issue a document. Credentials are managed on the server.</p>
    </div>}
    <GstNotice>{GENERATION_DEPENDENCY} Existing invoice totals and historical HSN snapshots remain authoritative.</GstNotice>
    <div className="grid gap-4 md:grid-cols-2">{[
      ["HSN / SAC master", "Central HSN/SAC management is unavailable on this server version. Continue using the existing HSN fields in Item Master."],
      ["GST rate history", "Effective-date GST rate history needs server support. Existing item GST rate fields remain available."],
      ["Category HSN mapping", "Category defaults and their effective dates are unavailable on this server version. Continue managing classification through Item Master."],
      ["Item HSN override", "Effective-date overrides are pending the backend mapping module. Existing Item Master HSN code and GST rate fields remain available."],
    ].map(([title, description]) => <article key={title} className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p><p className="mt-3 text-xs font-medium text-amber-800">Backend dependency</p></article>)}</div>
    {items.canView && <Link to="/items" className="inline-block rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-brand">Open Item Master</Link>}
    <p className="text-sm text-slate-500">E-Invoice and E-Way Bill registers need list APIs. Use identifier lookup to inspect existing records. Extension and OTP authentication await verified provider mappings.</p>
  </GstFrame>;
}

