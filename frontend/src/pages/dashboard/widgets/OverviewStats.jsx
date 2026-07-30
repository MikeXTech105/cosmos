import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CreditCard,
  IndianRupee,
  Minus,
  ReceiptText,
  ShoppingCart,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { createElement } from "react";

import {
  dashboardEmptyValue,
  formatCurrency,
  formatDashboardValue,
  formatPercent,
  getDashboardValue,
  toDashboardNumber,
} from "../dashboardHelpers";
import { StatSkeleton, WidgetError } from "./WidgetState";

const MetricIcon = ({ className, icon }) => {
  return createElement(icon, { "aria-hidden": true, className });
};

const buildMetrics = (overview) => [
  {
    format: "currency",
    group: "sales",
    icon: IndianRupee,
    key: "sales.todaySales",
    label: "Today's Sales",
    zeroHint: "No sales recorded yet",
  },
  {
    format: "currency",
    group: "sales",
    growthKey: "sales.growthPercentage",
    icon: ReceiptText,
    key: "sales.selectedPeriodSales",
    label: "Period Sales",
    previousKey: "sales.previousComparablePeriodSales",
    zeroHint: "No sales in this period yet",
  },
  {
    format: "number",
    icon: ReceiptText,
    key: "sales.salesInvoiceCount",
    label: "Sales Invoices",
    zeroHint: "No sales invoices created yet",
  },
  {
    format: "currency",
    icon: WalletCards,
    key: "sales.salesOutstanding",
    label: "Sales Outstanding",
    zeroHint: "No outstanding sales balance",
  },
  {
    format: "currency",
    group: "purchases",
    icon: ShoppingCart,
    key: "purchases.todayPurchases",
    label: "Today's Purchases",
    zeroHint: "No purchases recorded yet",
  },
  {
    format: "currency",
    group: "purchases",
    growthKey: "purchases.growthPercentage",
    icon: ShoppingCart,
    key: "purchases.selectedPeriodPurchases",
    label: "Period Purchases",
    previousKey: "purchases.previousComparablePeriodPurchases",
    zeroHint: "No purchases in this period yet",
  },
  {
    format: "currency",
    icon: CreditCard,
    key: "purchases.purchaseOutstanding",
    label: "Purchase Outstanding",
    zeroHint: "No outstanding purchase balance",
  },
  {
    format: "currency",
    icon: WalletCards,
    key: "expenses.selectedPeriodExpenses",
    label: "Period Expenses",
    zeroHint: "No expenses recorded yet",
  },
  {
    format: "currency",
    icon: Boxes,
    key: "inventory.currentStockValue",
    label: "Stock Value",
    zeroHint: "No stock value recorded yet",
  },
  {
    format: "number",
    icon: AlertTriangle,
    key: "inventory.lowStockCount",
    label: "Low Stock Items",
    zeroHint: "No low-stock items",
  },
  {
    format: "number",
    icon: UsersRound,
    key: "hr.activeEmployees",
    label: "Active Employees",
    zeroHint: "No employees added yet",
  },
  {
    format: "number",
    icon: AlertTriangle,
    key: "alerts.totalAlerts",
    label: "Open Alerts",
    zeroHint: "No open alerts",
  },
].filter((metric) => getDashboardValue(overview, metric.key, null) !== null);

const GrowthChip = ({ growth, previousValue }) => {
  const numericGrowth = toDashboardNumber(growth);
  const isPositive = numericGrowth !== null && numericGrowth > 0;
  const isNegative = numericGrowth !== null && numericGrowth < 0;
  const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span
        className={[
          "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ring-inset",
          isPositive
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : isNegative
              ? "bg-red-50 text-red-700 ring-red-200"
              : "bg-slate-50 text-slate-600 ring-slate-200",
        ].join(" ")}
      >
        <Icon aria-hidden="true" className="h-3 w-3" />
        {numericGrowth === null ? dashboardEmptyValue : formatPercent(numericGrowth)}
      </span>
      <span className="text-xs text-slate-500">
        Prev {formatCurrency(previousValue)}
      </span>
    </div>
  );
};

const OverviewStats = ({ error, isLoading, onRetry, overview }) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <StatSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return <WidgetError message={error} onRetry={onRetry} />;
  }

  const metrics = buildMetrics(overview ?? {});

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const value = getDashboardValue(overview, metric.key);
        const isZero = toDashboardNumber(value) === 0;

        return (
          <div
            key={metric.key}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand ring-1 ring-inset ring-brand/10">
                <MetricIcon icon={metric.icon} className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {metric.label}
                </p>
                <p className="mt-1 truncate text-xl font-bold text-slate-900">
                  {formatDashboardValue(value, metric.format)}
                </p>
                {isZero ? (
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {metric.zeroHint}
                  </p>
                ) : null}
              </div>
            </div>

            {metric.growthKey ? (
              <GrowthChip
                growth={getDashboardValue(overview, metric.growthKey, null)}
                previousValue={getDashboardValue(
                  overview,
                  metric.previousKey,
                  null,
                )}
              />
            ) : (
              !isZero ? (
                <p className="mt-2 text-xs text-slate-500">
                  Current overview metric
                </p>
              ) : null
            )}
          </div>
        );
      })}

      {metrics.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm sm:col-span-2 xl:col-span-4">
          Overview metrics will appear after your first transactions are
          recorded.
        </div>
      )}
    </div>
  );
};

export default OverviewStats;
