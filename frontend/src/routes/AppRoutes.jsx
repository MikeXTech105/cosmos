import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

const AuthLayout = lazy(() => import("../layouts/AuthLayout"));
const MainLayout = lazy(() => import("../layouts/MainLayout"));
const Login = lazy(() => import("../pages/auth/Login"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const ChangePassword = lazy(() => import("../pages/auth/ChangePassword"));
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));
const Permission = lazy(() => import("../pages/permissions/Permission"));
const Role = lazy(() => import("../pages/roles/Role"));
const Users = lazy(() => import("../pages/users/Users"));

const RouteFallback = () => {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
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
          <Route path="/users" element={<Users />} />
          <Route path="/roles" element={<Role />} />
          <Route path="/permissions" element={<Permission />} />
          <Route path="/change-password" element={<ChangePassword />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
