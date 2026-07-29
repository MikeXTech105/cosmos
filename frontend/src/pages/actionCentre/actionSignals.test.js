import { describe, expect, it, vi } from "vitest";

import {
  fetchActionSignals,
  getPermittedActionSignals,
} from "./actionSignals";

describe("Action Centre signal registry", () => {
  it("excludes a signal when its owning-page permission is absent", () => {
    const signals = [
      { id: "allowed", permission: { key: "inventory" } },
      { id: "restricted", permission: { key: "dispatch" } },
    ];

    expect(
      getPermittedActionSignals(signals, {
        dispatch: false,
        inventory: true,
      }).map((signal) => signal.id),
    ).toEqual(["allowed"]);
  });

  it("keeps fulfilled signals when a sibling request is rejected", async () => {
    const signals = [
      { fetch: vi.fn().mockResolvedValue(3), id: "available" },
      {
        fetch: vi.fn().mockRejectedValue(new Error("Endpoint unavailable")),
        id: "failed",
      },
    ];

    await expect(fetchActionSignals(signals)).resolves.toEqual([
      { count: 3, id: "available", status: "success" },
      {
        error: expect.objectContaining({ message: "Endpoint unavailable" }),
        id: "failed",
        status: "error",
      },
    ]);
  });
});
