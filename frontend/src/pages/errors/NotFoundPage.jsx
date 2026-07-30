import { ArrowLeft, FileQuestion } from "lucide-react";
import { useNavigate } from "react-router-dom";

import AppButton from "../../components/common/AppButton";
import useDefaultAuthorizedRoute from "../../hooks/useDefaultAuthorizedRoute";

const NotFoundPage = () => {
  const navigate = useNavigate();
  const defaultRoute = useDefaultAuthorizedRoute();

  return (
    <section className="flex min-h-[60vh] items-center justify-center py-8">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand ring-1 ring-inset ring-brand/10">
          <FileQuestion aria-hidden="true" className="h-7 w-7" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          404 / Not Found
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          This page does not exist
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
          The address may be incorrect, or the page may have moved. Return to a
          page available to your account.
        </p>
        <div className="mt-6 flex justify-center">
          <AppButton onClick={() => navigate(defaultRoute, { replace: true })}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Go back to COSMOS
          </AppButton>
        </div>
      </div>
    </section>
  );
};

export default NotFoundPage;

