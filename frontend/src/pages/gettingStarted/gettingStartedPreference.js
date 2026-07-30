export const GETTING_STARTED_DISMISSED_KEY =
  "cosmos.gettingStarted.dismissed";

export const GETTING_STARTED_PREFERENCE_EVENT =
  "cosmos:getting-started-preference-change";

export const isGettingStartedDismissed = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(GETTING_STARTED_DISMISSED_KEY) === "true";
};

export const setGettingStartedDismissed = (dismissed) => {
  if (typeof window === "undefined") {
    return;
  }

  if (dismissed) {
    window.localStorage.setItem(GETTING_STARTED_DISMISSED_KEY, "true");
  } else {
    window.localStorage.removeItem(GETTING_STARTED_DISMISSED_KEY);
  }

  window.dispatchEvent(
    new CustomEvent(GETTING_STARTED_PREFERENCE_EVENT, {
      detail: { dismissed },
    }),
  );
};
