import { AlertCircle, Clock, ReceiptText, TrendingUp } from "lucide-react";

import { InvoiceStatCard } from "./InvoiceShared";

const InvoiceStats = ({ metricScope, overdue, totalInvoices, totalSales, totalScope, unpaid }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <InvoiceStatCard
        icon={ReceiptText}
        label="Total Invoices"
        value={totalInvoices}
        scope={totalScope}
        colorClass="bg-brand-light text-brand"
      />
      <InvoiceStatCard
        icon={TrendingUp}
        label="Total Sales"
        value={totalSales}
        scope={metricScope}
        colorClass="bg-emerald-50 text-emerald-600"
      />
      <InvoiceStatCard
        icon={AlertCircle}
        label="Unpaid"
        value={unpaid}
        scope={metricScope}
        colorClass="bg-amber-50 text-amber-600"
      />
      <InvoiceStatCard
        icon={Clock}
        label="Overdue"
        value={overdue}
        scope={metricScope}
        colorClass="bg-red-50 text-red-600"
      />
    </div>
  );
};

export default InvoiceStats;
