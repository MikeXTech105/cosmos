export const partyLedgerColumns = [
  { format: "date", header: "Date", key: "entryDate", width: "130px" },
  { header: "Party", key: "partyName", width: "240px" },
  { header: "Source", key: "sourceType" },
  { header: "Entry", key: "entryType" },
  { align: "right", format: "currency", header: "Debit", key: "debit" },
  { align: "right", format: "currency", header: "Credit", key: "credit" },
  { align: "right", format: "currency", header: "Balance", key: "balance" },
  { header: "Notes", key: "notes", sortable: false, width: "260px" },
];

export const partyStatementColumns = [
  { format: "date", header: "Date", key: "entryDate", width: "130px" },
  { header: "Party", key: "partyName", width: "240px" },
  { header: "Source", key: "sourceType" },
  { header: "Entry", key: "entryType" },
  { align: "right", format: "currency", header: "Debit", key: "debit" },
  { align: "right", format: "currency", header: "Credit", key: "credit" },
  { align: "right", format: "currency", header: "Balance", key: "balance" },
  { header: "Notes", key: "notes", sortable: false, width: "260px" },
];

export const receivableAgingColumns = [
  { header: "Party", key: "partyName", width: "260px" },
  {
    align: "right",
    format: "currency",
    header: "Current Balance",
    key: "currentBalance",
  },
  { align: "right", format: "currency", header: "0-30", key: "days0To30" },
  { align: "right", format: "currency", header: "31-60", key: "days31To60" },
  { align: "right", format: "currency", header: "61-90", key: "days61To90" },
  { align: "right", format: "currency", header: "Over 90", key: "daysOver90" },
];

export const payableAgingColumns = receivableAgingColumns;
