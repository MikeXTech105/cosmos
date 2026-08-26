import {
  ACTIVITY_EMPTY_VALUE,
  getActivityStatusTone,
} from "../../utils/activityLogPresentation";

const TONE_CLASSES = {
  danger: "bg-red-50 text-red-700 ring-red-200",
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  success: "bg-green-50 text-green-700 ring-green-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
};

const StatusPill = ({ method, statusCode }) => {
  const hasStatus = statusCode !== null && statusCode !== undefined && statusCode !== "";
  const methodText = String(method ?? "").trim();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasStatus ? (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ring-inset ${TONE_CLASSES[getActivityStatusTone(statusCode)]}`}
        >
          {statusCode}
        </span>
      ) : (
        <span className="text-slate-400">{ACTIVITY_EMPTY_VALUE}</span>
      )}
      {methodText ? (
        <span className="font-mono text-xs text-slate-500">{methodText}</span>
      ) : null}
    </div>
  );
};

export default StatusPill;

