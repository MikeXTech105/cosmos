import { AlertCircle, Clock, ReceiptText, TrendingUp } from "lucide-react";

import { InvoiceStatCard } from "./InvoiceShared";

const InvoiceStats = ({
  loading = false,
  metricScope,
  overdue,
  totalInvoices,
  totalSales,
  totalScope,
  unpaid,
}) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <InvoiceStatCard
        icon={ReceiptText}
        label="Total Invoices"
        loading={loading}
        value={totalInvoices}
        scope={totalScope}
        colorClass="bg-brand-light text-brand"
      />
      <InvoiceStatCard
        icon={TrendingUp}
        label="Total Sales"
        loading={loading}
        value={totalSales}
        scope={metricScope}
        colorClass="bg-emerald-50 text-emerald-600"
      />
      <InvoiceStatCard
        icon={AlertCircle}
        label="Unpaid"
        loading={loading}
        value={unpaid}
        scope={metricScope}
        colorClass="bg-amber-50 text-amber-600"
      />
      <InvoiceStatCard
        icon={Clock}
        label="Overdue"
        loading={loading}
        value={overdue}
        scope={metricScope}
        colorClass="bg-red-50 text-red-600"
      />
    </div>
  );
};

export default InvoiceStats;
