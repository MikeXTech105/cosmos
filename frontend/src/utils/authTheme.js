export const AUTH_THEME = {
  DARK: "dark",
  LIGHT: "light",
};

export const AUTH_THEME_STORAGE_KEY = "cosmos.authTheme";
export const AUTH_THEME_EVENT = "cosmos:auth-theme-change";

export const normalizeAuthTheme = (value) => {
  return value === AUTH_THEME.DARK ? AUTH_THEME.DARK : AUTH_THEME.LIGHT;
};

export const getStoredAuthTheme = () => {
  if (typeof window === "undefined") {
    return AUTH_THEME.LIGHT;
  }

  return normalizeAuthTheme(window.localStorage.getItem(AUTH_THEME_STORAGE_KEY));
};

export const persistAuthTheme = (value) => {
  const nextTheme = normalizeAuthTheme(value);

  window.localStorage.setItem(AUTH_THEME_STORAGE_KEY, nextTheme);
  window.dispatchEvent(
    new CustomEvent(AUTH_THEME_EVENT, {
      detail: nextTheme,
    }),
  );

  return nextTheme;
};
