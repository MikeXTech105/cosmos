const trimTrailingSlashes = (value) =>
  value === "/" ? value : value.replace(/\/+$/, "");

export const validateApiBaseUrl = (candidate) => {
  const value = String(candidate ?? "").trim();

  if (!value) {
    return { error: null, value: "" };
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return { error: null, value: trimTrailingSlashes(value) };
  }

  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      return {
        error: "API_BASE_URL must use HTTP(S) or a same-origin path.",
        value: "",
      };
    }

    return { error: null, value: trimTrailingSlashes(value) };
  } catch {
    return {
      error: "API_BASE_URL must be an absolute HTTP(S) URL or a leading-slash same-origin path.",
      value: "",
    };
  }
};

export const resolveRuntimeConfig = ({ buildValue, runtimeValue } = {}) => {
  const hasRuntimeValue = runtimeValue !== undefined && runtimeValue !== null;
  const source = hasRuntimeValue ? "runtime" : buildValue ? "build" : "same-origin";
  const candidate = hasRuntimeValue ? runtimeValue : buildValue ?? "";
  const validation = validateApiBaseUrl(candidate);

  return {
    API_BASE_URL: validation.value,
    error: validation.error,
    source,
  };
};

export const runtimeConfig = resolveRuntimeConfig({
  buildValue: import.meta.env.VITE_API_BASE_URL,
  runtimeValue:
    typeof window === "undefined"
      ? undefined
      : window.__COSMOS_CONFIG__?.API_BASE_URL,
});

export default runtimeConfig;
