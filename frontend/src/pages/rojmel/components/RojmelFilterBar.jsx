import { Filter, RotateCcw, Search } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import AppDateRangeFilter from "../../../components/common/AppDateRangeFilter";
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
  const sortOptions = showWalletType
    ? [{ label: "Wallet name", value: "walletName" }, { label: "Created date", value: "createdAt" }]
    : showTransactionType
      ? [{ label: "Transaction date", value: "transactionDate" }, { label: "Amount", value: "amount" }, { label: "Created date", value: "createdAt" }]
      : [];
  const hasFilters = Object.entries(filters).some(([key, value]) => {
    if (["SortBy", "SortDirection"].includes(key)) return Boolean(value);
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
              placeholder={showWalletType ? "Search wallet name or code…" : "Search number, category or note…"}
              value={filters.Search ?? ""}
              onChange={(event) => onChange({ Search: event.target.value })}
            />
          </label>
        )}
        {showDates && (
          <>
<AppDateRangeFilter
            className="w-full sm:col-span-2 sm:min-w-[260px]"
            fromDate={filters.FromDate ?? ""}
            toDate={filters.ToDate ?? ""}
            allowLifetime={true}
            onChange={({ fromDate, toDate }) => onChange({ FromDate: fromDate, ToDate: toDate })}
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
        {sortOptions.length > 0 && (
          <>
            <AppSelect
              aria-label="Sort records by"
              options={[{ label: "Default order", value: "" }, ...sortOptions]}
              value={filters.SortBy ?? ""}
              onChange={(value) => onChange({ SortBy: value, SortDirection: value ? (filters.SortDirection || "desc") : "" })}
            />
            <AppSelect
              aria-label="Sort direction"
              disabled={!filters.SortBy}
              options={[{ label: "Ascending", value: "asc" }, { label: "Descending", value: "desc" }]}
              value={filters.SortDirection || "desc"}
              onChange={(value) => onChange({ SortDirection: value })}
            />
          </>
        )}
        <AppButton
          className="h-10 rounded-lg px-3"
          disabled={!hasFilters}
          variant="secondary"
          onClick={() => {
            if (sortOptions.length) onChange({ SortBy: "", SortDirection: "" });
            onClear();
          }}
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
