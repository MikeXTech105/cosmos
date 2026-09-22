import { useEffect, useState } from "react";

import {
  getManufacturingEnabled,
  PREFERENCES_EVENT,
  PREFERENCES_STORAGE_KEY,
  updateStoredPreferences,
} from "../utils/preferencesStorage";

const useManufacturingPreference = () => {
  const [manufacturingEnabled, setManufacturingEnabledState] = useState(
    getManufacturingEnabled,
  );

  useEffect(() => {
    const syncPreference = (event) => {
      if (event.type === "storage" && event.key !== PREFERENCES_STORAGE_KEY) return;
      setManufacturingEnabledState(
        event.detail?.manufacturingEnabled ?? getManufacturingEnabled(),
      );
    };

    window.addEventListener(PREFERENCES_EVENT, syncPreference);
    window.addEventListener("storage", syncPreference);

    return () => {
      window.removeEventListener(PREFERENCES_EVENT, syncPreference);
      window.removeEventListener("storage", syncPreference);
    };
  }, []);

  const setManufacturingEnabled = (enabled) => {
    updateStoredPreferences({ manufacturingEnabled: Boolean(enabled) });
  };

  return { manufacturingEnabled, setManufacturingEnabled };
};

export default useManufacturingPreference;
