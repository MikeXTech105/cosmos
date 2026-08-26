import { Filter, RotateCcw, Search } from "lucide-react";
import { memo } from "react";

import AppSelect from "../../components/common/AppSelect";

const STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const CREDIT_OPTIONS = [
  { value: "all", label: "All credit" },
  { value: "with-limit", label: "With credit limit" },
  { value: "without-limit", label: "No credit limit" },
];

const GST_OPTIONS = [
  { value: "all", label: "All GST" },
  { value: "with-gstin", label: "With GSTIN" },
  { value: "without-gstin", label: "Without GSTIN" },
];

const PartyFilters = ({
  embedded = false,
  filters,
  onChange,
  onClear,
  resultCount,
}) => {
  const hasActiveFilters =
    filters.Search ||
    filters.IsActive !== "all" ||
    filters.creditLimit !== "all" ||
    filters.gst !== "all";

  return (
    <div
      className={[
        "px-4 py-4 sm:px-5",
        embedded
          ? "border-b border-slate-200 bg-slate-50/70"
          : "rounded-2xl border border-slate-200 bg-white shadow-sm",
      ].join(" ")}
    >
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          <Filter className="h-3.5 w-3.5" />
          Search & filters
        </div>
        <p className="text-xs text-slate-500">
          <span className="font-bold tabular-nums text-slate-800">
            {resultCount}
          </span>{" "}
          matching {resultCount === 1 ? "party" : "parties"}
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_170px_190px_170px_auto]">
        <label className="relative block">
          <span className="sr-only">Search parties</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Search parties"
            value={filters.Search}
            onChange={(event) => onChange({ Search: event.target.value })}
            placeholder="Quick search by name, mobile, GSTIN..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <AppSelect
          value={filters.IsActive}
          onChange={(value) => onChange({ IsActive: value })}
          options={STATUS_OPTIONS}
          aria-label="Filter parties by status"
        />

        <AppSelect
          value={filters.creditLimit}
          onChange={(value) => onChange({ creditLimit: value })}
          options={CREDIT_OPTIONS}
          aria-label="Filter parties by credit limit"
        />

        <AppSelect
          value={filters.gst}
          onChange={(value) => onChange({ gst: value })}
          options={GST_OPTIONS}
          aria-label="Filter parties by GST"
        />

        <button
          type="button"
          onClick={onClear}
          disabled={!hasActiveFilters}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </button>
      </div>
    </div>
  );
};

export default memo(PartyFilters);
