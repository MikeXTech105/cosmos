import { describe, expect, it } from "vitest";

import { searchRecordEntities } from "./globalSearch";

const deferred = () => {
  let resolve;
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

describe("global record search", () => {
  it("discards a stale response that settles after the latest query", async () => {
    const slow = deferred();
    let latestRequestId = 1;
    const entity = {
      fetch: (query) =>
        query === "cl"
          ? slow.promise
          : Promise.resolve({ data: { items: [{ id: 2, name: "Clip" }] } }),
      id: "items",
      label: "Items",
      mapResult: (item) => ({
        id: item.id,
        primary: item.name,
        route: `/items?q=${item.name}`,
        secondary: "",
      }),
    };
    const staleSearch = searchRecordEntities({
      entities: [entity],
      isCurrent: (requestId) => requestId === latestRequestId,
      query: "cl",
      requestId: 1,
    });

    latestRequestId = 2;
    const latestSearch = searchRecordEntities({
      entities: [entity],
      isCurrent: (requestId) => requestId === latestRequestId,
      query: "clip",
      requestId: 2,
    });

    await expect(latestSearch).resolves.toMatchObject({
      groups: [{ items: [{ primary: "Clip" }] }],
      stale: false,
    });

    slow.resolve({ data: { items: [{ id: 1, name: "Clasp" }] } });

    await expect(staleSearch).resolves.toEqual({
      groups: [],
      requestId: 1,
      stale: true,
    });
  });
});
