import { describe, expect, it } from "vitest";

import {
  createHrInitialState,
  setHrDetailFulfilled,
  setHrDetailPending,
  setHrListFulfilled,
  setHrListPending,
  setHrListRejected,
} from "./hrSliceUtils";

const action = ({ arg, payload, requestId }) => ({
  meta: { arg, requestId },
  payload,
});

describe("HR request identity reducers", () => {
  it("ignores stale list completions and rejections", () => {
    const state = createHrInitialState();
    const older = action({ requestId: "older" });
    const newer = action({ requestId: "newer" });

    setHrListPending(state, older);
    setHrListPending(state, newer);
    setHrListFulfilled(state, {
      ...older,
      payload: { data: { items: [{ id: 1 }], totalCount: 1 } },
    });
    setHrListRejected(state, {
      ...older,
      error: { message: "stale failure" },
    });

    expect(state.list).toEqual([]);
    expect(state.error).toBeNull();
    expect(state.loading).toBe(true);

    setHrListFulfilled(state, {
      ...newer,
      payload: { data: { items: [{ id: 2 }], totalCount: 1 } },
    });

    expect(state.list).toEqual([{ id: 2 }]);
    expect(state.loading).toBe(false);
  });

  it("requires both the latest request and matching entity for details", () => {
    const state = createHrInitialState();
    const first = action({ arg: 10, requestId: "first" });
    const second = action({ arg: 20, requestId: "second" });
    const fulfill = setHrDetailFulfilled("department");

    setHrDetailPending(state, first);
    setHrDetailPending(state, second);
    fulfill(state, {
      ...first,
      payload: { data: { department: { id: 10 } } },
    });
    fulfill(state, {
      ...second,
      meta: { arg: 10, requestId: "second" },
      payload: { data: { department: { id: 10 } } },
    });

    expect(state.selected).toBeNull();
    expect(state.detailLoading).toBe(true);

    fulfill(state, {
      ...second,
      payload: { data: { department: { id: 20 } } },
    });

    expect(state.selected).toEqual({ id: 20 });
    expect(state.detailLoading).toBe(false);
  });
});
