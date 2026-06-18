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
import salesInvoiceReducer from "./slices/sales/invoiceSlice";
import sidebarReducer from "./slices/sidebarSlice";
import unitReducer from "./slices/inventory/unitSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    categories: categoryReducer,
    hrAttendance: hrAttendanceReducer,
    hrDepartments: hrDepartmentReducer,
    hrDesignations: hrDesignationReducer,
    hrEmployees: hrEmployeeReducer,
    hrLeaves: hrLeaveReducer,
    hrPayroll: hrPayrollReducer,
    hrShifts: hrShiftReducer,
    items: itemReducer,
    salesInvoices: salesInvoiceReducer,
    sidebar: sidebarReducer,
    units: unitReducer,
  },
});
