import { beforeEach, describe, expect, it, vi } from "vitest";

const routerMock = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  setSearchParams: vi.fn(),
}));

vi.mock("react", () => ({
  useCallback: (callback) => callback,
  useEffect: (effect) => effect(),
  useMemo: (factory) => factory(),
}));

vi.mock("react-router-dom", () => ({
  useSearchParams: () => [
    routerMock.searchParams,
    routerMock.setSearchParams,
  ],
}));

import useUrlFilters from "./useUrlFilters";

const schema = Object.freeze({
  q: Object.freeze({ default: "", type: "string" }),
  classification: Object.freeze({
    default: null,
    options: [1, 2, 3, 4],
    type: "enum",
  }),
  isActive: Object.freeze({ default: null, type: "boolean" }),
  page: Object.freeze({
    clamp: [1, Number.MAX_SAFE_INTEGER],
    default: 1,
    type: "number",
  }),
  size: Object.freeze({
    clamp: [1, 200],
    default: 10,
    type: "number",
  }),
  sort: Object.freeze({
    default: "",
    options: ["name", "code", "createdAt"],
    type: "enum",
  }),
});

const setSearch = (search = "") => {
  routerMock.searchParams = new URLSearchParams(search);
  routerMock.setSearchParams.mockReset();
};

const getWrittenSearch = () =>
  routerMock.setSearchParams.mock.calls[0]?.[0]?.toString() ?? "";

const getWriteOptions = () =>
  routerMock.setSearchParams.mock.calls[0]?.[1];

describe("useUrlFilters", () => {
  beforeEach(() => {
    setSearch();
  });

  it("keeps defaults out of a pristine URL", () => {
    const { values } = useUrlFilters(schema);

    expect(values).toEqual({
      classification: null,
      isActive: null,
      page: 1,
      q: "",
      size: 10,
      sort: "",
    });
    expect(routerMock.setSearchParams).not.toHaveBeenCalled();
  });

  it("removes explicitly written defaults with replace", () => {
    setSearch("q=&page=1&size=10");

    useUrlFilters(schema);

    expect(getWrittenSearch()).toBe("");
    expect(getWriteOptions()).toEqual({ replace: true });
  });

  it("defensively normalizes malformed values", () => {
    setSearch(
      "page=abc&size=99999&sort=bogus&classification=9&isActive=maybe",
    );

    const { values } = useUrlFilters(schema);

    expect(values).toMatchObject({
      classification: null,
      isActive: null,
      page: 1,
      size: 200,
      sort: "",
    });
    expect(routerMock.setSearchParams).toHaveBeenCalledTimes(1);
    expect(getWrittenSearch()).toBe("size=200");
    expect(getWriteOptions()).toEqual({ replace: true });
  });

  it("clamps a zero page size to one", () => {
    setSearch("size=0");

    const { values } = useUrlFilters(schema);

    expect(values.size).toBe(1);
    expect(getWrittenSearch()).toBe("size=1");
  });

  it("resets page for filters and size but not for page itself", () => {
    setSearch("page=4");
    useUrlFilters(schema).setValue("classification", 2);

    expect(getWrittenSearch()).toBe("classification=2");
    expect(getWriteOptions()).toEqual({ replace: false });

    setSearch();
    useUrlFilters(schema).setValue("page", 3);

    expect(getWrittenSearch()).toBe("page=3");

    setSearch("page=3");
    useUrlFilters(schema).setValue("size", 50);

    expect(getWrittenSearch()).toBe("size=50");
  });

  it("uses replace for typing and push for committed values", () => {
    useUrlFilters(schema).setValue("q", "clip");

    expect(getWrittenSearch()).toBe("q=clip");
    expect(getWriteOptions()).toEqual({ replace: true });

    setSearch();
    useUrlFilters(schema).setValue("isActive", true);

    expect(getWriteOptions()).toEqual({ replace: false });
  });

  it("writes a multi-key update atomically", () => {
    useUrlFilters(schema).setValues({
      classification: 2,
      isActive: true,
      q: "clip",
    });

    expect(routerMock.setSearchParams).toHaveBeenCalledTimes(1);
    expect(getWrittenSearch()).toBe(
      "q=clip&classification=2&isActive=true",
    );
  });

  it("excludes page and size from activeCount", () => {
    setSearch("q=clip&classification=2&page=3&size=50");

    expect(useUrlFilters(schema).activeCount).toBe(2);
  });

  it("resets every schema key to its default in one push", () => {
    setSearch("q=clip&classification=2&page=3&size=50");
    useUrlFilters(schema).reset();

    expect(routerMock.setSearchParams).toHaveBeenCalledTimes(1);
    expect(getWrittenSearch()).toBe("");
    expect(getWriteOptions()).toEqual({ replace: false });
  });

  it("falls back from an unknown tab and cleans it with replace", () => {
    const tabSchema = {
      tab: {
        default: "items",
        options: ["items", "history"],
        type: "enum",
      },
    };

    setSearch("tab=stale");

    const { values } = useUrlFilters(tabSchema);

    expect(values.tab).toBe("items");
    expect(routerMock.setSearchParams).toHaveBeenCalledTimes(1);
    expect(getWrittenSearch()).toBe("");
    expect(getWriteOptions()).toEqual({ replace: true });
  });

  it("can clear tab-specific filters in the tab's atomic update", () => {
    const tabSchema = {
      tab: {
        default: "items",
        options: ["items", "history"],
        type: "enum",
      },
      classification: schema.classification,
      page: schema.page,
    };

    setSearch("classification=2&page=3&productId=17");
    useUrlFilters(tabSchema, {
      clearOnChange: {
        tab: ["classification", "productId"],
      },
    }).setValue("tab", "history");

    expect(routerMock.setSearchParams).toHaveBeenCalledTimes(1);
    expect(getWrittenSearch()).toBe("tab=history");
    expect(getWriteOptions()).toEqual({ replace: false });
  });
});
