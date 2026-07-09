import { useCallback, useEffect, useState } from "react";

import {
  AUTH_THEME,
  AUTH_THEME_EVENT,
  AUTH_THEME_STORAGE_KEY,
  getStoredAuthTheme,
  normalizeAuthTheme,
  persistAuthTheme,
} from "../utils/authTheme";

const useAuthTheme = () => {
  const [authTheme, setAuthThemeState] = useState(getStoredAuthTheme);

  useEffect(() => {
    const syncAuthTheme = (event) => {
      const value =
        event.type === "storage"
          ? event.newValue
          : event.detail;

      setAuthThemeState(normalizeAuthTheme(value));
    };
    const handleStorage = (event) => {
      if (event.key === AUTH_THEME_STORAGE_KEY) {
        syncAuthTheme(event);
      }
    };

    window.addEventListener(AUTH_THEME_EVENT, syncAuthTheme);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(AUTH_THEME_EVENT, syncAuthTheme);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setAuthTheme = useCallback((value) => {
    setAuthThemeState(persistAuthTheme(value));
  }, []);

  return {
    authTheme,
    isDark: authTheme === AUTH_THEME.DARK,
    setAuthTheme,
  };
};

export default useAuthTheme;
