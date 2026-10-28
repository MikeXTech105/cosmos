import { useCallback, useEffect, useState } from "react";
import productionApi from "../services/manufacturing/productionApi";
import { unwrapResponse } from "../services/apiServiceUtils";

export default function useProductionRuntime() {
  const [state, setState] = useState({ runtime: null, loading: true, error: "" });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    productionApi.get("/api/v1/manufacturing/runtime", { signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) setState({ runtime: unwrapResponse(response).data, loading: false, error: "" });
    }).catch(error => { if (!controller.signal.aborted) setState({ runtime: null, loading: false, error: error.response?.data?.message || error.message || "Company business context is unavailable." }); });
    return () => controller.abort();
  }, [revision]);
  return { ...state, reload };
}
