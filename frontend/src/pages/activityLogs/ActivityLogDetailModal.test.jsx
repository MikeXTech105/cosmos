import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ActivityLogDetailModal from "./ActivityLogDetailModal";

describe("ActivityLogDetailModal loading state", () => {
  it("renders safely before the selected activity has loaded", () => {
    expect(() =>
      renderToStaticMarkup(
        createElement(ActivityLogDetailModal, {
          activity: null,
          copied: false,
          error: null,
          isLoading: true,
          isOpen: true,
          onClose: vi.fn(),
          onCopy: vi.fn(),
        }),
      ),
    ).not.toThrow();
  });
});
