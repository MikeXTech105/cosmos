import { ListChecks } from "lucide-react";
import { useEffect, useState } from "react";

import SettingsCard from "../components/SettingsCard";
import {
  GETTING_STARTED_PREFERENCE_EVENT,
  isGettingStartedDismissed,
  setGettingStartedDismissed,
} from "../../gettingStarted/gettingStartedPreference";

const GettingStartedSection = () => {
  const [showOnDashboard, setShowOnDashboard] = useState(
    () => !isGettingStartedDismissed(),
  );

  useEffect(() => {
    const syncPreference = () =>
      setShowOnDashboard(!isGettingStartedDismissed());

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

  return (
    <SettingsCard
      description="Restore the first-run checklist after it has been dismissed."
      icon={ListChecks}
      title="Getting started"
    >
      <label
        htmlFor="show-getting-started"
        className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4"
      >
        <span className="sr-only">Show getting started on the Dashboard</span>
        <input
          id="show-getting-started"
          aria-label="Show getting started on the Dashboard"
          checked={showOnDashboard}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/25"
          type="checkbox"
          onChange={(event) => {
            const shouldShow = event.target.checked;

            setGettingStartedDismissed(!shouldShow);
            setShowOnDashboard(shouldShow);
          }}
        />
        <span>
          <span className="block text-sm font-semibold text-slate-900">
            Show getting started again
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            Display the setup checklist on the Dashboard until all available
            steps are complete.
          </span>
        </span>
      </label>
    </SettingsCard>
  );
};

export default GettingStartedSection;
