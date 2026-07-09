import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Lock, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { getAuthFormClasses } from "../../components/auth/authThemeClasses";
import useAuthTheme from "../../hooks/useAuthTheme";
import { resetPassword } from "../../services/authService";
import { getApiErrorMessage } from "../../utils/apiError";
import { resetPasswordSchema } from "../../utils/validationSchemas";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authTheme } = useAuthTheme();
  const classes = getAuthFormClasses(authTheme);
  const resetToken =
    searchParams.get("resetToken") ?? searchParams.get("token") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: searchParams.get("email") ?? "",
      resetToken,
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (payload) => {
    try {
      const data = await resetPassword(payload);

      toast.success(data.message ?? "Password reset successfully");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to reset password."));
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2
          className={[
            "text-2xl font-bold tracking-tight",
            classes.title,
          ].join(" ")}
        >
          Reset password
        </h2>
        <p className={["mt-1.5 text-sm", classes.subtext].join(" ")}>
          Create a new password for your COSMOS account.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label
            htmlFor="email"
            className={[
              "mb-1.5 block text-xs font-medium",
              classes.label,
            ].join(" ")}
          >
            Email
          </label>

          <div className="relative flex items-center">
            <Mail className={["absolute left-3 h-4 w-4", classes.icon].join(" ")} />

            <input
              id="email"
              type="email"
              autoComplete="email"
              className={[
                "w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2",
                classes.input,
                errors.email ? classes.inputError : "",
              ].join(" ")}
              {...register("email")}
            />
          </div>

          {errors.email && (
            <p className={["mt-1 text-xs", classes.error].join(" ")}>
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="resetToken"
            className={[
              "mb-1.5 block text-xs font-medium",
              classes.label,
            ].join(" ")}
          >
            Reset Token
          </label>

          <div className="relative flex items-center">
            <KeyRound className={["absolute left-3 h-4 w-4", classes.icon].join(" ")} />

            <input
              id="resetToken"
              className={[
                "w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2",
                classes.input,
                errors.resetToken ? classes.inputError : "",
              ].join(" ")}
              {...register("resetToken")}
            />
          </div>

          {errors.resetToken && (
            <p className={["mt-1 text-xs", classes.error].join(" ")}>
              {errors.resetToken.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className={[
              "mb-1.5 block text-xs font-medium",
              classes.label,
            ].join(" ")}
          >
            New Password
          </label>

          <div className="relative flex items-center">
            <Lock className={["absolute left-3 h-4 w-4", classes.icon].join(" ")} />

            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className={[
                "w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2",
                classes.input,
                errors.newPassword ? classes.inputError : "",
              ].join(" ")}
              {...register("newPassword")}
            />
          </div>

          {errors.newPassword && (
            <p className={["mt-1 text-xs", classes.error].join(" ")}>
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className={[
              "mb-1.5 block text-xs font-medium",
              classes.label,
            ].join(" ")}
          >
            Confirm Password
          </label>

          <div className="relative flex items-center">
            <Lock className={["absolute left-3 h-4 w-4", classes.icon].join(" ")} />

            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className={[
                "w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2",
                classes.input,
                errors.confirmPassword ? classes.inputError : "",
              ].join(" ")}
              {...register("confirmPassword")}
            />
          </div>

          {errors.confirmPassword && (
            <p className={["mt-1 text-xs", classes.error].join(" ")}>
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={[
            "w-full rounded-lg py-2.5 text-sm font-medium transition-colors",
            classes.button,
          ].join(" ")}
        >
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>

        <Link
          className={[
            "block text-center text-sm font-medium transition-colors",
            classes.link,
          ].join(" ")}
          to="/login"
        >
          Back to sign in
        </Link>
      </form>
    </div>
  );
};

export default ResetPassword;
