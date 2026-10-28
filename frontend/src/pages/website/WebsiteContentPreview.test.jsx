// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WebsiteAnnouncementPreview, WebsiteArticlePreview, WebsiteProductPreview } from "./WebsiteContentPreview";
describe("safe website editorial previews", () => {
  it("renders supported Markdown as elements while escaping HTML and rejecting script links", () => {
    const html = renderToStaticMarkup(<WebsiteArticlePreview content={'# Heading\n\n**Strong** and [unsafe](javascript:alert(1))\n\n<script>alert(1)</script>\n\n- One\n- Two'} />);
    expect(html).toContain("<h2"); expect(html).toContain("<strong>Strong</strong>"); expect(html).toContain("<ul"); expect(html).not.toContain("<script>"); expect(html).not.toContain('href="javascript:');
  });
  it("previews unsaved products and announcements without posting or publishing", () => {
    const html = renderToStaticMarkup(<WebsiteProductPreview product={{ name: "Preview product", media: [], benefits: [{ benefitText: "A benefit" }], displayPrice: "12.50", currencyCode: "INR" }} />);
    expect(html).toContain("Preview product"); expect(html).toContain("A benefit"); expect(html).not.toContain("<img");
    expect(renderToStaticMarkup(<WebsiteAnnouncementPreview announcement={{ message: "Draft offer", ctaLabel: "Unsafe", ctaUrl: "javascript:alert(1)" }} />)).not.toContain("href=");
  });
});
