import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AppButton from "./AppButton";

const getClassName = (markup) =>
  markup.match(/class="([^"]*)"/)?.[1] ?? "";

describe("AppButton class merging", () => {
  it("lets a caller override secondary variant colours", () => {
    const markup = renderToStaticMarkup(
      <AppButton
        className="border-white/25 bg-white/10 text-white hover:bg-white/20"
        variant="secondary"
      >
        Export CSV
      </AppButton>,
    );
    const className = getClassName(markup);

    expect(className).toContain("bg-white/10");
    expect(className).toContain("text-white");
    expect(className).toContain("hover:bg-white/20");
    expect(className).not.toMatch(/(?:^|\s)bg-white(?:\s|$)/);
    expect(className).not.toContain("text-slate-700");
  });

  it("keeps a disabled caller-styled label visible", () => {
    const markup = renderToStaticMarkup(
      <AppButton
        className="bg-white text-brand hover:bg-white/90"
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
    expect(className).not.toContain("text-slate-700");
  });
});
