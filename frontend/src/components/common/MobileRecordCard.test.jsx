import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MobileRecordCard, {
  MobileRecordCardSkeleton,
} from "./MobileRecordCard";

describe("MobileRecordCard", () => {
  it("renders a serial, curated fields, status, and actions", () => {
    const markup = renderToStaticMarkup(
      <MobileRecordCard
        actionItems={[{ id: "edit", label: "Edit" }]}
        fields={[
          { label: "Code", value: "ITM-01" },
          { label: "Stock", value: "12" },
        ]}
        serial={7}
        status={<span>Active</span>}
        title="Clip"
      />,
    );

    expect(markup).toContain("#7");
    expect(markup).toContain("Clip");
    expect(markup).toContain("ITM-01");
    expect(markup).toContain("Active");
    expect(markup).toContain("aria-label=\"Edit\"");
  });

  it("renders card-shaped loading placeholders", () => {
    const markup = renderToStaticMarkup(<MobileRecordCardSkeleton />);

    expect(markup).toContain("animate-pulse");
    expect(markup).toContain("rounded-xl");
  });
});
