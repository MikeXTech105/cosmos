import {
  ROJMEL_TRANSACTION_STATUS_LABELS,
  ROJMEL_TRANSACTION_TYPE_LABELS,
  ROJMEL_WALLET_TYPE_LABELS,
  RojmelTransactionStatus,
  RojmelTransactionType,
} from "../../../constants/rojmelEnums";

const typePillMap = Object.fromEntries(
  Object.entries(ROJMEL_TRANSACTION_TYPE_LABELS).map(([key, label]) => {
    const value = Number(key);
    const className =
      value === RojmelTransactionType.Income
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : value === RojmelTransactionType.Expense
          ? "bg-red-50 text-red-700 ring-red-200"
          : [
                RojmelTransactionType.TransferIn,
                RojmelTransactionType.TransferOut,
              ].includes(value)
            ? "bg-blue-50 text-blue-700 ring-blue-200"
            : value === RojmelTransactionType.Adjustment
              ? "bg-amber-50 text-amber-700 ring-amber-200"
              : "bg-slate-50 text-slate-600 ring-slate-200";

    return [key, { className, label }];
  }),
);

const statusPillMap = {
  [RojmelTransactionStatus.Active]: {
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: ROJMEL_TRANSACTION_STATUS_LABELS[RojmelTransactionStatus.Active],
  },
  [RojmelTransactionStatus.Cancelled]: {
    className: "bg-slate-100 text-slate-500 ring-slate-200",
    label: ROJMEL_TRANSACTION_STATUS_LABELS[RojmelTransactionStatus.Cancelled],
  },
};

const transactionColumns = [
  { header: "Txn No", key: "transactionNo", width: "150px" },
  { format: "date", header: "Date", key: "transactionDate", width: "130px" },
  { header: "Wallet", key: "walletName", width: "190px" },
  { format: "pill", header: "Type", key: "transactionType", pillMap: typePillMap, width: "140px" },
  { header: "Category", key: "categoryName", width: "170px" },
  { align: "right", format: "currency", header: "Amount", key: "amount" },
  { align: "right", format: "currency", header: "Balance", key: "balanceAfter" },
  { format: "pill", header: "Status", key: "status", pillMap: statusPillMap, width: "120px" },
  { header: "Reference", key: "referenceNo" },
];

export const rojmelWalletLedgerColumns = transactionColumns;
export const rojmelAllTransactionColumns = transactionColumns;

export const rojmelCategoryExpenseColumns = [
  { header: "Category", key: "categoryName", width: "260px" },
  { align: "right", format: "currency", header: "Expense", key: "expenseAmount" },
  { align: "right", format: "number", header: "Transactions", key: "transactionCount" },
];

export const rojmelTransferColumns = [
  { header: "Transfer No", key: "transferNo", width: "160px" },
  { format: "date", header: "Date", key: "transferDate", width: "130px" },
  { header: "From Wallet", key: "fromWalletName", width: "190px" },
  { header: "To Wallet", key: "toWalletName", width: "190px" },
  { align: "right", format: "currency", header: "Amount", key: "amount" },
  { format: "pill", header: "Status", key: "status", pillMap: statusPillMap },
  { header: "Reference", key: "referenceNo" },
];

export const rojmelDailyCashFlowColumns = [
  { format: "date", header: "Date", key: "transactionDate", width: "160px" },
  { align: "right", format: "currency", header: "Income", key: "income" },
  { align: "right", format: "currency", header: "Expense", key: "expense" },
  { align: "right", format: "currency", header: "Net", key: "netIncomeExpense", tone: "negative" },
];

export const rojmelUserWalletBalanceColumns = [
  { header: "Wallet", key: "walletName", width: "240px" },
  { header: "Linked User", key: "linkedUserName", width: "240px" },
  { align: "right", format: "currency", header: "Current Balance", key: "currentBalance" },
];

export const rojmelWalletBalanceColumns = [
  { header: "Wallet Code", key: "walletCode" },
  { header: "Wallet", key: "walletName", width: "220px" },
  {
    format: "pill",
    header: "Type",
    key: "walletType",
    pillMap: Object.fromEntries(
      Object.entries(ROJMEL_WALLET_TYPE_LABELS).map(([key, label]) => [
        key,
        { className: "bg-brand-light text-brand ring-brand/20", label },
      ]),
    ),
  },
  { header: "Linked User", key: "linkedUserName" },
  { align: "right", format: "currency", header: "Balance", key: "currentBalance" },
];
