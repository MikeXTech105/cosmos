# WEWEL Frontend Data Migration Report

## Safe migration position

No public marketing data is seeded by the Website Management migration. The reviewed WEWEL frontend has three products represented independently in card, comparison, spotlight, and JSON-LD sources; values may conflict and have no verified operational source. Importing them as authoritative records would turn mock/marketing data into ERP-managed facts.

| Source | Candidate | Migration status |
| --- | --- | --- |
| `ProductsSection.tsx` | Three product cards | Structure supported; values require approval. |
| `ProductComparisonTool.tsx` | Material/quantity/resistance/warranty comparison | Structure supported; reconcile against card/spotlight values. |
| `ProductSpotlight.tsx` | Premium Cloth Clips copy/benefits | Map to selected product only after approval. |
| `SEO.tsx` product schemas | Offer/rating/review/brand/image data | Do not seed until claims, URLs and images are factual. |
| `pages/blog/blogData.ts` | Four articles | Schema supported; client should approve content and images before importing. |
| `AnnouncementBar.tsx` | Summer sale bar | Schema supported; current promotion is static and possibly expired. |
| `config/site.ts` | Support email, location, social values | Settings supported; confirm values and public visibility. |
| Testimonials/counters/social-proof/press/FAQ | Marketing copy | Not seeded; requires factual/legal approval. |

## Client confirmation required

- Approved price, rating, review count, warranty, availability and Amazon URL per product.
- Whether categories, detail URLs/slugs, or Website Product-to-ERP Item mapping are needed (none exists now).
- Blog editorial approval and public image hosting ownership.
- Announcement scheduling, priority and dismissal semantics.
- Warranty eligibility/exclusions, refund/replacement process, tracking visibility, and status labels.
- Support/social/WhatsApp values, SEO/sitemap strategy, public statistics source, and contact-enquiry owner.

Import only after those decisions, using an explicit follow-on seed/import migration with source references and reconciliation sign-off.
