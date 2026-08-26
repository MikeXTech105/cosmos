import { FileText, Plus, RefreshCw } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import {
  formatCurrency,
  formatDate,
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
  { key: "amount", label: "Amount", align: "right" },
  { key: "status", label: "Status" },
  { key: "payment", label: "Payment" },
  { key: "actions", label: "", align: "right" },
];

const InvoiceTable = ({
  actions,
  error,
  invoices,
  isLoading,
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
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
          <FileText className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          {error ? "Unable to load invoices" : "No invoices found"}
        </h3>
        <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
          {error
            ? error
            : "Create the first sale invoice, or adjust the current filters."}
        </p>
        {(error || onCreate) && (
          <AppButton
            variant={error ? "secondary" : "primary"}
            className="mt-5 h-10"
            onClick={error ? onRetry : onCreate}
          >
            {error ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {error ? "Retry" : "New Invoice"}
          </AppButton>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[420px] flex-col">
      <div className="min-h-0 flex-1 overflow-x-auto">
        <table className="w-full min-w-[980px] table-fixed text-left">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
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
              ? Array.from({ length: 7 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={columns.length} className="px-3 py-3">
                      <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                    </td>
                  </tr>
                ))
              : invoices.map((invoice, index) => (
                  <tr
                    key={invoice.id}
                    tabIndex={0}
                    onClick={() => onSelect(invoice)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(invoice);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <div>
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {invoice.invoiceNumber ?? `INV-${invoice.id}`}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          #{invoice.id}
                        </p>
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {invoice.customerName ?? "Customer"}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {invoice.customerMobileNo || invoice.customerPartyId}
                      </p>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-600">
                      {formatDate(invoice.invoiceDate)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-600">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right text-sm font-semibold text-slate-900">
                      {formatCurrency(invoice.grandTotal)}
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
