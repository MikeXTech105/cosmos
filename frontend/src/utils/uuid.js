import { v4 as uuidv4 } from "uuid";

/**
 * Produces a cryptographically secure UUID in both secure and insecure browser
 * contexts. randomUUID is restricted to secure contexts, whereas uuid uses the
 * browser's secure random source when that convenience API is unavailable.
 */
export function generateUUID() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return uuidv4();
}
