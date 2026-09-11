import runtimeConfig from "../config/runtimeConfig";

const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+.-]*:/i;

export const resolveMediaUrl = (value) => {
  const source = String(value ?? "").trim();

  if (!source || source.startsWith("blob:") || source.startsWith("data:")) {
    return source;
  }

  const normalized = source.replace(/\\/g, "/");

  if (ABSOLUTE_URL_PATTERN.test(normalized) || normalized.startsWith("//")) {
    return normalized;
  }

  const browserOrigin = globalThis.location?.origin ?? "http://localhost";
  const apiBase = runtimeConfig.API_BASE_URL || browserOrigin;

  try {
    return new URL(normalized, `${apiBase.replace(/\/+$/, "")}/`).toString();
  } catch {
    return normalized;
  }
};

export const getMediaUrl = (record, keys) => {
  const key = keys.find((candidate) => {
    const value = record?.[candidate];
    return typeof value === "string" && value.trim();
  });

  return resolveMediaUrl(key ? record[key] : "");
};
