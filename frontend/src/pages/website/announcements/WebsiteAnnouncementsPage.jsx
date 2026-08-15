import { Edit3, Megaphone, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import DataTableShell, { DATA_TABLE_ROW_ACTION_CLASS, DATA_TABLE_ROW_ACTION_DANGER_CLASS } from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import { ANNOUNCEMENT_PLACEMENT } from "../../../constants/websiteEnums";
import { websiteAnnouncementService } from "../../../services/website/websiteService";
import { fetchWebsiteAnnouncements } from "../../../store/slices/website/websiteSlice";
import { getApiErrorMessage, getApiFieldErrors, isConflictError } from "../../../utils/apiError";
import { bumpDismissalVersion, getAnnouncementLiveState } from "../../../utils/websiteContent";
import useWebsiteCapabilities from "../useWebsiteCapabilities";
import { formatWebsiteDateTime } from "../websiteFormat";
import { WebsiteBooleanPill, WebsiteConfirmModal, WebsiteConflictPanel, WebsiteErrorState, WebsitePagination, WebsiteTextarea, WebsiteToggle } from "../WebsiteShared";

const INITIAL_FILTERS = { isActive: "", pageNumber: 1, pageSize: 25, placement: "" };
const EMPTY_FORM = { ctaLabel: "", ctaUrl: "", dismissalVersion: "1", endsAtUtc: "", isActive: true, message: "", placement: ANNOUNCEMENT_PLACEMENT.TopBar, priority: 0, rowVersion: null, sortOrder: 0, startsAtUtc: "", title: "" };
const toLocalDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const toForm = (record = {}) => ({ ...EMPTY_FORM, ...record, placement: typeof record.placement === "number" ? record.placement : ANNOUNCEMENT_PLACEMENT.TopBar, startsAtUtc: toLocalDateTime(record.startsAtUtc), endsAtUtc: toLocalDateTime(record.endsAtUtc) });

// BACKEND: GET /announcements has no declared response schema and the live endpoint
// required authentication. The list deliberately consumes only save-contract fields and id.
const WebsiteAnnouncementsPage = () => {
  const dispatch = useDispatch();
  const capabilities = useWebsiteCapabilities().announcements;
  const announcements = useSelector((state) => state.website.announcements);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const request = dispatch(fetchWebsiteAnnouncements(filters));
    return () => request.abort();
  }, [dispatch, filters]);
  const refresh = () => dispatch(fetchWebsiteAnnouncements(filters));
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, pageNumber: key === "pageNumber" ? value : 1 }));
  const completePage = announcements.totalCount <= announcements.items.length;
  const liveCount = announcements.items.filter((item) => getAnnouncementLiveState(item).isLive).length;
  const scheduledCount = announcements.items.filter((item) => item.isActive && item.startsAtUtc && new Date(item.startsAtUtc) > new Date()).length;
  const stats = useMemo(() => [
    { label: "Total announcements", value: announcements.totalCount, icon: Megaphone },
    completePage ? { label: "Currently live", value: liveCount, icon: Megaphone } : null,
    completePage ? { label: "Scheduled", value: scheduledCount, icon: Megaphone } : null,
  ], [announcements.totalCount, completePage, liveCount, scheduledCount]);
  const openForm = (record = EMPTY_FORM) => { setForm(toForm(record)); setErrors({}); setConflict(null); };
  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: undefined })); };
  const buildPayload = (source) => ({ ...source, endsAtUtc: source.endsAtUtc ? new Date(source.endsAtUtc).toISOString() : null, startsAtUtc: source.startsAtUtc ? new Date(source.startsAtUtc).toISOString() : null, priority: Number(source.priority) || 0, sortOrder: Number(source.sortOrder) || 0 });
  const save = async (source = form) => {
    const nextErrors = {};
    if (!source.title.trim()) nextErrors.title = "Title is required.";
    if (!source.message.trim()) nextErrors.message = "Message is required.";
    if (source.startsAtUtc && source.endsAtUtc && new Date(source.endsAtUtc) <= new Date(source.startsAtUtc)) nextErrors.endsAtUtc = "End must be after the start.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const payload = buildPayload(source);
    const id = source.id;
    delete payload.id;
    setSaving(true);
    try {
      const response = id ? await websiteAnnouncementService.update(id, payload) : await websiteAnnouncementService.create(payload);
      setForm((current) => ({ ...current, ...toForm(response.data) }));
      toast.success(id ? "Announcement saved" : "Announcement created");
      setForm(null);
      refresh();
    } catch (error) {
      if (isConflictError(error) && id) {
        try {
          const response = await websiteAnnouncementService.getList({ PageNumber: 1, PageSize: 200 });
          const current = (Array.isArray(response.data) ? response.data : response.data?.items || []).find((item) => String(item.id) === String(id));
          if (current) setConflict({ current, mine: source });
          else toast.error("The saved announcement is no longer available.");
        } catch (refreshError) {
          toast.error(getApiErrorMessage(refreshError, "Unable to load the saved announcement."));
        }
      } else {
        setErrors(getApiFieldErrors(error));
        toast.error(getApiErrorMessage(error, "Unable to save this announcement."));
      }
    } finally {
      setSaving(false);
    }
  };
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await websiteAnnouncementService.delete(pendingDelete.id);
      toast.success("Announcement deleted");
      setPendingDelete(null);
      refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete this announcement."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader badge="Website Management" title="Announcements" description="Control the top-bar message shown on the public WEWEL website." actions={<><AppButton variant="secondary" onClick={refresh}><RefreshCw className={`h-4 w-4 ${announcements.loading ? "animate-spin" : ""}`} /> Refresh</AppButton>{capabilities.canCreate ? <AppButton onClick={() => openForm()}><Plus className="h-4 w-4" /> Add announcement</AppButton> : null}</>} />
      <StatCards cards={stats} loading={announcements.loading} />
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-end gap-3"><AppSelect className="w-56" label="Placement" options={[{ label: "Any placement", value: "" }, { label: "Top bar", value: "TopBar" }]} value={filters.placement} onChange={(value) => setFilter("placement", value)} /><AppSelect className="w-52" label="Active" options={[{ label: "Any state", value: "" }, { label: "Active", value: true }, { label: "Inactive", value: false }]} value={filters.isActive} onChange={(value) => setFilter("isActive", value)} /><AppButton variant="ghost" disabled={filters.placement === "" && filters.isActive === ""} onClick={() => setFilters(INITIAL_FILTERS)}>Clear</AppButton></div><p className="mt-3 text-xs text-slate-500">Public order: priority descending, then sort order ascending, then id ascending.</p></section>
      <WebsiteErrorState error={announcements.error} onRetry={refresh} />
      <DataTableShell columnCount={9} loading={announcements.loading} minWidth="min-w-[1280px]" emptyTitle={!announcements.items.length ? "No announcements found" : undefined} emptyHint="Create a top-bar announcement or change the filters." head={<><th className="w-14">#</th><th className="w-48">Title</th><th className="w-72">Message</th><th className="w-52">CTA</th><th className="w-24 text-right">Priority</th><th className="w-72">Window</th><th className="w-28">Live now</th><th className="w-24">Active</th><th className="w-24 text-right">Actions</th></>}>
        {announcements.items.map((item, index) => {
          const live = getAnnouncementLiveState(item);
          return <tr key={item.id}><td>{(announcements.pageNumber - 1) * announcements.pageSize + index + 1}</td><td className="font-semibold text-slate-900">{item.title || "Untitled"}</td><td><p className="truncate" title={item.message}>{item.message || "—"}</p></td><td>{item.ctaLabel ? <a className="font-medium text-brand hover:underline" href={item.ctaUrl} target="_blank" rel="noreferrer">{item.ctaLabel}</a> : "—"}</td><td className="text-right tabular-nums">{item.priority ?? 0}</td><td><span title={`UTC: ${item.startsAtUtc || "unbounded"} – ${item.endsAtUtc || "unbounded"}`} className="text-xs">{formatWebsiteDateTime(item.startsAtUtc)} – {formatWebsiteDateTime(item.endsAtUtc)}</span></td><td><AppTooltip label={live.reason}><span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${live.isLive ? "text-green-700" : "text-slate-500"}`}><span className={`h-2 w-2 rounded-full ${live.isLive ? "bg-green-500" : "bg-slate-300"}`} />{live.isLive ? "Live" : "Not live"}</span></AppTooltip></td><td><WebsiteBooleanPill value={item.isActive} /></td><td><div className="flex justify-end gap-1">{capabilities.canEdit ? <button className={DATA_TABLE_ROW_ACTION_CLASS} type="button" aria-label={`Edit ${item.title}`} onClick={() => openForm(item)}><Edit3 className="h-4 w-4" /></button> : null}{capabilities.canDelete ? <button className={DATA_TABLE_ROW_ACTION_DANGER_CLASS} type="button" aria-label={`Delete ${item.title}`} onClick={() => setPendingDelete(item)}><Trash2 className="h-4 w-4" /></button> : null}</div></td></tr>;
        })}
      </DataTableShell>
      <WebsitePagination disabled={announcements.loading} pageNumber={announcements.pageNumber} pageSize={announcements.pageSize} totalCount={announcements.totalCount} totalPages={announcements.totalPages} onPageChange={(value) => setFilter("pageNumber", value)} onPageSizeChange={(value) => setFilter("pageSize", value)} />

      <AppModal isOpen={Boolean(form)} isBusy={saving} title={form?.id ? "Edit announcement" : "Add announcement"} onClose={() => setForm(null)}>
        {form ? <div className="space-y-4">
          {conflict ? <WebsiteConflictPanel current={conflict.current} mine={conflict.mine} resolving={saving} onUseSaved={() => { setForm(toForm(conflict.current)); setConflict(null); }} onKeepMine={() => save({ ...conflict.mine, rowVersion: conflict.current.rowVersion })} /> : null}
          <div className="grid gap-4 md:grid-cols-2"><AppInput label="Title" required value={form.title} error={errors.title} onChange={(event) => update("title", event.target.value)} /><AppSelect label="Placement" options={[{ label: "Top bar", value: ANNOUNCEMENT_PLACEMENT.TopBar }]} value={form.placement} onChange={(value) => update("placement", value)} /></div>
          <WebsiteTextarea id="announcement-message" label="Message" required value={form.message} error={errors.message} onChange={(event) => update("message", event.target.value)} />
          <div className="grid gap-4 md:grid-cols-2"><AppInput label="CTA label" value={form.ctaLabel} onChange={(event) => update("ctaLabel", event.target.value)} /><AppInput label="CTA URL" type="url" value={form.ctaUrl} error={errors.ctaUrl} onChange={(event) => update("ctaUrl", event.target.value)} /><AppInput label="Priority" type="number" value={form.priority} onChange={(event) => update("priority", event.target.value)} /><AppInput label="Sort order" type="number" value={form.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} /><AppInput label="Starts at (UTC)" type="datetime-local" value={form.startsAtUtc} onChange={(event) => update("startsAtUtc", event.target.value)} /><AppInput label="Ends at (UTC)" type="datetime-local" value={form.endsAtUtc} error={errors.endsAtUtc} onChange={(event) => update("endsAtUtc", event.target.value)} /></div>
          <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-end gap-3"><div className="flex-1"><AppInput label="Dismissal version" value={form.dismissalVersion} helperText="Change this to re-show the bar to visitors who dismissed the previous version." onChange={(event) => update("dismissalVersion", event.target.value)} /></div><AppButton variant="secondary" onClick={() => update("dismissalVersion", bumpDismissalVersion(form.dismissalVersion))}>Bump version</AppButton></div></div>
          <WebsiteToggle label="Active" helperText="The configured time window still determines whether the bar is live." checked={form.isActive} onChange={(value) => update("isActive", value)} />
          <div className="flex justify-end gap-2"><AppButton variant="secondary" onClick={() => setForm(null)}>Cancel</AppButton><AppButton isLoading={saving} onClick={() => save()}>Save announcement</AppButton></div>
        </div> : null}
      </AppModal>
      <WebsiteConfirmModal danger isOpen={Boolean(pendingDelete)} isLoading={deleting} title="Delete announcement?" description={`This permanently removes “${pendingDelete?.title || "this announcement"}” from website management.`} confirmLabel="Delete" onClose={() => setPendingDelete(null)} onConfirm={confirmDelete} />
    </div>
  );
};

export default WebsiteAnnouncementsPage;
