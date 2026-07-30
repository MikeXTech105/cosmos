import { ListChecks, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AppButton from "../../components/common/AppButton";
import AppTooltip from "../../components/common/AppTooltip";
import {
  GETTING_STARTED_PREFERENCE_EVENT,
  isGettingStartedDismissed,
  setGettingStartedDismissed,
} from "./gettingStartedPreference";
import GettingStartedProgress from "./GettingStartedProgress";
import useGettingStartedProgress from "./useGettingStartedProgress";

const GettingStartedCard = () => {
  const [dismissed, setDismissed] = useState(isGettingStartedDismissed);
  const progress = useGettingStartedProgress({ enabled: !dismissed });

  useEffect(() => {
    const syncPreference = () => setDismissed(isGettingStartedDismissed());

    window.addEventListener(
      GETTING_STARTED_PREFERENCE_EVENT,
      syncPreference,
    );
    window.addEventListener("storage", syncPreference);

    return () => {
      window.removeEventListener(
        GETTING_STARTED_PREFERENCE_EVENT,
        syncPreference,
      );
      window.removeEventListener("storage", syncPreference);
    };
  }, []);

  if (dismissed || progress.isComplete) {
    return null;
  }

  return (
    <section className="rounded-xl border border-brand/15 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
            <ListChecks aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Get started with COSMOS
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Complete the available setup steps to make your workspace ready.
            </p>
          </div>
        </div>
        <AppTooltip label="Hide getting started">
          <button
            aria-label="Hide getting started"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 md:h-9 md:w-9"
            type="button"
            onClick={() => setGettingStartedDismissed(true)}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </AppTooltip>
      </div>

      <GettingStartedProgress {...progress} />

      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <Link
          className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98] md:h-9"
          to="/getting-started"
        >
          View setup guide
        </Link>
        <AppButton
          disabled={progress.isLoading}
          variant="secondary"
          onClick={progress.refresh}
        >
          <RefreshCw aria-hidden="true"
            className={`h-4 w-4 ${progress.isLoading ? "animate-spin" : ""}`}
          />
          Check again
        </AppButton>
      </div>
    </section>
  );
};

export default GettingStartedCard;
