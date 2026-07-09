import {
  DEFAULT_SIDEBAR_THEME,
  getSidebarTheme,
  sidebarThemeMap,
} from "../config/sidebarThemes";

export const APP_THEME_STORAGE_KEY = "cosmos.appTheme";
export const LEGACY_SIDEBAR_THEME_STORAGE_KEY = "cosmos.sidebarTheme";
export const SIDEBAR_THEME_STORAGE_KEY = APP_THEME_STORAGE_KEY;
export const SIDEBAR_THEME_EVENT = "cosmos:app-theme-change";

export const normalizeSidebarTheme = (value) => {
  return sidebarThemeMap[value] ? value : DEFAULT_SIDEBAR_THEME;
};

export const getStoredSidebarTheme = () => {
  if (typeof window === "undefined") {
    return DEFAULT_SIDEBAR_THEME;
  }

  return normalizeSidebarTheme(
    window.localStorage.getItem(APP_THEME_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_SIDEBAR_THEME_STORAGE_KEY),
  );
};

export const applyAppTheme = (value) => {
  if (typeof document === "undefined") {
    return normalizeSidebarTheme(value);
  }

  const nextTheme = normalizeSidebarTheme(value);
  const theme = getSidebarTheme(nextTheme);
  const root = document.documentElement;

  root.dataset.appTheme = nextTheme;
  root.style.setProperty("--app-accent", theme.accent.base);
  root.style.setProperty("--app-accent-light", theme.accent.light);
  root.style.setProperty("--app-accent-mid", theme.accent.mid);
  root.style.setProperty("--app-accent-dark", theme.accent.dark);

  return nextTheme;
};

export const applyStoredAppTheme = () => {
  return applyAppTheme(getStoredSidebarTheme());
};

export const persistSidebarTheme = (value) => {
  const nextTheme = normalizeSidebarTheme(value);

  applyAppTheme(nextTheme);
  window.localStorage.setItem(APP_THEME_STORAGE_KEY, nextTheme);
  window.localStorage.removeItem(LEGACY_SIDEBAR_THEME_STORAGE_KEY);
  window.dispatchEvent(
    new CustomEvent(SIDEBAR_THEME_EVENT, {
      detail: nextTheme,
    }),
  );

  return nextTheme;
};
