import {
  AlertCircle,
  CheckCircle2,
  Circle,
  LoaderCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

const GettingStartedProgress = ({
  checks,
  completeCount,
  isLoading,
  steps,
  totalCount,
}) => {
  const percentage =
    totalCount > 0 ? Math.round((completeCount / totalCount) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          Setup {completeCount} of {totalCount} complete
        </p>
        <span className="text-xs font-medium tabular-nums text-slate-500">
          {percentage}%
        </span>
      </div>
      <div
        aria-label={`${percentage}% of setup complete`}
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
      >
        <div
          className="h-full rounded-full bg-brand transition-[width]"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {totalCount === 0 && !isLoading ? (
        <p className="mt-5 text-sm text-slate-500">
          No setup actions are available with your current permissions.
        </p>
      ) : (
        <ol className="mt-5 divide-y divide-slate-100">
          {steps.map((step) => {
            const check = checks[step.id];
            const checking = isLoading && !check;
            const failed = check?.status === "error";
            const complete = Boolean(check?.complete);
            const StateIcon = checking
              ? LoaderCircle
              : failed
                ? AlertCircle
                : complete
                  ? CheckCircle2
                  : Circle;

            return (
              <li
                key={step.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <StateIcon
                  className={[
                    "h-5 w-5 shrink-0",
                    checking
                      ? "animate-spin text-slate-300"
                      : failed
                        ? "text-slate-500"
                        : complete
                          ? "text-emerald-600"
                          : "text-slate-300",
                  ].join(" ")}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      "text-sm font-medium",
                      complete ? "text-slate-500 line-through" : "text-slate-900",
                    ].join(" ")}
                  >
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    {failed ? "Couldn't check" : step.description}
                  </p>
                </div>
                {!complete ? (
                  <Link
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98] md:h-9"
                    to={step.href}
                  >
                    Open
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default GettingStartedProgress;
