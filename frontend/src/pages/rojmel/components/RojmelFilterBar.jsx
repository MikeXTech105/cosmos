import { Filter, RotateCcw, Search } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Object.hasOwn(filters, "Search") && (
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search Rojmel records"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="Search number, category or note…"
              value={filters.Search ?? ""}
              onChange={(event) => onChange({ Search: event.target.value })}
            />
          </label>
        )}
        {showDates && (
          <>
            <AppInput
              aria-label="From date"
              className="h-10 px-3"
              max={filters.ToDate || undefined}
              type="date"
              value={filters.FromDate ?? ""}
              onChange={(event) => onChange({ FromDate: event.target.value })}
            />
            <AppInput
              aria-label="To date"
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
            aria-label="Filter by wallet"
            options={withAll("All wallets", walletOptions)}
            value={filters.WalletId ?? "all"}
            onChange={(value) => onChange({ WalletId: value })}
          />
        )}
        {showLinkedUser && (
          <AppSelect
            aria-label="Filter by linked user"
            options={withAll("All linked users", linkedUserOptions)}
            value={filters.LinkedUserId ?? "all"}
            onChange={(value) => onChange({ LinkedUserId: value })}
          />
        )}
        {showCategory && (
          <AppSelect
            aria-label="Filter by category"
            options={withAll("All categories", categoryOptions)}
            value={filters.CategoryId ?? "all"}
            onChange={(value) => onChange({ CategoryId: value })}
          />
        )}
        {showTransactionType && (
          <AppSelect
            aria-label="Filter by transaction type"
            options={ROJMEL_TRANSACTION_TYPE_OPTIONS}
            value={filters.TransactionType ?? "all"}
            onChange={(value) => onChange({ TransactionType: value })}
          />
        )}
        {showStatus && (
          <AppSelect
            aria-label="Filter by status"
            options={ROJMEL_STATUS_OPTIONS}
            value={filters.Status ?? "all"}
            onChange={(value) => onChange({ Status: value })}
          />
        )}
        {showWalletType && (
          <AppSelect
            aria-label="Filter by wallet type"
            options={ROJMEL_WALLET_TYPE_OPTIONS}
            value={filters.WalletType ?? "all"}
            onChange={(value) => onChange({ WalletType: value })}
          />
        )}
        {showWalletStatus && (
          <AppSelect
            aria-label="Filter wallets by status"
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
          <RotateCcw className="h-4 w-4" />
          Clear
        </AppButton>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Filter className="h-3.5 w-3.5" />
        {resultCount} records on this page
      </div>
    </div>
  );
};

export default RojmelFilterBar;
