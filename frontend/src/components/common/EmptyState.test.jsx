import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it.each([
    ["empty", "No categories yet", "Create"],
    ["filtered", "No categories match these filters", "Clear filters"],
    ["error", "Couldn't load categories", "Retry"],
  ])("renders the %s variant with its correct action", (variant, title, action) => {
    const markup = renderToStaticMarkup(
      <EmptyState
        context="Categories group items for reporting and procurement planning."
        hint="Use the next action to continue."
        title={title}
        variant={variant}
        onAction={() => {}}
      />,
    );

    expect(markup).toContain('class="py-12 text-center"');
    expect(markup).toContain(title.replaceAll("'", "&#x27;"));
    expect(markup).toContain(action);
    expect(markup).toContain(
      "Categories group items for reporting and procurement planning.",
    );
  });

  it("omits an action when the caller does not have one", () => {
    const markup = renderToStaticMarkup(
      <EmptyState
        hint="Ask an administrator for create permission."
        title="No users yet"
      />,
    );

    expect(markup).not.toContain("<button");
  });
});
