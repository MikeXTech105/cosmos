import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AppButton from "./AppButton";

const getClassName = (markup) =>
  markup.match(/class="([^"]*)"/)?.[1] ?? "";

describe("AppButton class merging", () => {
  it("lets a caller override secondary variant colours", () => {
    const markup = renderToStaticMarkup(
      <AppButton
        className="border-white/25 bg-white/10 text-white hover:bg-white/20 disabled:opacity-90"
        variant="secondary"
      >
        Export CSV
      </AppButton>,
    );
    const className = getClassName(markup);

    expect(className).toContain("bg-white/10");
    expect(className).toContain("text-white");
    expect(className).toContain("hover:bg-white/20");
    expect(className).toContain("disabled:opacity-90");
    expect(className).not.toMatch(/(?:^|\s)bg-white(?:\s|$)/);
    expect(className).not.toContain("text-slate-700");
  });

  it("keeps a disabled caller-styled label visible", () => {
    const markup = renderToStaticMarkup(
      <AppButton
        className="bg-white text-brand hover:bg-white/90 disabled:opacity-80"
        disabled
        variant="secondary"
      >
        Save draft
      </AppButton>,
    );
    const className = getClassName(markup);

    expect(markup).toContain("Save draft");
    expect(markup).toContain("disabled");
    expect(className).toContain("bg-white");
    expect(className).toContain("text-brand");
    expect(className).toContain("disabled:opacity-80");
    expect(className).not.toContain("text-slate-700");
    expect(className).not.toContain("disabled:opacity-60");
  });

  it("preserves the default medium rendering", () => {
    const markup = renderToStaticMarkup(<AppButton>Continue</AppButton>);
    const className = getClassName(markup);

    expect(className).toContain("h-9");
    expect(className).toContain("px-5");
    expect(className).toContain("bg-brand");
    expect(className).toContain("text-white");
  });

  it("supports the small size and disabled alias", () => {
    const markup = renderToStaticMarkup(
      <AppButton isDisabled size="sm">
        Continue
      </AppButton>,
    );
    const className = getClassName(markup);

    expect(markup).toContain("disabled");
    expect(className).toContain("h-8");
    expect(className).toContain("px-3");
    expect(className).not.toContain("h-9");
  });

  it("wraps a disabled action with its reason", () => {
    const markup = renderToStaticMarkup(
      <AppButton disabled disabledReason="Complete the required fields">
        Continue
      </AppButton>,
    );

    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain("disabled");
    expect(markup).toContain("Continue");
  });
});
