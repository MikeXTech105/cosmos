import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { canPerformAction } from "../../utils/permissionResolver";
import { GETTING_STARTED_STEPS } from "./gettingStartedConfig";

const getTotalCount = (response) => {
  const data = response?.data;
  const candidates = [
    data?.totalCount,
    data?.pagination?.totalCount,
    data?.meta?.totalCount,
    response?.meta?.totalCount,
    response?.meta?.total,
  ];
  const totalCount = candidates
    .map(Number)
    .find((value) => Number.isFinite(value) && value >= 0);

  if (totalCount !== undefined) {
    return totalCount;
  }

  if (Array.isArray(data)) {
    return data.length;
  }

  if (Array.isArray(data?.items)) {
    return data.items.length;
  }

  throw new Error("The paged response did not include a total count.");
};

const useGettingStartedProgress = ({ enabled = true } = {}) => {
  const pages = useSelector((state) => state.auth.pages ?? []);
  const roles = useSelector((state) => state.auth.roles ?? []);
  const user = useSelector((state) => state.auth.user);
  const [checks, setChecks] = useState({});
  const [isLoading, setIsLoading] = useState(enabled);

  const steps = useMemo(
    () =>
      GETTING_STARTED_STEPS.filter((step) =>
        step.permissions.every((permission) =>
          canPerformAction({
            action: permission.action,
            pages,
            roles,
            target: {
              label: permission.label,
              route: permission.route,
            },
            user,
          }),
        ),
      ),
    [pages, roles, user],
  );

  const refresh = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const results = await Promise.allSettled(
      steps.map((step) => step.check()),
    );
    const nextChecks = Object.fromEntries(
      results.map((result, index) => {
        const step = steps[index];

        if (result.status === "rejected") {
          return [step.id, { status: "error" }];
        }

        try {
          return [
            step.id,
            {
              complete: getTotalCount(result.value) > 0,
              status: "ready",
            },
          ];
        } catch {
          return [step.id, { status: "error" }];
        }
      }),
    );

    setChecks(nextChecks);
    setIsLoading(false);
  }, [enabled, steps]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const completeCount = steps.filter(
    (step) => checks[step.id]?.complete,
  ).length;
  const totalCount = steps.length;

  return {
    checks,
    completeCount,
    isComplete: totalCount > 0 && completeCount === totalCount,
    isLoading,
    refresh,
    steps,
    totalCount,
  };
};

export default useGettingStartedProgress;
