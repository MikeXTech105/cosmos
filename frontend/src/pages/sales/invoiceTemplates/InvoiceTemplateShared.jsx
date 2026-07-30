import {
  formatCurrency,
  formatDate,
  formatNumber,
} from "../invoices/invoiceHelpers";
import { COMPANY_PROFILE } from "./companyProfile";

export const TemplatePage = ({ children, className = "" }) => {
  return (
    <article
      className={[
        "invoice-template mx-auto min-h-[1120px] w-full max-w-[794px] bg-white p-8 text-slate-900 shadow-sm print:shadow-none",
        className,
      ].join(" ")}
    >
      {children}
    </article>
  );
};

export const CompanyBlock = ({ align = "left", company = COMPANY_PROFILE }) => {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Tax Invoice
      </p>
      <h2 className="mt-1 text-2xl font-bold text-slate-950">
        {company.name}
      </h2>
      <p className="mt-1 text-sm font-medium text-slate-700">
        {company.legalName}
      </p>
      <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">
        {company.address}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {company.phone} | {company.email}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-600">
        {company.gstin}
      </p>
    </div>
  );
};

export const CustomerBlock = ({ invoice, title = "Bill To" }) => {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {title}
      </p>
      <h3 className="mt-2 text-base font-bold text-slate-950">
        {invoice.customer.name}
      </h3>
      {invoice.customer.address && (
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {invoice.customer.address}
        </p>
      )}
      <div className="mt-2 space-y-1 text-xs text-slate-500">
        {invoice.customer.mobile && <p>Mobile: {invoice.customer.mobile}</p>}
        {invoice.customer.email && <p>Email: {invoice.customer.email}</p>}
        {invoice.customer.gstin && <p>GSTIN: {invoice.customer.gstin}</p>}
      </div>
    </div>
  );
};

export const MetaGrid = ({ invoice, boxed = false }) => {
  const rows = [
    ["Invoice #", invoice.invoiceNumber],
    ["Invoice Date", formatDate(invoice.invoiceDate)],
    ["Due Date", formatDate(invoice.dueDate)],
    ["Status", invoice.statusLabel],
    ["Payment", invoice.paymentStatusLabel],
  ];

  return (
    <dl
      className={[
        "grid gap-2 text-sm",
        boxed ? "rounded-xl border border-slate-200 bg-slate-50 p-4" : "",
      ].join(" ")}
    >
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4">
          <dt className="text-slate-500">{label}</dt>
          <dd className="text-right font-semibold text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

export const ItemsTable = ({
  accentClass = "bg-slate-950 text-white",
  bordered = true,
  dense = false,
  invoice,
}) => {
  return (
    <table
      className={[
        "w-full table-fixed text-left",
        bordered ? "border border-slate-200" : "",
        dense ? "text-[11px]" : "text-xs",
      ].join(" ")}
    >
      <thead className={accentClass}>
        <tr>
          <th className="w-10 px-2 py-2 font-semibold">#</th>
          <th className="px-2 py-2 font-semibold">Item</th>
          <th className="w-20 px-2 py-2 text-right font-semibold">Qty</th>
          <th className="w-24 px-2 py-2 text-right font-semibold">Rate (₹)</th>
          <th className="w-24 px-2 py-2 text-right font-semibold">Disc</th>
          <th className="w-20 px-2 py-2 text-right font-semibold">GST</th>
          <th className="w-28 px-2 py-2 text-right font-semibold">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        {invoice.items.map((item) => (
          <tr key={item.id} className="border-b border-slate-100">
            <td className="px-2 py-2 align-top text-slate-500">
              {item.serial}
            </td>
            <td className="px-2 py-2 align-top">
              <p className="font-semibold text-slate-900">{item.name}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {[item.hsn && `HSN ${item.hsn}`, item.unit]
                  .filter(Boolean)
                  .join(" | ")}
              </p>
            </td>
            <td className="px-2 py-2 text-right align-top tabular-nums text-slate-700">
              {formatNumber(item.quantity)}
            </td>
            <td className="px-2 py-2 text-right align-top tabular-nums text-slate-700">
              {formatNumber(item.rate)}
            </td>
            <td className="px-2 py-2 text-right align-top tabular-nums text-slate-700">
              {item.discountPercentage > 0
                ? `${formatNumber(item.discountPercentage)}%`
                : formatNumber(item.discountAmount)}
            </td>
            <td className="px-2 py-2 text-right align-top tabular-nums text-slate-700">
              {formatNumber(item.taxPercentage)}%
            </td>
            <td className="px-2 py-2 text-right align-top font-semibold tabular-nums text-slate-900">
              {formatNumber(item.lineTotal)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const TotalsBlock = ({ accent = "text-brand", invoice }) => {
  const rows = [
    ["Subtotal", invoice.subTotal],
    ["Discount", invoice.discountAmount],
    ["Tax", invoice.taxAmount],
    ["Paid", invoice.paidAmount],
    ["Balance Due", invoice.dueAmount],
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <dl className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-semibold text-slate-900">
              {formatCurrency(value)}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
          <dt className="font-bold text-slate-950">Grand Total</dt>
          <dd className={`text-lg font-bold ${accent}`}>
            {formatCurrency(invoice.grandTotal)}
          </dd>
        </div>
      </dl>
    </div>
  );
};

export const TaxBreakup = ({ invoice }) => {
  if (!invoice.taxBreakup.length) {
    return null;
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        Tax Breakup
      </p>
      <table className="mt-2 w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-1 text-left font-semibold">GST</th>
            <th className="py-1 text-right font-semibold">Taxable</th>
            <th className="py-1 text-right font-semibold">Tax</th>
          </tr>
        </thead>
        <tbody>
          {invoice.taxBreakup.map((tax) => (
            <tr key={tax.rate} className="border-b border-slate-100">
              <td className="py-1">{formatNumber(tax.rate)}%</td>
              <td className="py-1 text-right tabular-nums">
                {formatNumber(tax.taxableAmount)}
              </td>
              <td className="py-1 text-right tabular-nums">
                {formatNumber(tax.taxAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const NotesAndTerms = ({ invoice }) => {
  return (
    <div className="grid gap-4 text-xs leading-5 text-slate-500 sm:grid-cols-2">
      <div>
        <p className="font-semibold uppercase tracking-[0.16em] text-slate-400">
          Notes
        </p>
        <p className="mt-2">{invoice.notes || "No additional notes."}</p>
      </div>
      <div>
        <p className="font-semibold uppercase tracking-[0.16em] text-slate-400">
          Terms
        </p>
        <p className="mt-2">
          {invoice.termsAndConditions || COMPANY_PROFILE.terms}
        </p>
      </div>
    </div>
  );
};
