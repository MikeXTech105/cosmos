import { useCallback } from "react";
import { Link } from "react-router-dom";
import AppButton from "../../components/common/AppButton";
import { gstService } from "../../services/gst/gstService";
import { GENERATION_DEPENDENCY } from "../../utils/gstCompliance";
import { GstDetails, GstError, GstFrame, GstNotice } from "./GstShared";
import { useGstAccess, useGstQuery } from "./useGst";

const managementFeatures = [
  {
    pageName: "GST.HsnSac",
    route: "/gst/hsn-sac",
    title: "HSN / SAC master",
    description: "Maintain the central HSN/SAC classifications used by the current GST mapping workflow.",
  },
  {
    pageName: "GST.RateHistory",
    route: "/gst/rate-history",
    title: "GST rate history",
    description: "Maintain approved, effective-dated total-rate versions. Component-tax calculation remains a separate compliance dependency.",
  },
  {
    pageName: "GST.CategoryMapping",
    route: "/gst/category-mappings",
    title: "Category HSN mapping",
    description: "Set effective-dated category defaults that feed classification resolution.",
  },
  {
    pageName: "GST.ProductMapping",
    route: "/gst/product-mappings",
    title: "Item HSN override",
    description: "Maintain effective-dated product overrides, which take precedence over category defaults.",
  },
];

export default function GstOverviewPage() {
  const load = useCallback(options => gstService.configuration(options), []);
  const query = useGstQuery(load);
  const access = useGstAccess();
  const availableManagementFeatures = managementFeatures.filter(feature => access(feature.pageName));
  return <GstFrame title="GST overview" description="Company registrations, provider configuration and compliance workflows." actions={<AppButton variant="secondary" disabled={query.loading} onClick={query.retry}>Refresh configuration</AppButton>}>
    <GstError error={query.error} retry={query.retry} />
    {query.loading && <div role="status" className="h-32 animate-pulse rounded-xl bg-slate-100 p-5">Loading GST configuration…</div>}
    {query.data && <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">Provider configuration</h2>
      <GstDetails entries={[["Environment", query.data.environment], ["Configured features", query.data.enabledFeatures?.join(", ")], ["Missing setting names", query.data.missingSettings?.join(", ") || "None reported"], ["Configured setting names", query.data.configuredSettings?.join(", ")]]} />
      <p className="text-sm text-slate-500">These are server configuration indicators. They do not confirm provider availability, registration eligibility or permission to issue a document. Credentials are managed on the server.</p>
    </div>}
    <GstNotice>{GENERATION_DEPENDENCY} Existing invoice totals and historical HSN snapshots remain authoritative.</GstNotice>
    {availableManagementFeatures.length > 0 && <div className="grid gap-4 md:grid-cols-2">{availableManagementFeatures.map(feature => <article key={feature.pageName} className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">{feature.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{feature.description}</p><Link to={feature.route} className="mt-4 inline-block text-sm font-medium text-brand hover:underline">Open {feature.title}</Link></article>)}</div>}
    <p className="text-sm text-slate-500">E-Invoice and E-Way Bill registers still need list APIs. Use identifier lookup to inspect existing records. Extension and GST-session authentication remain unavailable until their provider mappings are verified.</p>
  </GstFrame>;
}

