import { useCallback, useEffect, useState } from "react";

import { salesChannelService } from "../../services/procurement/salesChannelService";
import { getCollection } from "./procurementHelpers";
import useLatestRequest from "../../hooks/useLatestRequest";

const useActiveSalesChannels = () => {
  const [state, setState] = useState({
    channels: [],
    error: null,
    loading: true,
  });
  const { beginRequest, isLatestRequest } = useLatestRequest();

  const load = useCallback(async () => {
    const requestId = beginRequest();
    setState((current) => ({ ...current, error: null, loading: true }));
    try {
      const response = await salesChannelService.list({
        IsActive: true,
        PageNumber: 1,
        PageSize: 200,
      });
      if (isLatestRequest(requestId)) {
        setState({
          channels: getCollection(response.data, ["channels", "salesChannels"]),
          error: null,
          loading: false,
        });
      }
    } catch (error) {
      if (isLatestRequest(requestId)) {
        setState({ channels: [], error, loading: false });
      }
    }
  }, [beginRequest, isLatestRequest]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  return { ...state, reload: load };
};

export default useActiveSalesChannels;
