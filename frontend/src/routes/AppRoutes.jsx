import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import PermissionGuard from "./PermissionGuard";

const AuthLayout = lazy(() => import("../layouts/AuthLayout"));
const MainLayout = lazy(() => import("../layouts/MainLayout"));
const Login = lazy(() => import("../pages/auth/Login"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const ChangePassword = lazy(() => import("../pages/auth/ChangePassword"));
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));
const Pages = lazy(() => import("../pages/rbac/pages/index.js"));
const Permissions = lazy(() => import("../pages/rbac/permissions/index.js"));
const Party = lazy(() => import("../pages/party/index.js"));
const Roles = lazy(() => import("../pages/rbac/roles/index.js"));
const Users = lazy(() => import("../pages/rbac/users/index.js"));
const Items = lazy(() => import("../pages/inventory/items/index.js"));
const Categories = lazy(() => import("../pages/inventory/categories/index.js"));
const Units = lazy(() => import("../pages/inventory/units/index.js"));
const HrDashboard = lazy(() => import("../pages/hr/dashboard/index.js"));
const HrEmployees = lazy(() => import("../pages/hr/employees/index.js"));
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
const Settings = lazy(() => import("../pages/settings/index.js"));

const RouteFallback = () => {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

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
          <Route path="/dashboard" element={<Dashboard />} />
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
            path="/pages"
            element={
              <PermissionGuard route="/pages" pageName="Pages">
                <Pages />
              </PermissionGuard>
            }
          />
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
              <PermissionGuard route="/party" pageName="Party Master">
                <Party />
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
            path="/hr/dashboard"
            element={
              <PermissionGuard route="/hr/dashboard" pageName="HR Dashboard">
                <HrDashboard />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/employees"
            element={
              <PermissionGuard route="/hr/employees" pageName="Employees">
                <HrEmployees />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/departments"
            element={
              <PermissionGuard route="/hr/departments" pageName="Departments">
                <HrDepartments />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/designations"
            element={
              <PermissionGuard
                route="/hr/designations"
                pageName="Designations"
              >
                <HrDesignations />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/attendance"
            element={
              <PermissionGuard route="/hr/attendance" pageName="Attendance">
                <HrAttendance />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/leaves"
            element={
              <PermissionGuard route="/hr/leaves" pageName="Leaves">
                <HrLeaves />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/shifts"
            element={
              <PermissionGuard route="/hr/shifts" pageName="Shifts">
                <HrShifts />
              </PermissionGuard>
            }
          />
          <Route
            path="/hr/payroll"
            element={
              <PermissionGuard route="/hr/payroll" pageName="Payroll">
                <HrPayroll />
              </PermissionGuard>
            }
          />
          <Route
            path="/sales/invoices"
            element={
              <PermissionGuard
                route="/sales/invoices"
                pageName="Sale Invoices"
              >
                <SalesInvoices />
              </PermissionGuard>
            }
          />
          <Route
            path="/sales/invoices/:id"
            element={
              <PermissionGuard
                route="/sales/invoices"
                pageName="Sale Invoices"
              >
                <SalesInvoiceDetail />
              </PermissionGuard>
            }
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
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
