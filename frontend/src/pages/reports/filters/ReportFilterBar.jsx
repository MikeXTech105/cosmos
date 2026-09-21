import { Filter, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppDateRangeFilter from "../../../components/common/AppDateRangeFilter";
import AppSelect from "../../../components/common/AppSelect";
import { categoryService } from "../../../services/inventory/categoryService";
import { itemService } from "../../../services/inventory/itemService";
import { unitService } from "../../../services/inventory/unitService";
import { expenseCategoryService } from "../../../services/purchase/expenseCategoryService";
import { partyService } from "../../party/partyService";
import { myWalletService } from "../../../services/rojmel/myWalletService";
import { walletService } from "../../../services/rojmel/walletService";
import { RojmelCategoryType } from "../../../constants/rojmelEnums";
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

const extractList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
};

const compactOption = (value, label) => {
  const text = String(label ?? "").trim();

  return value && text ? { label: text, value } : null;
};

const getPartyOption = (party) => {
  return compactOption(
    party?.id ?? party?.partyId,
    party?.partyName ?? party?.tradeName ?? party?.legalName ?? party?.name,
  );
};

const getItemOption = (item) => {
  const label = [item?.name ?? item?.itemName, item?.itemCode]
    .filter(Boolean)
    .join(" - ");

  return compactOption(item?.id ?? item?.itemId, label);
};

const getCategoryOption = (category) => {
  return compactOption(
    category?.id ?? category?.categoryId,
    category?.name ?? category?.categoryName,
  );
};

const getUnitOption = (unit) => {
  return compactOption(
    unit?.id ?? unit?.unitId,
    unit?.name ?? unit?.unitName ?? unit?.symbol,
  );
};

const getWalletOption = (wallet) =>
  compactOption(
    wallet?.id ?? wallet?.walletId,
    [wallet?.walletName, wallet?.walletCode].filter(Boolean).join(" · "),
  );

const trimLeadingZeroes = (value) => {
  return String(value).replace(/^0+(?=\d)/, "");
};

const lookupRequestMap = {
  categories: () =>
    categoryService.getCategories({
      IsActive: true,
      PageNumber: 1,
      PageSize: 200,
    }),
  expenseCategories: () =>
    expenseCategoryService.getExpenseCategories({
      IsActive: true,
      PageNumber: 1,
      PageSize: 200,
    }),
  items: () =>
    itemService.getItems({
      IsActive: true,
      PageNumber: 1,
      PageSize: 200,
    }),
  parties: () =>
    partyService.getParties({
      IsActive: true,
      PageNumber: 1,
      PageSize: 200,
    }),
  units: () =>
    unitService.getUnits({
      IsActive: true,
      PageNumber: 1,
      PageSize: 200,
    }),
  rojmelWallets: () =>
    walletService.getWallets({
      IsActive: true,
      PageNumber: 1,
      PageSize: 200,
      SortBy: "walletName",
      SortDirection: "asc",
    }),
  rojmelCategories: () =>
    myWalletService.getCategories(RojmelCategoryType.Both),
};

const getNeededLookups = (report) => {
  const needs = new Set();

  (report.filters ?? []).forEach((filter) => {
    const config = normalizeFilterConfig(filter);

    if (config.key === "party") {
      needs.add("parties");
    } else if (config.key === "item") {
      needs.add("items");
    } else if (config.key === "unit") {
      needs.add("units");
    } else if (config.key === "category") {
      needs.add(config.source === "expense" ? "expenseCategories" : "categories");
    } else if (config.key === "rojmelWallet") {
      needs.add("rojmelWallets");
    } else if (config.key === "rojmelCategory") {
      needs.add("rojmelCategories");
    }
  });

  return [...needs];
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
  const [lookups, setLookups] = useState({
    categories: [],
    expenseCategories: [],
    items: [],
    parties: [],
    units: [],
    rojmelCategories: [],
    rojmelWallets: [],
  });
  const [loadingLookups, setLoadingLookups] = useState({});
  const [loadedLookups, setLoadedLookups] = useState({});
  const neededLookups = useMemo(
    () =>
      getNeededLookups(report).filter(
        (key) => key !== "rojmelWallets" || rojmelCapabilities.isAdmin,
      ),
    [report, rojmelCapabilities.isAdmin],
  );

  useEffect(() => {
    let isMounted = true;

    neededLookups.forEach((key) => {
      if (loadedLookups[key] || loadingLookups[key]) {
        return;
      }

      setLoadingLookups((current) => ({ ...current, [key]: true }));

      lookupRequestMap[key]()
        .then((response) => {
          if (!isMounted) {
            return;
          }

          const mapper =
            key === "parties"
              ? getPartyOption
              : key === "items"
                ? getItemOption
                : key === "units"
                  ? getUnitOption
                  : key === "rojmelWallets"
                    ? getWalletOption
                  : getCategoryOption;
          const options = extractList(response).map(mapper).filter(Boolean);

          setLookups((current) => ({ ...current, [key]: options }));
          setLoadedLookups((current) => ({ ...current, [key]: true }));
        })
        .catch(() => {
          if (!isMounted) {
            return;
          }

          setLoadedLookups((current) => ({ ...current, [key]: true }));
          toast.error("Unable to load report filter options.");
        })
        .finally(() => {
          if (isMounted) {
            setLoadingLookups((current) => ({ ...current, [key]: false }));
          }
        });
    });

    return () => {
      isMounted = false;
    };
  }, [loadedLookups, loadingLookups, neededLookups]);

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

    if (config.key === "party") {
      return (
        <AppSelect
          key={param}
          value={filters[param] ?? "all"}
          onChange={(value) => onChange({ [param]: value, PageNumber: 1 })}
          options={withAll(`All ${config.label ?? definition.label}`, lookups.parties)}
          placeholder={config.label ?? definition.label}
          className="min-w-[180px]"
          disabled={disabled || loadingLookups.parties}
          aria-label={`Filter by ${config.label ?? definition.label}`}
        />
      );
    }

    if (config.key === "item") {
      return (
        <AppSelect
          key={param}
          value={filters[param] ?? "all"}
          onChange={(value) => onChange({ [param]: value, PageNumber: 1 })}
          options={withAll(
            config.required ? "Select an item" : "All items",
            lookups.items,
          )}
          placeholder="Item"
          className="min-w-[180px]"
          disabled={disabled || loadingLookups.items}
          aria-label="Filter by item"
        />
      );
    }

    if (config.key === "unit") {
      return (
        <AppSelect
          key="UnitId"
          value={filters.UnitId ?? "all"}
          onChange={(value) => onChange({ PageNumber: 1, UnitId: value })}
          options={withAll("All units", lookups.units)}
          placeholder="Unit"
          className="min-w-[160px]"
          disabled={disabled || loadingLookups.units}
          aria-label="Filter by unit"
        />
      );
    }

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

    if (config.key === "category") {
      const sourceKey =
        config.source === "expense" ? "expenseCategories" : "categories";

      return (
        <AppSelect
          key={`${sourceKey}-${param}`}
          value={filters[param] ?? "all"}
          onChange={(value) => onChange({ [param]: value, PageNumber: 1 })}
          options={withAll(
            config.source === "expense"
              ? "All expense categories"
              : "All categories",
            lookups[sourceKey],
          )}
          placeholder={config.source === "expense" ? "Expense category" : "Category"}
          className="min-w-[180px]"
          disabled={disabled || loadingLookups[sourceKey]}
          aria-label="Filter by category"
        />
      );
    }

    if (config.key === "rojmelWallet") {
      if (!rojmelCapabilities.isAdmin) return null;

      return (
        <AppSelect
          key="WalletId"
          value={filters.WalletId ?? "all"}
          onChange={(value) => onChange({ PageNumber: 1, WalletId: value })}
          options={withAll("All wallets", lookups.rojmelWallets)}
          className="min-w-[190px]"
          disabled={disabled || loadingLookups.rojmelWallets}
          aria-label="Filter by wallet"
        />
      );
    }

    if (config.key === "rojmelCategory") {
      return (
        <AppSelect
          key="RojmelCategoryId"
          value={filters.CategoryId ?? "all"}
          onChange={(value) => onChange({ CategoryId: value, PageNumber: 1 })}
          options={withAll("All categories", lookups.rojmelCategories)}
          className="min-w-[180px]"
          disabled={disabled || loadingLookups.rojmelCategories}
          aria-label="Filter by Rojmel category"
        />
      );
    }

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

    if (config.key === "paymentStatus") {
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
