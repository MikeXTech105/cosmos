import { Filter, RotateCcw, Search } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppDateRangeFilter from "../../../components/common/AppDateRangeFilter";
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

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.4)]">
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_220px_180px_180px_160px_160px_auto]">
        <AppInput
          aria-label="Search invoices"
          leadingIcon={Search}
          value={filters.Search}
          onChange={(event) => onChange({ Search: event.target.value })}
          placeholder="Search invoice number or customer..."
        />

        <AppSelect
          value={filters.CustomerPartyId}
          onChange={(value) => onChange({ CustomerPartyId: value })}
          options={[
            { value: "all", label: "All customers" },
            ...customerOptions,
          ]}
          aria-label="Filter invoices by customer"
          creatable={canCreateCustomer}
          createLabel="Create new customer"
          onCreateClick={onCreateCustomer}
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

<AppDateRangeFilter
            className="w-full sm:col-span-2 sm:min-w-[260px]"
            fromDate={filters.FromDate}
            toDate={filters.ToDate}
            allowLifetime={true}
            onChange={({ fromDate, toDate }) => onChange({ FromDate: fromDate, ToDate: toDate })}
          />

        <AppButton
          variant="secondary"
          className="px-3"
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
