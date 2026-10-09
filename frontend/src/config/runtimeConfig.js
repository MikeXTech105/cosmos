const trimTrailingSlashes = (value) =>
  value === "/" ? value : value.replace(/\/+$/, "");

const normalizeApiOrigin = (url) => {
  const pathname = trimTrailingSlashes(url.pathname);

  if (pathname !== "/" && pathname !== "/api") {
    return {
      error: "API_BASE_URL must be an API origin or end with /api; endpoint paths already include /api.",
      value: "",
    };
  }

  if (url.search || url.hash) {
    return {
      error: "API_BASE_URL must not include a query string or fragment.",
      value: "",
    };
  }

  return { error: null, value: url.origin };
};

export const validateApiBaseUrl = (candidate) => {
  const value = String(candidate ?? "").trim();

  if (!value) {
    return { error: null, value: "" };
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    if (trimTrailingSlashes(value) === "/api") {
      return { error: null, value: "" };
    }

    return {
      error: "API_BASE_URL must be an HTTP(S) origin or the same-origin /api path.",
      value: "",
    };
  }

  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      return {
        error: "API_BASE_URL must use HTTP(S) or a same-origin path.",
        value: "",
      };
    }

    return normalizeApiOrigin(url);
  } catch {
    return {
      error: "API_BASE_URL must be an absolute HTTP(S) URL or a leading-slash same-origin path.",
      value: "",
    };
  }
};

export const resolveRuntimeConfig = ({
  allowSameOrigin = false,
  buildValue,
  runtimeValue,
} = {}) => {
  const hasRuntimeValue = runtimeValue !== undefined && runtimeValue !== null;
  const source = hasRuntimeValue ? "runtime" : buildValue ? "build" : "same-origin";
  const candidate = hasRuntimeValue ? runtimeValue : buildValue ?? "";
  const validation = validateApiBaseUrl(candidate);

  if (!validation.error && !validation.value && !allowSameOrigin) {
    return {
      API_BASE_URL: "",
      error:
        "API_BASE_URL is required outside local development. Configure an HTTP(S) API origin at runtime or build time.",
      source,
    };
  }

  return {
    API_BASE_URL: validation.value,
    error: validation.error,
    source,
  };
};

export const runtimeConfig = resolveRuntimeConfig({
  allowSameOrigin: import.meta.env.DEV || import.meta.env.MODE === "test",
  buildValue: import.meta.env.VITE_API_BASE_URL,
  runtimeValue:
    typeof window === "undefined"
      ? undefined
      : window.__COSMOS_CONFIG__?.API_BASE_URL,
});

export const buildApiUrl = (endpoint, baseUrl = runtimeConfig.API_BASE_URL) => {
  const path = String(endpoint ?? "");

  if (!path.startsWith("/api/")) {
    throw new Error("API endpoint paths must start with /api/.");
  }

  return `${baseUrl}${path}`;
};

export default runtimeConfig;
