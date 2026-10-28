import { Globe2, LockKeyhole, RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import PageHeader from "../../../components/common/PageHeader";
import { websiteSettingsService } from "../../../services/website/websiteService";
import { fetchWebsiteSettings } from "../../../store/slices/website/websiteSlice";
import { getApiErrorMessage } from "../../../utils/apiError";
import useWebsiteCapabilities from "../useWebsiteCapabilities";
import { WebsiteErrorState, WebsitePageIntro, WebsiteToggle } from "../WebsiteShared";
import useUnsavedChanges from "../../../hooks/useUnsavedChanges";
import { getWebsiteSettingMetadata, validateWebsiteSettingValue } from "./websiteSettingMetadata";

const keyFor = (item) => item.settingKey;
const fingerprint = (item) => JSON.stringify([item.value ?? "", Boolean(item.isPublic)]);

// BACKEND: GET /settings has no declared response schema. The UI uses the exact PUT item
// contract (settingKey, value, isPublic) and never creates keys client-side.
const WebsiteSettingsPage = () => {
  const dispatch = useDispatch();
  const capabilities = useWebsiteCapabilities().settings;
  const settings = useSelector((state) => state.website.settings);
  const [rows, setRows] = useState([]);
  const [baseline, setBaseline] = useState({});
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const request = dispatch(fetchWebsiteSettings());
    request.unwrap().then((response) => {
      const items = Array.isArray(response.data) ? response.data : response.data?.items || [];
      setRows(items.map((item) => ({ ...item, isPublic: Boolean(item.isPublic), value: item.value ?? "" })));
      setBaseline(Object.fromEntries(items.map((item) => [keyFor(item), fingerprint(item)])));
    }).catch((error) => {
      if (error?.name !== "AbortError") toast.error(getApiErrorMessage(error, "Unable to load website settings."));
    });
    return () => request.abort();
  }, [dispatch]);

  const dirtyKeys = rows.filter((item) => baseline[keyFor(item)] !== fingerprint(item)).map(keyFor);
  const { confirmLeave } = useUnsavedChanges({ when: dirtyKeys.length > 0, message: "Website settings have unsaved changes. Discard them and refresh?" });
  const groups = useMemo(() => Object.entries(rows.reduce((result, item) => {
    const prefix = getWebsiteSettingMetadata(item.settingKey).group;
    (result[prefix] ||= []).push(item);
    return result;
  }, {})), [rows]);
  const update = (settingKey, patch) => setRows((current) => current.map((item) => item.settingKey === settingKey ? { ...item, ...patch } : item));
  const refresh = () => {
    if (saving || !confirmLeave(() => {})) return;
    const request = dispatch(fetchWebsiteSettings());
    request.unwrap().then((response) => {
      const items = Array.isArray(response.data) ? response.data : response.data?.items || [];
      setRows(items.map((item) => ({ ...item, isPublic: Boolean(item.isPublic), value: item.value ?? "" })));
      setBaseline(Object.fromEntries(items.map((item) => [keyFor(item), fingerprint(item)])));
    }).catch((error) => toast.error(getApiErrorMessage(error, "Unable to refresh website settings.")));
    return request;
  };
  const save = async () => {
    const errors = Object.fromEntries(rows.map((item) => [item.settingKey, validateWebsiteSettingValue(item.settingKey, item.value)]).filter(([, message]) => message));
    setValidationErrors(errors);
    if (Object.keys(errors).length) return;
    const visibilityChanges = rows.filter((item) => { const saved = JSON.parse(baseline[item.settingKey] || "null"); return saved && saved[1] !== Boolean(item.isPublic); });
    if (visibilityChanges.length && !window.confirm(`Review website visibility changes:\n${visibilityChanges.map((item) => `${getWebsiteSettingMetadata(item.settingKey).label}: ${item.isPublic ? "public" : "private"}`).join("\n")}\nSave these changes?`)) return;
    setSaving(true);
    try {
      await websiteSettingsService.update(rows.filter((item) => dirtyKeys.includes(item.settingKey)).map(({ settingKey, value, isPublic }) => ({ settingKey, value, isPublic })));
      toast.success("Website settings saved");
      const response = await dispatch(fetchWebsiteSettings()).unwrap();
      const items = Array.isArray(response.data) ? response.data : response.data?.items || [];
      setRows(items.map((item) => ({ ...item, isPublic: Boolean(item.isPublic), value: item.value ?? "" })));
      setBaseline(Object.fromEntries(items.map((item) => [keyFor(item), fingerprint(item)])));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to save website settings."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader badge="Website Management" title="Site settings" description="Manage only the centrally approved values exposed to the WEWEL website." actions={<><AppButton variant="secondary" disabled={settings.loading || saving} onClick={refresh}><RefreshCw className={`h-4 w-4 ${settings.loading ? "animate-spin" : ""}`} /> Refresh</AppButton>{capabilities.canEdit ? <AppButton disabled={!dirtyKeys.length} isLoading={saving} onClick={save}><Save className="h-4 w-4" /> Save changes{dirtyKeys.length ? ` (${dirtyKeys.length})` : ""}</AppButton> : null}</>} />
      <WebsitePageIntro>These values appear on the public website. Confirm before making public.</WebsitePageIntro>
      <WebsiteErrorState error={settings.error} onRetry={refresh} />
      {settings.loading ? <div className="space-y-4">{[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl bg-slate-100" />)}</div> : null}
      {!settings.loading && !rows.length && !settings.error ? <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm"><LockKeyhole className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-900">No allow-listed settings</p><p className="mt-1 text-xs text-slate-500">The backend controls which keys are available here.</p></div> : null}
      {groups.map(([group, items]) => <section key={group} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold capitalize text-slate-900">{group}</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {items.map((item) => <div key={item.settingKey} className="grid gap-4 py-4 lg:grid-cols-[minmax(220px,.65fr)_minmax(300px,1fr)_minmax(280px,.8fr)] lg:items-start">
            <div><p className="text-sm font-semibold text-slate-700">{getWebsiteSettingMetadata(item.settingKey).label}</p><details className="mt-1 text-xs text-slate-400"><summary>Support details</summary>{item.settingKey}</details>{dirtyKeys.includes(item.settingKey) ? <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Unsaved</span> : null}</div>
            {getWebsiteSettingMetadata(item.settingKey).type === "boolean" ? <label className="text-sm"><select className="h-10 rounded-lg border border-slate-200 px-3" aria-label={getWebsiteSettingMetadata(item.settingKey).label} disabled={!capabilities.canEdit || saving} value={String(item.value).toLowerCase()} onChange={(event) => update(item.settingKey, { value: event.target.value })}><option value="">Choose Yes or No</option><option value="true">Yes</option><option value="false">No</option></select>{validationErrors[item.settingKey] && <span role="alert" className="block text-xs text-red-700">{validationErrors[item.settingKey]}</span>}</label> : <AppInput label={getWebsiteSettingMetadata(item.settingKey).label} type={getWebsiteSettingMetadata(item.settingKey).type} helperText={getWebsiteSettingMetadata(item.settingKey).example} error={validationErrors[item.settingKey]} disabled={!capabilities.canEdit || saving} value={item.value} onChange={(event) => update(item.settingKey, { value: event.target.value })} />}
            <div><WebsiteToggle disabled={!capabilities.canEdit} label="Public value" helperText={item.isPublic ? "Readable by anyone on the public website." : "Kept private from public website responses."} checked={item.isPublic} onChange={(value) => update(item.settingKey, { isPublic: value })} />{item.isPublic ? <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-amber-700"><Globe2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> This value will be readable by anyone on the public website.</p> : null}</div>
          </div>)}
        </div>
      </section>)}
    </div>
  );
};

export default WebsiteSettingsPage;
