import { CalendarDays, RefreshCw } from "lucide-react";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import MobileFilterSheet from "../../components/common/MobileFilterSheet";
import {
  DASHBOARD_DATE_PRESETS,
  COMPARISON_PERIODS,
  GROUP_BY_OPTIONS,
  getDatePresetRange,
  getDefaultDashboardFilters,
} from "./dashboardHelpers";

const DashboardFilters = ({
  filters,
  isRefreshing = false,
  onChange,
  onRefresh,
}) => {
  const defaults = getDefaultDashboardFilters();
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => defaults[key] !== value,
  ).length;
  const handleClear = () => onChange(defaults);

  return (
    <MobileFilterSheet activeCount={activeFilterCount} onClear={handleClear}>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
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
            label="Dashboard date preset"
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
            label="Dashboard from date"
            className="h-10"
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
            label="Dashboard to date"
            className="h-10"
          />
        </div>

        <AppSelect
          value={filters.comparisonPeriod}
          onChange={(value) => onChange({ comparisonPeriod: value })}
          options={COMPARISON_PERIODS}
          className="min-w-[180px]"
          label="Comparison period"
        />

        <AppSelect
          value={filters.groupBy}
          onChange={(value) => onChange({ groupBy: value })}
          options={GROUP_BY_OPTIONS}
          className="min-w-[140px]"
          label="Trend grouping"
        />

        <AppButton
          variant="secondary"
          className="h-10 rounded-lg px-3"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </AppButton>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
        Dashboard filters are shareable through the current URL.
      </div>
      </div>
    </MobileFilterSheet>
  );
};

export default DashboardFilters;
