import { ArrowRight, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

import AppButton from "../../components/common/AppButton";
import useDefaultAuthorizedRoute from "../../hooks/useDefaultAuthorizedRoute";

const AccessDeniedPage = () => {
  const navigate = useNavigate();
  const defaultRoute = useDefaultAuthorizedRoute();
  const hasDestination = defaultRoute !== "/403";

  return (
    <section className="flex min-h-[60vh] items-center justify-center py-8">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
          <ShieldAlert aria-hidden="true" className="h-7 w-7" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
          403 / Access Denied
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          You cannot access this page
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
          Your account does not have access to the requested area. Contact an
          administrator if you believe this is unexpected.
        </p>
        <div className="mt-6 flex justify-center">
          <AppButton
            disabled={!hasDestination}
            onClick={() => navigate(defaultRoute, { replace: true })}
          >
            {hasDestination ? "Go to an available page" : "No available modules"}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </AppButton>
        </div>
      </div>
    </section>
  );
};

export default AccessDeniedPage;

