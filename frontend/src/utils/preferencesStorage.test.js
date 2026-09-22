import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_MANUFACTURING_ENABLED,
  DEFAULT_PAGE_SIZE,
  getStoredPreferences,
  updateStoredPreferences,
} from "./preferencesStorage";

describe("preferencesStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
    });
    vi.stubGlobal("CustomEvent", class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    });
  });

  it("uses a safe default", () => {
    expect(getStoredPreferences().defaultPageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(getStoredPreferences().manufacturingEnabled).toBe(DEFAULT_MANUFACTURING_ENABLED);
  });

  it("persists only an allowed page size", () => {
    expect(updateStoredPreferences({ defaultPageSize: 50 })).toEqual({
      defaultPageSize: 50,
      manufacturingEnabled: DEFAULT_MANUFACTURING_ENABLED,
    });
    expect(updateStoredPreferences({ defaultPageSize: 999 })).toEqual({
      defaultPageSize: DEFAULT_PAGE_SIZE,
      manufacturingEnabled: DEFAULT_MANUFACTURING_ENABLED,
    });
  });

  it("persists the manufacturing feature switch", () => {
    expect(updateStoredPreferences({ manufacturingEnabled: false })).toEqual({
      defaultPageSize: DEFAULT_PAGE_SIZE,
      manufacturingEnabled: false,
    });
  });
});
