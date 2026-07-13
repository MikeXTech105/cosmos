export const expenseByCategoryColumns = [
  { header: "Category", key: "categoryName", width: "260px" },
  { align: "right", format: "number", header: "Expenses", key: "expenseCount" },
  {
    align: "right",
    format: "currency",
    header: "Expense Amount",
    key: "expenseAmount",
  },
  { align: "right", format: "currency", header: "Tax", key: "taxAmount" },
  { align: "right", format: "currency", header: "Total", key: "totalAmount" },
];

export const expenseByPartyColumns = [
  { header: "Party", key: "partyName", width: "260px" },
  { align: "right", format: "number", header: "Expenses", key: "expenseCount" },
  {
    align: "right",
    format: "currency",
    header: "Expense Amount",
    key: "expenseAmount",
  },
  { align: "right", format: "currency", header: "Tax", key: "taxAmount" },
  { align: "right", format: "currency", header: "Total", key: "totalAmount" },
];

export const monthlyExpenseColumns = [
  { header: "Month", key: "monthName", width: "180px" },
  { align: "right", format: "number", header: "Year", key: "expenseYear" },
  { align: "right", format: "number", header: "Expenses", key: "expenseCount" },
  {
    align: "right",
    format: "currency",
    header: "Expense Amount",
    key: "expenseAmount",
  },
  { align: "right", format: "currency", header: "Tax", key: "taxAmount" },
  { align: "right", format: "currency", header: "Total", key: "totalAmount" },
];
