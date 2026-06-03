import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { forgotPassword } from "../../services/authService";
import { forgotPasswordSchema } from "../../utils/validationSchemas";

const inputClassName =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15";

const ForgotPassword = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (payload) => {
    try {
      const data = await forgotPassword(payload);

      toast.success(
        data.message ?? "Password reset instructions have been sent",
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ?? "Unable to send reset instructions.",
      );
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Forgot password
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Enter your email address and we will send reset instructions.
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
              placeholder="you@company.com"
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Send Instructions"}
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

export default ForgotPassword;
