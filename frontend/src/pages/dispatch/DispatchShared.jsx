import { Circle } from "lucide-react";

import AppTooltip from "../../components/common/AppTooltip";
import { DISPATCH_RUN_STATUS } from "../../constants/dispatchEnums";
import { normalizeDispatchRunStatus } from "../../utils/dispatchRunLifecycle";
import { getDispatchRunStatusLabel } from "./dispatchDisplay";

export const DispatchRunStatusPill = ({ status }) => {
  const normalized = normalizeDispatchRunStatus(status);
  const tones = {
    [DISPATCH_RUN_STATUS.Draft]:
      "bg-slate-50 text-slate-600 ring-slate-200",
    [DISPATCH_RUN_STATUS.Calculated]:
      "bg-sky-50 text-sky-700 ring-sky-200",
    [DISPATCH_RUN_STATUS.Allocated]:
      "bg-amber-50 text-amber-700 ring-amber-200",
    [DISPATCH_RUN_STATUS.Finalized]:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",
    [DISPATCH_RUN_STATUS.Cancelled]:
      "bg-red-50 text-red-700 ring-red-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${tones[normalized] ?? tones[DISPATCH_RUN_STATUS.Draft]}`}
    >
      <Circle className="h-1.5 w-1.5 fill-current" />
      {getDispatchRunStatusLabel(normalized ?? status)}
    </span>
  );
};

export const DispatchPill = ({ children, tone = "slate" }) => {
  const tones = {
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    brand: "bg-brand-light text-brand ring-brand/20",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    sky: "bg-sky-50 text-sky-700 ring-sky-200",
    slate: "bg-slate-50 text-slate-600 ring-slate-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${tones[tone] ?? tones.slate}`}
    >
      {children}
    </span>
  );
};

export const DisabledDispatchAction = ({ children, reason }) => (
  <AppTooltip label={reason}>
    <span className="inline-flex">{children}</span>
  </AppTooltip>
);
