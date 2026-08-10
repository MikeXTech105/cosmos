import { Check, ChevronDown, ChevronRight, ClipboardCopy, History } from "lucide-react";
import { useMemo, useState } from "react";

import AppButton from "../../components/common/AppButton";
import AppModal from "../../components/common/AppModal";
import { getDataBookHistoryDiff } from "../../utils/dataBookHistory";

const ACTION_TONES = {
  created: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  deleted: "bg-red-50 text-red-700 ring-red-200",
  updated: "bg-brand-light text-brand ring-brand/20",
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const displayHistoryValue = (field, value) => {
  if (field === "isPrivate") return value ? "Private" : "Public";
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const EntryHistoryModal = ({
  entry,
  error,
  isLoading,
  isOpen,
  onClose,
  onCopy,
  onRetry,
}) => {
  const [shownValues, setShownValues] = useState(new Set());
  const [shownRaw, setShownRaw] = useState(new Set());
  const records = useMemo(
    () =>
      [...(entry?.history ?? [])].sort(
        (left, right) =>
          new Date(right.changedAtUtc).getTime() -
          new Date(left.changedAtUtc).getTime(),
      ),
    [entry?.history],
  );

  const toggleSet = (setter, id) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AppModal isOpen={isOpen} maxWidth="max-w-4xl" onClose={onClose}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <History className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Entry history</h2>
          <p className="mt-1 text-sm text-slate-500">
            {entry?.name || "Entry"} · newest change first
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Unable to load history</p>
          <p className="mt-1 text-xs text-red-700">{error}</p>
          <AppButton className="mt-3" variant="secondary" onClick={onRetry}>Retry</AppButton>
        </div>
      ) : records.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center">
          <History className="mx-auto h-7 w-7 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-900">No history found</p>
        </div>
      ) : (
        <ol className="relative mt-6 space-y-5 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-slate-200">
          {records.map((record, index) => {
            const id = record.id ?? `${record.changedAtUtc}-${index}`;
            const action = String(record.actionType || "Updated");
            const tone = ACTION_TONES[action.toLowerCase()] ?? "bg-slate-100 text-slate-700 ring-slate-200";
            const diff = getDataBookHistoryDiff(record);
            const valueVisible = shownValues.has(id);
            const rawVisible = shownRaw.has(id);

            return (
              <li key={id} className="relative pl-10">
                <span className="absolute left-2 top-3 grid h-4 w-4 place-items-center rounded-full bg-brand text-white ring-4 ring-white">
                  <Check className="h-2.5 w-2.5" />
                </span>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${tone}`}>
                        {action}
                      </span>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {record.changedByName || "Unknown user"}
                      </p>
                    </div>
                    <time className="text-xs tabular-nums text-slate-500">
                      {formatDateTime(record.changedAtUtc)}
                    </time>
                  </div>

                  {diff.fields.length ? (
                    <div className="mt-4 space-y-3">
                      {diff.fields.map((field) => {
                        const isValue = field.field.toLowerCase() === "value";
                        return (
                          <div key={field.field}>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                {field.field}
                              </p>
                              {isValue ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                                  onClick={() => toggleSet(setShownValues, id)}
                                >
                                  {valueVisible ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                  {valueVisible ? "Hide value change" : "Show value change"}
                                </button>
                              ) : null}
                            </div>
                            {!isValue || valueVisible ? (
                              <div className="mt-1 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                <pre className="overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 font-mono text-xs text-slate-600">{displayHistoryValue(field.field, field.oldValue)}</pre>
                                <span aria-hidden="true" className="text-center text-slate-300">→</span>
                                <pre className="overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 font-mono text-xs text-slate-700">{displayHistoryValue(field.field, field.newValue)}</pre>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {diff.raw.length ? (
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                        onClick={() => toggleSet(setShownRaw, id)}
                      >
                        {rawVisible ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        {rawVisible ? "Hide raw history data" : "Show raw history data"}
                      </button>
                      {rawVisible ? (
                        <div className="mt-2 space-y-2">
                          {diff.raw.map((part, partIndex) => (
                            <pre key={partIndex} className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">{part.raw}</pre>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {record.correlationId ? (
                    <button
                      type="button"
                      className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-slate-400 hover:text-brand"
                      onClick={() => onCopy(record.correlationId, "Reference copied")}
                    >
                      <ClipboardCopy className="h-3.5 w-3.5" />
                      {record.correlationId}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
        <AppButton variant="secondary" onClick={onClose}>Close</AppButton>
      </div>
    </AppModal>
  );
};

export default EntryHistoryModal;
