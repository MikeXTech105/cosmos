import { describe, expect, it } from "vitest";

import { decodeJwtPayload, getJwtExpiry, isJwtExpired } from "./jwt";

const encode = (value) => {
  return btoa(JSON.stringify(value))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

const createToken = (payload) => `${encode({ alg: "none" })}.${encode(payload)}.`;

describe("JWT helpers", () => {
  it("decodes a payload without claiming signature validation", () => {
    expect(decodeJwtPayload(createToken({ sub: "user-1", exp: 123 }))).toEqual({
      exp: 123,
      sub: "user-1",
    });
  });

  it("returns expiry in milliseconds", () => {
    expect(getJwtExpiry(createToken({ exp: 123 }))).toBe(123000);
  });

  it("detects expired and valid timestamps", () => {
    expect(isJwtExpired(createToken({ exp: 10 }), 10001)).toBe(true);
    expect(isJwtExpired(createToken({ exp: 11 }), 10001)).toBe(false);
  });

  it.each(["", "opaque-token", "a.bad-json.c", createToken({ sub: "x" })])(
    "treats malformed or unknown-expiry tokens as expired-safe: %s",
    (token) => {
      expect(isJwtExpired(token)).toBe(true);
    },
  );
});
