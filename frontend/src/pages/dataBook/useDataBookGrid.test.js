import { describe, expect, it, vi } from "vitest";

import {
  commitDataBookGridRow,
  createBlankDataBookGridRow,
  createDataBookGridRow,
  isDataBookGridRowValid,
  reapplyDataBookGridConflict,
  saveDataBookRowsSequentially,
} from "./useDataBookGrid";

const dirtyRow = (entry) => ({
  ...createDataBookGridRow(entry, entry.category),
  status: "dirty",
});

describe("Data Book grid rows", () => {
  it("requires name and value and never treats the blank tail as valid", () => {
    expect(isDataBookGridRowValid(createBlankDataBookGridRow("Sheet"))).toBe(false);
    expect(isDataBookGridRowValid(dirtyRow({
      category: "Sheet",
      description: "",
      id: 1,
      isPrivate: false,
      name: "Name",
      rowVersion: "v1",
      value: "",
    }))).toBe(false);
    expect(isDataBookGridRowValid(dirtyRow({
      category: "Sheet",
      description: "",
      id: 1,
      isPrivate: false,
      name: "Name",
      rowVersion: "v1",
      value: "Value",
    }))).toBe(true);
  });

  it("commits the rowVersion returned by every save", () => {
    const row = dirtyRow({
      category: "Sheet",
      description: "",
      id: 1,
      isPrivate: false,
      name: "Name",
      rowVersion: "v1",
      value: "Value",
    });
    const committed = commitDataBookGridRow(row, {
      ...row,
      rowVersion: "v2",
    });

    expect(committed.rowVersion).toBe("v2");
    expect(committed.savedSnapshot.value).toBe("Value");
  });

  it("runs saves sequentially and continues after a row failure", async () => {
    const calls = [];
    const api = {
      createEntry: vi.fn(async (payload) => {
        calls.push(`start:${payload.name}`);
        await Promise.resolve();
        calls.push(`end:${payload.name}`);
        if (payload.name === "Second") throw new Error("failed");
        return {
          data: { ...payload, id: payload.name, rowVersion: `v-${payload.name}` },
        };
      }),
      updateEntry: vi.fn(),
    };
    const rows = ["First", "Second", "Third"].map((name) => ({
      ...createBlankDataBookGridRow("Sheet"),
      name,
      status: "dirty",
      value: "Value",
    }));
    const committed = [];

    const result = await saveDataBookRowsSequentially({
      api,
      rows,
      onSuccess: (row, saved) => committed.push([row.name, saved.rowVersion]),
    });

    expect(calls).toEqual([
      "start:First", "end:First",
      "start:Second", "end:Second",
      "start:Third", "end:Third",
    ]);
    expect(result).toMatchObject({ attempted: 3, failed: 1, saved: 2 });
    expect(committed).toEqual([
      ["First", "v-First"],
      ["Third", "v-Third"],
    ]);
  });

  it("re-applies mine onto the freshly fetched conflict rowVersion", () => {
    const row = {
      ...dirtyRow({
        category: "Sheet",
        description: "mine",
        id: 1,
        isPrivate: false,
        name: "Mine",
        rowVersion: "stale",
        value: "Value",
      }),
      conflict: {
        saved: { rowVersion: "fresh" },
      },
      status: "error",
    };

    const reapplied = reapplyDataBookGridConflict(row);
    expect(reapplied.name).toBe("Mine");
    expect(reapplied.description).toBe("mine");
    expect(reapplied.rowVersion).toBe("fresh");
    expect(reapplied.status).toBe("dirty");
  });
});
