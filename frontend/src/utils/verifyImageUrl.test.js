import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyImageUrl } from "./verifyImageUrl";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("uploaded image availability", () => {
  it("accepts an image only after the browser loads the saved URL", async () => {
    let image;
    vi.stubGlobal("Image", class { constructor() { image = this; } });
    const promise = verifyImageUrl("https://example.com/uploads/p.png");
    expect(image.src).toBe("https://example.com/uploads/p.png");
    image.onload();
    await expect(promise).resolves.toBe(image.src);
    expect(image.onload).toBeNull();
  });
  it("rejects the deployed failure: successful upload but inaccessible image", async () => {
    let image;
    vi.stubGlobal("Image", class { constructor() { image = this; } });
    const promise = verifyImageUrl("https://example.com/uploads/missing.png");
    image.onerror();
    await expect(promise).rejects.toThrow("cannot be opened");
  });
  it("does not leave save blocked indefinitely on a stalled image", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Image", class {});
    const promise = verifyImageUrl("https://example.com/uploads/stalled.png", 100);
    const assertion = expect(promise).rejects.toThrow("could not be verified");
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });
});
