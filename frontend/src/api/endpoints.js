export const ENDPOINTS = {
  LOGIN: "/api/auth/login",

  AUTH_ME: "/api/auth/me",

  AUTH_ME_UPDATE: "/api/auth/me",

  REFRESH_TOKEN: "/api/auth/refresh-token",

  LOGOUT: "/api/auth/logout",

  CHANGE_PASSWORD: "/api/auth/change-password",

  FORGOT_PASSWORD: "/api/auth/forgot-password",

  RESET_PASSWORD: "/api/auth/reset-password",

  ROLES: "/api/roles",

  ROLES_EXPORT: "/api/roles/export",

  ROLE_BY_ID: (id) => `/api/roles/${id}`,

  PAGES: "/api/pages",

  PAGE_BY_ID: (id) => `/api/pages/${id}`,

  ROLE_PERMISSIONS: (roleId) => `/api/permissions/role/${roleId}`,

  USERS: "/api/users",

  USERS_EXPORT: "/api/users/export",

  USER_BY_ID: (id) => `/api/users/${id}`,

  USER_ACTIVATE: (id) => `/api/users/${id}/activate`,

  USER_DEACTIVATE: (id) => `/api/users/${id}/deactivate`,

  USER_ROLES: (id) => `/api/users/${id}/roles`,

  PARTIES: "/api/v1/parties",

  PARTIES_EXPORT: "/api/v1/parties/export",

  REPORT_EXPORT: "/api/v1/reports/export",

  PARTY_BY_ID: (id) => `/api/v1/parties/${id}`,

  PARTY_STATUS: (id) => `/api/v1/parties/${id}/status`,

  PARTY_SETTINGS: "/api/v1/settings/party",

  GST_VERIFY_GSTIN: "/api/v1/gst/verify-gstin",

  GST_CONFIG_STATUS: "/api/v1/gst/configuration/status",

  SALES_INVOICES: "/api/v1/sales/invoices",

  SALES_INVOICE_BY_ID: (id) => `/api/v1/sales/invoices/${id}`,

  SALES_INVOICE_CONFIRM: (id) => `/api/v1/sales/invoices/${id}/confirm`,

  SALES_INVOICE_CANCEL: (id) => `/api/v1/sales/invoices/${id}/cancel`,

  SALES_INVOICE_PAYMENTS: (id) => `/api/v1/sales/invoices/${id}/payments`,

  EXPENSE_CATEGORIES: "/api/expense-categories",

  EXPENSE_CATEGORY_BY_ID: (id) => `/api/expense-categories/${id}`,

  EXPENSES: "/api/expenses",

  EXPENSE_BY_ID: (id) => `/api/expenses/${id}`,

  PURCHASE_BILLS: "/api/purchase-bills",

  PURCHASE_BILL_BY_ID: (id) => `/api/purchase-bills/${id}`,

  PURCHASE_BILL_BY_SUPPLIER: (supplierId) =>
    `/api/purchase-bills/supplier/${supplierId}`,

  PURCHASE_BILL_CONFIRM: (id) => `/api/purchase-bills/${id}/confirm`,

  PURCHASE_BILL_CANCEL: (id) => `/api/purchase-bills/${id}/cancel`,

  PURCHASE_ORDERS: "/api/purchase-orders",

  PURCHASE_ORDER_BY_ID: (id) => `/api/purchase-orders/${id}`,

  PURCHASE_ORDER_CANCEL: (id) => `/api/purchase-orders/${id}/cancel`,

  PURCHASE_ORDER_CONVERT_TO_BILL: (id) =>
    `/api/purchase-orders/${id}/convert-to-purchase-bill`,

  PURCHASE_RETURNS: "/api/purchase-returns",

  PURCHASE_RETURN_BY_ID: (id) => `/api/purchase-returns/${id}`,

  SUPPLIER_PAYMENTS: "/api/supplier-payments",

  SUPPLIER_PAYMENT_BY_ID: (id) => `/api/supplier-payments/${id}`,

  PURCHASE_REPORT_PURCHASE_SUMMARY:
    "/api/purchase-expense/reports/purchase-summary",

  PURCHASE_REPORT_SUPPLIER_OUTSTANDING:
    "/api/purchase-expense/reports/supplier-outstanding",

  PURCHASE_REPORT_EXPENSE_SUMMARY:
    "/api/purchase-expense/reports/expense-summary",

  PURCHASE_REPORT_CATEGORY_WISE_EXPENSE:
    "/api/purchase-expense/reports/category-wise-expense",

  PURCHASE_REPORT_ITEM_PURCHASE_HISTORY:
    "/api/purchase-expense/reports/item-purchase-history",

  CATEGORIES: "/api/categories",

  CATEGORY_BY_ID: (id) => `/api/categories/${id}`,

  UNITS: "/api/units",

  UNIT_BY_ID: (id) => `/api/units/${id}`,

  ITEMS: "/api/items",

  ITEM_BY_ID: (id) => `/api/items/${id}`,

  // Swagger currently exposes no multipart image-upload endpoint.
  // Set this to the backend upload path when available.
  UPLOAD_IMAGE: null,

  HR_DEPARTMENTS: "/api/hr/departments",

  HR_DEPARTMENT_BY_ID: (id) => `/api/hr/departments/${id}`,

  HR_DESIGNATIONS: "/api/hr/designations",

  HR_DESIGNATION_BY_ID: (id) => `/api/hr/designations/${id}`,

  HR_EMPLOYEES: "/api/hr/employees",

  HR_EMPLOYEE_BY_ID: (id) => `/api/hr/employees/${id}`,

  HR_EMPLOYEE_DROPDOWN: "/api/hr/employees/dropdown",

  HR_EMPLOYEE_REPORTING_MANAGERS: "/api/hr/employees/reporting-managers",

  HR_EMPLOYEE_RESIGN: (id) => `/api/hr/employees/${id}/resign`,

  HR_EMPLOYEE_REJOIN: (id) => `/api/hr/employees/${id}/rejoin`,

  HR_EMPLOYEE_DOCUMENTS: (id) => `/api/hr/employees/${id}/documents`,

  HR_EMPLOYEE_DOCUMENT_BY_ID: (docId) =>
    `/api/hr/employees/documents/${docId}`,

  HR_EMPLOYEE_BANK_DETAILS: (id) =>
    `/api/hr/employees/${id}/bank-details`,

  HR_SHIFTS: "/api/hr/shifts",

  HR_SHIFT_BY_ID: (id) => `/api/hr/shifts/${id}`,

  HR_ATTENDANCE: "/api/hr/attendance",

  HR_ATTENDANCE_BY_EMPLOYEE: (employeeId) =>
    `/api/hr/attendance/${employeeId}`,

  HR_ATTENDANCE_CHECKIN: "/api/hr/attendance/check-in",

  HR_ATTENDANCE_CHECKOUT: "/api/hr/attendance/check-out",

  HR_ATTENDANCE_MANUAL: "/api/hr/attendance/manual-entry",

  HR_ATTENDANCE_ADJUST_REQUEST:
    "/api/hr/attendance/adjustment-request",

  HR_ATTENDANCE_APPROVE_ADJUST:
    "/api/hr/attendance/approve-adjustment",

  HR_ATTENDANCE_REJECT_ADJUST:
    "/api/hr/attendance/reject-adjustment",

  HR_ATTENDANCE_MONTHLY_REPORT:
    "/api/hr/attendance/monthly-report",

  HR_ATTENDANCE_DEPT_REPORT:
    "/api/hr/attendance/department-report",

  HR_LEAVES: "/api/hr/leaves",

  HR_LEAVES_APPLY: "/api/hr/leaves/apply",

  HR_LEAVES_CANCEL: "/api/hr/leaves/cancel",

  HR_LEAVES_APPROVE: "/api/hr/leaves/approve",

  HR_LEAVES_REJECT: "/api/hr/leaves/reject",

  HR_LEAVES_BALANCE: (employeeId) =>
    `/api/hr/leaves/balance?employeeId=${employeeId}`,

  HR_LEAVES_PENDING: "/api/hr/leaves/pending-approvals",

  HR_PAYROLL_PROCESS: "/api/hr/payroll/process",

  HR_PAYROLL_APPROVE: "/api/hr/payroll/approve",

  HR_PAYROLL_RUN_BY_ID: (id) => `/api/hr/payroll/run/${id}`,

  HR_PAYROLL_HISTORY: (employeeId) =>
    `/api/hr/payroll/history/${employeeId}`,

  HR_PAYROLL_PAYSLIP: (employeeId) =>
    `/api/hr/payroll/payslip/${employeeId}`,

  DASHBOARD_OVERVIEW: "/api/v1/dashboard/overview",

  DASHBOARD_SALES_PURCHASE_TREND:
    "/api/v1/dashboard/sales-purchase-trend",

  DASHBOARD_REVENUE_EXPENSE_TREND:
    "/api/v1/dashboard/revenue-expense-trend",

  DASHBOARD_TOP_SELLING_ITEMS: "/api/v1/dashboard/top-selling-items",

  DASHBOARD_TOP_PARTIES: "/api/v1/dashboard/top-parties",

  DASHBOARD_ALERTS: "/api/v1/dashboard/alerts",

  DASHBOARD_HR_SUMMARY: "/api/v1/dashboard/hr-summary",

  // Procurement Planning - Channels
  PP_CHANNELS: "/api/v1/procurement-planning/channels",

  PP_CHANNEL_BY_ID: (id) => `/api/v1/procurement-planning/channels/${id}`,

  PP_CHANNEL_STATUS: (id) =>
    `/api/v1/procurement-planning/channels/${id}/status`,

  // Procurement Planning - SKU mappings
  PP_SKU_MAPPINGS: "/api/v1/procurement-planning/sku-mappings",

  PP_SKU_MAPPINGS_UNMAPPED:
    "/api/v1/procurement-planning/sku-mappings/unmapped",

  PP_SKU_MAPPING_BY_ID: (id) =>
    `/api/v1/procurement-planning/sku-mappings/${id}`,

  PP_SKU_MAPPING_STATUS: (id) =>
    `/api/v1/procurement-planning/sku-mappings/${id}/status`,

  // Procurement Planning - Sales
  PP_SALES_IMPORT_TEMPLATE:
    "/api/v1/procurement-planning/sales/import-template",

  PP_SALES_IMPORT_PREVIEW:
    "/api/v1/procurement-planning/sales/imports/preview",

  PP_SALES_IMPORT_CONFIRM:
    "/api/v1/procurement-planning/sales/imports/confirm",

  PP_SALES_IMPORT_BATCHES:
    "/api/v1/procurement-planning/sales/import-batches",

  PP_SALES_IMPORT_BATCH_BY_ID: (id) =>
    `/api/v1/procurement-planning/sales/import-batches/${id}`,

  PP_SALES_IMPORT_BATCH_CANCEL: (id) =>
    `/api/v1/procurement-planning/sales/import-batches/${id}/cancel`,

  PP_SALES_MANUAL: "/api/v1/procurement-planning/sales/manual",

  PP_SALES_MANUAL_BY_ID: (id) =>
    `/api/v1/procurement-planning/sales/manual/${id}`,

  PP_SALES_HISTORY: "/api/v1/procurement-planning/sales/history",

  PP_SALES_SUMMARY: "/api/v1/procurement-planning/sales/summary",

  // Procurement Planning - BOMs
  PP_BOM_BY_PRODUCT: (productId) =>
    `/api/v1/procurement-planning/boms/products/${productId}`,

  PP_BOM_ISSUES: "/api/v1/procurement-planning/boms/issues",

  // Procurement Planning - Settings
  PP_SETTINGS: "/api/v1/procurement-planning/settings",

  PP_SETTING_BY_ITEM: (itemId) =>
    `/api/v1/procurement-planning/settings/items/${itemId}`,

  PP_SETTINGS_MISSING: "/api/v1/procurement-planning/settings/missing",

  PP_LEAD_TIME_HISTORY:
    "/api/v1/procurement-planning/settings/lead-time-history",

  PP_LEAD_TIME_HISTORY_BY_ITEM: (itemId) =>
    `/api/v1/procurement-planning/settings/items/${itemId}/lead-time-history`,

  // Procurement Planning - Plans
  PP_PLAN_VALIDATE: "/api/v1/procurement-planning/plans/validate",

  PP_PLAN_PREVIEW: "/api/v1/procurement-planning/plans/preview",

  PP_PLAN_RUNS: "/api/v1/procurement-planning/plans/runs",

  PP_PLAN_RUN_BY_ID: (id) =>
    `/api/v1/procurement-planning/plans/runs/${id}`,

  PP_PLAN_RUN_LINES: (id) =>
    `/api/v1/procurement-planning/plans/runs/${id}/lines`,

  PP_PLAN_RUN_LINE: (runId, lineId) =>
    `/api/v1/procurement-planning/plans/runs/${runId}/lines/${lineId}`,

  PP_PLAN_RUN_FINALIZE: (id) =>
    `/api/v1/procurement-planning/plans/runs/${id}/finalize`,

  PP_PLAN_RUN_EXPORT: (id) =>
    `/api/v1/procurement-planning/plans/runs/${id}/export`,

  PP_PLAN_RUN_CANCEL: (id) =>
    `/api/v1/procurement-planning/plans/runs/${id}/cancel`,

  // Supply Chain - shared masters
  SC_CHANNELS: "/api/v1/supply-chain/channels",

  SC_CHANNEL_BY_ID: (id) => `/api/v1/supply-chain/channels/${id}`,

  SC_CHANNEL_STATUS: (id) => `/api/v1/supply-chain/channels/${id}/status`,

  SC_WAREHOUSES: "/api/v1/supply-chain/warehouses",

  SC_WAREHOUSE_BY_ID: (id) => `/api/v1/supply-chain/warehouses/${id}`,

  SC_WAREHOUSE_STATUS: (id) =>
    `/api/v1/supply-chain/warehouses/${id}/status`,

  SC_WAREHOUSE_DROPDOWN: "/api/v1/supply-chain/warehouses/dropdown",

  SC_ITEM_MAPPINGS: "/api/v1/supply-chain/item-mappings",

  SC_ITEM_MAPPING_BY_ID: (id) =>
    `/api/v1/supply-chain/item-mappings/${id}`,

  SC_ITEM_MAPPING_STATUS: (id) =>
    `/api/v1/supply-chain/item-mappings/${id}/status`,

  SC_ITEM_MAPPINGS_UNMATCHED:
    "/api/v1/supply-chain/item-mappings/unmatched",

  SC_PACKAGING_PROFILES: "/api/v1/supply-chain/packaging-profiles",

  SC_PACKAGING_PROFILE_BY_ID: (id) =>
    `/api/v1/supply-chain/packaging-profiles/${id}`,

  SC_PACKAGING_PROFILE_SET_DEFAULT: (id) =>
    `/api/v1/supply-chain/packaging-profiles/${id}/set-default`,

  SC_IMPORT_VALIDATE: "/api/v1/supply-chain/imports/validate",

  SC_IMPORTS: "/api/v1/supply-chain/imports",

  SC_IMPORT_BY_ID: (id) => `/api/v1/supply-chain/imports/${id}`,

  SC_IMPORT_ERRORS: (id) => `/api/v1/supply-chain/imports/${id}/errors`,

  SC_IMPORT_ERROR_EXPORT: (id) =>
    `/api/v1/supply-chain/imports/${id}/error-export`,

  SC_IMPORT_COMMIT: (id) => `/api/v1/supply-chain/imports/${id}/commit`,

  SC_IMPORT_CANCEL: (id) => `/api/v1/supply-chain/imports/${id}/cancel`,

  // Dispatch Planning
  DP_SETTINGS: "/api/v1/dispatch-planning/settings",

  DP_SETTING_BY_ID: (id) => `/api/v1/dispatch-planning/settings/${id}`,

  DP_IMPORT_VALIDATE: "/api/v1/dispatch-planning/imports/validate",

  DP_IMPORTS: "/api/v1/dispatch-planning/imports",

  DP_IMPORT_COMMIT: (id) =>
    `/api/v1/dispatch-planning/imports/${id}/commit`,

  DP_IMPORT_CANCEL: (id) =>
    `/api/v1/dispatch-planning/imports/${id}/cancel`,

  DP_RUNS: "/api/v1/dispatch-planning/runs",

  DP_RUN_BY_ID: (id) => `/api/v1/dispatch-planning/runs/${id}`,

  DP_RUN_CALCULATE: (id) =>
    `/api/v1/dispatch-planning/runs/${id}/calculate`,

  DP_RUN_RECOMMENDATIONS: (id) =>
    `/api/v1/dispatch-planning/runs/${id}/recommendations`,

  DP_RUN_RECOMMENDATION: (runId, recommendationId) =>
    `/api/v1/dispatch-planning/runs/${runId}/recommendations/${recommendationId}`,

  DP_RUN_ALLOCATE: (id) =>
    `/api/v1/dispatch-planning/runs/${id}/allocate`,

  DP_RUN_FINALIZE: (id) =>
    `/api/v1/dispatch-planning/runs/${id}/finalize`,

  DP_RUN_CANCEL: (id) => `/api/v1/dispatch-planning/runs/${id}/cancel`,

  DP_RECOMMENDATION_REPORTS:
    "/api/v1/dispatch-planning/reports/recommendations",

  DP_RECOMMENDATION_REPORT_EXPORT:
    "/api/v1/dispatch-planning/reports/recommendations/export",

  // Shipment Operations
  SO_SHIPMENTS: "/api/v1/shipment-operations/shipments",

  SO_SHIPMENT_BY_ID: (id) =>
    `/api/v1/shipment-operations/shipments/${id}`,

  SO_SHIPMENTS_MANUAL:
    "/api/v1/shipment-operations/shipments/manual",

  SO_SHIPMENTS_FROM_DISPATCH:
    "/api/v1/shipment-operations/shipments/from-dispatch-planning",

  SO_SHIPMENT_TRANSITION: (id) =>
    `/api/v1/shipment-operations/shipments/${id}/transition`,

  SO_SHIPMENT_CANCEL: (id) =>
    `/api/v1/shipment-operations/shipments/${id}/cancel`,

  SO_PACKING_SUGGESTIONS: (shipmentId) =>
    `/api/v1/shipment-operations/shipments/${shipmentId}/packing-suggestions`,

  SO_PACKAGES: (shipmentId) =>
    `/api/v1/shipment-operations/shipments/${shipmentId}/packages`,

  SO_DOCKETS: (shipmentId) =>
    `/api/v1/shipment-operations/shipments/${shipmentId}/dockets`,

  SO_APPOINTMENTS: (shipmentId) =>
    `/api/v1/shipment-operations/shipments/${shipmentId}/appointments`,

  SO_TRACKING_EVENTS: (shipmentId) =>
    `/api/v1/shipment-operations/shipments/${shipmentId}/tracking-events`,

  SO_DELIVERY_ATTEMPTS: (shipmentId) =>
    `/api/v1/shipment-operations/shipments/${shipmentId}/delivery-attempts`,

  SO_RECEIPTS: (shipmentId) =>
    `/api/v1/shipment-operations/shipments/${shipmentId}/receipts`,

  SO_RETURNS: (shipmentId) =>
    `/api/v1/shipment-operations/shipments/${shipmentId}/returns`,

  SO_RETURN_RECEIVE: (id) =>
    `/api/v1/shipment-operations/returns/${id}/receive`,

  SO_FREIGHT_CHARGES: (shipmentId) =>
    `/api/v1/shipment-operations/shipments/${shipmentId}/freight-charges`,

  SO_FREIGHT_SUBMIT: (id) =>
    `/api/v1/shipment-operations/freight-charges/${id}/submit`,

  SO_FREIGHT_APPROVE: (id) =>
    `/api/v1/shipment-operations/freight-charges/${id}/approve`,

  SO_FREIGHT_REJECT: (id) =>
    `/api/v1/shipment-operations/freight-charges/${id}/reject`,

  SO_FREIGHT_MARK_PAID: (id) =>
    `/api/v1/shipment-operations/freight-charges/${id}/mark-paid`,

  SO_FREIGHT_ROJMEL_EXPENSE: (id) =>
    `/api/v1/shipment-operations/freight-charges/${id}/rojmel-expense`,

  SO_TRANSPORTERS: "/api/v1/shipment-operations/transporters",

  SO_TRANSPORTER_BY_ID: (partyId) =>
    `/api/v1/shipment-operations/transporters/${partyId}`,

  SO_REPORTS: "/api/v1/shipment-operations/reports",

  SO_REPORTS_DASHBOARD:
    "/api/v1/shipment-operations/reports/dashboard",

  SO_REPORTS_EXPORT:
    "/api/v1/shipment-operations/reports/export",

  SO_IMPORT_VALIDATE:
    "/api/v1/shipment-operations/imports/validate",

  SO_IMPORTS: "/api/v1/shipment-operations/imports",

  SO_IMPORT_COMMIT: (id) =>
    `/api/v1/shipment-operations/imports/${id}/commit`,

  SO_IMPORT_CANCEL: (id) =>
    `/api/v1/shipment-operations/imports/${id}/cancel`,

  OEE_DASHBOARD_SUMMARY: "/api/v1/oee/dashboard/summary",

  OEE_DASHBOARD_MACHINE_WISE: "/api/v1/oee/dashboard/machine-wise",

  OEE_DASHBOARD_MOULD_WISE: "/api/v1/oee/dashboard/mould-wise",

  OEE_DASHBOARD_TOP_DOWNTIME:
    "/api/v1/oee/dashboard/top-downtime-reasons",

  OEE_DASHBOARD_DAILY_TREND: "/api/v1/oee/dashboard/daily-trend",

  OEE_MACHINES: "/api/v1/oee/machines",

  OEE_MACHINE_BY_ID: (id) => `/api/v1/oee/machines/${id}`,

  OEE_MOULDS: "/api/v1/oee/moulds",

  OEE_MOULD_BY_ID: (id) => `/api/v1/oee/moulds/${id}`,

  OEE_DOWNTIME_REASONS: "/api/v1/oee/downtime-reasons",

  OEE_DOWNTIME_REASON_BY_ID: (id) =>
    `/api/v1/oee/downtime-reasons/${id}`,

  OEE_PRODUCTION_ENTRIES: "/api/v1/oee/production-entries",

  OEE_PRODUCTION_ENTRIES_BULK:
    "/api/v1/oee/production-entries/bulk",

  OEE_PRODUCTION_ENTRY_BY_ID: (id) =>
    `/api/v1/oee/production-entries/${id}`,

  OEE_REPORT_DAILY: "/api/v1/oee/reports/daily",

  OEE_REPORT_MACHINE_PERFORMANCE:
    "/api/v1/oee/reports/machine-performance",

  OEE_REPORT_MOULD_PERFORMANCE:
    "/api/v1/oee/reports/mould-performance",

  OEE_REPORT_DOWNTIME: "/api/v1/oee/reports/downtime",

  OEE_REPORT_EXPORT_EXCEL: "/api/v1/oee/reports/export/excel",

  // --- Rojmel (Daily Cash Book) ---
  // My Wallet (current user)
  ROJMEL_MY_WALLET: "/api/v1/rojmel/my-wallet",
  ROJMEL_MY_WALLET_TRANSACTIONS: "/api/v1/rojmel/my-wallet/transactions",
  ROJMEL_MY_WALLET_LEDGER: "/api/v1/rojmel/my-wallet/ledger",
  ROJMEL_MY_WALLET_INCOME: "/api/v1/rojmel/my-wallet/income",
  ROJMEL_MY_WALLET_EXPENSE: "/api/v1/rojmel/my-wallet/expense",
  ROJMEL_MY_WALLET_CATEGORIES: "/api/v1/rojmel/my-wallet/categories",

  // Wallets (admin)
  ROJMEL_WALLETS: "/api/v1/rojmel/wallets",
  ROJMEL_WALLET_BY_ID: (id) => `/api/v1/rojmel/wallets/${id}`,
  ROJMEL_WALLET_BALANCE: (id) => `/api/v1/rojmel/wallets/${id}/balance`,
  ROJMEL_WALLET_STATUS: (id) => `/api/v1/rojmel/wallets/${id}/status`,

  // Transactions / ledger
  ROJMEL_TRANSACTIONS: "/api/v1/rojmel/transactions",
  ROJMEL_TRANSACTION_BY_ID: (id) => `/api/v1/rojmel/transactions/${id}`,
  ROJMEL_TRANSACTION_INCOME: "/api/v1/rojmel/transactions/income",
  ROJMEL_TRANSACTION_EXPENSE: "/api/v1/rojmel/transactions/expense",
  ROJMEL_TRANSACTION_ADJUSTMENT: "/api/v1/rojmel/transactions/adjustment",
  ROJMEL_TRANSACTION_CANCEL: (id) =>
    `/api/v1/rojmel/transactions/${id}/cancel`,

  // Transfers
  ROJMEL_TRANSFERS: "/api/v1/rojmel/transfers",
  ROJMEL_TRANSFER_BY_ID: (id) => `/api/v1/rojmel/transfers/${id}`,
  ROJMEL_TRANSFER_CANCEL: (id) => `/api/v1/rojmel/transfers/${id}/cancel`,

  // Dashboard
  ROJMEL_DASHBOARD_SUMMARY: "/api/v1/rojmel/dashboard/summary",
  ROJMEL_DASHBOARD_WALLET_BALANCES:
    "/api/v1/rojmel/dashboard/wallet-balances",
  ROJMEL_DASHBOARD_RECENT:
    "/api/v1/rojmel/dashboard/recent-transactions",

  // Reports
  ROJMEL_REPORT_WALLET_LEDGER: "/api/v1/rojmel/reports/wallet-ledger",
  ROJMEL_REPORT_ALL_TRANSACTIONS:
    "/api/v1/rojmel/reports/all-transactions",
  ROJMEL_REPORT_INCOME_EXPENSE:
    "/api/v1/rojmel/reports/income-expense",
  ROJMEL_REPORT_CATEGORY_EXPENSE:
    "/api/v1/rojmel/reports/category-wise-expense",
  ROJMEL_REPORT_TRANSFERS: "/api/v1/rojmel/reports/transfers",
  ROJMEL_REPORT_DAILY_CASH_FLOW:
    "/api/v1/rojmel/reports/daily-cash-flow",
  ROJMEL_REPORT_USER_WALLET_BALANCES:
    "/api/v1/rojmel/reports/user-wallet-balances",
};

const PARTY_REPORTS = {
  customerStatement: "/api/v1/reports/parties/customer-statement",
  ledger: "/api/v1/reports/parties/ledger",
  payableAging: "/api/v1/reports/parties/payable-aging",
  receivableAging: "/api/v1/reports/parties/receivable-aging",
  supplierStatement: "/api/v1/reports/parties/supplier-statement",
};

const EXPENSE_REPORTS = {
  byCategory: "/api/v1/reports/expenses/by-category",
  byParty: "/api/v1/reports/expenses/by-party",
  monthlySummary: "/api/v1/reports/expenses/monthly-summary",
  summary: "/api/v1/reports/expenses/summary",
};

export const REPORTS = {
  sales: {
    byItem: "/api/v1/reports/sales/by-item",
    byParty: "/api/v1/reports/sales/by-party",
    invoices: "/api/v1/reports/sales/invoices",
    paymentsIn: "/api/v1/reports/sales/payments-in",
    receivables: "/api/v1/reports/sales/receivables",
    summary: "/api/v1/reports/sales/summary",
    taxSummary: "/api/v1/reports/sales/tax-summary",
  },
  purchase: {
    bills: "/api/v1/reports/purchase/bills",
    byItem: "/api/v1/reports/purchase/by-item",
    bySupplier: "/api/v1/reports/purchase/by-supplier",
    payables: "/api/v1/reports/purchase/payables",
    paymentsOut: "/api/v1/reports/purchase/payments-out",
    summary: "/api/v1/reports/purchase/summary",
    taxSummary: "/api/v1/reports/purchase/tax-summary",
  },
  inventory: {
    deadStock: "/api/v1/reports/inventory/dead-stock",
    fastMovingItems: "/api/v1/reports/inventory/fast-moving-items",
    itemLedger: (itemId) => `/api/v1/reports/inventory/items/${itemId}/ledger`,
    itemMovement: "/api/v1/reports/inventory/item-movement",
    lowStock: "/api/v1/reports/inventory/low-stock",
    negativeStock: "/api/v1/reports/inventory/negative-stock",
    slowMovingItems: "/api/v1/reports/inventory/slow-moving-items",
    stockLedger: "/api/v1/reports/inventory/stock-ledger",
    stockMovements: "/api/v1/reports/inventory/stock-movements",
    stockSummary: "/api/v1/reports/inventory/stock-summary",
    stockValuation: "/api/v1/reports/inventory/stock-valuation",
  },
  party: PARTY_REPORTS,
  parties: PARTY_REPORTS,
  expense: EXPENSE_REPORTS,
  expenses: EXPENSE_REPORTS,
};
