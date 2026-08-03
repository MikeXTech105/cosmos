import { useCallback, useEffect, useState } from "react";

import { supplyChainChannelService } from "../../services/supplyChain/channelService";

const useSupplyChainChannels = () => {
  const [channels, setChannels] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await supplyChainChannelService.list({
        IsActive: true,
        PageNumber: 1,
        PageSize: 200,
        SortBy: "sortOrder",
        SortDirection: "asc",
      });
      setChannels(
        Array.isArray(response.data?.items) ? response.data.items : [],
      );
    } catch (requestError) {
      setChannels([]);
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);

    return () => window.clearTimeout(timeout);
  }, [load]);

  return { channels, error, loading, reload: load };
};

export default useSupplyChainChannels;
