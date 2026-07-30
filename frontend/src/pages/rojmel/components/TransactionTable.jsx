import { Eye, RotateCcw } from "lucide-react";

import AppTooltip from "../../../components/common/AppTooltip";
import { RojmelTransactionStatus } from "../../../constants/rojmelEnums";
import {
  formatRojmelCurrency,
  formatRojmelDate,
} from "../rojmelHelpers";
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
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
        tone === "warning"
          ? "hover:bg-amber-50 hover:text-amber-700"
          : "hover:bg-slate-100 hover:text-brand"
      }`}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
    </button>
  </AppTooltip>
);

const TransactionTable = ({
  canCancel,
  canView,
  error,
  isLoading,
  onCancel,
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
          error={error}
          isLoading={isLoading}
          noun="transactions"
          onRetry={onRetry}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] table-fixed text-left">
            <thead className="bg-slate-50">
              <tr>
                {["#", "Txn No", "Date", ...(showWallet ? ["Wallet"] : []), "Type", "Category", "Amount", "Balance After", "Status", ...(showActions ? ["Actions"] : [])].map(
                  (heading) => (
                    <th
                      key={heading}
                      className={`border-b border-slate-200 px-3 py-3.5 text-xs font-medium uppercase tracking-wide text-slate-500 ${
                        ["Amount", "Balance After", "Actions"].includes(heading)
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
                    className={`transition-colors hover:bg-slate-50 ${cancelled ? "text-slate-400" : ""}`}
                  >
                    <td className="border-b border-slate-100 px-3 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
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
                    <td className="border-b border-slate-100 px-3 py-3.5 text-right text-sm">
                      <RojmelAmount amount={transaction.amount} type={transaction.transactionType} />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3.5 text-right text-sm font-semibold tabular-nums text-slate-900">
                      {formatRojmelCurrency(transaction.balanceAfter)}
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
        </div>
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
