import { useCallback, useEffect, useRef } from "react";

const useLatestRequest = () => {
  const mountedRef = useRef(true);
  const sequenceRef = useRef(0);
  const abortControllerRef = useRef(null);

  const cancelAllRequests = useCallback(() => {
    sequenceRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      sequenceRef.current += 1;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  const beginRequest = useCallback(() => {
    sequenceRef.current += 1;
    return sequenceRef.current;
  }, []);

  const beginAbortableRequest = useCallback(() => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    sequenceRef.current += 1;

    return {
      requestId: sequenceRef.current,
      signal: controller.signal,
    };
  }, []);

  const isLatestRequest = useCallback((requestId) => {
    return mountedRef.current && sequenceRef.current === requestId;
  }, []);

  const cancelRequest = useCallback((requestId) => {
    if (sequenceRef.current === requestId) {
      sequenceRef.current += 1;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    beginAbortableRequest,
    beginRequest,
    cancelAllRequests,
    cancelRequest,
    isLatestRequest,
  };
};

export default useLatestRequest;
