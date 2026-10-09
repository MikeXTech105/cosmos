import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import CosmosLoader from "../components/common/CosmosLoader";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import PermissionGuard from "./PermissionGuard";
import DefaultRouteRedirect from "./DefaultRouteRedirect";

const AuthLayout = lazy(() => import("../layouts/AuthLayout"));
const MainLayout = lazy(() => import("../layouts/MainLayout"));
const Login = lazy(() => import("../pages/auth/Login"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const ChangePassword = lazy(() => import("../pages/auth/ChangePassword"));
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));
const Pages = lazy(() => import("../pages/rbac/pages/index.js"));
const PageForm = lazy(() => import("../pages/rbac/pages/PageFormPage.jsx"));
const Permissions = lazy(() => import("../pages/rbac/permissions/index.js"));
const Party = lazy(() => import("../pages/party/index.js"));
const PartyForm = lazy(() => import("../pages/party/PartyFormPage.jsx"));
const Roles = lazy(() => import("../pages/rbac/roles/index.js"));
const Users = lazy(() => import("../pages/rbac/users/index.js"));
const Items = lazy(() => import("../pages/inventory/items/index.js"));
const ItemForm = lazy(() => import("../pages/inventory/items/ItemFormPage.jsx"));
const Categories = lazy(() => import("../pages/inventory/categories/index.js"));
const Units = lazy(() => import("../pages/inventory/units/index.js"));
const RojmelDashboard = lazy(
  () => import("../pages/rojmel/dashboard/index.js"),
);
const RojmelMyWallet = lazy(
  () => import("../pages/rojmel/myWallet/index.js"),
);
const RojmelWallets = lazy(
  () => import("../pages/rojmel/wallets/index.js"),
);
const RojmelTransactions = lazy(
  () => import("../pages/rojmel/transactions/index.js"),
);
const RojmelTransfers = lazy(
  () => import("../pages/rojmel/transfers/index.js"),
);
const RojmelReports = lazy(
  () => import("../pages/rojmel/reports/index.js"),
);
const RojmelReportRoute = lazy(
  () => import("../pages/rojmel/reports/RojmelReportRoutePage.jsx"),
);
const HrDashboard = lazy(() => import("../pages/hr/dashboard/index.js"));
const HrEmployees = lazy(() => import("../pages/hr/employees/index.js"));
const HrEmployeeForm = lazy(() => import("../pages/hr/employees/EmployeeFormPage.jsx"));
const HrDepartments = lazy(() => import("../pages/hr/departments/index.js"));
const HrDesignations = lazy(() => import("../pages/hr/designations/index.js"));
const HrAttendance = lazy(() => import("../pages/hr/attendance/index.js"));
const HrLeaves = lazy(() => import("../pages/hr/leaves/index.js"));
const HrShifts = lazy(() => import("../pages/hr/shifts/index.js"));
const HrPayroll = lazy(() => import("../pages/hr/payroll/index.js"));
const SalesInvoices = lazy(() => import("../pages/sales/invoices/index.js"));
const SalesInvoiceDetail = lazy(
  () => import("../pages/sales/invoices/InvoiceDetailPage.jsx"),
);
const SalesInvoiceForm = lazy(
  () => import("../pages/sales/invoices/InvoiceFormPage.jsx"),
);
const PurchaseBills = lazy(() => import("../pages/purchase/bills/index.js"));
const PurchaseBillDetail = lazy(
  () => import("../pages/purchase/bills/PurchaseBillDetailPage.jsx"),
);
const PurchaseBillForm = lazy(
  () => import("../pages/purchase/bills/PurchaseBillFormPage.jsx"),
);
const PurchaseOrders = lazy(() => import("../pages/purchase/orders/index.js"));
const PurchaseOrderDetail = lazy(
  () => import("../pages/purchase/orders/PurchaseOrderDetailPage.jsx"),
);
const PurchaseOrderForm = lazy(
  () => import("../pages/purchase/orders/PurchaseOrderFormPage.jsx"),
);
const PurchaseReturns = lazy(() => import("../pages/purchase/returns/index.js"));
const PurchaseReturnDetail = lazy(
  () => import("../pages/purchase/returns/PurchaseReturnDetailPage.jsx"),
);
const PurchaseReturnForm = lazy(
  () => import("../pages/purchase/returns/PurchaseReturnFormPage.jsx"),
);
const SupplierPayments = lazy(
  () => import("../pages/purchase/supplierPayments/index.js"),
);
const Expenses = lazy(() => import("../pages/purchase/expenses/index.js"));
const ExpenseCategories = lazy(
  () => import("../pages/purchase/expenseCategories/index.js"),
);
const PurchaseReports = lazy(() => import("../pages/purchase/reports/index.js"));
const ReportsHome = lazy(() => import("../pages/reports/index.js"));
const ReportRoutePage = lazy(
  () => import("../pages/reports/ReportRoutePage.jsx"),
);
const OeeDashboard = lazy(() => import("../pages/oee/dashboard/index.js"));
const OeeProductionEntries = lazy(
  () => import("../pages/oee/productionEntries/index.js"),
);
const OeeMachines = lazy(() => import("../pages/oee/machines/index.js"));
const OeeMoulds = lazy(() => import("../pages/oee/moulds/index.js"));
const OeeDowntimeReasons = lazy(
  () => import("../pages/oee/downtimeReasons/index.js"),
);
const OeeReports = lazy(() => import("../pages/oee/reports/index.js"));
const ProcurementSalesImport = lazy(
  () => import("../pages/procurement/salesImport/index.js"),
);
const ProcurementHome = lazy(
  () => import("../pages/procurement/home/index.js"),
);
const ProcurementSetup = lazy(
  () => import("../pages/procurement/setup/index.js"),
);
const ProcurementSettingForm = lazy(
  () => import("../pages/procurement/settings/ProcurementSettingFormPage.jsx"),
);
const ProcurementGeneratePlan = lazy(
  () => import("../pages/procurement/generatePlan/index.js"),
);
const ProcurementPlanningHistory = lazy(
  () => import("../pages/procurement/planningHistory/index.js"),
);
const SupplyChainChannels = lazy(
  () => import("../pages/supplyChain/channels/index.js"),
);
const SupplyChainWarehouses = lazy(
  () => import("../pages/supplyChain/warehouses/index.js"),
);
const SupplyChainItemMappings = lazy(
  () => import("../pages/supplyChain/itemMappings/index.js"),
);
const SupplyChainPackagingProfiles = lazy(
  () => import("../pages/supplyChain/packagingProfiles/index.js"),
);
const SupplyChainPackagingProfileForm = lazy(
  () => import("../pages/supplyChain/packagingProfiles/PackagingProfileFormPage.jsx"),
);
const SupplyChainImports = lazy(
  () => import("../pages/supplyChain/imports/index.js"),
);
const DispatchDashboard = lazy(
  () => import("../pages/dispatch/dashboard/index.js"),
);
const DispatchRuns = lazy(
  () => import("../pages/dispatch/runs/index.js"),
);
const DispatchRunDetail = lazy(
  () => import("../pages/dispatch/runs/DispatchRunDetailPage.jsx"),
);
const DispatchImports = lazy(
  () => import("../pages/dispatch/imports/index.js"),
);
const DispatchSettings = lazy(
  () => import("../pages/dispatch/settings/index.js"),
);
const DispatchSettingForm = lazy(
  () => import("../pages/dispatch/settings/DispatchSettingFormPage.jsx"),
);
const DispatchReports = lazy(
  () => import("../pages/dispatch/reports/index.js"),
);
const ShipmentDashboard = lazy(
  () => import("../pages/shipments/dashboard/index.js"),
);
const ShipmentWorkList = lazy(
  () => import("../pages/shipments/workList/index.js"),
);
const ManualShipmentForm = lazy(
  () => import("../pages/shipments/workList/ManualShipmentFormPage.jsx"),
);
const DispatchPlanShipmentForm = lazy(
  () => import("../pages/shipments/workList/DispatchPlanShipmentFormPage.jsx"),
);
const ShipmentDetail = lazy(
  () => import("../pages/shipments/detail/index.js"),
);
const ShipmentFreight = lazy(
  () => import("../pages/shipments/freight/index.js"),
);
const ShipmentTransporters = lazy(
  () => import("../pages/shipments/transporters/index.js"),
);
const ShipmentImports = lazy(
  () => import("../pages/shipments/imports/index.js"),
);
const ShipmentReports = lazy(
  () => import("../pages/shipments/reports/index.js"),
);
const DataBook = lazy(() => import("../pages/dataBook/index.js"));
const ActivityLogs = lazy(() => import("../pages/activityLogs/index.js"));
const WebsiteDashboard = lazy(() => import("../pages/website/dashboard/index.js"));
const WebsiteProducts = lazy(() => import("../pages/website/products/index.js"));
const WebsiteProductForm = lazy(() => import("../pages/website/products/WebsiteProductFormPage.jsx"));
const WebsiteBlog = lazy(() => import("../pages/website/blog/index.js"));
const WebsiteBlogPostForm = lazy(() => import("../pages/website/blog/WebsiteBlogPostFormPage.jsx"));
const WebsiteAnnouncements = lazy(() => import("../pages/website/announcements/index.js"));
const WebsiteWarranty = lazy(() => import("../pages/website/warranty/index.js"));
const WebsiteWarrantyDetail = lazy(() => import("../pages/website/warranty/WebsiteWarrantyDetailPage.jsx"));
const WebsiteSettings = lazy(() => import("../pages/website/settings/index.js"));
const Settings = lazy(() => import("../pages/settings/index.js"));
const Profile = lazy(() => import("../pages/profile/index.js"));
const Preferences = lazy(() => import("../pages/preferences/index.js"));
const AccessDeniedPage = lazy(
  () => import("../pages/errors/AccessDeniedPage.jsx"),
);
const NotFoundPage = lazy(() => import("../pages/errors/NotFoundPage.jsx"));

const RouteFallback = () => {
  return <CosmosLoader fullScreen size="md" />;
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DefaultRouteRedirect />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <PublicRoute>
              <AuthLayout />
            </PublicRoute>
          }
        >
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <PermissionGuard route="/dashboard" pageName="Dashboard">
                <Dashboard />
              </PermissionGuard>
            }
          />
          <Route
            path="/users"
            element={
              <PermissionGuard route="/users" pageName="Users">
                <Users />
              </PermissionGuard>
            }
          />
          <Route
            path="/roles"
            element={
              <PermissionGuard route="/roles" pageName="Roles">
                <Roles />
              </PermissionGuard>
            }
          />
          <Route
            path="/rbac/pages"
            element={
              <PermissionGuard route="/rbac/pages" pageName="Pages">
                <Pages />
              </PermissionGuard>
            }
          />
          <Route
            path="/rbac/pages/new"
            element={
              <PermissionGuard route="/rbac/pages" pageName="Pages">
                <PageForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/rbac/pages/:id/edit"
            element={
              <PermissionGuard route="/rbac/pages" pageName="Pages">
                <PageForm />
              </PermissionGuard>
            }
          />
          <Route path="/pages" element={<Navigate to="/rbac/pages" replace />} />
          <Route
            path="/permissions"
            element={
              <PermissionGuard route="/permissions" pageName="Permissions">
                <Permissions />
              </PermissionGuard>
            }
          />
          <Route
            path="/party"
            element={
              <PermissionGuard route="/party" pageName="Party">
                <Party />
              </PermissionGuard>
            }
          />
          <Route
            path="/party/new"
            element={
              <PermissionGuard route="/party" pageName="Party">
                <PartyForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/party/:id/edit"
            element={
              <PermissionGuard route="/party" pageName="Party">
                <PartyForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/items"
            element={
              <PermissionGuard route="/items" pageName="Items">
                <Items />
              </PermissionGuard>
            }
          />
          <Route
            path="/items/new"
            element={
              <PermissionGuard route="/items" pageName="Items">
                <ItemForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/items/:id/edit"
            element={
              <PermissionGuard route="/items" pageName="Items">
                <ItemForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/categories"
            element={
              <PermissionGuard route="/categories" pageName="Categories">
                <Categories />
              </PermissionGuard>
            }
          />
          <Route
            path="/units"
            element={
              <PermissionGuard route="/units" pageName="Units">
                <Units />
              </PermissionGuard>
            }
          />
          <Route
            path="/rojmel/dashboard"
            element={
              <PermissionGuard
                route="/rojmel/dashboard"
                pageName="Rojmel.Dashboard"
              >
                <RojmelDashboard />
              </PermissionGuard>
            }
          />
          <Route
            path="/rojmel/my-wallet"
            element={
              <PermissionGuard
                route="/rojmel/my-wallet"
                pageName="Rojmel.MyWallet"
              >
                <RojmelMyWallet />
              </PermissionGuard>
            }
          />
          <Route
            path="/rojmel/wallets"
            element={
              <PermissionGuard
                route="/rojmel/wallets"
                pageName="Rojmel.Wallets"
              >
                <RojmelWallets />
              </PermissionGuard>
            }
          />
          <Route
            path="/rojmel/transactions"
            element={
              <PermissionGuard
                route="/rojmel/transactions"
                pageName="Rojmel.Transactions"
              >
                <RojmelTransactions />
              </PermissionGuard>
            }
          />
          <Route
            path="/rojmel/transfers"
            element={
              <PermissionGuard
                route="/rojmel/transfers"
                pageName="Rojmel.Transfers"
              >
                <RojmelTransfers />
              </PermissionGuard>
            }
          />
          <Route
            path="/rojmel/reports"
            element={
              <PermissionGuard
                route="/rojmel/reports"
                pageName="Rojmel.Reports"
              >
                <RojmelReports />
              </PermissionGuard>
            }
          />
          <Route
            path="/rojmel/reports/:reportId"
            element={<RojmelReportRoute />}
          />
          <Route
            path="/hr/dashboard"
            element={
              <PermissionGuard route="/hr/dashboard" pageName="HR.Employee">
                <HrDashboard />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/employees"
            element={
              <PermissionGuard route="/hr/employees" pageName="HR.Employee">
                <HrEmployees />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/employees/new"
            element={
              <PermissionGuard route="/hr/employees" pageName="HR.Employee">
                <HrEmployeeForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/employees/:id/edit"
            element={
              <PermissionGuard route="/hr/employees" pageName="HR.Employee">
                <HrEmployeeForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/departments"
            element={
              <PermissionGuard route="/hr/departments" pageName="HR.Department">
                <HrDepartments />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/designations"
            element={
              <PermissionGuard
                route="/hr/designations"
                pageName="HR.Designation"
              >
                <HrDesignations />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/attendance"
            element={
              <PermissionGuard route="/hr/attendance" pageName="HR.Attendance">
                <HrAttendance />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/leaves"
            element={
              <PermissionGuard route="/hr/leaves" pageName="HR.Leave">
                <HrLeaves />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/shifts"
            element={
              <PermissionGuard route="/hr/shifts" pageName="HR.Shift">
                <HrShifts />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/payroll"
            element={
              <PermissionGuard route="/hr/payroll" pageName="HR.Payroll">
                <HrPayroll />
              </PermissionGuard>
            }
          />
          <Route
            path="/sales/invoices"
            element={
              <PermissionGuard
                route="/sales/invoices"
                pageName="Sales.Invoice"
              >
                <SalesInvoices />
              </PermissionGuard>
            }
          />
          <Route
            path="/sales/invoices/new"
            element={
              <PermissionGuard
                route="/sales/invoices"
                pageName="Sales.Invoice"
              >
                <SalesInvoiceForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/sales/invoices/:id"
            element={
              <PermissionGuard
                route="/sales/invoices"
                pageName="Sales.Invoice"
              >
                <SalesInvoiceDetail />
              </PermissionGuard>
            }
          />
          <Route
            path="/sales/invoices/:id/edit"
            element={
              <PermissionGuard
                route="/sales/invoices"
                pageName="Sales.Invoice"
              >
                <SalesInvoiceForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/bills"
            element={
              <PermissionGuard
                route="/purchase/bills"
                pageName="PurchaseExpense.PurchaseBill"
              >
                <PurchaseBills />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/bills/new"
            element={
              <PermissionGuard
                route="/purchase/bills"
                pageName="PurchaseExpense.PurchaseBill"
              >
                <PurchaseBillForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/bills/:id"
            element={
              <PermissionGuard
                route="/purchase/bills"
                pageName="PurchaseExpense.PurchaseBill"
              >
                <PurchaseBillDetail />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/bills/:id/edit"
            element={
              <PermissionGuard
                route="/purchase/bills"
                pageName="PurchaseExpense.PurchaseBill"
              >
                <PurchaseBillForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/orders"
            element={
              <PermissionGuard
                route="/purchase/orders"
                pageName="PurchaseExpense.PurchaseOrder"
              >
                <PurchaseOrders />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/orders/new"
            element={
              <PermissionGuard
                route="/purchase/orders"
                pageName="PurchaseExpense.PurchaseOrder"
              >
                <PurchaseOrderForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/orders/:id"
            element={
              <PermissionGuard
                route="/purchase/orders"
                pageName="PurchaseExpense.PurchaseOrder"
              >
                <PurchaseOrderDetail />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/orders/:id/edit"
            element={
              <PermissionGuard
                route="/purchase/orders"
                pageName="PurchaseExpense.PurchaseOrder"
              >
                <PurchaseOrderForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/returns"
            element={
              <PermissionGuard
                route="/purchase/returns"
                pageName="PurchaseExpense.PurchaseReturn"
              >
                <PurchaseReturns />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/returns/new"
            element={
              <PermissionGuard
                route="/purchase/returns"
                pageName="PurchaseExpense.PurchaseReturn"
              >
                <PurchaseReturnForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/returns/:id"
            element={
              <PermissionGuard
                route="/purchase/returns"
                pageName="PurchaseExpense.PurchaseReturn"
              >
                <PurchaseReturnDetail />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/returns/:id/edit"
            element={
              <PermissionGuard
                route="/purchase/returns"
                pageName="PurchaseExpense.PurchaseReturn"
              >
                <PurchaseReturnForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/supplier-payments"
            element={
              <PermissionGuard
                route="/purchase/supplier-payments"
                pageName="PurchaseExpense.PaymentOut"
              >
                <SupplierPayments />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/expenses"
            element={
              <PermissionGuard
                route="/purchase/expenses"
                pageName="PurchaseExpense.Expense"
              >
                <Expenses />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/expense-categories"
            element={
              <PermissionGuard
                route="/purchase/expense-categories"
                pageName="PurchaseExpense.ExpenseCategory"
              >
                <ExpenseCategories />
              </PermissionGuard>
            }
          />
          <Route
            path="/purchase/reports"
            element={
              <PermissionGuard
                route="/purchase/reports"
                pageName="PurchaseExpense.Report"
              >
                <PurchaseReports />
              </PermissionGuard>
            }
          />
          <Route
            path="/reports"
            element={
              <PermissionGuard route="/reports" pageName="Reports">
                <ReportsHome />
              </PermissionGuard>
            }
          />
          <Route
            path="/reports/:group"
            element={<ReportsHome />}
          />
          <Route
            path="/reports/:group/:reportId"
            element={<ReportRoutePage />}
          />
          <Route
            path="/oee/dashboard"
            element={
              <PermissionGuard route="/oee/dashboard" pageName="OEE.Dashboard">
                <OeeDashboard />
              </PermissionGuard>
            }
          />
          <Route
            path="/oee/production-entries"
            element={
              <PermissionGuard
                route="/oee/production-entries"
                pageName="OEE.ProductionEntries"
              >
                <OeeProductionEntries />
              </PermissionGuard>
            }
          />
          <Route
            path="/oee/machines"
            element={
              <PermissionGuard route="/oee/machines" pageName="OEE.Machines">
                <OeeMachines />
              </PermissionGuard>
            }
          />
          <Route
            path="/oee/moulds"
            element={
              <PermissionGuard route="/oee/moulds" pageName="OEE.Moulds">
                <OeeMoulds />
              </PermissionGuard>
            }
          />
          <Route
            path="/oee/downtime-reasons"
            element={
              <PermissionGuard
                route="/oee/downtime-reasons"
                pageName="OEE.DowntimeReasons"
              >
                <OeeDowntimeReasons />
              </PermissionGuard>
            }
          />
          <Route
            path="/oee/reports"
            element={
              <PermissionGuard route="/oee/reports" pageName="OEE.Reports">
                <OeeReports />
              </PermissionGuard>
            }
          />
          <Route
            path="/supply-chain/channels"
            element={
              <PermissionGuard
                route="/supply-chain/channels"
                pageName="SupplyChain.Channels"
              >
                <SupplyChainChannels />
              </PermissionGuard>
            }
          />
          <Route
            path="/supply-chain/warehouses"
            element={
              <PermissionGuard
                route="/supply-chain/warehouses"
                pageName="SupplyChain.Warehouses"
              >
                <SupplyChainWarehouses />
              </PermissionGuard>
            }
          />
          <Route
            path="/supply-chain/item-mappings"
            element={
              <PermissionGuard
                route="/supply-chain/item-mappings"
                pageName="SupplyChain.ItemMappings"
              >
                <SupplyChainItemMappings />
              </PermissionGuard>
            }
          />
          <Route
            path="/supply-chain/packaging-profiles"
            element={
              <PermissionGuard
                route="/supply-chain/packaging-profiles"
                pageName="SupplyChain.PackagingProfiles"
              >
                <SupplyChainPackagingProfiles />
              </PermissionGuard>
            }
          />
          <Route
            path="/supply-chain/packaging-profiles/new"
            element={
              <PermissionGuard
                route="/supply-chain/packaging-profiles"
                pageName="SupplyChain.PackagingProfiles"
              >
                <SupplyChainPackagingProfileForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/supply-chain/packaging-profiles/:id/edit"
            element={
              <PermissionGuard
                route="/supply-chain/packaging-profiles"
                pageName="SupplyChain.PackagingProfiles"
              >
                <SupplyChainPackagingProfileForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/supply-chain/imports"
            element={
              <PermissionGuard
                route="/supply-chain/imports"
                pageName="SupplyChain.Imports"
              >
                <SupplyChainImports />
              </PermissionGuard>
            }
          />
          <Route
            path="/procurement"
            element={
              <PermissionGuard
                route="/procurement/generate-plan"
                pageName="ProcurementPlanning.GeneratePlan"
              >
                <ProcurementHome />
              </PermissionGuard>
            }
          />
          <Route
            path="/procurement/sales-import"
            element={
              <PermissionGuard
                route="/procurement/sales-import"
                pageName="ProcurementPlanning.SalesImport"
              >
                <ProcurementSalesImport />
              </PermissionGuard>
            }
          />
          <Route
            path="/procurement/sku-mapping"
            element={
              <PermissionGuard
                route="/procurement/sku-mapping"
                pageName="ProcurementPlanning.SkuMapping"
              >
                <Navigate replace to="/procurement/setup?tab=sku" />
              </PermissionGuard>
            }
          />
          <Route
            path="/procurement/bom-mapping"
            element={
              <PermissionGuard
                route="/procurement/bom-mapping"
                pageName="ProcurementPlanning.BomMapping"
              >
                <Navigate replace to="/procurement/setup?tab=bom" />
              </PermissionGuard>
            }
          />
          <Route
            path="/procurement/settings"
            element={
              <PermissionGuard
                route="/procurement/settings"
                pageName="ProcurementPlanning.Settings"
              >
                <Navigate replace to="/procurement/setup?tab=settings" />
              </PermissionGuard>
            }
          />
          <Route
            path="/procurement/setup"
            element={<ProcurementSetup />}
          />
          <Route
            path="/procurement/settings/:itemId/edit"
            element={
              <PermissionGuard
                route="/procurement/settings"
                pageName="ProcurementPlanning.Settings"
              >
                <ProcurementSettingForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/procurement/generate-plan"
            element={
              <PermissionGuard
                route="/procurement/generate-plan"
                pageName="ProcurementPlanning.GeneratePlan"
              >
                <ProcurementGeneratePlan />
              </PermissionGuard>
            }
          />
          <Route
            path="/procurement/planning-history"
            element={
              <PermissionGuard
                route="/procurement/planning-history"
                pageName="ProcurementPlanning.PlanningHistory"
              >
                <ProcurementPlanningHistory />
              </PermissionGuard>
            }
          />
          <Route
            path="/dispatch"
            element={<Navigate replace to="/dispatch/dashboard" />}
          />
          <Route
            path="/dispatch/dashboard"
            element={
              <PermissionGuard
                route="/dispatch/dashboard"
                pageName="DispatchPlanning.Reports"
              >
                <DispatchDashboard />
              </PermissionGuard>
            }
          />
          <Route
            path="/dispatch/runs"
            element={
              <PermissionGuard
                route="/dispatch/runs"
                pageName="DispatchPlanning.PlanningRuns"
              >
                <DispatchRuns />
              </PermissionGuard>
            }
          />
          <Route
            path="/dispatch/runs/:id"
            element={
              <PermissionGuard
                route="/dispatch/runs"
                pageName="DispatchPlanning.PlanningRuns"
              >
                <DispatchRunDetail />
              </PermissionGuard>
            }
          />
          <Route
            path="/dispatch/imports"
            element={
              <PermissionGuard
                route="/dispatch/imports"
                pageName="DispatchPlanning.Imports"
              >
                <DispatchImports />
              </PermissionGuard>
            }
          />
          <Route
            path="/dispatch/settings"
            element={
              <PermissionGuard
                route="/dispatch/settings"
                pageName="DispatchPlanning.SkuSettings"
              >
                <DispatchSettings />
              </PermissionGuard>
            }
          />
          <Route
            path="/dispatch/settings/new"
            element={
              <PermissionGuard
                route="/dispatch/settings"
                pageName="DispatchPlanning.SkuSettings"
              >
                <DispatchSettingForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/dispatch/settings/:id/edit"
            element={
              <PermissionGuard
                route="/dispatch/settings"
                pageName="DispatchPlanning.SkuSettings"
              >
                <DispatchSettingForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/dispatch/reports"
            element={
              <PermissionGuard
                route="/dispatch/reports"
                pageName="DispatchPlanning.Reports"
              >
                <DispatchReports />
              </PermissionGuard>
            }
          />
          <Route
            path="/shipments"
            element={<Navigate replace to="/shipments/dashboard" />}
          />
          <Route
            path="/shipments/dashboard"
            element={
              <PermissionGuard
                route="/shipments/dashboard"
                pageName="ShipmentOperations.Reports"
              >
                <ShipmentDashboard />
              </PermissionGuard>
            }
          />
          <Route
            path="/shipments/work-list"
            element={
              <PermissionGuard
                route="/shipments/work-list"
                pageName="ShipmentOperations.Shipments"
              >
                <ShipmentWorkList />
              </PermissionGuard>
            }
          />
          <Route
            path="/shipments/work-list/new"
            element={
              <PermissionGuard
                route="/shipments/work-list"
                pageName="ShipmentOperations.Shipments"
              >
                <ManualShipmentForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/shipments/work-list/new-from-plan"
            element={
              <PermissionGuard
                route="/shipments/work-list"
                pageName="ShipmentOperations.Shipments"
              >
                <DispatchPlanShipmentForm />
              </PermissionGuard>
            }
          />
          <Route
            path="/shipments/work-list/:id"
            element={
              <PermissionGuard
                route="/shipments/work-list"
                pageName="ShipmentOperations.Shipments"
              >
                <ShipmentDetail />
              </PermissionGuard>
            }
          />
          <Route
            path="/shipments/freight"
            element={
              <PermissionGuard
                route="/shipments/freight"
                pageName="ShipmentOperations.Freight"
              >
                <ShipmentFreight />
              </PermissionGuard>
            }
          />
          <Route
            path="/shipments/transporters"
            element={
              <PermissionGuard
                route="/shipments/transporters"
                pageName="ShipmentOperations.Shipments"
              >
                <ShipmentTransporters />
              </PermissionGuard>
            }
          />
          <Route
            path="/shipments/imports"
            element={
              <PermissionGuard
                route="/shipments/imports"
                pageName="ShipmentOperations.Imports"
              >
                <ShipmentImports />
              </PermissionGuard>
            }
          />
          <Route
            path="/shipments/reports"
            element={
              <PermissionGuard
                route="/shipments/reports"
                pageName="ShipmentOperations.Reports"
              >
                <ShipmentReports />
              </PermissionGuard>
            }
          />
          <Route
            path="/data-book"
            element={
              <PermissionGuard route="/data-book" pageName="DataBook.Entries">
                <DataBook />
              </PermissionGuard>
            }
          />
          <Route
            path="/activity-logs"
            element={
              <PermissionGuard route="/activity-logs" pageName="ActivityLogs">
                <ActivityLogs />
              </PermissionGuard>
            }
          />
          <Route
            path="/website/dashboard"
            element={<PermissionGuard route="/website/dashboard" pageName="WebsiteManagement.Dashboard"><WebsiteDashboard /></PermissionGuard>}
          />
          <Route
            path="/website/products"
            element={<PermissionGuard route="/website/products" pageName="WebsiteManagement.Products"><WebsiteProducts /></PermissionGuard>}
          />
          <Route
            path="/website/products/new"
            element={<PermissionGuard route="/website/products" pageName="WebsiteManagement.Products"><WebsiteProductForm /></PermissionGuard>}
          />
          <Route
            path="/website/products/:id/edit"
            element={<PermissionGuard route="/website/products" pageName="WebsiteManagement.Products"><WebsiteProductForm /></PermissionGuard>}
          />
          <Route
            path="/website/blog"
            element={<PermissionGuard route="/website/blog" pageName="WebsiteManagement.Blogs"><WebsiteBlog /></PermissionGuard>}
          />
          <Route
            path="/website/blog/new"
            element={<PermissionGuard route="/website/blog" pageName="WebsiteManagement.Blogs"><WebsiteBlogPostForm /></PermissionGuard>}
          />
          <Route
            path="/website/blog/:id/edit"
            element={<PermissionGuard route="/website/blog" pageName="WebsiteManagement.Blogs"><WebsiteBlogPostForm /></PermissionGuard>}
          />
          <Route
            path="/website/announcements"
            element={<PermissionGuard route="/website/announcements" pageName="WebsiteManagement.Announcements"><WebsiteAnnouncements /></PermissionGuard>}
          />
          <Route
            path="/website/warranty"
            element={<PermissionGuard route="/website/warranty" pageName="WebsiteManagement.WarrantyClaims"><WebsiteWarranty /></PermissionGuard>}
          />
          <Route
            path="/website/warranty/:id"
            element={<PermissionGuard route="/website/warranty" pageName="WebsiteManagement.WarrantyClaims"><WebsiteWarrantyDetail /></PermissionGuard>}
          />
          <Route
            path="/website/settings"
            element={<PermissionGuard route="/website/settings" pageName="WebsiteManagement.Settings"><WebsiteSettings /></PermissionGuard>}
          />
          <Route
            path="/settings"
            element={
              <PermissionGuard route="/settings" pageName="Settings">
                <Settings />
              </PermissionGuard>
            }
          />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/403" element={<AccessDeniedPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
