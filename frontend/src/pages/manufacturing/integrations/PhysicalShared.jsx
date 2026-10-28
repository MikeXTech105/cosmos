import { RefreshCw } from "lucide-react";
import AppButton from "../../../components/common/AppButton";
import useProductionText from "../../../hooks/useProductionText";
import { physicalErrorText, physicalMessages } from "./physicalMessages";

export function PhysicalSection({ title, description, children, actions }) {
  const t = useProductionText(physicalMessages);
  return <section className="no-print space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{t(title)}</h2>{description && <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500">{t(description)}</p>}</div>{actions}</div>{children}</section>;
}

export function PhysicalFeedback({ loading, error, conflict, onReload }) {
  const t = useProductionText(physicalMessages);
  return <>{loading && <p role="status" className="text-sm text-slate-500">{t("Loading authoritative context…")}</p>}{error && <div role="alert" className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p className="font-semibold">{t("Action requires review")}</p><p>{physicalErrorText(t, error)}</p>{conflict && <p>{t("Another action changed this document or its source balance. Reload and review before submitting a new command.")}</p>}{onReload && <AppButton variant="secondary" onClick={onReload}><RefreshCw className="h-4 w-4" />{t("Reload context")}</AppButton>}</div>}</>;
}

export function PhysicalTable({ headings, children }) {
  return <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr>{headings.map((heading, index) => <th key={`${heading}-${index}`} className="px-3 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 [&_td]:px-3 [&_td]:py-3">{children}</tbody></table></div>;
}
