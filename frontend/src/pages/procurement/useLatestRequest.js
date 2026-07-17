import { useCallback, useEffect, useRef } from "react";

const useLatestRequest = () => {
  const mountedRef = useRef(true);
  const sequenceRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      sequenceRef.current += 1;
    };
  }, []);

  const beginRequest = useCallback(() => {
    sequenceRef.current += 1;
    return sequenceRef.current;
  }, []);

  const isLatestRequest = useCallback((requestId) => {
    return mountedRef.current && sequenceRef.current === requestId;
  }, []);

  const cancelRequest = useCallback((requestId) => {
    if (sequenceRef.current === requestId) {
      sequenceRef.current += 1;
    }
  }, []);

  return { beginRequest, cancelRequest, isLatestRequest };
};

export default useLatestRequest;
