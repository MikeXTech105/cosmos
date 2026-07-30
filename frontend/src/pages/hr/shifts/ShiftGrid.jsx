import {
  Clock,
  Moon,
  Plus,
  SunMedium,
  TimerReset,
} from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import MobileRecordCard, {
  MobileRecordCardSkeleton,
} from "../../../components/common/MobileRecordCard";
import {
  formatHrTime,
  getHrBoolean,
  getHrRecordId,
} from "../hrHelpers";
import {
  HrEmptyState,
  HrPagination,
  HrStatusPill,
} from "../HrShared";
import ShiftActions from "./ShiftActions";

const ShiftCard = ({ actions, shift }) => {
  const isNightShift = getHrBoolean(shift.isNightShift, false);
  const ShiftIcon = isNightShift ? Moon : SunMedium;

  return (
    <article className="flex h-full min-h-[220px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={[
              "flex h-10 w-10 items-center justify-center rounded-xl",
              isNightShift
                ? "bg-brand-light text-brand"
                : "bg-amber-50 text-amber-600",
            ].join(" ")}
          >
            <ShiftIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900">
              {shift.shiftName ?? "-"}
            </h3>
            <p className="mt-0.5 font-mono text-xs font-semibold text-slate-500">
              {shift.shiftCode ?? "-"}
            </p>
          </div>
        </div>

        <ShiftActions shift={shift} {...actions} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Clock aria-hidden="true" className="h-3.5 w-3.5" />
            Starts
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatHrTime(shift.startTime)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Clock aria-hidden="true" className="h-3.5 w-3.5" />
            Ends
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatHrTime(shift.endTime)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Grace
          </p>
          <p className="mt-1 font-medium text-slate-900">
            {Number(shift.graceMinutes ?? 0)} min
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Weekly Hours
          </p>
          <p className="mt-1 font-medium text-slate-900">
            {Number(shift.weeklyHours ?? 0)} hrs
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
            isNightShift
              ? "bg-brand-light text-brand ring-brand/20"
              : "bg-amber-50 text-amber-700 ring-amber-200",
          ].join(" ")}
        >
          <TimerReset aria-hidden="true" className="h-3.5 w-3.5" />
          {isNightShift ? "Night Shift" : "Day Shift"}
        </span>
        <HrStatusPill isActive={getHrBoolean(shift.isActive)} />
      </div>
    </article>
  );
};

const ShiftGrid = ({
  activeFilterCount = 0,
  actions,
  error,
  isLoading,
  onCreate,
  onClear,
  onPageChange,
  onPageSizeChange,
  onRetry,
  pageNumber,
  pageSize,
  shifts,
  totalCount,
  totalPages,
}) => {
  if (!isLoading && (error || shifts.length === 0)) {
    const variant = activeFilterCount > 0 ? "filtered" : "empty";

    return (
      <HrEmptyState
        context="Shifts define working hours, grace periods, and weekly schedules."
        icon={Clock}
        error={error}
        errorTitle="Couldn't load shifts"
        title={
          variant === "filtered"
            ? "No shifts match these filters"
            : "No shifts yet"
        }
        description={
          variant === "filtered"
            ? "Clear the current filters to see all shifts."
            : "Create the first shift before assigning employee schedules."
        }
        onRetry={onRetry}
        variant={variant}
        action={
          variant === "filtered" ? (
            <AppButton variant="secondary" onClick={onClear}>
              Clear filters
            </AppButton>
          ) : actions.canCreate ? (
            <AppButton className="mt-5 h-10" onClick={onCreate}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add Shift
            </AppButton>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-3 bg-slate-50/50 p-3 md:hidden">
        {isLoading
          ? Array.from({ length: 5 }, (_, index) => (
              <MobileRecordCardSkeleton key={index} />
            ))
          : shifts.map((shift, index) => (
              <MobileRecordCard
                key={getHrRecordId(shift, "shift") ?? shift.shiftCode}
                serial={(pageNumber - 1) * pageSize + index + 1}
                title={shift.shiftName ?? "-"}
                subtitle={shift.shiftCode ?? "-"}
                status={
                  <HrStatusPill isActive={getHrBoolean(shift.isActive)} />
                }
                fields={[
                  {
                    key: "starts",
                    label: "Starts",
                    value: formatHrTime(shift.startTime),
                  },
                  {
                    key: "ends",
                    label: "Ends",
                    value: formatHrTime(shift.endTime),
                  },
                  {
                    key: "grace",
                    label: "Grace",
                    value: `${Number(shift.graceMinutes ?? 0)} min`,
                  },
                  {
                    key: "weekly",
                    label: "Weekly hours",
                    value: `${Number(shift.weeklyHours ?? 0)} hrs`,
                  },
                ]}
                footer={
                  getHrBoolean(shift.isNightShift, false)
                    ? "Night shift"
                    : "Day shift"
                }
                actions={<ShiftActions shift={shift} {...actions} />}
              />
            ))}
      </div>

      <div className="hidden items-stretch gap-4 bg-slate-50/50 p-4 md:grid md:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="h-[220px] animate-pulse rounded-2xl bg-white ring-1 ring-slate-200"
              />
            ))
          : shifts.map((shift) => (
              <ShiftCard
                key={getHrRecordId(shift, "shift") ?? shift.shiftCode}
                shift={shift}
                actions={actions}
              />
            ))}
      </div>

      <HrPagination
        disabled={isLoading}
        itemLabel="shifts"
        itemCount={shifts.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </div>
  );
};

export default ShiftGrid;
