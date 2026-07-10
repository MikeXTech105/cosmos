import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import categoryReducer from "./slices/inventory/categorySlice";
import hrAttendanceReducer from "./slices/hr/attendanceSlice";
import hrDepartmentReducer from "./slices/hr/departmentSlice";
import hrDesignationReducer from "./slices/hr/designationSlice";
import hrEmployeeReducer from "./slices/hr/employeeSlice";
import hrLeaveReducer from "./slices/hr/leaveSlice";
import hrPayrollReducer from "./slices/hr/payrollSlice";
import hrShiftReducer from "./slices/hr/shiftSlice";
import itemReducer from "./slices/inventory/itemSlice";
import oeeDashboardReducer from "./slices/oee/oeeDashboardSlice";
import oeeDowntimeReasonReducer from "./slices/oee/oeeDowntimeReasonSlice";
import oeeMachineReducer from "./slices/oee/oeeMachineSlice";
import oeeMouldReducer from "./slices/oee/oeeMouldSlice";
import oeeProductionEntryReducer from "./slices/oee/oeeProductionEntrySlice";
import oeeReportReducer from "./slices/oee/oeeReportSlice";
import expenseCategoryReducer from "./slices/purchase/expenseCategorySlice";
import expenseReducer from "./slices/purchase/expenseSlice";
import purchaseBillReducer from "./slices/purchase/purchaseBillSlice";
import purchaseOrderReducer from "./slices/purchase/purchaseOrderSlice";
import purchaseReportReducer from "./slices/purchase/purchaseReportSlice";
import purchaseReturnReducer from "./slices/purchase/purchaseReturnSlice";
import partyGstReducer from "./slices/party/gstSlice";
import rbacPageReducer from "./slices/rbac/pageSlice";
import salesInvoiceReducer from "./slices/sales/invoiceSlice";
import sidebarReducer from "./slices/sidebarSlice";
import supplierPaymentReducer from "./slices/purchase/supplierPaymentSlice";
import unitReducer from "./slices/inventory/unitSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    categories: categoryReducer,
    expenseCategories: expenseCategoryReducer,
    expenses: expenseReducer,
    hrAttendance: hrAttendanceReducer,
    hrDepartments: hrDepartmentReducer,
    hrDesignations: hrDesignationReducer,
    hrEmployees: hrEmployeeReducer,
    hrLeaves: hrLeaveReducer,
    hrPayroll: hrPayrollReducer,
    hrShifts: hrShiftReducer,
    items: itemReducer,
    oeeDashboard: oeeDashboardReducer,
    oeeDowntimeReasons: oeeDowntimeReasonReducer,
    oeeMachines: oeeMachineReducer,
    oeeMoulds: oeeMouldReducer,
    oeeProductionEntries: oeeProductionEntryReducer,
    oeeReports: oeeReportReducer,
    partyGst: partyGstReducer,
    purchaseBills: purchaseBillReducer,
    purchaseOrders: purchaseOrderReducer,
    purchaseReports: purchaseReportReducer,
    purchaseReturns: purchaseReturnReducer,
    rbacPages: rbacPageReducer,
    salesInvoices: salesInvoiceReducer,
    sidebar: sidebarReducer,
    supplierPayments: supplierPaymentReducer,
    units: unitReducer,
  },
});
