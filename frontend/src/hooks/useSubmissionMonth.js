import { useCallback, useEffect, useMemo, useState } from "react";
import { loadSubmissionMonth, submissionMonthRange, validSubmissionMonth } from "../utils/submissionCalendar";
import { getApiErrorMessage } from "../utils/apiError";

export default function useSubmissionMonth({ month, loadPage, enabled = true, revision = 0, scope = "" }) {
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState(null);
  const key = JSON.stringify([month, scope, revision, retry, enabled]);
  const request = useMemo(() => ({ key, loadPage }), [key, loadPage]);
  const available = enabled && validSubmissionMonth(month);
  useEffect(() => {
    if (!available) return;
    const controller = new AbortController();
    loadSubmissionMonth({ month, loadPage: request.loadPage, signal: controller.signal }).then(entries => {
      if (!controller.signal.aborted) setState({ request, entries, error: "" });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ request, entries: [], error: getApiErrorMessage(error, "The month could not be loaded. Retry to check your entries.") });
    });
    return () => controller.abort();
  }, [available, request, month]);
  const current = state?.request === request ? state : null;
  const reload = useCallback(() => setRetry(value => value + 1), []);
  return {
    entries: available ? current?.entries ?? [] : [],
    loading: Boolean(available && !current),
    error: available ? current?.error ?? "" : "",
    complete: Boolean(available && current && !current.error),
    reload,
    ...submissionMonthRange(month),
  };
}
