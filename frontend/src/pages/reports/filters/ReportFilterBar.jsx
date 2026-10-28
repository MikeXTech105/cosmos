import { Filter, RotateCcw, Search } from "lucide-react";
import { useMemo } from "react";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppDateRangeFilter from "../../../components/common/AppDateRangeFilter";
import AppSelect from "../../../components/common/AppSelect";
import AppLookup from "../../../components/common/AppLookup";
import { reportLookups } from "./reportLookups";
import useRojmelCapabilities from "../../rojmel/useRojmelCapabilities";
import {
  DATE_PRESETS,
  filterRegistry,
  getDatePresetRange,
  getDefaultReportFilters,
  getFilterParamName,
  hasActiveReportFilters,
  normalizeFilterConfig,
} from "./filterRegistry";

const withAll = (label, options) => [{ label, value: "all" }, ...options];

const trimLeadingZeroes = (value) => {
  return String(value).replace(/^0+(?=\d)/, "");
};

const ReportFilterBar = ({
  disabled = false,
  filters,
  onChange,
  onClear,
  report,
  resultCount = 0,
}) => {
  const rojmelCapabilities = useRojmelCapabilities({
    label: "Rojmel.Reports",
    resource: "rojmel.reports",
    route: "/rojmel/reports",
  });
  const renderLookup = (source, param, label, allLabel) => <AppLookup
    key={`${source}-${param}`} value={filters[param] ?? "all"}
    onChange={(value) => onChange({ [param]: value, PageNumber: 1 })}
    {...reportLookups[source]} initialOptions={[{ value: "all", label: allLabel }]}
    disabled={disabled} placeholder={label} aria-label={`Filter by ${label.toLowerCase()}`}
    className="min-w-[180px] flex-1 sm:max-w-[260px]"
  />;

  const defaults = useMemo(() => getDefaultReportFilters(report), [report]);
  const hasActiveFilters = hasActiveReportFilters(report, filters);

  const renderFilter = (filter) => {
    const config = normalizeFilterConfig(filter);
    const definition = filterRegistry[config.key];
    const param = getFilterParamName(config);

    if (config.key === "dateRange") {
      return (
        <div
          key="dateRange"
          className="grid min-w-0 gap-3 sm:grid-cols-[160px_150px_150px]"
        >
          <AppSelect
            value={filters.datePreset ?? "custom"}
            onChange={(value) => {
              if (value === "custom") {
                onChange({ datePreset: value });
                return;
              }

              onChange({
                datePreset: value,
                ...getDatePresetRange(value),
                PageNumber: 1,
              });
            }}
            options={DATE_PRESETS.map(({ label, value }) => ({ label, value }))}
            aria-label="Date preset"
          />
<AppDateRangeFilter
            className="w-full sm:col-span-2 sm:min-w-[260px]"
            fromDate={filters.FromDate ?? ""}
            toDate={filters.ToDate ?? ""}
            allowLifetime={false}
            disabled={disabled}
            onChange={({ fromDate, toDate }) => onChange({ FromDate: fromDate, ToDate: toDate, PageNumber: 1, datePreset: "custom" })}
          />
        </div>
      );
    }

    if (config.key === "search") {
      return (
        <label key="search" className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Search report records"
            value={filters.Search ?? ""}
            onChange={(event) =>
              onChange({ PageNumber: 1, Search: event.target.value })
            }
            placeholder="Search report..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
      );
    }

    if (config.key === "party") return renderLookup("parties", param, config.label ?? definition.label, `All ${config.label ?? definition.label}`);
    if (config.key === "item") return renderLookup("items", param, "Item", config.required ? "Select an item" : "All items");
    if (config.key === "unit") return renderLookup("units", "UnitId", "Unit", "All units");

    if (
      config.key === "movementType" ||
      config.key === "sourceType" ||
      config.key === "stockStatus" ||
      config.key === "top"
    ) {
      return (
        <AppSelect
          key={param}
          value={filters[param] ?? "all"}
          onChange={(value) => onChange({ [param]: value, PageNumber: 1 })}
          options={withAll(`All ${definition.label ?? config.key}`, definition.options)}
          placeholder={definition.label ?? config.key}
          className="min-w-[160px]"
          aria-label={`Filter by ${definition.label ?? config.key}`}
        />
      );
    }

    if (config.key === "category") return renderLookup(config.source === "expense" ? "expenseCategories" : "categories", param, config.source === "expense" ? "Expense category" : "Category", "All categories");
    if (config.key === "rojmelWallet") return rojmelCapabilities.isAdmin ? renderLookup("rojmelWallets", "WalletId", "Wallet", "All wallets") : null;
    if (config.key === "rojmelCategory") return renderLookup("rojmelCategories", "CategoryId", "Rojmel category", "All categories");

    if (
      config.key === "rojmelTransactionType" ||
      config.key === "rojmelStatus"
    ) {
      return (
        <AppSelect
          key={param}
          value={filters[param] ?? "all"}
          onChange={(value) => onChange({ [param]: value, PageNumber: 1 })}
          options={withAll(`All ${definition.label.toLowerCase()}`, definition.options)}
          className="min-w-[170px]"
          aria-label={`Filter by ${definition.label.toLowerCase()}`}
        />
      );
    }

    if (config.key === "asOfDate") {
      return (
        <div key="AsOfDate" className="min-w-[150px]">
          <AppInput
            type="date"
            value={filters.AsOfDate ?? ""}
            onChange={(event) =>
              onChange({ AsOfDate: event.target.value, PageNumber: 1 })
            }
            className="h-10 px-3"
            aria-label="As of date"
          />
        </div>
      );
    }

    if (
      config.key === "inactiveDays" ||
      config.key === "minimumStockValue" ||
      config.key === "minimumTransactions"
    ) {
      const labels = {
        inactiveDays: "Inactive days",
        minimumStockValue: "Min stock value",
        minimumTransactions: "Min transactions",
      };

      return (
        <div key={param} className="min-w-[150px]">
          <AppInput
            type="number"
            min="0"
            step={config.key === "minimumStockValue" ? "0.01" : "1"}
            value={filters[param] ?? ""}
            onChange={(event) =>
              onChange({
                [param]: trimLeadingZeroes(event.target.value),
                PageNumber: 1,
              })
            }
            placeholder={labels[config.key]}
            className="h-10 px-3"
            aria-label={labels[config.key]}
          />
        </div>
      );
    }

    if (config.key === "status") {
      return (
        <AppSelect
          key="Status"
          value={filters.Status ?? "all"}
          onChange={(value) => onChange({ PageNumber: 1, Status: value })}
          options={withAll("All status", definition.getOptions(config))}
          className="min-w-[150px]"
          aria-label="Filter by status"
        />
      );
    }

    if (config.key === "paymentStatus" || config.key === "purchasePaymentStatus") {
      return (
        <AppSelect
          key="PaymentStatus"
          value={filters.PaymentStatus ?? "all"}
          onChange={(value) => onChange({ PageNumber: 1, PaymentStatus: value })}
          options={withAll("All payments", definition.options)}
          className="min-w-[160px]"
          aria-label="Filter by payment status"
        />
      );
    }

    if (config.key === "includeInactive") {
      return (
        <label
          key="IncludeInactive"
          className="flex h-10 min-w-[170px] cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <span className="truncate">Include inactive</span>
          <input
            type="checkbox"
            checked={Boolean(filters.IncludeInactive)}
            onChange={(event) =>
              onChange({
                IncludeInactive: event.target.checked,
                PageNumber: 1,
              })
            }
            className="h-4 w-4 rounded border-slate-300 accent-brand"
          />
        </label>
      );
    }

    if (config.key === "lowStockOnly") {
      return (
        <label
          key="LowStockOnly"
          className="flex h-10 min-w-[160px] cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <span className="truncate">Low stock only</span>
          <input
            type="checkbox"
            checked={Boolean(filters.LowStockOnly)}
            onChange={(event) =>
              onChange({
                LowStockOnly: event.target.checked,
                PageNumber: 1,
              })
            }
            className="h-4 w-4 rounded border-slate-300 accent-brand"
          />
        </label>
      );
    }

    return null;
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start gap-3">
        {(report.filters ?? []).map(renderFilter)}

        <AppButton
          variant="secondary"
          className="h-10 rounded-lg px-3"
          disabled={disabled || !hasActiveFilters}
          onClick={() => onClear(defaults)}
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </AppButton>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Filter className="h-3.5 w-3.5" />
        {resultCount} rows on this page
        {report.group === "rojmel" && (
          <span className="ml-auto rounded-full bg-brand-light px-2.5 py-1 font-semibold text-brand">
            {rojmelCapabilities.isAdmin ? "All wallets" : "Your wallet"}
          </span>
        )}
      </div>
    </div>
  );
};

export default ReportFilterBar;
