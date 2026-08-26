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

import MetricCard from "../../../components/common/MetricCard";
import {
  dashboardEmptyValue,
  formatCurrency,
  formatDashboardValue,
  formatPercent,
  getDashboardValue,
  toDashboardNumber,
} from "../dashboardHelpers";
import { StatSkeleton, WidgetError } from "./WidgetState";

const buildMetrics = (overview) => [
  {
    format: "currency",
    group: "sales",
    icon: IndianRupee,
    key: "sales.todaySales",
    label: "Today's Sales",
  },
  {
    format: "currency",
    group: "sales",
    growthKey: "sales.growthPercentage",
    icon: ReceiptText,
    key: "sales.selectedPeriodSales",
    label: "Period Sales",
    previousKey: "sales.previousComparablePeriodSales",
  },
  {
    format: "number",
    icon: ReceiptText,
    key: "sales.salesInvoiceCount",
    label: "Sales Invoices",
  },
  {
    format: "currency",
    icon: WalletCards,
    key: "sales.salesOutstanding",
    label: "Sales Outstanding",
  },
  {
    format: "currency",
    group: "purchases",
    icon: ShoppingCart,
    key: "purchases.todayPurchases",
    label: "Today's Purchases",
  },
  {
    format: "currency",
    group: "purchases",
    growthKey: "purchases.growthPercentage",
    icon: ShoppingCart,
    key: "purchases.selectedPeriodPurchases",
    label: "Period Purchases",
    previousKey: "purchases.previousComparablePeriodPurchases",
  },
  {
    format: "currency",
    icon: CreditCard,
    key: "purchases.purchaseOutstanding",
    label: "Purchase Outstanding",
  },
  {
    format: "currency",
    icon: WalletCards,
    key: "expenses.selectedPeriodExpenses",
    label: "Period Expenses",
  },
  {
    format: "currency",
    icon: Boxes,
    key: "inventory.currentStockValue",
    label: "Stock Value",
  },
  {
    format: "number",
    icon: AlertTriangle,
    key: "inventory.lowStockCount",
    label: "Low Stock Items",
  },
  {
    format: "number",
    icon: UsersRound,
    key: "hr.activeEmployees",
    label: "Active Employees",
  },
  {
    format: "number",
    icon: AlertTriangle,
    key: "alerts.totalAlerts",
    label: "Open Alerts",
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
        <Icon className="h-3 w-3" />
        {numericGrowth === null ? dashboardEmptyValue : formatPercent(numericGrowth)}
      </span>
      <span className="text-xs text-slate-400">
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
      {metrics.map((metric, index) => {
        const value = getDashboardValue(overview, metric.key);
        const tones = ["brand", "sky", "emerald", "amber", "violet", "red"];

        return (
          <MetricCard
            key={metric.key}
            className="p-5"
            icon={metric.icon}
            label={metric.label}
            tone={tones[index % tones.length]}
            value={formatDashboardValue(value, metric.format)}
            footer={metric.growthKey ? (
              <GrowthChip
                growth={getDashboardValue(overview, metric.growthKey, null)}
                previousValue={getDashboardValue(
                  overview,
                  metric.previousKey,
                  null,
                )}
              />
            ) : (
              <p className="text-xs text-slate-400">
                Current overview metric
              </p>
            )}
          />
        );
      })}

      {metrics.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm sm:col-span-2 xl:col-span-4">
          No overview metrics were returned for this period.
        </div>
      )}
    </div>
  );
};

export default OverviewStats;
