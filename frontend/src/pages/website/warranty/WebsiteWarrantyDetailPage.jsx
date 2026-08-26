import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileWarning,
  History,
  LockKeyhole,
  Mail,
  MessageSquare,
  MoreHorizontal,
  PlayCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import { WARRANTY_RESOLUTION_NAMES, WARRANTY_RESOLUTION_TYPE } from "../../../constants/websiteEnums";
import { userService } from "../../../services/rbac/userService";
import { websiteWarrantyService } from "../../../services/website/websiteService";
import { clearWebsiteWarrantyDetail, fetchWebsiteDashboard, fetchWebsiteWarrantyClaims, fetchWebsiteWarrantyDetail } from "../../../store/slices/website/websiteSlice";
import { getApiErrorMessage } from "../../../utils/apiError";
import { validateWarrantyResolution } from "../../../utils/websiteContent";
import useWebsiteCapabilities from "../useWebsiteCapabilities";
import { formatWebsiteDate, formatWebsiteDateTime, formatWebsiteMoney } from "../websiteFormat";
import WarrantyStatusPill from "../WarrantyStatusPill";
import { getAvailableActions } from "../warrantyStatus";
import { GuardedButton, WebsiteConfirmModal, WebsiteErrorState, WebsiteTextarea } from "../WebsiteShared";

const ACTIONS = {
  approve: { label: "Approve", icon: CheckCircle2, service: "approve" },
  assign: { label: "Assign", icon: UserRoundCheck, service: "assign" },
  complete: { label: "Complete", icon: CheckCircle2, service: "complete" },
  reject: { label: "Reject", icon: XCircle, service: "reject" },
  requestInformation: { label: "Request information", icon: Mail, service: "requestInformation" },
  resolve: { label: "Resolve", icon: ShieldCheck, service: "resolve" },
  startReview: { label: "Start review", icon: PlayCircle, service: "startReview" },
};
const EMPTY_ACTION_FORM = { assignedToUserId: "", refundAmount: "", refundReference: "", remark: "", repairReference: "", replacementReference: "", replacementTrackingNumber: "", resolutionRemarks: "", resolutionType: WARRANTY_RESOLUTION_TYPE.None };
const formatSize = (value) => {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};
const getDateValue = (item) => item.createdAtUtc || item.createdAt || item.occurredAtUtc || item.timestampUtc;
const safeDetails = (value) => {
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !/storage.?key/i.test(key)).map(([key, nested]) => [key, safeDetails(nested)]));
};
const Timeline = ({ items }) => <div className="space-y-0">{[...items].sort((a, b) => new Date(getDateValue(b) || 0) - new Date(getDateValue(a) || 0)).map((item, index) => <div key={item.id || index} className="relative pl-7 pb-5 before:absolute before:left-[7px] before:top-4 before:h-full before:w-px before:bg-slate-200 last:pb-0 last:before:hidden"><span className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-brand bg-white" /><p className="text-sm font-semibold text-slate-800">{item.action || item.eventType || item.title || "Claim activity"}</p><p className="mt-1 text-sm leading-6 text-slate-600">{item.description || item.remark || item.message || "Activity recorded"}</p>{item.details ? <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-600">{JSON.stringify(safeDetails(item.details), null, 2)}</pre> : null}<p className="mt-1.5 text-xs text-slate-400">{item.actorName || item.createdByName || "System"} · {formatWebsiteDateTime(getDateValue(item))}</p></div>)}</div>;

// BACKEND: Detail/history/attachments/notes/customer-message GET shapes have no Swagger
// schemas and could not be authenticated. Renderers preserve received fields defensively,
// omit storage-key-like fields, and never auto-preview customer evidence.
const WebsiteWarrantyDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const capabilities = useWebsiteCapabilities().warranty;
  const warranty = useSelector((state) => state.website.warranty);
  const { attachments, claim, detailError, detailLoading, history, messages, notes } = warranty;
  const [tab, setTab] = useState("history");
  const [action, setAction] = useState(null);
  const [actionForm, setActionForm] = useState(EMPTY_ACTION_FORM);
  const [actionErrors, setActionErrors] = useState({});
  const [working, setWorking] = useState(false);
  const [users, setUsers] = useState([]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [confirmMessage, setConfirmMessage] = useState(false);
  const confirmedMessageRef = useRef(false);

  const refresh = () => dispatch(fetchWebsiteWarrantyDetail(id));
  useEffect(() => {
    const request = dispatch(fetchWebsiteWarrantyDetail(id));
    return () => request.abort();
  }, [dispatch, id]);
  useEffect(() => () => dispatch(clearWebsiteWarrantyDetail()), [dispatch]);
  useEffect(() => {
    let active = true;
    userService.getUsers({ PageNumber: 1, PageSize: 200 })
      .then((response) => { if (active) setUsers(Array.isArray(response.data) ? response.data : response.data?.items || []); })
      .catch((error) => { if (active) toast.error(getApiErrorMessage(error, "Unable to load assignees.")); });
    return () => { active = false; };
  }, []);

  const available = useMemo(() => getAvailableActions(claim || {}, capabilities), [capabilities, claim]);
  const userOptions = users.map((user) => ({ label: user.fullName || user.name || user.userName || user.email, value: user.id }));
  const refetchAfterWrite = () => {
    dispatch(fetchWebsiteWarrantyDetail(id));
    dispatch(fetchWebsiteWarrantyClaims({ PageNumber: 1, PageSize: 25 }));
    dispatch(fetchWebsiteDashboard());
  };
  const openAction = (name) => {
    if (!available[name]?.enabled) return;
    setAction(name);
    setActionForm(EMPTY_ACTION_FORM);
    setActionErrors({});
  };
  const submitAction = async () => {
    const errors = {};
    if (action === "assign" && !actionForm.assignedToUserId) errors.assignedToUserId = "Choose an assignee.";
    if (action === "reject" && !actionForm.remark.trim()) errors.remark = "Reason for rejection is required.";
    if (action === "resolve") Object.assign(errors, validateWarrantyResolution(actionForm));
    setActionErrors(errors);
    if (Object.keys(errors).length) return;
    setWorking(true);
    try {
      let payload;
      if (action === "assign") payload = { assignedToUserId: Number(actionForm.assignedToUserId), remark: actionForm.remark || null };
      else if (action === "resolve") payload = {
        resolutionType: Number(actionForm.resolutionType),
        refundAmount: Number(actionForm.resolutionType) === WARRANTY_RESOLUTION_TYPE.Refund ? Number(actionForm.refundAmount) : null,
        refundReference: actionForm.refundReference || null,
        replacementReference: actionForm.replacementReference || null,
        replacementTrackingNumber: actionForm.replacementTrackingNumber || null,
        repairReference: actionForm.repairReference || null,
        resolutionRemarks: actionForm.resolutionRemarks || null,
        remark: actionForm.remark || null,
      };
      else payload = { remark: actionForm.remark || null };
      await websiteWarrantyService[ACTIONS[action].service](id, payload);
      toast.success(`${ACTIONS[action].label} recorded`);
      setAction(null);
      refetchAfterWrite();
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Unable to ${ACTIONS[action].label.toLowerCase()} this claim.`));
    } finally {
      setWorking(false);
    }
  };
  const addNote = async () => {
    if (!note.trim()) return;
    setWorking(true);
    try {
      await websiteWarrantyService.addNote(id, note.trim());
      setNote("");
      toast.success("Internal note added");
      refetchAfterWrite();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to add the internal note."));
    } finally { setWorking(false); }
  };
  const sendMessage = async () => {
    if (!message.trim()) return;
    setWorking(true);
    try {
      await websiteWarrantyService.addMessage(id, message.trim());
      confirmedMessageRef.current = true;
      setMessage("");
      setConfirmMessage(false);
      toast.success("Message sent to customer");
      refetchAfterWrite();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to send the customer message."));
    } finally { setWorking(false); }
  };
  const requestMessageSend = () => {
    if (!message.trim()) return;
    if (!confirmedMessageRef.current) setConfirmMessage(true);
    else void sendMessage();
  };
  const download = async (attachment) => {
    try {
      const response = await websiteWarrantyService.downloadAttachment(attachment.id);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = attachment.fileName || attachment.filename || `claim-attachment-${attachment.id}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to download this attachment."));
    }
  };

  if (detailError) return <div className="space-y-5"><PageHeader title="Warranty claim" /><WebsiteErrorState error={detailError} onRetry={refresh} /><AppButton variant="secondary" onClick={() => navigate("/website/warranty")}><ArrowLeft className="h-4 w-4" /> Back to claims</AppButton></div>;

  const resolutionPresent = claim?.resolutionType && String(claim.resolutionType).toLowerCase() !== "none";
  return (
    <div className="space-y-6">
      <PageHeader
        badge="Warranty claim"
        title={claim?.referenceId || (detailLoading ? "Loading claim…" : "Claim")}
        description={claim ? `${claim.fullName || "Customer"} · Submitted ${formatWebsiteDateTime(claim.submittedAtUtc)}` : "Customer warranty operation"}
        actions={<><AppButton variant="secondary" onClick={() => navigate("/website/warranty")}><ArrowLeft className="h-4 w-4" /> Back</AppButton><AppButton variant="secondary" onClick={refresh} disabled={detailLoading}><RefreshCw className={`h-4 w-4 ${detailLoading ? "animate-spin" : ""}`} /> Refresh</AppButton>{claim ? <WarrantyStatusPill value={claim.status} /> : null}</>}
      />

      {claim ? <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2"><span className="mr-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"><MoreHorizontal className="h-4 w-4" /> Claim actions</span>{Object.entries(ACTIONS).map(([name, config]) => { const Icon = config.icon; return <GuardedButton key={name} variant={name === "reject" ? "secondary" : "secondary"} className={name === "reject" ? "hover:border-red-200 hover:bg-red-50 hover:text-red-600" : ""} disabledReason={available[name]?.reason} onClick={() => openAction(name)}><Icon className="h-4 w-4" /> {config.label}</GuardedButton>; })}</div>
      </div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Claim details</h2>
            {detailLoading ? <div className="mt-4 h-48 animate-pulse rounded-lg bg-slate-100" /> : <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="text-xs font-medium text-slate-400">Customer</p><p className="mt-1 font-semibold text-slate-800">{claim?.fullName || "—"}</p></div><div><p className="text-xs font-medium text-slate-400">Email</p><p className="mt-1 text-slate-700">{claim?.email || "—"}</p></div><div><p className="text-xs font-medium text-slate-400">Order number</p><p className="mt-1 text-slate-700">{claim?.orderNumber || "—"}</p></div><div><p className="text-xs font-medium text-slate-400">Purchase date</p><p className="mt-1 text-slate-700">{formatWebsiteDate(claim?.purchaseDate)}</p></div><blockquote className="sm:col-span-2 rounded-xl border-l-4 border-slate-300 bg-slate-50 p-4 text-sm leading-7 text-slate-700">{claim?.description || claim?.customerDescription || "No description provided."}</blockquote></div>}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Customer attachments</h2><p className="mt-1 text-xs text-slate-500">Evidence is never previewed automatically. Every file is downloaded through the protected claim endpoint.</p>
            <div className="mt-4 space-y-3">{attachments.map((attachment, index) => { const scan = attachment.scanState || attachment.scanStatus || "Pending"; const caution = scan !== "Clean"; return <div key={attachment.id || index} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${caution ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}><FileWarning className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{attachment.fileName || attachment.filename || `Attachment ${index + 1}`}</p><p className="mt-0.5 text-xs text-slate-500">{attachment.contentType || attachment.type || "Unknown type"} · {formatSize(attachment.sizeBytes || attachment.size)}</p><p className={`mt-1 text-xs font-semibold ${caution ? "text-amber-700" : "text-green-700"}`}>Scan: {scan}{caution ? " — review with caution" : ""}</p></div></div><AppButton variant="secondary" onClick={() => download(attachment)}><Download className="h-4 w-4" /> Download</AppButton></div>; })}{!detailLoading && !attachments.length ? <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">No attachments</p> : null}</div>
          </section>

          {resolutionPresent ? <section className="rounded-xl border border-green-200 bg-green-50 p-5"><h2 className="text-base font-semibold text-green-900">Resolution</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-green-700">Type</p><p className="mt-1 font-semibold text-green-900">{claim.resolutionType}</p></div>{claim.refundAmount != null ? <div><p className="text-xs text-green-700">Refund amount</p><p className="mt-1 font-semibold text-green-900">{formatWebsiteMoney(claim.refundAmount, claim.currencyCode)}</p></div> : null}{claim.refundReference ? <div><p className="text-xs text-green-700">Refund reference</p><p className="mt-1 text-green-900">{claim.refundReference}</p></div> : null}{claim.replacementReference ? <div><p className="text-xs text-green-700">Replacement reference</p><p className="mt-1 text-green-900">{claim.replacementReference}</p></div> : null}{claim.repairReference ? <div><p className="text-xs text-green-700">Repair reference</p><p className="mt-1 text-green-900">{claim.repairReference}</p></div> : null}{claim.resolutionRemarks ? <div className="sm:col-span-2"><p className="text-xs text-green-700">Remarks</p><p className="mt-1 whitespace-pre-wrap text-green-900">{claim.resolutionRemarks}</p></div> : null}</div></section> : null}
        </div>

        <section className="self-start rounded-xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-4">
          <div className="flex overflow-x-auto border-b border-slate-200 p-1" role="tablist">{[{ id: "history", label: "History", icon: History }, { id: "notes", label: "Internal notes", icon: LockKeyhole }, { id: "messages", label: "Customer messages", icon: Mail }].map((item) => { const Icon = item.icon; return <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={`flex min-w-max items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold ${tab === item.id ? "bg-brand text-white" : "text-slate-500 hover:bg-slate-50"}`} onClick={() => setTab(item.id)}><Icon className="h-3.5 w-3.5" /> {item.label}</button>; })}</div>
          <div className="max-h-[calc(100vh-260px)] min-h-[520px] overflow-y-auto p-5">
            {tab === "history" ? <><p className="mb-5 text-xs text-slate-500">Immutable, append-only claim activity. Entries cannot be edited or deleted.</p><Timeline items={history} />{!history.length ? <p className="py-10 text-center text-sm text-slate-400">No history entries</p> : null}</> : null}
            {tab === "notes" ? <><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><LockKeyhole className="h-4 w-4" /> Internal — not visible to the customer.</p><WebsiteTextarea id="internal-note" className="mt-3" label="Internal note" value={note} onChange={(event) => setNote(event.target.value)} /><GuardedButton className="mt-3" isLoading={working} disabledReason={!note.trim() ? "Write an internal note first." : available.addNote.reason} onClick={addNote}><MessageSquare className="h-4 w-4" /> Add internal note</GuardedButton></div><div className="mt-4 space-y-3">{notes.map((item, index) => <article key={item.id || index} className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-amber-950">{item.note || item.content || item.text || "Note recorded"}</p><p className="mt-2 text-xs text-amber-700">{item.createdByName || item.authorName || "Team member"} · {formatWebsiteDateTime(getDateValue(item))}</p></article>)}</div></> : null}
            {tab === "messages" ? <><div className="rounded-xl border border-brand/20 bg-brand-light p-4"><p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Mail className="h-4 w-4 text-brand" /> Visible to the customer.</p><WebsiteTextarea id="customer-message" className="mt-3" label="Customer message" value={message} onChange={(event) => setMessage(event.target.value)} /><GuardedButton className="mt-3" isLoading={working} disabledReason={!message.trim() ? "Write a customer message first." : available.addMessage.reason} onClick={requestMessageSend}><Send className="h-4 w-4" /> Send message to customer</GuardedButton></div><div className="mt-4 space-y-3">{messages.map((item, index) => <article key={item.id || index} className="rounded-xl border border-brand/20 bg-brand-light p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{item.message || item.content || item.text || "Message sent"}</p><p className="mt-2 text-xs text-slate-500">{item.createdByName || item.senderName || "Team member"} · {formatWebsiteDateTime(getDateValue(item))}</p></article>)}</div></> : null}
          </div>
        </section>
      </div>

      <AppModal isOpen={Boolean(action)} isBusy={working} title={action ? ACTIONS[action].label : "Claim action"} onClose={() => setAction(null)}>
        {action ? <div className="space-y-4">{action === "assign" ? <AppSelect label="Assign to" required options={userOptions} value={actionForm.assignedToUserId} error={actionErrors.assignedToUserId} onChange={(value) => setActionForm((current) => ({ ...current, assignedToUserId: value }))} /> : null}{action === "resolve" ? <><AppSelect label="Resolution type" required options={WARRANTY_RESOLUTION_NAMES.filter((name) => name !== "None").map((name) => ({ label: name, value: WARRANTY_RESOLUTION_TYPE[name] }))} value={actionForm.resolutionType} error={actionErrors.resolutionType} onChange={(value) => setActionForm((current) => ({ ...current, resolutionType: value }))} />{Number(actionForm.resolutionType) === WARRANTY_RESOLUTION_TYPE.Refund ? <div className="grid gap-4 sm:grid-cols-2"><AppInput label="Refund amount" required type="number" min="0.01" step="0.01" value={actionForm.refundAmount} error={actionErrors.refundAmount} onChange={(event) => setActionForm((current) => ({ ...current, refundAmount: event.target.value }))} /><AppInput label="Refund reference" required value={actionForm.refundReference} error={actionErrors.refundReference} onChange={(event) => setActionForm((current) => ({ ...current, refundReference: event.target.value }))} /></div> : null}{Number(actionForm.resolutionType) === WARRANTY_RESOLUTION_TYPE.Replacement ? <div className="grid gap-4 sm:grid-cols-2"><AppInput label="Replacement reference" required value={actionForm.replacementReference} error={actionErrors.replacementReference} onChange={(event) => setActionForm((current) => ({ ...current, replacementReference: event.target.value }))} /><AppInput label="Tracking number" value={actionForm.replacementTrackingNumber} onChange={(event) => setActionForm((current) => ({ ...current, replacementTrackingNumber: event.target.value }))} /></div> : null}{Number(actionForm.resolutionType) === WARRANTY_RESOLUTION_TYPE.Repair ? <AppInput label="Repair reference" required value={actionForm.repairReference} error={actionErrors.repairReference} onChange={(event) => setActionForm((current) => ({ ...current, repairReference: event.target.value }))} /> : null}<WebsiteTextarea id="resolution-remarks" label="Resolution remarks" value={actionForm.resolutionRemarks} onChange={(event) => setActionForm((current) => ({ ...current, resolutionRemarks: event.target.value }))} /></> : null}<WebsiteTextarea id="action-remark" label={action === "reject" ? "Reason for rejection" : "Remark"} required={action === "reject"} value={actionForm.remark} error={actionErrors.remark} onChange={(event) => setActionForm((current) => ({ ...current, remark: event.target.value }))} /><div className="flex justify-end gap-2"><AppButton variant="secondary" onClick={() => setAction(null)}>Cancel</AppButton><AppButton variant={action === "reject" ? "danger" : "primary"} isLoading={working} onClick={submitAction}>{ACTIONS[action].label}</AppButton></div></div> : null}
      </AppModal>
      <WebsiteConfirmModal isOpen={confirmMessage} isLoading={working} title="Send customer message?" description="This message will be sent to the customer." confirmLabel="Send message" onClose={() => setConfirmMessage(false)} onConfirm={sendMessage} />
    </div>
  );
};

export default WebsiteWarrantyDetailPage;
