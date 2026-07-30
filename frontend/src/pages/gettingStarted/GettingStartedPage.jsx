import { ListChecks, RefreshCw } from "lucide-react";

import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";
import GettingStartedProgress from "./GettingStartedProgress";
import useGettingStartedProgress from "./useGettingStartedProgress";

const GettingStartedPage = () => {
  const progress = useGettingStartedProgress();

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <ListChecks aria-hidden="true" className="h-3.5 w-3.5" />
            First-run setup
          </>
        }
        title="Getting started"
        description="Set up the core records your team needs. Only actions allowed by your permissions are shown."
        actions={
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
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <GettingStartedProgress {...progress} />
      </div>
    </section>
  );
};

export default GettingStartedPage;
