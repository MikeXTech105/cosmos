import { Filter, RotateCcw, Search } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import {
  INVOICE_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
} from "./invoiceHelpers";

const InvoiceFilters = ({
  customerOptions,
  filters,
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_220px_180px_180px_160px_160px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.Search}
            onChange={(event) => onChange({ Search: event.target.value })}
            placeholder="Search invoice number or customer..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <AppSelect
          value={filters.CustomerPartyId}
          onChange={(value) => onChange({ CustomerPartyId: value })}
          options={[
            { value: "all", label: "All customers" },
            ...customerOptions,
          ]}
          aria-label="Filter invoices by customer"
        />

        <AppSelect
          value={filters.Status}
          onChange={(value) => onChange({ Status: value })}
          options={INVOICE_STATUS_OPTIONS}
          aria-label="Filter invoices by status"
        />

        <AppSelect
          value={filters.PaymentStatus}
          onChange={(value) => onChange({ PaymentStatus: value })}
          options={PAYMENT_STATUS_OPTIONS}
          aria-label="Filter invoices by payment status"
        />

        <AppInput
          type="date"
          value={filters.FromDate}
          onChange={(event) => onChange({ FromDate: event.target.value })}
          aria-label="From date"
          className="h-10"
        />

        <AppInput
          type="date"
          value={filters.ToDate}
          onChange={(event) => onChange({ ToDate: event.target.value })}
          aria-label="To date"
          className="h-10"
        />

        <AppButton
          variant="secondary"
          className="h-10 rounded-lg px-3"
          disabled={!hasActiveFilters}
          onClick={onClear}
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </AppButton>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Filter className="h-3.5 w-3.5" />
        {resultCount} invoices on this page
      </div>
    </div>
  );
};

export default InvoiceFilters;
