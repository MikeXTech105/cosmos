import { FileText } from "lucide-react";

import EmptyState from "../../../components/common/EmptyState";
import MobileRecordCard, {
  MobileRecordCardSkeleton,
} from "../../../components/common/MobileRecordCard";
import {
  formatDate,
  formatNumber,
  getInvoiceStatusMeta,
  getPaymentStatusMeta,
} from "./invoiceHelpers";
import {
  InvoicePagination,
  InvoiceStatusPill,
} from "./InvoiceShared";
import InvoiceActions from "./InvoiceActions";

const columns = [
  { key: "serialNumber", label: "#" },
  { key: "number", label: "Invoice #" },
  { key: "customer", label: "Customer" },
  { key: "date", label: "Date" },
  { key: "dueDate", label: "Due Date" },
  { key: "amount", label: "Amount (₹)", align: "right" },
  { key: "status", label: "Status" },
  { key: "payment", label: "Payment" },
  { key: "actions", label: "", align: "right" },
];

const InvoiceTable = ({
  activeFilterCount = 0,
  actions,
  error,
  invoices,
  isLoading,
  onClear,
  onCreate,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onSelect,
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
}) => {
  if (!isLoading && (error || invoices.length === 0)) {
    const variant = error
      ? "error"
      : activeFilterCount > 0
        ? "filtered"
        : "empty";

    return (
      <div className="min-h-[420px] px-6">
        <EmptyState
          actionLabel={variant === "empty" ? "New Invoice" : undefined}
          context={
            variant === "empty"
              ? "Sale invoices record customer billing, tax, payment, and balance details."
              : undefined
          }
          hint={
            error
              ? error
              : variant === "filtered"
                ? "Clear the current filters to see all sale invoices."
                : "Create your first sale invoice to begin billing customers."
          }
          icon={FileText}
          title={
            error
              ? "Couldn't load invoices"
              : variant === "filtered"
                ? "No invoices match these filters"
                : "No invoices yet"
          }
          variant={variant}
          onAction={
            error
              ? onRetry
              : variant === "filtered"
                ? onClear
                : onCreate
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[420px] flex-col">
      <div className="grid gap-3 pb-3 md:hidden">
        {isLoading
          ? Array.from({ length: 5 }, (_, index) => (
              <MobileRecordCardSkeleton key={index} />
            ))
          : invoices.map((invoice, index) => (
              <MobileRecordCard
                key={invoice.id}
                serial={(pageNumber - 1) * pageSize + index + 1}
                title={invoice.invoiceNumber ?? `INV-${invoice.id}`}
                subtitle={invoice.customerName ?? "Customer"}
                status={
                  <InvoiceStatusPill
                    meta={getInvoiceStatusMeta(invoice.status)}
                  />
                }
                fields={[
                  {
                    key: "date",
                    label: "Invoice date",
                    value: formatDate(invoice.invoiceDate),
                  },
                  {
                    key: "dueDate",
                    label: "Due date",
                    value: formatDate(invoice.dueDate),
                  },
                  {
                    key: "amount",
                    label: "Amount",
                    value: formatNumber(invoice.grandTotal),
                  },
                  {
                    key: "payment",
                    label: "Payment",
                    value: (
                      <InvoiceStatusPill
                        meta={getPaymentStatusMeta(invoice.paymentStatus)}
                      />
                    ),
                  },
                ]}
                footer={
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center text-sm font-medium text-brand"
                    onClick={() => onSelect(invoice)}
                  >
                    View invoice
                  </button>
                }
                actions={<InvoiceActions invoice={invoice} {...actions} />}
              />
            ))}
      </div>

      <div className="hidden min-h-0 flex-1 overflow-x-auto md:block">
        <table aria-label="Sales invoices" className="w-full min-w-[980px] table-fixed text-left">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th scope="col" aria-label={column.label === "#" ? "Row number" : undefined}
                  key={column.key}
                  className={[
                    "border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500",
                    column.align === "right" ? "text-right" : "",
                    column.key === "customer" ? "w-[22%]" : "",
                    column.key === "actions" ? "w-[184px]" : "",
                  ].join(" ")}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={columns.length} className="px-3 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              : invoices.map((invoice, index) => (
                  <tr
                    key={invoice.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-500">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <button
                        type="button"
                        className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                        onClick={() => onSelect(invoice)}
                      >
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {invoice.invoiceNumber ?? `INV-${invoice.id}`}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          #{invoice.id}
                        </p>
                      </button>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {invoice.customerName ?? "Customer"}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {invoice.customerMobileNo || invoice.customerPartyId}
                      </p>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-600">
                      {formatDate(invoice.invoiceDate)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-600">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right text-sm font-semibold tabular-nums text-slate-900">
                      {formatNumber(invoice.grandTotal)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <InvoiceStatusPill
                        meta={getInvoiceStatusMeta(invoice.status)}
                      />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <InvoiceStatusPill
                        meta={getPaymentStatusMeta(invoice.paymentStatus)}
                      />
                    </td>
                    <td className="border-b border-slate-100 px-2 py-3">
                      <InvoiceActions invoice={invoice} {...actions} />
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <InvoicePagination
        disabled={isLoading}
        invoiceCount={invoices.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </div>
  );
};

export default InvoiceTable;
