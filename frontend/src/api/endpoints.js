export const ENDPOINTS = {
  LOGIN: "/api/auth/login",

  REFRESH_TOKEN: "/api/auth/refresh-token",

  LOGOUT: "/api/auth/logout",

  CHANGE_PASSWORD: "/api/auth/change-password",

  FORGOT_PASSWORD: "/api/auth/forgot-password",

  RESET_PASSWORD: "/api/auth/reset-password",

  ROLES: "/api/roles",

  ROLE_BY_ID: (id) => `/api/roles/${id}`,

  PAGES: "/api/pages",

  PAGE_BY_ID: (id) => `/api/pages/${id}`,

  ROLE_PERMISSIONS: (roleId) => `/api/permissions/role/${roleId}`,

  USERS: "/api/users",

  USER_BY_ID: (id) => `/api/users/${id}`,

  USER_ACTIVATE: (id) => `/api/users/${id}/activate`,

  USER_DEACTIVATE: (id) => `/api/users/${id}/deactivate`,

  USER_ROLES: (id) => `/api/users/${id}/roles`,

  PARTIES: "/api/v1/parties",

  PARTY_BY_ID: (id) => `/api/v1/parties/${id}`,

  PARTY_STATUS: (id) => `/api/v1/parties/${id}/status`,

  PARTY_SETTINGS: "/api/v1/settings/party",

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
};
