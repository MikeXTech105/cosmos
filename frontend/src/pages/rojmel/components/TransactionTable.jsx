import { Eye, RotateCcw } from "lucide-react";

import AppTooltip from "../../../components/common/AppTooltip";
import ResponsiveTableRegion from "../../../components/common/ResponsiveTableRegion";
import { RojmelTransactionStatus } from "../../../constants/rojmelEnums";
import {
  formatRojmelDate,
} from "../rojmelHelpers";
import { formatNumber } from "../../../utils/format";
import {
  RojmelAmount,
  RojmelPagination,
  RojmelState,
  RojmelStatusPill,
  RojmelTransactionTypeBadge,
} from "../RojmelShared";

const ActionButton = ({ icon: Icon, label, onClick, tone = "default" }) => (
  <AppTooltip label={label}>
    <button
      type="button"
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
        tone === "warning"
          ? "hover:bg-amber-50 hover:text-amber-700"
          : "hover:bg-slate-100 hover:text-brand"
      }`}
      onClick={onClick}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>
  </AppTooltip>
);

const TransactionTable = ({
  canCancel,
  canView,
  createLabel,
  emptyContext,
  error,
  isFiltered,
  isLoading,
  onCancel,
  onClear,
  onCreate,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onView,
  pageNumber,
  pageSize,
  rows,
  showActions = false,
  showWallet = false,
  totalCount,
  totalPages,
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {isLoading || error || rows.length === 0 ? (
        <RojmelState
          context={emptyContext}
          createLabel={createLabel}
          error={error}
          isFiltered={isFiltered}
          isLoading={isLoading}
          noun="transactions"
          onClear={onClear}
          onCreate={onCreate}
          onRetry={onRetry}
        />
      ) : (
        <ResponsiveTableRegion
          mobileConfig={{
            actions: showActions ? (showWallet ? 9 : 8) : undefined,
            fields: showWallet ? [3, 4, 5, 6] : [3, 4, 5, 6],
            serial: 0,
            status: showWallet ? 8 : 7,
            subtitle: 2,
            title: 1,
          }}
        >
          <table className="w-full min-w-[1100px] table-fixed text-left">
            <thead className="bg-slate-50">
              <tr>
                {["#", "Txn No", "Date", ...(showWallet ? ["Wallet"] : []), "Type", "Category", "Amount (₹)", "Balance After (₹)", "Status", ...(showActions ? ["Actions"] : [])].map(
                  (heading) => (
                    <th scope="col" aria-label={heading === "#" ? "Row number" : undefined}
                      key={heading}
                      className={`border-b border-slate-200 px-3 py-3.5 text-xs font-medium uppercase tracking-wide text-slate-500 ${
                        ["Amount (₹)", "Balance After (₹)", "Actions"].includes(heading)
                          ? "text-right"
                          : ""
                      }`}
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((transaction, index) => {
                const cancelled =
                  Number(transaction.status) === RojmelTransactionStatus.Cancelled;

                return (
                  <tr
                    key={transaction.id ?? `${transaction.transactionNo}-${index}`}
                    className={`transition-colors hover:bg-slate-50 ${cancelled ? "text-slate-500" : ""}`}
                  >
                    <td className="border-b border-slate-100 px-3 py-3.5 text-xs font-semibold tabular-nums text-slate-500">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3.5 text-sm font-semibold text-slate-800">
                      {transaction.transactionNo || "-"}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3.5 text-sm text-slate-600">
                      {formatRojmelDate(transaction.transactionDate)}
                    </td>
                    {showWallet && (
                      <td className="border-b border-slate-100 px-3 py-3.5 text-sm text-slate-700">
                        {transaction.walletName || transaction.walletCode || "-"}
                      </td>
                    )}
                    <td className="border-b border-slate-100 px-3 py-3.5">
                      <RojmelTransactionTypeBadge value={transaction.transactionType} />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3.5 text-sm text-slate-600">
                      {transaction.categoryName || "-"}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3.5 text-right text-sm tabular-nums">
                      <RojmelAmount amount={transaction.amount} showCurrency={false} type={transaction.transactionType} />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3.5 text-right text-sm font-semibold tabular-nums text-slate-900">
                      {formatNumber(transaction.balanceAfter)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3.5">
                      <RojmelStatusPill value={transaction.status} />
                    </td>
                    {showActions && (
                      <td className="border-b border-slate-100 px-3 py-3.5">
                        <div className="flex items-center justify-end gap-0.5">
                          {canView && (
                            <ActionButton icon={Eye} label="View transaction" onClick={() => onView(transaction)} />
                          )}
                          {canCancel && !cancelled && (
                            <ActionButton
                              icon={RotateCcw}
                              label="Reverse transaction"
                              tone="warning"
                              onClick={() => onCancel(transaction)}
                            />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ResponsiveTableRegion>
      )}
      {!isLoading && !error && rows.length > 0 && (
        <RojmelPagination
          disabled={isLoading}
          itemCount={rows.length}
          itemLabel="transactions"
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
        />
      )}
    </div>
  );
};

export default TransactionTable;
