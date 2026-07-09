import { useCallback, useEffect, useState } from "react";

import { getSidebarTheme } from "../config/sidebarThemes";
import {
  applyAppTheme,
  getStoredSidebarTheme,
  persistSidebarTheme,
  SIDEBAR_THEME_EVENT,
  SIDEBAR_THEME_STORAGE_KEY,
} from "../utils/sidebarTheme";

const useSidebarTheme = () => {
  const [sidebarThemeId, setSidebarThemeId] = useState(getStoredSidebarTheme);

  useEffect(() => {
    const syncSidebarTheme = (event) => {
      const value = event.type === "storage" ? event.newValue : event.detail;
      const nextTheme = applyAppTheme(value);

      setSidebarThemeId(nextTheme);
    };

    const handleStorage = (event) => {
      if (event.key === SIDEBAR_THEME_STORAGE_KEY) {
        syncSidebarTheme(event);
      }
    };

    window.addEventListener(SIDEBAR_THEME_EVENT, syncSidebarTheme);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(SIDEBAR_THEME_EVENT, syncSidebarTheme);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    applyAppTheme(sidebarThemeId);
  }, [sidebarThemeId]);

  const setSidebarTheme = useCallback((value) => {
    setSidebarThemeId(persistSidebarTheme(value));
  }, []);

  return {
    setSidebarTheme,
    sidebarTheme: getSidebarTheme(sidebarThemeId),
    sidebarThemeId,
  };
};

export default useSidebarTheme;
