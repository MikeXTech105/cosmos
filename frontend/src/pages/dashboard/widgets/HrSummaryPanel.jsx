import { Clock, UserCheck, UserMinus, UsersRound } from "lucide-react";

import AppInput from "../../../components/common/AppInput";
import {
  formatDashboardValue,
  formatDate,
  formatPercent,
  getDashboardValue,
  toDashboardNumber,
} from "../dashboardHelpers";
import {
  ListSkeleton,
  WidgetCard,
  WidgetError,
} from "./WidgetState";

const getAttendancePercentage = (summary) => {
  const present = toDashboardNumber(summary?.presentToday);
  const active = toDashboardNumber(summary?.activeEmployees);

  if (present === null || active === null || active <= 0) {
    return null;
  }

  return (present / active) * 100;
};

const stats = [
  { icon: UsersRound, key: "activeEmployees", label: "Active" },
  { icon: UserCheck, key: "presentToday", label: "Present" },
  { icon: UserMinus, key: "absentToday", label: "Absent" },
  { icon: Clock, key: "onLeaveToday", label: "On Leave" },
  { icon: Clock, key: "lateArrivals", label: "Late" },
  { icon: UserMinus, key: "notCheckedIn", label: "Not Checked In" },
  { icon: UsersRound, key: "newJoinersThisMonth", label: "New Joiners" },
  { icon: UserMinus, key: "resignedEmployees", label: "Resigned" },
];

const HrSummaryPanel = ({
  error,
  filters,
  isLoading,
  onChange,
  onRetry,
  summary,
}) => {
  const attendancePercentage = getAttendancePercentage(summary);

  return (
    <WidgetCard
      title="HR Summary"
      description={`Attendance snapshot for ${formatDate(getDashboardValue(summary, "attendanceDate", filters.attendanceDate))}.`}
      actions={
        <AppInput
          type="date"
          value={filters.attendanceDate ?? ""}
          onChange={(event) => onChange({ attendanceDate: event.target.value })}
          className="h-10 w-40"
          label="Attendance date"
        />
      }
    >
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <WidgetError message={error} onRetry={onRetry} />
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-600">Attendance</span>
              <span className="font-bold text-slate-900">
                {attendancePercentage === null
                  ? "-"
                  : formatPercent(attendancePercentage)}
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand"
                style={{
                  width:
                    attendancePercentage === null
                      ? "0%"
                      : `${Math.min(100, Math.max(0, attendancePercentage))}%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.key}
                  className="rounded-xl border border-slate-100 px-3 py-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light text-brand">
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        {stat.label}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatDashboardValue(
                          getDashboardValue(summary, stat.key),
                          "number",
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </WidgetCard>
  );
};

export default HrSummaryPanel;
