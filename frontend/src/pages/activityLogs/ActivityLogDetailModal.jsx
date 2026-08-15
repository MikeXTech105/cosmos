import { Check, Copy, FileJson, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import AppButton from "../../components/common/AppButton";
import AppModal from "../../components/common/AppModal";
import {
  ACTIVITY_EMPTY_VALUE,
  ACTIVITY_VALUE_UNAVAILABLE,
  formatActivitySnapshotValue,
  formatActivityTimestamp,
  getActivityActor,
  getActivityDiffFields,
  getActivityEntityLabel,
  getActivitySnapshotValue,
  parseActivitySnapshot,
} from "../../utils/activityLogPresentation";
import ActivityPill from "./ActivityPill";
import StatusPill from "./StatusPill";

const SnapshotFallback = ({ snapshot }) => {
  if (snapshot.kind === "unavailable") {
    return <p className="text-xs italic text-slate-500">{ACTIVITY_VALUE_UNAVAILABLE}</p>;
  }

  if (snapshot.kind === "text") {
    return (
      <p className="whitespace-pre-wrap break-words font-mono text-xs text-slate-700">
        {snapshot.value}
      </p>
    );
  }

  return (
    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700">
      {snapshot.raw}
    </pre>
  );
};

const RawSnapshot = ({ before, after }) => {
  if (!before.raw && !after.raw) return null;

  return (
    <details className="mt-4 rounded-lg border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-600">
        <FileJson className="h-3.5 w-3.5 text-brand" />
        Show raw JSON
      </summary>
      <div className="grid gap-3 border-t border-slate-200 p-3 md:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Before</p>
          {before.raw ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-100">{before.raw}</pre>
          ) : (
            <p className="text-xs italic text-slate-500">{ACTIVITY_VALUE_UNAVAILABLE}</p>
          )}
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">After</p>
          {after.raw ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-100">{after.raw}</pre>
          ) : (
            <p className="text-xs italic text-slate-500">{ACTIVITY_VALUE_UNAVAILABLE}</p>
          )}
        </div>
      </div>
    </details>
  );
};

const ActivityLogDetailModal = ({
  activity,
  copied,
  error,
  isLoading,
  isOpen,
  onClose,
  onCopy,
}) => {
  const [copying, setCopying] = useState(false);
  const before = useMemo(
    () => parseActivitySnapshot(activity?.oldValues),
    [activity?.oldValues],
  );
  const after = useMemo(
    () => parseActivitySnapshot(activity?.newValues),
    [activity?.newValues],
  );
  const changedFields = useMemo(
    () =>
      Array.isArray(activity?.changedFields)
        ? activity.changedFields
            .map((field) => String(field ?? "").trim())
            .filter(Boolean)
        : [],
    [activity],
  );
  const diffFields = useMemo(
    () => getActivityDiffFields(changedFields, before, after),
    [after, before, changedFields],
  );
  const actor = getActivityActor(activity ?? {});
  const contextEntries = [
    ["Request path", activity?.requestPath],
    ["IP address", activity?.ipAddress],
    ["User agent", activity?.userAgent],
    ["Source", activity?.source],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
  const hasRequestContext =
    contextEntries.length > 0 ||
    activity?.httpMethod ||
    activity?.httpStatusCode !== null && activity?.httpStatusCode !== undefined;

  const copyReference = async () => {
    setCopying(true);
    try {
      await onCopy(activity.correlationId);
    } finally {
      setCopying(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      isBusy={isLoading}
      maxWidth="max-w-5xl"
      onClose={onClose}
      title="Activity details"
    >
      {isLoading ? (
        <div className="space-y-4" aria-label="Loading activity details">
          <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{error.message}</p>
        </div>
      ) : activity ? (
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <ActivityPill value={activity.action} />
              <ActivityPill value={activity.module} />
            </div>
            <h3 className="mt-3 text-base font-semibold text-slate-900">
              {getActivityEntityLabel(activity)}
            </h3>
            <time
              className="mt-1 block text-xs tabular-nums text-slate-500"
              title={activity.timestampUtc ?? undefined}
            >
              {formatActivityTimestamp(activity.timestampUtc)}
            </time>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                <UserRound className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Actor</h3>
                <p className={`mt-1 text-sm font-semibold ${actor.isSystem ? "italic text-slate-400" : "text-slate-900"}`}>
                  {actor.primary}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[
                    actor.secondary,
                    activity.userId !== null && activity.userId !== undefined
                      ? `User ID: ${activity.userId}`
                      : "",
                  ].filter(Boolean).join(" · ") || ACTIVITY_EMPTY_VALUE}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Changed fields</h3>
            {changedFields.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {changedFields.map((field) => (
                  <span key={field} className="rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-brand ring-1 ring-inset ring-brand/10">
                    {field}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No field-level changes recorded</p>
            )}
          </section>

          <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold text-slate-900">
              Before / After
              <span className="ml-2 text-xs font-normal text-slate-400">Collapsed by default</span>
            </summary>
            <div className="border-t border-slate-200 p-4">
              {before.kind === "unavailable" ? (
                <p className="mb-3 text-xs italic text-slate-500">
                  Before: {ACTIVITY_VALUE_UNAVAILABLE}
                </p>
              ) : null}
              {after.kind === "unavailable" ? (
                <p className="mb-3 text-xs italic text-slate-500">
                  After: {ACTIVITY_VALUE_UNAVAILABLE}
                </p>
              ) : null}
              {diffFields.length > 0 &&
              before.kind !== "text" &&
              after.kind !== "text" &&
              (before.kind === "object" || after.kind === "object") ? (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="grid grid-cols-[minmax(120px,0.65fr)_minmax(0,1fr)_minmax(0,1fr)] bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <div className="px-3 py-2.5">Field</div>
                    <div className="border-l border-slate-200 px-3 py-2.5">Before</div>
                    <div className="border-l border-slate-200 px-3 py-2.5">After</div>
                  </div>
                  {diffFields.map((field) => (
                    <div key={field} className="grid grid-cols-[minmax(120px,0.65fr)_minmax(0,1fr)_minmax(0,1fr)] border-t border-slate-100">
                      <div className="break-words px-3 py-3 text-xs font-semibold text-slate-600">{field}</div>
                      <div className="whitespace-pre-wrap break-words border-l border-slate-100 px-3 py-3 font-mono text-xs text-slate-700">
                        {formatActivitySnapshotValue(getActivitySnapshotValue(before, field))}
                      </div>
                      <div className="whitespace-pre-wrap break-words border-l border-slate-100 px-3 py-3 font-mono text-xs text-slate-700">
                        {formatActivitySnapshotValue(getActivitySnapshotValue(after, field))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-500">Before</p>
                    <SnapshotFallback snapshot={before} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-500">After</p>
                    <SnapshotFallback snapshot={after} />
                  </div>
                </div>
              )}
              <RawSnapshot before={before} after={after} />
            </div>
          </details>

          {hasRequestContext ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">Request context</h3>
                <StatusPill method={activity.httpMethod} statusCode={activity.httpStatusCode} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Request details aren't recorded for older or non-HTTP events.
              </p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {contextEntries.map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                    <dd className="mt-1 break-words text-xs text-slate-700">{value}</dd>
                    {label === "IP address" ? (
                      <p className="mt-1 text-[11px] leading-4 text-slate-500">
                        Server-observed address. Behind a proxy this may be the proxy's IP.
                      </p>
                    ) : null}
                  </div>
                ))}
              </dl>
            </section>
          ) : (
            <p className="text-xs text-slate-500">
              Request details aren't recorded for older or non-HTTP events.
            </p>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Support reference</h3>
                <p className="mt-1 break-all font-mono text-xs text-slate-700">
                  {activity.correlationId || ACTIVITY_EMPTY_VALUE}
                </p>
              </div>
              {activity.correlationId ? (
                <AppButton
                  variant="secondary"
                  className="h-9 shrink-0 rounded-lg px-3"
                  isLoading={copying}
                  loadingText="Copying…"
                  onClick={copyReference}
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </AppButton>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </AppModal>
  );
};

export default ActivityLogDetailModal;
