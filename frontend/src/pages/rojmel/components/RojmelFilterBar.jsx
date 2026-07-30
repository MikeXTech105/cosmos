import { Filter, RotateCcw, Search } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import MobileFilterSheet from "../../../components/common/MobileFilterSheet";
import AppSelect from "../../../components/common/AppSelect";
import {
  ROJMEL_STATUS_OPTIONS,
  ROJMEL_TRANSACTION_TYPE_OPTIONS,
  ROJMEL_WALLET_TYPE_OPTIONS,
} from "../rojmelHelpers";

const withAll = (label, options) => [{ label, value: "all" }, ...options];

const RojmelFilterBar = ({
  categoryOptions = [],
  filters,
  linkedUserOptions = [],
  onChange,
  onClear,
  resultCount,
  showCategory = false,
  showDates = false,
  showLinkedUser = false,
  showStatus = false,
  showTransactionType = false,
  showWallet = false,
  showWalletStatus = false,
  showWalletType = false,
  walletOptions = [],
}) => {
  const hasFilters = Object.entries(filters).some(([key, value]) => {
    if (["SortBy", "SortDirection"].includes(key)) return false;
    return value !== "" && value !== "all" && value !== undefined;
  });
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (["SortBy", "SortDirection"].includes(key)) return false;
    return value !== "" && value !== "all" && value !== undefined;
  }).length;

  return (
    <MobileFilterSheet activeCount={activeFilterCount} onClear={onClear}>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Object.hasOwn(filters, "Search") && (
          <label className="relative block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">Search</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 bottom-3 h-4 w-4 text-slate-500" />
            <input
              aria-label="Search Rojmel records"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="Search number, category or note…"
              value={filters.Search ?? ""}
              onChange={(event) => onChange({ Search: event.target.value })}
            />
          </label>
        )}
        {showDates && (
          <>
            <AppInput
              label="From date"
              className="h-10 px-3"
              max={filters.ToDate || undefined}
              type="date"
              value={filters.FromDate ?? ""}
              onChange={(event) => onChange({ FromDate: event.target.value })}
            />
            <AppInput
              label="To date"
              className="h-10 px-3"
              min={filters.FromDate || undefined}
              type="date"
              value={filters.ToDate ?? ""}
              onChange={(event) => onChange({ ToDate: event.target.value })}
            />
          </>
        )}
        {showWallet && (
          <AppSelect
            label="Filter by wallet"
            options={withAll("All wallets", walletOptions)}
            value={filters.WalletId ?? "all"}
            onChange={(value) => onChange({ WalletId: value })}
          />
        )}
        {showLinkedUser && (
          <AppSelect
            label="Filter by linked user"
            options={withAll("All linked users", linkedUserOptions)}
            value={filters.LinkedUserId ?? "all"}
            onChange={(value) => onChange({ LinkedUserId: value })}
          />
        )}
        {showCategory && (
          <AppSelect
            label="Filter by category"
            options={withAll("All categories", categoryOptions)}
            value={filters.CategoryId ?? "all"}
            onChange={(value) => onChange({ CategoryId: value })}
          />
        )}
        {showTransactionType && (
          <AppSelect
            label="Filter by transaction type"
            options={ROJMEL_TRANSACTION_TYPE_OPTIONS}
            value={filters.TransactionType ?? "all"}
            onChange={(value) => onChange({ TransactionType: value })}
          />
        )}
        {showStatus && (
          <AppSelect
            label="Filter by status"
            options={ROJMEL_STATUS_OPTIONS}
            value={filters.Status ?? "all"}
            onChange={(value) => onChange({ Status: value })}
          />
        )}
        {showWalletType && (
          <AppSelect
            label="Filter by wallet type"
            options={ROJMEL_WALLET_TYPE_OPTIONS}
            value={filters.WalletType ?? "all"}
            onChange={(value) => onChange({ WalletType: value })}
          />
        )}
        {showWalletStatus && (
          <AppSelect
            label="Filter wallets by status"
            options={[
              { label: "All status", value: "all" },
              { label: "Active", value: true },
              { label: "Inactive", value: false },
            ]}
            value={filters.IsActive ?? "all"}
            onChange={(value) => onChange({ IsActive: value })}
          />
        )}
        <AppButton
          className="h-10 rounded-lg px-3"
          disabled={!hasFilters}
          variant="secondary"
          onClick={onClear}
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Clear
        </AppButton>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Filter aria-hidden="true" className="h-3.5 w-3.5" />
        {resultCount} records on this page
      </div>
      </div>
    </MobileFilterSheet>
  );
};

export default RojmelFilterBar;
