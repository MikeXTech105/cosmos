import { getApiErrorMessage } from "./apiError";

const decodeFilename = (value) => {
  const normalized = String(value ?? "").trim().replace(/^"|"$/g, "");

  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
};

export const getFilenameFromContentDisposition = (headerValue) => {
  if (!headerValue) {
    return "";
  }

  const extendedMatch = String(headerValue).match(
    /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i,
  );

  if (extendedMatch) {
    return decodeFilename(extendedMatch[1]);
  }

  const filenameMatch = String(headerValue).match(
    /filename\s*=\s*("(?:[^"\\]|\\.)*"|[^;]+)/i,
  );

  if (!filenameMatch) {
    return "";
  }

  return filenameMatch[1]
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/\\"/g, '"');
};

export const downloadBlob = (blob, filename = "download") => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  try {
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }
};

export const readBlobApiError = async (
  blob,
  fallback = "Unable to download the file.",
) => {
  try {
    const text = await blob.text();
    const data = text ? JSON.parse(text) : null;

    return getApiErrorMessage({ response: { data } }, fallback);
  } catch {
    return fallback;
  }
};

export const downloadResponseBlob = async (
  response,
  fallbackFilename = "download",
) => {
  const blob = response?.data instanceof Blob
    ? response.data
    : new Blob([response?.data ?? ""]);
  const contentType = String(
    response?.headers?.["content-type"] ?? blob.type ?? "",
  ).toLowerCase();

  if (contentType.includes("json")) {
    throw new Error(await readBlobApiError(blob));
  }

  const filename =
    getFilenameFromContentDisposition(
      response?.headers?.["content-disposition"],
    ) || fallbackFilename;

  downloadBlob(blob, filename);
  return filename;
};

export const getDownloadErrorMessage = async (
  error,
  fallback = "Unable to download the file.",
) => {
  if (error?.response?.data instanceof Blob) {
    return readBlobApiError(error.response.data, fallback);
  }

  return getApiErrorMessage(error, fallback);
};
