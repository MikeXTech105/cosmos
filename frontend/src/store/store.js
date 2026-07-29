import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import dashboardReducer from "./slices/dashboard/dashboardSlice";
import categoryReducer from "./slices/inventory/categorySlice";
import hrAttendanceReducer from "./slices/hr/attendanceSlice";
import hrDepartmentReducer from "./slices/hr/departmentSlice";
import hrDesignationReducer from "./slices/hr/designationSlice";
import hrEmployeeReducer from "./slices/hr/employeeSlice";
import hrLeaveReducer from "./slices/hr/leaveSlice";
import hrPayrollReducer from "./slices/hr/payrollSlice";
import hrShiftReducer from "./slices/hr/shiftSlice";
import itemReducer from "./slices/inventory/itemSlice";
import dispatchImportsReducer from "./slices/dispatch/importSlice";
import dispatchReportsReducer from "./slices/dispatch/reportSlice";
import dispatchRunsReducer from "./slices/dispatch/runSlice";
import dispatchSettingsReducer from "./slices/dispatch/settingSlice";
import oeeDashboardReducer from "./slices/oee/oeeDashboardSlice";
import oeeDowntimeReasonReducer from "./slices/oee/oeeDowntimeReasonSlice";
import oeeMachineReducer from "./slices/oee/oeeMachineSlice";
import oeeMouldReducer from "./slices/oee/oeeMouldSlice";
import oeeProductionEntryReducer from "./slices/oee/oeeProductionEntrySlice";
import oeeReportReducer from "./slices/oee/oeeReportSlice";
import procurementBomReducer from "./slices/procurement/bomSlice";
import procurementPlanningReducer from "./slices/procurement/planningSlice";
import procurementSalesChannelsReducer from "./slices/procurement/salesChannelSlice";
import procurementSalesImportReducer from "./slices/procurement/salesImportSlice";
import procurementSettingsReducer from "./slices/procurement/procurementSettingSlice";
import procurementSkuMappingsReducer from "./slices/procurement/skuMappingSlice";
import supplyChainChannelsReducer from "./slices/supplyChain/channelSlice";
import supplyChainImportsReducer from "./slices/supplyChain/importSlice";
import supplyChainItemMappingsReducer from "./slices/supplyChain/itemMappingSlice";
import supplyChainPackagingProfilesReducer from "./slices/supplyChain/packagingProfileSlice";
import supplyChainWarehousesReducer from "./slices/supplyChain/warehouseSlice";
import expenseCategoryReducer from "./slices/purchase/expenseCategorySlice";
import expenseReducer from "./slices/purchase/expenseSlice";
import purchaseBillReducer from "./slices/purchase/purchaseBillSlice";
import purchaseOrderReducer from "./slices/purchase/purchaseOrderSlice";
import purchaseReportReducer from "./slices/purchase/purchaseReportSlice";
import purchaseReturnReducer from "./slices/purchase/purchaseReturnSlice";
import partyGstReducer from "./slices/party/gstSlice";
import rbacPageReducer from "./slices/rbac/pageSlice";
import reportsReducer from "./slices/reports/reportsSlice";
import myRojmelWalletReducer from "./slices/rojmel/myWalletSlice";
import rojmelDashboardReducer from "./slices/rojmel/rojmelDashboardSlice";
import rojmelTransactionReducer from "./slices/rojmel/transactionSlice";
import rojmelTransferReducer from "./slices/rojmel/transferSlice";
import rojmelWalletReducer from "./slices/rojmel/walletSlice";
import salesInvoiceReducer from "./slices/sales/invoiceSlice";
import sidebarReducer from "./slices/sidebarSlice";
import supplierPaymentReducer from "./slices/purchase/supplierPaymentSlice";
import unitReducer from "./slices/inventory/unitSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    categories: categoryReducer,
    dashboard: dashboardReducer,
    dispatchImports: dispatchImportsReducer,
    dispatchReports: dispatchReportsReducer,
    dispatchRuns: dispatchRunsReducer,
    dispatchSettings: dispatchSettingsReducer,
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
    procurementBom: procurementBomReducer,
    procurementPlanning: procurementPlanningReducer,
    procurementSalesChannels: procurementSalesChannelsReducer,
    procurementSalesImport: procurementSalesImportReducer,
    procurementSettings: procurementSettingsReducer,
    procurementSkuMappings: procurementSkuMappingsReducer,
    partyGst: partyGstReducer,
    purchaseBills: purchaseBillReducer,
    purchaseOrders: purchaseOrderReducer,
    purchaseReports: purchaseReportReducer,
    purchaseReturns: purchaseReturnReducer,
    rbacPages: rbacPageReducer,
    reports: reportsReducer,
    myRojmelWallet: myRojmelWalletReducer,
    rojmelDashboard: rojmelDashboardReducer,
    rojmelTransactions: rojmelTransactionReducer,
    rojmelTransfers: rojmelTransferReducer,
    rojmelWallets: rojmelWalletReducer,
    salesInvoices: salesInvoiceReducer,
    sidebar: sidebarReducer,
    supplierPayments: supplierPaymentReducer,
    supplyChainChannels: supplyChainChannelsReducer,
    supplyChainImports: supplyChainImportsReducer,
    supplyChainItemMappings: supplyChainItemMappingsReducer,
    supplyChainPackagingProfiles: supplyChainPackagingProfilesReducer,
    supplyChainWarehouses: supplyChainWarehousesReducer,
    units: unitReducer,
  },
});
