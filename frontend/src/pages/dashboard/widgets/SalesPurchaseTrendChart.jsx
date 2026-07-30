import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AccessibleChartTable from "../../../components/common/AccessibleChartTable";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  isEmptyCollection,
} from "../dashboardHelpers";
import {
  ChartSkeleton,
  WidgetCard,
  WidgetEmpty,
  WidgetError,
} from "./WidgetState";

const TrendTooltip = ({ active, label, payload }) => {
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const row = payload[0]?.payload ?? {};

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg">
      <p className="font-semibold text-slate-900">{label}</p>
      <div className="mt-2 space-y-1 text-slate-600">
        <p>Sales: {formatCurrency(row.salesAmount)}</p>
        <p>Purchases: {formatCurrency(row.purchaseAmount)}</p>
        <p>Difference: {formatCurrency(row.difference)}</p>
        <p className="text-xs text-slate-500">
          {formatNumber(row.salesTransactionCount)} sales txns ·{" "}
          {formatNumber(row.purchaseTransactionCount)} purchase txns
        </p>
      </div>
    </div>
  );
};

const SalesPurchaseTrendChart = ({ error, isLoading, onRetry, rows }) => {
  if (isLoading) {
    return <ChartSkeleton tall />;
  }

  return (
    <WidgetCard
      title="Sales vs Purchase Trend"
      description="Sales and purchase movement over the selected period."
    >
      {error ? (
        <WidgetError message={error} onRetry={onRetry} />
      ) : isEmptyCollection(rows) ? (
        <WidgetEmpty />
      ) : (
        <>
          <div
            role="img"
            aria-label="Bar chart comparing sales and purchases by period"
            className="h-[300px]"
          >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ bottom: 0, left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="periodLabel"
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatCompactCurrency}
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={76}
              />
              <Tooltip content={<TrendTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="salesAmount"
                name="Sales"
                fill="var(--app-accent)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="purchaseAmount"
                name="Purchases"
                fill="var(--color-slate-400)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          </div>
          <AccessibleChartTable
            caption="Sales versus purchase trend data"
            columns={[
              { key: "periodLabel", label: "Period" },
              {
                key: "salesAmount",
                label: "Sales",
                render: (row) => formatCurrency(row.salesAmount),
              },
              {
                key: "purchaseAmount",
                label: "Purchases",
                render: (row) => formatCurrency(row.purchaseAmount),
              },
              {
                key: "difference",
                label: "Difference",
                render: (row) => formatCurrency(row.difference),
              },
              {
                key: "salesTransactionCount",
                label: "Sales transactions",
                render: (row) => formatNumber(row.salesTransactionCount),
              },
              {
                key: "purchaseTransactionCount",
                label: "Purchase transactions",
                render: (row) => formatNumber(row.purchaseTransactionCount),
              },
            ]}
            rows={rows}
          />
        </>
      )}
    </WidgetCard>
  );
};

export default SalesPurchaseTrendChart;
