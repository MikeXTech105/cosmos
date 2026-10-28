import { useCallback, useEffect, useState } from "react";
import { partyService } from "./partyService";
import { getApiErrorMessage } from "../../utils/apiError";

// These flags have concrete consumers. Reminder, loyalty and custom-value models do not yet exist.
export const supportedPartySetting = name => ["enablePartyGrouping", "enableShippingAddress", "printShippingAddress", "enablePartyStatus"].includes(name);
export const partySettingEnabled = (settings, name) => settings?.[name] === true;

export default function usePartySettings({ enabled = true } = {}) {
  const [result, setResult] = useState({ settings: null, error: "", loading: enabled });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    partyService.getPartySettings({ signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) setResult({ settings: response.data, error: "", loading: false });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ settings: null, error: getApiErrorMessage(error, "Party settings could not be loaded. Settings-dependent controls are unavailable."), loading: false });
    });
    return () => controller.abort();
  }, [enabled, revision]);
  return { ...result, refresh };
}
