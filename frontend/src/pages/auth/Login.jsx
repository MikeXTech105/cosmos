import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { loginUser } from "../../services/authService";
import { setCredentials } from "../../store/slices/authSlice";
import { saveAuthData } from "../../utils/authStorage";
import { loginSchema } from "../../utils/validationSchemas";

const inputBase =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15";

const getRememberMeDefault = () => {
  const storedValue = window.localStorage.getItem("cosmos_remember_me");

  return storedValue === null ? true : storedValue === "true";
};

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(null);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      usernameOrEmail: "",
      password: "",
      rememberMe: getRememberMeDefault(),
    },
  });

  const onSubmit = async ({ rememberMe, ...credentials }) => {
    try {
      const data = await loginUser(credentials);

      if (!data.accessToken || !data.refreshToken) {
        throw new Error("Login response did not include auth tokens.");
      }

      const authData = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user ?? null,
        roles: data.roles ?? [],
        pages: data.pages ?? [],
      };

      saveAuthData(authData);
      dispatch(setCredentials(authData));
      window.localStorage.setItem("cosmos_remember_me", String(rememberMe));

      toast.success(data.message ?? "Signed in successfully");

      navigate(location.state?.from?.pathname ?? "/dashboard", {
        replace: true,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message ??
          error.message ??
          "Unable to sign in. Please check your credentials.",
      );
    }
  };

  return (
    <div className="w-full">
      <div className="mb-7">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Welcome back
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Sign in to your COSMOS account.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1.5">
          <label
            htmlFor="usernameOrEmail"
            className="block text-xs font-medium text-slate-300"
          >
            Username / Email
          </label>

          <div className="relative flex items-center">
            <Mail
              className={`absolute left-3 h-4 w-4 transition-colors ${
                focused === "email" ? "text-blue-400" : "text-slate-500"
              }`}
            />

            <input
              id="usernameOrEmail"
              type="text"
              autoComplete="username"
              placeholder="you@company.com"
              className={`${inputBase} pl-10 pr-4 ${
                errors.usernameOrEmail ? "border-red-500/50" : ""
              }`}
              onFocus={() => setFocused("email")}
              {...register("usernameOrEmail", {
                onBlur: () => setFocused(null),
              })}
            />
          </div>

          {errors.usernameOrEmail && (
            <p className="text-xs text-red-400">
              {errors.usernameOrEmail.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-medium text-slate-300">
              Password
            </label>

            <Link
              to="/forgot-password"
              className="text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative flex items-center">
            <Lock
              className={`absolute left-3 h-4 w-4 transition-colors ${
                focused === "password" ? "text-blue-400" : "text-slate-500"
              }`}
            />

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className={`${inputBase} pl-10 pr-11 ${
                errors.password ? "border-red-500/50" : ""
              }`}
              onFocus={() => setFocused("password")}
              {...register("password", {
                onBlur: () => setFocused(null),
              })}
            />

            <button
              type="button"
              className="absolute right-3 text-slate-500 transition-colors hover:text-slate-300"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {errors.password && (
            <p className="text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <input
            id="rememberMe"
            type="checkbox"
            className="h-3.5 w-3.5 cursor-pointer rounded border-white/20 accent-blue-500"
            {...register("rememberMe")}
          />

          <label
            htmlFor="rememberMe"
            className="cursor-pointer select-none text-xs text-slate-400"
          >
            Keep me signed in
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </div>
  );
};

export default Login;
