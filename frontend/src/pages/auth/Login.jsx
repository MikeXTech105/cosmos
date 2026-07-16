import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { getAuthFormClasses } from "../../components/auth/authThemeClasses";
import useAuthTheme from "../../hooks/useAuthTheme";
import { loginUser } from "../../services/authService";
import { setCredentials } from "../../store/slices/authSlice";
import { saveAuthData } from "../../utils/authStorage";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  getDefaultAuthorizedRoute,
  isRouteAuthorized,
} from "../../utils/authorizedRoute";
import { loginSchema } from "../../utils/validationSchemas";

const getRememberMeDefault = () => {
  const storedValue = window.localStorage.getItem("cosmos_remember_me");

  return storedValue === null ? true : storedValue === "true";
};

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(null);
  const dispatch = useDispatch();
  const { authTheme } = useAuthTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const classes = getAuthFormClasses(authTheme);

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

      saveAuthData(authData, { rememberMe });
      dispatch(setCredentials(authData));
      window.localStorage.setItem("cosmos_remember_me", String(rememberMe));

      toast.success(data.message ?? "Signed in successfully");

      const requestedLocation = location.state?.from;
      const requestedRoute = requestedLocation
        ? `${requestedLocation.pathname ?? ""}${requestedLocation.search ?? ""}${requestedLocation.hash ?? ""}`
        : "";
      const nextRoute = isRouteAuthorized({
        ...authData,
        route: requestedRoute,
      })
        ? requestedRoute
        : getDefaultAuthorizedRoute(authData);

      navigate(nextRoute, { replace: true });
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          "Unable to sign in. Please check your credentials.",
        ),
      );
    }
  };

  return (
    <div className="w-full">
      <div className="mb-7">
        <h2 className={["text-2xl font-bold tracking-tight", classes.title].join(" ")}>
          Welcome back
        </h2>
        <p className={["mt-1.5 text-sm", classes.subtext].join(" ")}>
          Sign in to your COSMOS account.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1.5">
          <label
            htmlFor="usernameOrEmail"
            className={["block text-xs font-medium", classes.label].join(" ")}
          >
            Username / Email
          </label>

          <div className="relative flex items-center">
            <Mail
              className={`absolute left-3 h-4 w-4 transition-colors ${
                focused === "email" ? classes.iconFocus : classes.icon
              }`}
            />

            <input
              id="usernameOrEmail"
              type="text"
              autoComplete="username"
              placeholder="you@company.com"
              className={[
                "w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2",
                classes.input,
                errors.usernameOrEmail ? classes.inputError : "",
              ].join(" ")}
              onFocus={() => setFocused("email")}
              {...register("usernameOrEmail", {
                onBlur: () => setFocused(null),
              })}
            />
          </div>

          {errors.usernameOrEmail && (
            <p className={["text-xs", classes.error].join(" ")}>
              {errors.usernameOrEmail.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className={["text-xs font-medium", classes.label].join(" ")}
            >
              Password
            </label>

            <Link
              to="/forgot-password"
              className={["text-xs font-medium transition-colors", classes.link].join(" ")}
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative flex items-center">
            <Lock
              className={`absolute left-3 h-4 w-4 transition-colors ${
                focused === "password" ? classes.iconFocus : classes.icon
              }`}
            />

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className={[
                "w-full rounded-lg border py-2.5 pl-10 pr-11 text-sm outline-none transition-all focus:ring-2",
                classes.input,
                errors.password ? classes.inputError : "",
              ].join(" ")}
              onFocus={() => setFocused("password")}
              {...register("password", {
                onBlur: () => setFocused(null),
              })}
            />

            <button
              type="button"
              className={[
                "absolute right-3 transition-colors",
                classes.iconButton,
              ].join(" ")}
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
            <p className={["text-xs", classes.error].join(" ")}>
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <input
            id="rememberMe"
            type="checkbox"
            className={["h-3.5 w-3.5 cursor-pointer rounded", classes.checkbox].join(" ")}
            {...register("rememberMe")}
          />

          <label
            htmlFor="rememberMe"
            className={["cursor-pointer select-none text-xs", classes.subtext].join(" ")}
          >
            Keep me signed in
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={[
            "mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors",
            classes.button,
          ].join(" ")}
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
