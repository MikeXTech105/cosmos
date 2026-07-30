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
  isEmptyCollection,
} from "../dashboardHelpers";
import {
  ChartSkeleton,
  WidgetCard,
  WidgetEmpty,
  WidgetError,
} from "./WidgetState";

const RevenueExpenseTooltip = ({ active, label, payload }) => {
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const row = payload[0]?.payload ?? {};

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg">
      <p className="font-semibold text-slate-900">{label}</p>
      <div className="mt-2 space-y-1 text-slate-600">
        <p>Revenue: {formatCurrency(row.salesRevenue)}</p>
        <p>Expenses: {formatCurrency(row.expenseAmount)}</p>
        <p>Operating Difference: {formatCurrency(row.operatingDifference)}</p>
      </div>
    </div>
  );
};

const RevenueExpenseTrendChart = ({ error, isLoading, onRetry, rows }) => {
  if (isLoading) {
    return <ChartSkeleton tall />;
  }

  return (
    <WidgetCard
      title="Revenue vs Expense Trend"
      description="Operating movement from sales revenue and expenses."
    >
      {error ? (
        <WidgetError message={error} onRetry={onRetry} />
      ) : isEmptyCollection(rows) ? (
        <WidgetEmpty />
      ) : (
        <>
          <div
            role="img"
            aria-label="Bar chart comparing revenue and expenses by period"
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
              <Tooltip content={<RevenueExpenseTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="salesRevenue"
                name="Revenue"
                fill="var(--app-accent)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="expenseAmount"
                name="Expenses"
                fill="var(--color-amber-500)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          </div>
          <AccessibleChartTable
            caption="Revenue versus expense trend data"
            columns={[
              { key: "periodLabel", label: "Period" },
              {
                key: "salesRevenue",
                label: "Revenue",
                render: (row) => formatCurrency(row.salesRevenue),
              },
              {
                key: "expenseAmount",
                label: "Expenses",
                render: (row) => formatCurrency(row.expenseAmount),
              },
              {
                key: "operatingDifference",
                label: "Operating difference",
                render: (row) => formatCurrency(row.operatingDifference),
              },
            ]}
            rows={rows}
          />
        </>
      )}
    </WidgetCard>
  );
};

export default RevenueExpenseTrendChart;
