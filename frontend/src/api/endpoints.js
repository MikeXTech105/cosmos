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
};
