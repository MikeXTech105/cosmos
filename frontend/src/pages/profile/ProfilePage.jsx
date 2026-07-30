import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Pencil, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import PageHeader from "../../components/common/PageHeader";
import {
  getCurrentProfile,
  updateCurrentProfile,
} from "../../services/profile/profileService";
import { updateCurrentUser } from "../../store/slices/authSlice";
import {
  getApiErrorMessage,
  getApiFieldErrors,
  getApiStatus,
} from "../../utils/apiError";
import { updateStoredAuthUser } from "../../utils/authStorage";
import { getDisplayName, getInitial } from "../../utils/userDisplay";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid email address."),
});

const getRoleLabels = (profile, authRoles) => {
  const roleValues = [
    ...(Array.isArray(profile?.roles) ? profile.roles : []),
    ...(Array.isArray(authRoles) ? authRoles : []),
    profile?.role,
    profile?.roleName,
  ].filter(Boolean);

  return Array.from(
    new Set(
      roleValues
        .map((role) =>
          typeof role === "string"
            ? role
            : role.name ?? role.roleName ?? role.code ?? role.roleCode,
        )
        .filter(Boolean),
    ),
  );
};

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { roles, user: authUser } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState(authUser);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [readOnlyFallback, setReadOnlyFallback] = useState(false);
  const [loadError, setLoadError] = useState("");
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm({
    defaultValues: {
      email: authUser?.email ?? "",
      fullName: getDisplayName(authUser),
    },
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const data = await getCurrentProfile();

        if (!active) return;
        const nextProfile = data?.user ?? data;
        setProfile(nextProfile);
        reset({
          email: nextProfile?.email ?? "",
          fullName: getDisplayName(nextProfile),
        });
      } catch (error) {
        if (!active) return;
        if ([404, 405, 501].includes(getApiStatus(error))) {
          setReadOnlyFallback(true);
          setProfile(authUser);
          return;
        }
        setLoadError(getApiErrorMessage(error, "Unable to load your profile."));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [authUser, reset]);

  const roleLabels = useMemo(
    () => getRoleLabels(profile, roles),
    [profile, roles],
  );
  const displayName = getDisplayName(profile);
  const active = profile?.isActive ?? profile?.active ?? profile?.status === "Active";

  const handleCancel = () => {
    reset({ email: profile?.email ?? "", fullName: displayName });
    setIsEditing(false);
  };

  const handleUpdate = async (values) => {
    try {
      const data = await updateCurrentProfile(values);
      const updatedProfile = data?.user ?? data;
      const nextProfile = { ...(profile ?? {}), ...updatedProfile };

      setProfile(nextProfile);
      dispatch(updateCurrentUser(nextProfile));
      updateStoredAuthUser(nextProfile);
      reset({ email: nextProfile.email ?? "", fullName: getDisplayName(nextProfile) });
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);

      Object.entries(fieldErrors).forEach(([field, message]) => {
        if (["email", "fullName"].includes(field)) {
          setError(field, { message, type: "server" });
        }
      });
      if (getApiStatus(error) === 409 && !fieldErrors.email) {
        setError("email", {
          message: "This email address is already in use.",
          type: "server",
        });
        return;
      }
      if (Object.keys(fieldErrors).length === 0) {
        toast.error(getApiErrorMessage(error, "Unable to update your profile."));
      }
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Profile"
        description="Review and maintain your personal COSMOS ERP account details."
        actions={
          !readOnlyFallback && !isLoading && !isEditing ? (
            <AppButton onClick={() => setIsEditing(true)}>
              <Pencil aria-hidden="true" className="h-4 w-4" /> Edit profile
            </AppButton>
          ) : null
        }
      />

      {readOnlyFallback && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your saved account details are shown read-only. Profile editing will be
          available when the backend self-profile endpoint is enabled.
        </p>
      )}

      {loadError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand text-xl font-bold text-white shadow-sm">
            {getInitial(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold text-slate-900">{displayName}</h2>
            <p className="mt-1 truncate text-sm text-slate-500">{profile?.email ?? "No email available"}</p>
            <span className={["mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"].join(" ")}>
              {active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-slate-500" role="status">Loading profile…</div>
        ) : isEditing ? (
          <form onSubmit={handleSubmit(handleUpdate)} className="space-y-5 p-6">
            <AppInput label="Full name" required autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />
            <AppInput label="Email" type="email" required autoComplete="email" error={errors.email?.message} {...register("email")} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AppButton type="button" variant="secondary" disabled={isSubmitting} onClick={handleCancel}>Cancel</AppButton>
              <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving profile…">Save changes</AppButton>
            </div>
          </form>
        ) : (
          <div className="grid gap-5 p-6 sm:grid-cols-2">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username</p><p className="mt-1 text-sm font-medium text-slate-800">{profile?.username ?? profile?.userName ?? "—"}</p></div>
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p><p className="mt-1 break-all text-sm font-medium text-slate-800">{profile?.email ?? "—"}</p></div>
            <div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Roles</p><div className="mt-2 flex flex-wrap gap-2">{roleLabels.length > 0 ? roleLabels.map((role) => <span key={role} className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />{role}</span>) : <span className="text-sm text-slate-500">No roles assigned</span>}</div></div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 text-sm text-slate-600"><UserRound aria-hidden="true" className="h-4 w-4" />Personal account</span>
          <Link to="/change-password" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark md:min-h-0"><KeyRound aria-hidden="true" className="h-4 w-4" />Change password</Link>
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
