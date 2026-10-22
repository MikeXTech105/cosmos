import { Link, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";
import { GST_PAGES } from "../../utils/gstCompliance";
import { useGstAccess } from "./useGst";

export function GstFrame({ title, description, actions, children }) {
  const access = useGstAccess();
  const { pathname } = useLocation();
  return <section className="min-w-0 space-y-5">
    <PageHeader icon={ShieldCheck} title={title} description={description} actions={actions} />
    <nav aria-label="GST workflows" className="flex flex-wrap gap-2">
      {GST_PAGES.filter(page => access(page.pageName)).map(page => <Link key={page.key} to={page.route} aria-current={pathname === page.route ? "page" : undefined} className={`rounded-lg border px-3 py-2 text-sm hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-brand ${pathname === page.route ? "border-brand/30 bg-brand-light font-medium text-brand" : "border-slate-200 bg-white text-slate-700"}`}>{page.title}</Link>)}
    </nav>
    {children}
  </section>;
}

export function GstNotice({ children }) {
  return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{children}</div>;
}

export function GstError({ error, retry }) {
  return error ? <div role="alert" className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p>{retry && <AppButton variant="secondary" onClick={retry}>Retry</AppButton>}</div> : null;
}

export function GstDetails({ entries }) {
  return <dl className="grid min-w-0 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">{entries.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 break-all text-sm font-medium text-slate-900">{value === null || value === undefined || value === "" ? "Not supplied" : String(value)}</dd></div>)}</dl>;
}

export function GstPager({ page, pageSize, total, busy, onPage, onSize }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
    <span aria-live="polite">{total} records · Page {page} of {pages}</span>
    <div className="flex flex-wrap items-center gap-2"><label>Rows <select aria-label="Rows per page" className="rounded-lg border border-slate-200 bg-white p-2" value={pageSize} onChange={event => onSize(Number(event.target.value))} disabled={busy}>{[20, 50, 100].map(size => <option key={size}>{size}</option>)}</select></label>
      <AppButton variant="secondary" disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>Previous</AppButton>
      <AppButton variant="secondary" disabled={busy || page >= pages} onClick={() => onPage(page + 1)}>Next</AppButton>
    </div>
  </div>;
}

