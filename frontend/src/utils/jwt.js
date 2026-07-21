const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = globalThis.atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
};

export const decodeJwtPayload = (token) => {
  try {
    const parts = String(token ?? "").split(".");

    if (parts.length !== 3 || !parts[1]) {
      return null;
    }

    const payload = JSON.parse(decodeBase64Url(parts[1]));

    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
};

export const getJwtExpiry = (token) => {
  const expirySeconds = Number(decodeJwtPayload(token)?.exp);

  return Number.isFinite(expirySeconds) && expirySeconds > 0
    ? expirySeconds * 1000
    : null;
};

export const isJwtExpired = (token, now = Date.now()) => {
  const expiry = getJwtExpiry(token);

  return expiry === null || expiry <= now;
};
