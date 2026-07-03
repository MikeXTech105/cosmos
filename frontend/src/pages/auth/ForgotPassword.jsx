import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { getAuthFormClasses } from "../../components/auth/authThemeClasses";
import useAuthTheme from "../../hooks/useAuthTheme";
import { forgotPassword } from "../../services/authService";
import { getApiErrorMessage } from "../../utils/apiError";
import { forgotPasswordSchema } from "../../utils/validationSchemas";

const ForgotPassword = () => {
  const { authTheme } = useAuthTheme();
  const classes = getAuthFormClasses(authTheme);
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
        getApiErrorMessage(error, "Unable to send reset instructions."),
      );
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
          Forgot password
        </h2>
        <p className={["mt-1.5 text-sm", classes.subtext].join(" ")}>
          Enter your email address and we will send reset instructions.
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
              placeholder="you@company.com"
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

        <button
          type="submit"
          disabled={isSubmitting}
          className={[
            "w-full rounded-lg py-2.5 text-sm font-medium transition-colors",
            classes.button,
          ].join(" ")}
        >
          {isSubmitting ? "Sending..." : "Send Instructions"}
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

export default ForgotPassword;
