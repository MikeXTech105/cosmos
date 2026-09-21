import {
  ArrowLeftRight,
  Landmark,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppDateRangeFilter from "../../../components/common/AppDateRangeFilter";
import { sumRojmelMoney } from "../../../utils/rojmelTotals";
import PageHeader from "../../../components/common/PageHeader";
import { rojmelReportService } from "../../../services/rojmel/reportService";
import { fetchRojmelDashboard } from "../../../store/slices/rojmel/rojmelDashboardSlice";
import { getApiErrorMessage } from "../../../utils/apiError";
import {
  formatRojmelCurrency,
  formatRojmelDate,
  getRojmelCollection,
  getRojmelMonthRange,
  toRojmelInputDate,
} from "../rojmelHelpers";
import {
  RojmelAmount,
  RojmelState,
  RojmelStatCard,
  RojmelTransactionTypeBadge,
  RojmelWalletTypeBadge,
} from "../RojmelShared";

const RojmelDashboardPage = () => {
  const dispatch = useDispatch();
  const dashboard = useSelector((state) => state.rojmelDashboard);
  const [dates, setDates] = useState(() => getRojmelMonthRange());
  const [categoryExpense, setCategoryExpense] = useState([]);
  const [categoryError, setCategoryError] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);

  const params = useMemo(
    () => ({ ...dates, RecentTransactionCount: 10 }),
    [dates],
  );

  const loadDashboard = useCallback(async () => {
    await dispatch(fetchRojmelDashboard(params));
  }, [dispatch, params]);

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      setCategoryLoading(true);
      setCategoryError("");
      try {
        const response = await rojmelReportService.getCategoryExpense(
          { ...dates, PageNumber: 1, PageSize: 10 },
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setCategoryExpense(getRojmelCollection(response.data));
        }
      } catch (error) {
        if (!controller.signal.aborted && error?.name !== "CanceledError") {
          setCategoryError(
            getApiErrorMessage(error, "Unable to load category spending."),
          );
        }
      } finally {
        if (!controller.signal.aborted) setCategoryLoading(false);
      }
    });

    return () => controller.abort();
  }, [dates]);

  useEffect(() => {
    if (dashboard.error) toast.error(dashboard.error);
  }, [dashboard.error]);

  const summary = dashboard.summary ?? {};
  const net = Number(summary.totalIncome || 0) - Number(summary.totalExpense || 0);
  const cashInHand = summary.isAllWalletView
    ? summary.totalWalletBalance
    : summary.companyWalletBalance ?? summary.totalWalletBalance;
  const scope = summary.isAllWalletView ? "all-matching" : "own-wallet";

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <WalletCards className="h-3.5 w-3.5" />
            Rojmel / Daily Cash Book
          </>
        }
        title="Cash position at a glance"
        description="Today in, today out and cash in hand—without mixing transfers into profit or loss."
        actions={
          <AppButton
            className="h-10"
            disabled={dashboard.loading}
            variant="secondary"
            onClick={loadDashboard}
          >
            <RefreshCw className={`h-4 w-4 ${dashboard.loading ? "animate-spin" : ""}`} />
            Refresh
          </AppButton>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <AppDateRangeFilter
            className="w-full sm:w-auto sm:min-w-[300px]"
            fromDate={dates.FromDate}
            toDate={dates.ToDate}
            allowLifetime={false} max={toRojmelInputDate()}
            onChange={({ fromDate, toDate }) => setDates({ FromDate: fromDate, ToDate: toDate })}
          />
        <span className="inline-flex w-fit rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
          {summary.isAllWalletView ? "All wallets" : "Your wallet"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RojmelStatCard
          icon={Landmark}
          label="Cash in Hand"
          scope={scope}
          value={formatRojmelCurrency(cashInHand)}
        />
        <RojmelStatCard
          icon={TrendingUp}
          label="Period Income"
          scope={scope}
          tone="emerald"
          value={formatRojmelCurrency(summary.totalIncome)}
        />
        <RojmelStatCard
          icon={TrendingDown}
          label="Period Expense"
          scope={scope}
          tone="red"
          value={formatRojmelCurrency(summary.totalExpense)}
        />
        <RojmelStatCard
          icon={net >= 0 ? TrendingUp : TrendingDown}
          label="Net"
          scope={scope}
          tone={net >= 0 ? "emerald" : "red"}
          value={formatRojmelCurrency(net)}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Transfers</p>
            <p className="text-lg font-bold tabular-nums text-slate-900">
              {formatRojmelCurrency(summary.totalTransfers)}
            </p>
            <p className="text-xs text-slate-500">Movement only—excluded from income and expense.</p>
          </div>
        </div>
      </div>

      {dashboard.error && !dashboard.loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <RojmelState error={dashboard.error} noun="dashboard" onRetry={loadDashboard} />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Wallet Balances</h2>
              <p className="mt-1 text-xs text-slate-500">Current server-confirmed cash positions.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Wallet</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.walletBalances.map((wallet, index) => (
                    <tr key={wallet.walletId} className="hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-4 py-3 text-xs text-slate-400">{index + 1}</td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-800">{wallet.walletName}</td>
                      <td className="border-b border-slate-100 px-4 py-3"><RojmelWalletTypeBadge value={wallet.walletType} /></td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-semibold tabular-nums text-slate-900">{formatRojmelCurrency(wallet.currentBalance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
                  <tr>
                    <th scope="row" colSpan={3} className="px-4 py-4">Total displayed wallet balances</th>
                    <td className="px-4 py-4 text-right tabular-nums">{formatRojmelCurrency(sumRojmelMoney(dashboard.walletBalances, "currentBalance"))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Recent Transactions</h2>
              <p className="mt-1 text-xs text-slate-500">Latest entries with their running balance.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {dashboard.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-24 text-xs text-slate-500">{formatRojmelDate(transaction.transactionDate)}</div>
                  <div className="min-w-0 flex-1">
                    <RojmelTransactionTypeBadge value={transaction.transactionType} />
                    <p className="mt-1 truncate text-xs text-slate-500">{transaction.categoryName || transaction.description || "Uncategorized"}</p>
                  </div>
                  <div className="text-right text-sm">
                    <RojmelAmount amount={transaction.amount} type={transaction.transactionType} />
                    <p className="mt-1 text-xs tabular-nums text-slate-500">{formatRojmelCurrency(transaction.balanceAfter)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Expense by Category</h2>
        <p className="mt-1 text-xs text-slate-500">Transfers and adjustments are excluded.</p>
        {categoryError ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{categoryError}</p>
        ) : categoryLoading ? (
          <div className="mt-4 h-56 animate-pulse rounded-xl bg-slate-100" />
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryExpense} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="categoryName" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip formatter={(value) => formatRojmelCurrency(value)} />
                <Bar dataKey="expenseAmount" fill="var(--color-brand)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </section>
  );
};

export default RojmelDashboardPage;
