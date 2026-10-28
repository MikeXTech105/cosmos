import { orderText as tr } from "./orderText";
import { Link } from "react-router-dom";
import AppButton from "../../../components/common/AppButton";
import { orderStatusName } from "./orderHelpers";
export const OrderStatus = ({
  status
}) => {
  const name = orderStatusName(status);
  const tones = {
    Draft: "bg-slate-100 text-slate-700",
    Released: "bg-blue-50 text-blue-700",
    InProgress: "bg-amber-50 text-amber-800",
    Completed: "bg-emerald-50 text-emerald-700",
    Closed: "bg-slate-200 text-slate-700",
    Cancelled: "bg-red-50 text-red-700"
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[name] ?? tones.Draft}`}>{tr(name === "InProgress" ? "In progress" : name)}</span>;
};
export const Notice = ({
  children,
  tone = "blue"
}) => <div role="status" className={`rounded-xl border px-4 py-3 text-sm leading-6 ${tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-100 bg-blue-50 text-blue-900"}`}>{children}</div>;
export const OrderBackLink = () => <Link className="text-sm font-medium text-brand underline underline-offset-4" to="/manufacturing/orders">{tr("Back to production orders")}</Link>;
export const TableWrap = ({
  children
}) => <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm [&_th]:whitespace-nowrap [&_th]:bg-slate-50 [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-slate-600 [&_td]:border-t [&_td]:border-slate-100 [&_td]:px-4 [&_td]:py-3">{children}</table></div>;
export const ReadOnlyField = ({
  label,
  children
}) => <div><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{children ?? "—"}</dd></div>;
export const Busy = ({
  label = "Loading production data…"
}) => <div role="status" className="px-5 py-8 text-sm text-slate-500">{label}</div>;
export const Denied = () => <Notice tone="amber">{tr("You do not have permission to view production orders.")}</Notice>;
export const OrderPager = ({
  page,
  disabled,
  onChange,
  onPageSizeChange
}) => <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-600"><span>{page.totalCount}{tr("orders · Page")}{page.totalPages ? page.pageNumber : 0} / {page.totalPages}</span><div className="flex items-center gap-2"><label htmlFor="order-page-size">{tr("Rows")}</label><select id="order-page-size" className="rounded-lg border border-slate-200 bg-white p-2" value={page.pageSize} disabled={disabled} onChange={e => onPageSizeChange(Number(e.target.value))}>{[10, 20, 50, 100, 200].map(size => <option key={size}>{size}</option>)}</select><AppButton variant="secondary" disabled={disabled || page.pageNumber <= 1} onClick={() => onChange(page.pageNumber - 1)}>{tr("Previous")}</AppButton><AppButton variant="secondary" disabled={disabled || page.pageNumber >= page.totalPages} onClick={() => onChange(page.pageNumber + 1)}>{tr("Next")}</AppButton></div></div>;
