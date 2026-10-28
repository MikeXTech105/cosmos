import { ArrowRight, Pin, PinOff } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { useSidebar } from "../../hooks/useSidebar";
import useUserPreferences from "../../hooks/useUserPreferences";
import { allowedSavedDestinations, allowedWorkspaces } from "./workspaces";
import TodayQueues from "./TodayQueues";

const empty = { pinned: [], recent: [], workspace: "" };
export default function TodayPage({ showQueues = true }) {
  const { flatMenuItems } = useSidebar();
  const [preferences, setPreferences, preferencePersistence] = useUserPreferences("navigation", empty);
  const available = allowedWorkspaces(flatMenuItems);
  const selected = available.find((workspace) => workspace.id === preferences.workspace) ?? available[0];
  const pinned = allowedSavedDestinations(preferences.pinned ?? [], flatMenuItems);
  const recent = allowedSavedDestinations(preferences.recent ?? [], flatMenuItems);
  const togglePin = (route) => setPreferences((current) => ({ ...current, pinned: (current.pinned ?? []).includes(route) ? current.pinned.filter((entry) => entry !== route) : [...(current.pinned ?? []), route] }));
  return <section className="min-w-0 space-y-5">
    <PageHeader title="Today" description="Choose your work area. Actions follow your current permissions." />
    <nav aria-label="Work areas" className="flex flex-wrap gap-2">{available.map((workspace) => <button type="button" key={workspace.id} aria-pressed={workspace.id === selected?.id} onClick={() => setPreferences((current) => ({ ...current, workspace: workspace.id }))} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${workspace.id === selected?.id ? "border-brand bg-brand-light text-brand" : "border-slate-200 bg-white text-slate-600"}`}>{workspace.label}</button>)}</nav>
    {selected ? <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">{selected.label}</h2><p className="mt-1 text-sm text-slate-500">{selected.description}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{selected.tasks.map((task) => <div key={task.route} className="flex items-center gap-2 rounded-xl border border-slate-200 p-4">
        <Link to={task.route} className="flex min-w-0 flex-1 items-center justify-between gap-2 font-semibold text-slate-800 hover:text-brand">{task.label}<ArrowRight className="h-4 w-4 shrink-0" /></Link>
        <button type="button" aria-label={`${preferences.pinned?.includes(task.route) ? "Unpin" : "Pin"} ${task.label}`} aria-pressed={preferences.pinned?.includes(task.route) ?? false} onClick={() => togglePin(task.route)} className="rounded-lg p-2 text-brand hover:bg-brand-light">{preferences.pinned?.includes(task.route) ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}</button>
      </div>)}</div>
      <p className="mt-4 text-xs text-slate-500">Open a work list to see its current pending and blocked records. Counts are provided by each live module.</p>
    </div> : <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Your work areas will appear when access is assigned. Ask your administrator for the tasks you need.</p>}
    {showQueues && selected && <TodayQueues key={selected.id} workspace={selected.id} tasks={selected.tasks} />}
    <div className="grid gap-4 lg:grid-cols-2">{[["Pinned", pinned], ["Recently opened", recent]].map(([title, items]) => <section key={title} className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">{title}</h2>{items.length ? <ul className="mt-3 space-y-2">{items.map((item) => <li key={item.route}><Link to={item.route} className="text-sm font-medium text-brand hover:underline">{item.label}</Link></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">{title === "Pinned" ? "Pin frequent tasks using the pin beside each action." : "Your recent authorized destinations appear here."}</p>}</section>)}</div>
    <p className="text-xs text-slate-500">Pins and recent destinations belong to your account and company in this browser. All permitted modules remain available in the menu and search.</p>
    {(preferencePersistence.error || !preferencePersistence.available) && <p role="status" className="text-xs text-amber-700">{preferencePersistence.error || "Company scope is not verified. Pins apply to this open page only."}</p>}
  </section>;
}
