import { CalendarDays, RefreshCw } from "lucide-react";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import {
  DASHBOARD_DATE_PRESETS,
  COMPARISON_PERIODS,
  GROUP_BY_OPTIONS,
  getDatePresetRange,
} from "./dashboardHelpers";

const DashboardFilters = ({
  filters,
  isRefreshing = false,
  onChange,
  onRefresh,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.4)]">
      <div className="flex flex-wrap items-start gap-3">
        <div className="grid min-w-0 gap-3 sm:grid-cols-[160px_150px_150px]">
          <AppSelect
            value={filters.datePreset}
            onChange={(value) => {
              if (value === "custom") {
                onChange({ datePreset: value });
                return;
              }

              onChange({
                datePreset: value,
                ...getDatePresetRange(value),
              });
            }}
            options={DASHBOARD_DATE_PRESETS.map(({ label, value }) => ({
              label,
              value,
            }))}
            aria-label="Dashboard date preset"
          />
          <AppInput
            type="date"
            value={filters.fromDate ?? ""}
            onChange={(event) =>
              onChange({
                datePreset: "custom",
                fromDate: event.target.value,
              })
            }
            aria-label="Dashboard from date"
          />
          <AppInput
            type="date"
            value={filters.toDate ?? ""}
            onChange={(event) =>
              onChange({
                datePreset: "custom",
                toDate: event.target.value,
              })
            }
            aria-label="Dashboard to date"
          />
        </div>

        <AppSelect
          value={filters.comparisonPeriod}
          onChange={(value) => onChange({ comparisonPeriod: value })}
          options={COMPARISON_PERIODS}
          className="min-w-[180px]"
          aria-label="Comparison period"
        />

        <AppSelect
          value={filters.groupBy}
          onChange={(value) => onChange({ groupBy: value })}
          options={GROUP_BY_OPTIONS}
          className="min-w-[140px]"
          aria-label="Trend grouping"
        />

        <AppButton
          variant="secondary"
          className="px-3"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </AppButton>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <CalendarDays className="h-3.5 w-3.5" />
        Dashboard filters are shareable through the current URL.
      </div>
    </div>
  );
};

export default DashboardFilters;
