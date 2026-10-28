import { useState } from "react";
import { isRequiredReportColumn } from "./useReportViewPreferences";

export default function ReportViewPreferences({ report, query, onApply, preferences, setPreferences, persistence = { available: true, error: "" } }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const columns = report.columns ?? [];
  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) { setMessage("Enter a name for this view."); return; }
    const view = { name: trimmed, query, columns: preferences.columns, density: preferences.density };
    setPreferences((current) => ({ ...current, views: [...current.views.filter((entry) => entry.name !== trimmed), { ...current.views.find((entry) => entry.name === trimmed), ...view }] }));
    setMessage(`Saved “${trimmed}” in this browser for your account.`);
  };
  return <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
    <div className="flex flex-wrap items-end gap-2"><label className="text-xs font-medium text-slate-600">View name<input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} className="mt-1 block h-9 rounded-lg border border-slate-200 px-3 text-sm" placeholder="e.g. Monthly outstanding" /></label><button type="button" onClick={save} className="h-9 rounded-lg bg-brand px-3 text-sm font-semibold text-white">Save / update view</button><label className="ml-auto text-xs font-medium text-slate-600">Spacing<select value={preferences.density} onChange={(event) => setPreferences((current) => ({ ...current, density: event.target.value }))} className="ml-2 rounded-lg border border-slate-200 p-2"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label></div>
    {(message || persistence.error || !persistence.available) && <p role={persistence.error ? "alert" : "status"} className="text-xs text-slate-600">{persistence.error || (!persistence.available ? "Company scope is not verified. Preferences apply to this open page only; retry after company access is available." : message)}</p>}
    {preferences.views.length > 0 && <><label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={favoritesOnly} onChange={(event) => setFavoritesOnly(event.target.checked)} />Favorites only</label><ul className="flex flex-wrap gap-2">{preferences.views.filter((view) => !favoritesOnly || view.favorite).map((view) => <li key={view.name} className="flex items-center gap-1 rounded-lg border border-slate-200 p-1"><button type="button" className="px-2 py-1 text-sm font-medium text-brand" onClick={() => { setName(view.name); setPreferences((current) => ({ ...current, columns: view.columns ?? null, density: view.density ?? "comfortable" })); onApply(view.query); }}>{view.name}</button><button type="button" aria-label={`${view.favorite ? "Unfavorite" : "Favorite"} ${view.name}`} onClick={() => setPreferences((current) => ({ ...current, views: current.views.map((entry) => entry.name === view.name ? { ...entry, favorite: !entry.favorite } : entry) }))} className="px-1 text-amber-600">{view.favorite ? "★" : "☆"}</button><button type="button" aria-label={`Delete view ${view.name}`} onClick={() => setPreferences((current) => ({ ...current, views: current.views.filter((entry) => entry.name !== view.name) }))} className="px-2 text-slate-500">×</button></li>)}</ul></>}
    {columns.length > 0 && <details><summary className="cursor-pointer text-xs font-semibold text-slate-600">Visible columns</summary><div className="mt-2 flex flex-wrap gap-3">{columns.map((column, index) => <label key={column.key} className="flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" checked={isRequiredReportColumn(column, index) || !preferences.columns || preferences.columns.includes(String(column.key))} disabled={Boolean(isRequiredReportColumn(column, index))} onChange={(event) => setPreferences((current) => ({ ...current, columns: event.target.checked ? [...(current.columns ?? columns.map((entry) => String(entry.key))), String(column.key)] : (current.columns ?? columns.map((entry) => String(entry.key))).filter((key) => key !== String(column.key)) }))} />{column.header ?? column.label}</label>)}</div></details>}
  </div>;
}

