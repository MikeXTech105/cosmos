import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Clock3,
  FileText,
  Megaphone,
  Package,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import { fetchWebsiteDashboard } from "../../../store/slices/website/websiteSlice";
import { formatWebsiteDateTime } from "../websiteFormat";
import { WebsiteErrorState, WebsitePageIntro } from "../WebsiteShared";
import WarrantyStatusPill from "../WarrantyStatusPill";

const WebsiteDashboardPage = () => {
  const dispatch = useDispatch();
  const { data: dashboardData, error, loading } = useSelector((state) => state.website.dashboard);
  const data = dashboardData || {};

  useEffect(() => {
    const promise = dispatch(fetchWebsiteDashboard());
    return () => promise.abort();
  }, [dispatch]);

  const refresh = () => dispatch(fetchWebsiteDashboard());
  const resolutionData = [
    { name: "Refund", value: Number(data.refundResolutions) || 0 },
    { name: "Replacement", value: Number(data.replacementResolutions) || 0 },
  ];
  const cards = [
    { key: "products", label: "Website products", value: data.totalProducts, icon: Package, hint: `${data.publishedProducts ?? "—"} published` },
    { key: "posts", label: "Blog posts", value: data.totalBlogPosts, icon: FileText, hint: `${data.publishedBlogPosts ?? "—"} published` },
    { key: "announcements", label: "Active announcements", value: data.activeAnnouncements, icon: Megaphone, hint: "Currently visible" },
    { key: "claims", label: "Warranty claims", value: data.totalWarrantyClaims, icon: ShieldCheck, hint: "All submissions" },
    { key: "submitted", label: "Submitted", value: data.submittedClaims, icon: Clock3, hint: "Awaiting review" },
    { key: "review", label: "Under review", value: data.underReviewClaims, icon: AlertCircle, hint: "Team is assessing" },
    { key: "approved", label: "Approved", value: data.approvedClaims, icon: CheckCircle2, hint: "Ready to resolve" },
    { key: "completed", label: "Completed", value: data.completedClaims, icon: Archive, hint: "Workflow finished" },
    { key: "month", label: "Claims this month", value: data.claimsThisMonth, icon: ShieldCheck, hint: "Current calendar month" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Website Management"
        title="Dashboard"
        description="A focused view of WEWEL content and warranty operations."
        actions={<AppButton variant="secondary" onClick={refresh} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</AppButton>}
      />
      <WebsitePageIntro>
        Website products are a standalone marketing catalogue. They are intentionally separate from ERP Items, stock and inventory workflows.
      </WebsitePageIntro>
      <WebsiteErrorState error={error} onRetry={refresh} />
      <StatCards cards={cards} loading={loading} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Claims by resolution</h2>
              <p className="mt-1 text-xs text-slate-500">Outcome mix across processed warranty claims.</p>
            </div>
            <Link className="text-sm font-semibold text-brand hover:underline" to="/website/warranty">View claims</Link>
          </div>
          <div className="mt-5 h-72">
            {loading ? <div className="h-full animate-pulse rounded-lg bg-slate-100" /> : resolutionData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resolutionData} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,.08)" }} />
                  <Bar className="text-brand" dataKey="value" fill="currentColor" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">No resolution data yet</div>}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent claims</h2>
              <p className="mt-1 text-xs text-slate-500">Latest customer submissions.</p>
            </div>
            <Link className="text-sm font-semibold text-brand hover:underline" to="/website/warranty">Open queue</Link>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {(data.recentWarrantyClaims || []).slice(0, 6).map((claim) => (
              <Link key={claim.id} to={`/website/warranty/${claim.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold text-slate-800">{claim.referenceId || "Unnumbered claim"}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{claim.fullName || "Customer claim"} · {formatWebsiteDateTime(claim.submittedAtUtc)}</p>
                </div>
                <WarrantyStatusPill value={claim.status} />
              </Link>
            ))}
            {!loading && !(data.recentWarrantyClaims || []).length ? <p className="py-12 text-center text-sm text-slate-400">No recent claims</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
};

export default WebsiteDashboardPage;
