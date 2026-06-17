import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Lock, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { resetPassword } from "../../services/authService";
import { resetPasswordSchema } from "../../utils/validationSchemas";

const inputClassName =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
      toast.error(error.response?.data?.message ?? "Unable to reset password.");
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Reset password
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Create a new password for your COSMOS account.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-medium text-slate-300"
          >
            Email
          </label>

          <div className="relative flex items-center">
            <Mail className="absolute left-3 h-4 w-4 text-slate-500" />

            <input
              id="email"
              type="email"
              autoComplete="email"
              className={`${inputClassName} ${
                errors.email ? "border-red-500/50" : ""
              }`}
              {...register("email")}
            />
          </div>

          {errors.email && (
            <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="resetToken"
            className="mb-1.5 block text-xs font-medium text-slate-300"
          >
            Reset Token
          </label>

          <div className="relative flex items-center">
            <KeyRound className="absolute left-3 h-4 w-4 text-slate-500" />

            <input
              id="resetToken"
              className={`${inputClassName} ${
                errors.resetToken ? "border-red-500/50" : ""
              }`}
              {...register("resetToken")}
            />
          </div>

          {errors.resetToken && (
            <p className="mt-1 text-xs text-red-400">
              {errors.resetToken.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="mb-1.5 block text-xs font-medium text-slate-300"
          >
            New Password
          </label>

          <div className="relative flex items-center">
            <Lock className="absolute left-3 h-4 w-4 text-slate-500" />

            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className={`${inputClassName} ${
                errors.newPassword ? "border-red-500/50" : ""
              }`}
              {...register("newPassword")}
            />
          </div>

          {errors.newPassword && (
            <p className="mt-1 text-xs text-red-400">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-xs font-medium text-slate-300"
          >
            Confirm Password
          </label>

          <div className="relative flex items-center">
            <Lock className="absolute left-3 h-4 w-4 text-slate-500" />

            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className={`${inputClassName} ${
                errors.confirmPassword ? "border-red-500/50" : ""
              }`}
              {...register("confirmPassword")}
            />
          </div>

          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-400">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>

        <Link
          className="block text-center text-sm font-medium text-blue-400 hover:text-blue-300"
          to="/login"
        >
          Back to sign in
        </Link>
      </form>
    </div>
  );
};

export default ResetPassword;
