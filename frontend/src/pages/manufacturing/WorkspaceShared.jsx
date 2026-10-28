import { Link } from "react-router-dom";
import AppButton from "../../components/common/AppButton";
import useCapabilities from "../../hooks/useCapabilities";
import useProductionText from "../../hooks/useProductionText";
import workspaceMessages from "./workspaceMessages";
import { useProductionCapabilities } from "./workspaceHooks";
export function Notice({ children, error = false }) { return children ? <div role={error ? "alert" : "status"} className={`whitespace-pre-line rounded-xl border p-4 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-900"}`}>{children}</div> : null; }
export const Card = ({ title, children }) => <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}{children}</section>;
export function WorkspaceNav() {
  const t = useProductionText(workspaceMessages), orders = useProductionCapabilities(), reports = useProductionCapabilities("Reports");
  const configuration = useCapabilities({ pageName: "Manufacturing.Configuration", resource: "Manufacturing.Configuration", route: "/manufacturing/configuration" });
  return <nav aria-label={t("Production workspace")} className="flex flex-wrap gap-3 text-sm font-medium text-brand">{orders.canView && <><Link to="/manufacturing/daily">{t("Daily entry")}</Link><Link to="/manufacturing/board">{t("Kanban board")}</Link><Link to="/manufacturing/orders">{t("Orders")}</Link><Link to="/manufacturing/planning">{t("Planning & materials")}</Link><Link to="/manufacturing/imports">{t("Import & reconcile")}</Link></>}{configuration.canView && <Link to="/manufacturing/configuration">{t("Configuration")}</Link>}{reports.canView && <Link to="/reports/manufacturing/operations">{t("Operational reports")}</Link>}</nav>;
}
export function BusinessContext({ context }) { const t = useProductionText(workspaceMessages); return <><Notice error>{context.error}</Notice>{context.runtime && <p className="text-xs text-slate-500">{t("Business date")} {context.runtime.businessDate} · {context.runtime.businessTimeZone}{context.runtime.closedThroughDate ? ` · ${t("Closed through")} ${context.runtime.closedThroughDate}` : ""}</p>}</>; }
export function Pager({ page, pageSize = 50, total = 0, busy, onPage }) { const t = useProductionText(workspaceMessages), pages = Math.ceil(total / pageSize); return <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span>{total} {t("records")} · {t("Page")} {page} / {pages || 0}</span><div className="flex gap-2"><AppButton variant="secondary" disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>{t("common.previous")}</AppButton><AppButton variant="secondary" disabled={busy || page >= pages} onClick={() => onPage(page + 1)}>{t("common.next")}</AppButton></div></div>; }
export function CommandNotice({ command }) { return <><Notice error>{command.error}</Notice><Notice>{command.success}</Notice>{command.uncertain && <Notice>The outcome is unknown. Keep the same entries for an identical retry, or reload and inspect saved records before changing the request.</Notice>}</>; }

