import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  loadSource,
  safeSourceError,
  sourcePermissions,
  validRange,
} from "./deepDiveData";

export function useDebounced(value) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), 220);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}

export function useFreshnessClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    const timer = setInterval(update, 60000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return now;
}

export default function useDeepDive(page, range, revision) {
  const auth = useSelector((state) => state.auth);
  const access = useMemo(() => sourcePermissions(auth), [auth]);
  const exports = useMemo(() => sourcePermissions(auth, "export"), [auth]);
  const allowed = page.sources.filter((key) => access[key]).join(",");
  const { fromDate, toDate } = range;
  const requestKey = `${page.id}:${fromDate}:${toDate}:${allowed}:${revision}`;
  const [result, setResult] = useState({ key: "", sources: {} });
  useEffect(() => {
    const controller = new AbortController();
    const keys = allowed.split(",").filter(Boolean);
    if (!validRange({ fromDate, toDate })) return () => controller.abort();
    let next = 0;
    async function worker() {
      await Promise.resolve();
      while (next < keys.length && !controller.signal.aborted) {
        const key = keys[next++];
        let entry;
        try {
          const data = await loadSource(
            key,
            { fromDate, toDate },
            controller.signal,
          );
          entry = { status: "ready", data, fetchedAt: Date.now() };
        } catch (error) {
          entry = { status: "error", error: safeSourceError(error) };
        }
        if (!controller.signal.aborted)
          setResult((previous) => ({
            key: requestKey,
            auth,
            sources: {
              ...(previous.key === requestKey && previous.auth === auth
                ? previous.sources
                : {}),
              [key]: entry,
            },
          }));
      }
    }
    void Promise.all(Array.from({ length: Math.min(keys.length, 4) }, worker));
    return () => controller.abort();
  }, [allowed, fromDate, toDate, requestKey, auth]);
  const sources = Object.fromEntries(
    page.sources.map((key) => [
      key,
      !access[key]
        ? { status: "denied" }
        : result.key === requestKey &&
            result.auth === auth &&
            result.sources[key]
          ? result.sources[key]
          : { status: "loading" },
    ]),
  );
  return {
    access,
    exports,
    sources,
    authorized: page.sources.some((key) => access[key]),
  };
}
