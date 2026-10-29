import { afterEach, describe, expect, it, vi } from "vitest";
import { generateUUID } from "./uuid";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

afterEach(() => vi.unstubAllGlobals());

describe("generateUUID", () => {
  it("uses native randomUUID when available in a secure context", () => {
    const randomUUID = vi.fn(() => "native-uuid");
    vi.stubGlobal("crypto", { randomUUID, getRandomValues: vi.fn() });

    expect(generateUUID()).toBe("native-uuid");
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("uses secure getRandomValues-backed uuid generation when randomUUID is unavailable, including HTTP", () => {
    const getRandomValues = values => {
      for (let index = 0; index < values.length; index += 1) values[index] = index;
      return values;
    };
    vi.stubGlobal("crypto", { getRandomValues });

    const generated = Array.from({ length: 3 }, generateUUID);
    expect(generated).toHaveLength(3);
    generated.forEach(value => expect(value).toMatch(UUID_V4));
  });
});
