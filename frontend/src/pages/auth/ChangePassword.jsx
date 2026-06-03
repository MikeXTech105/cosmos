import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { changePassword } from "../../services/authService";
import { changePasswordSchema } from "../../utils/validationSchemas";

const inputClassName =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 pr-11 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";

const PasswordField = ({
  id,
  label,
  error,
  register,
  isVisible,
  onToggle,
  autoComplete,
}) => {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-gray-700">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={isVisible ? "text" : "password"}
          autoComplete={autoComplete}
          className={`${inputClassName} ${
            error ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : ""
          }`}
          {...register(id)}
        />

        <button
          type="button"
          className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          onClick={onToggle}
          aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
};

const ChangePassword = () => {
  const navigate = useNavigate();
  const [visibleFields, setVisibleFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const toggleVisibility = (field) => {
    setVisibleFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  const onSubmit = async (payload) => {
    try {
      const data = await changePassword(payload);

      reset();
      toast.success(data.message ?? "Password changed successfully");
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to change password.");
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-6rem)] items-start justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-[560px]">
        <div className="mb-6">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Change password
          </h1>

          <p className="mt-2 max-w-lg text-sm leading-6 text-gray-500">
            Keep your COSMOS account secure by choosing a strong password that
            you do not use anywhere else.
          </p>
        </div>

        <div
          className="overflow-hidden rounded-xl border border-gray-200/80 bg-white"
          style={{
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.04), 0 10px 30px rgba(15,23,42,0.08)",
          }}
        >
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-gray-900">
              Security details
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter your current password and confirm the new one.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-5 px-5 py-5 sm:px-6">
              <PasswordField
                id="currentPassword"
                label="Current Password"
                autoComplete="current-password"
                register={register}
                error={errors.currentPassword?.message}
                isVisible={visibleFields.currentPassword}
                onToggle={() => toggleVisibility("currentPassword")}
              />

              <PasswordField
                id="newPassword"
                label="New Password"
                autoComplete="new-password"
                register={register}
                error={errors.newPassword?.message}
                isVisible={visibleFields.newPassword}
                onToggle={() => toggleVisibility("newPassword")}
              />

              <PasswordField
                id="confirmPassword"
                label="Confirm Password"
                autoComplete="new-password"
                register={register}
                error={errors.confirmPassword?.message}
                isVisible={visibleFields.confirmPassword}
                onToggle={() => toggleVisibility("confirmPassword")}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/10"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-white transition-shadow hover:shadow-[0_6px_16px_rgba(59,130,246,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  background:
                    "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
                  boxShadow:
                    "0 2px 6px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.18)",
                }}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Changing..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ChangePassword;
