import {
  ClipboardCopy,
  Eye,
  EyeOff,
  History,
  NotebookText,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import AppButton from "../../components/common/AppButton";
import AppModal from "../../components/common/AppModal";
import AppTooltip from "../../components/common/AppTooltip";
import {
  canDeleteDataBookEntry,
  canEditDataBookEntry,
} from "../../utils/dataBookPermissions";
import VisibilityPill from "./VisibilityPill";

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const DetailItem = ({ label, mono = false, value }) => (
  <div>
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {label}
    </dt>
    <dd className={`mt-1 text-sm text-slate-700 ${mono ? "font-mono" : ""}`}>
      {value || "—"}
    </dd>
  </div>
);

const MaybeDisabledButton = ({ disabled, reason, children }) =>
  disabled ? <AppTooltip label={reason}>{children}</AppTooltip> : children;

const EntryDetailModal = ({
  capabilities,
  entry,
  isLoading,
  isOpen,
  onClose,
  onCopy,
  onDelete,
  onEdit,
  onHistory,
}) => {
  const [showValue, setShowValue] = useState(() => !entry?.isPrivate);

  const editAllowed = canEditDataBookEntry(capabilities, entry);
  const deleteAllowed = canDeleteDataBookEntry(capabilities, entry);

  return (
    <AppModal isOpen={isOpen} maxWidth="max-w-3xl" onClose={onClose}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <NotebookText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-slate-900">
            {entry?.name || "Entry details"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Full reference value and audit metadata.
          </p>
        </div>
      </div>

      {isLoading || !entry ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Value
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-brand hover:bg-brand-light"
                  onClick={() => setShowValue((current) => !current)}
                >
                  {showValue ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showValue ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-brand hover:bg-brand-light"
                  onClick={() => onCopy(entry.value)}
                >
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
            </div>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-sm leading-6 text-slate-700">
              {showValue ? entry.value || "—" : "••••••••••••"}
            </pre>
          </div>

          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <DetailItem label="Description" value={entry.description} />
            <DetailItem label="Category" value={entry.category} />
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Visibility</dt>
              <dd className="mt-1"><VisibilityPill isPrivate={entry.isPrivate} /></dd>
            </div>
            <DetailItem label="Owner" value={entry.isPrivate ? entry.ownerUserName : "—"} />
            <DetailItem label="Created by" value={entry.createdByName} />
            <DetailItem label="Created at" value={formatDateTime(entry.createdAtUtc)} />
            <DetailItem label="Updated by" value={entry.updatedByName} />
            <DetailItem label="Updated at" value={formatDateTime(entry.updatedAtUtc)} />
          </dl>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
            <AppButton variant="secondary" onClick={onClose}>Close</AppButton>
            <AppButton variant="secondary" onClick={() => onHistory(entry)}>
              <History className="h-4 w-4" />
              History
            </AppButton>
            {capabilities.canEdit ? (
              <MaybeDisabledButton
                disabled={!editAllowed}
                reason="You can only edit your own private entries."
              >
                <AppButton
                  disabled={!editAllowed}
                  variant="secondary"
                  onClick={() => onEdit(entry)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </AppButton>
              </MaybeDisabledButton>
            ) : null}
            {capabilities.canDelete ? (
              <MaybeDisabledButton
                disabled={!deleteAllowed}
                reason="You can only delete your own private entries."
              >
                <AppButton
                  disabled={!deleteAllowed}
                  variant="danger"
                  onClick={() => onDelete(entry)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </AppButton>
              </MaybeDisabledButton>
            ) : null}
          </div>
        </>
      )}
    </AppModal>
  );
};

export default EntryDetailModal;
