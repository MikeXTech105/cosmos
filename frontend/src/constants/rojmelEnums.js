export const RojmelCategoryType = {
  Income: 1,
  Expense: 2,
  Both: 3,
};

export const RojmelTransactionType = {
  Income: 1,
  Expense: 2,
  TransferIn: 3,
  TransferOut: 4,
  Adjustment: 5,
  OpeningBalance: 6,
  // CONFIRM: Swagger exposes value 7 without a label; "Other" is provisional.
  Other: 7,
};

export const RojmelTransactionStatus = {
  Active: 1,
  Cancelled: 2,
};

export const RojmelWalletType = {
  Company: 1,
  User: 2,
  External: 3,
  // CONFIRM: Swagger exposes value 4 without a label; "Bank" is provisional.
  Bank: 4,
  // CONFIRM: Swagger exposes value 5 without a label; "Cash" is provisional.
  Cash: 5,
};

export const ROJMEL_TRANSACTION_TYPE_LABELS = {
  [RojmelTransactionType.Income]: "Income",
  [RojmelTransactionType.Expense]: "Expense",
  [RojmelTransactionType.TransferIn]: "Transfer In",
  [RojmelTransactionType.TransferOut]: "Transfer Out",
  [RojmelTransactionType.Adjustment]: "Adjustment",
  [RojmelTransactionType.OpeningBalance]: "Opening Balance",
  [RojmelTransactionType.Other]: "Other",
};

export const ROJMEL_TRANSACTION_STATUS_LABELS = {
  [RojmelTransactionStatus.Active]: "Active",
  [RojmelTransactionStatus.Cancelled]: "Cancelled",
};

export const ROJMEL_WALLET_TYPE_LABELS = {
  [RojmelWalletType.Company]: "Company",
  [RojmelWalletType.User]: "User",
  [RojmelWalletType.External]: "External",
  [RojmelWalletType.Bank]: "Bank",
  [RojmelWalletType.Cash]: "Cash",
};

export const ROJMEL_CATEGORY_TYPE_LABELS = {
  [RojmelCategoryType.Income]: "Income",
  [RojmelCategoryType.Expense]: "Expense",
  [RojmelCategoryType.Both]: "Income & Expense",
};

export const getTransactionTypeLabel = (value) =>
  ROJMEL_TRANSACTION_TYPE_LABELS[Number(value)] ?? "Unknown";

export const getTransactionStatusLabel = (value) =>
  ROJMEL_TRANSACTION_STATUS_LABELS[Number(value)] ?? "Unknown";

export const getWalletTypeLabel = (value) =>
  ROJMEL_WALLET_TYPE_LABELS[Number(value)] ?? "Unknown";

export const getCategoryTypeLabel = (value) =>
  ROJMEL_CATEGORY_TYPE_LABELS[Number(value)] ?? "Unknown";

export const getTransactionTypeTone = (value) => {
  const numericValue = Number(value);

  if (numericValue === RojmelTransactionType.Income) return "income";
  if (numericValue === RojmelTransactionType.Expense) return "expense";
  if (
    numericValue === RojmelTransactionType.TransferIn ||
    numericValue === RojmelTransactionType.TransferOut
  ) {
    return "transfer";
  }
  if (numericValue === RojmelTransactionType.Adjustment) return "adjustment";

  return "neutral";
};

export const isRojmelIncome = (value) =>
  Number(value) === RojmelTransactionType.Income;

export const isRojmelExpense = (value) =>
  Number(value) === RojmelTransactionType.Expense;

export const isRojmelTransfer = (value) =>
  [RojmelTransactionType.TransferIn, RojmelTransactionType.TransferOut].includes(
    Number(value),
  );
