import { Filter, RotateCcw, Search } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import MobileFilterSheet from "../../../components/common/MobileFilterSheet";
import AppSelect from "../../../components/common/AppSelect";
import {
  INVOICE_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
} from "./invoiceHelpers";

const InvoiceFilters = ({
  canCreateCustomer = false,
  customerOptions,
  filters,
  onCreateCustomer,
  onChange,
  onClear,
  resultCount,
}) => {
  const hasActiveFilters =
    Boolean(filters.Search) ||
    filters.CustomerPartyId !== "all" ||
    filters.Status !== "all" ||
    filters.PaymentStatus !== "all" ||
    Boolean(filters.FromDate) ||
    Boolean(filters.ToDate);
  const activeFilterCount =
    Number(Boolean(filters.Search)) +
    Number(filters.CustomerPartyId !== "all") +
    Number(filters.Status !== "all") +
    Number(filters.PaymentStatus !== "all") +
    Number(Boolean(filters.FromDate)) +
    Number(Boolean(filters.ToDate));

  return (
    <MobileFilterSheet activeCount={activeFilterCount} onClear={onClear}>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_220px_180px_180px_160px_160px_auto]">
        <label className="relative block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">Search</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 bottom-3 h-4 w-4 text-slate-500" />
          <input
            value={filters.Search}
            onChange={(event) => onChange({ Search: event.target.value })}
            placeholder="Search invoice number or customer..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <AppSelect
          value={filters.CustomerPartyId}
          onChange={(value) => onChange({ CustomerPartyId: value })}
          options={[
            { value: "all", label: "All customers" },
            ...customerOptions,
          ]}
          label="Filter invoices by customer"
          creatable={canCreateCustomer}
          createLabel="Create new customer"
          onCreateClick={onCreateCustomer}
        />

        <AppSelect
          value={filters.Status}
          onChange={(value) => onChange({ Status: value })}
          options={INVOICE_STATUS_OPTIONS}
          label="Filter invoices by status"
        />

        <AppSelect
          value={filters.PaymentStatus}
          onChange={(value) => onChange({ PaymentStatus: value })}
          options={PAYMENT_STATUS_OPTIONS}
          label="Filter invoices by payment status"
        />

        <AppInput
          type="date"
          value={filters.FromDate}
          onChange={(event) => onChange({ FromDate: event.target.value })}
          label="From date"
          className="h-10"
        />

        <AppInput
          type="date"
          value={filters.ToDate}
          onChange={(event) => onChange({ ToDate: event.target.value })}
          label="To date"
          className="h-10"
        />

        <AppButton
          variant="secondary"
          className="h-10 rounded-lg px-3"
          disabled={!hasActiveFilters}
          onClick={onClear}
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Clear
        </AppButton>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Filter aria-hidden="true" className="h-3.5 w-3.5" />
        {resultCount} invoices on this page
      </div>
      </div>
    </MobileFilterSheet>
  );
};

export default InvoiceFilters;
