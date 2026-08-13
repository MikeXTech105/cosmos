# WEWEL / COSMOS Website Management Integration

## Response conventions

Management APIs use normal COSMOS `ApiResponse<T>` envelopes. Anonymous `/api/website/*` APIs intentionally return direct JSON to match `src/api/websiteClient.ts`:

```json
{ "message": "Warranty claim submitted.", "referenceId": "WC-2026-000001" }
```

Public errors are JSON with `message`, `code`, optional string-valued `fieldErrors`, and `correlationId`. For example:

```json
{ "message": "Add between 1 and 5 product damage images.", "code": "VALIDATION_FAILED", "fieldErrors": { "productImages[]": "Add between 1 and 5 product damage images." } }
```

## Public endpoints

| Method | Endpoint | Data returned/accepted |
| --- | --- | --- |
| GET | `/api/website/products` | Published active standalone products, typed comparison fields, benefits, primary image URL. |
| GET | `/api/website/blog-posts` | Published blog list; includes content for the current small four-post design. |
| GET | `/api/website/blog-posts/{slug}` | One published article or JSON 404. |
| GET | `/api/website/announcements?placement=top-bar` | Active TopBar records inside their scheduled window, ordered deterministically. |
| GET | `/api/website/settings` | Only settings explicitly marked public. |
| POST | `/api/website/warranty-claims` | Existing multipart contract, returns `message` and `referenceId`. |
| POST | `/api/website/contact-enquiries` | Existing JSON contract, returns `message`. |

Warranty multipart names are exactly `fullName`, `email`, `orderNumber`, `purchaseDate` (`YYYY-MM-DD`), `description`, `invoice`, repeated `productImages[]`, `source` (`WEWEL_WEBSITE`), and `consent` (`true`). Invoice: PDF/JPEG/PNG, 10 MiB. Each damage image: JPEG/PNG/WebP, 5 MiB; count 1–5. The service validates signature and MIME server-side.

Public routes have no bearer token and are rate limited. Do not attempt warranty tracking, attachment retrieval, category/tag reads, product detail pages, or public statistics until separately designed.

## Management endpoints

All require bearer JWT and their page action. Lists use `pageNumber`/`pageSize` (1–200) and documented safe filters.

| Area | Routes |
| --- | --- |
| Dashboard | `GET /api/v1/website-management/dashboard/overview` |
| Products | CRUD `/api/v1/website-management/products` |
| Blog posts | CRUD `/api/v1/website-management/blog-posts` |
| Blog categories | CRUD `/api/v1/website-management/blog-categories` |
| Announcements | CRUD `/api/v1/website-management/announcements` |
| Warranty | List/detail/history/attachments/download, `assign`, `start-review`, `request-information`, `approve`, `reject`, `resolve`, `complete`, notes/customer messages, `reports/summary` under `/api/v1/website-management/warranty-claims` |
| Settings | `GET`/`PUT /api/v1/website-management/settings` |
| Public CMS media | `POST /api/uploads/website/images` (multipart `file`, optional `folder=website`; `WebsiteManagement.Media.Create`) |

Update product/blog/category/announcement requests must include the returned base64 `rowVersion`. A stale update returns 409 from the standard COSMOS envelope. Warranty operations are action endpoints; never use a generic status PATCH.

## Current frontend mapping

| Current WEWEL source | Replace/migrate with |
| --- | --- |
| `src/components/sections/ProductsSection.tsx` | `GET /api/website/products` |
| `src/components/sections/ProductComparisonTool.tsx` | Same products projection: material, quantity, resistance flags, warranty. |
| `src/components/sections/ProductSpotlight.tsx` / `src/components/common/SEO.tsx` | Select a confirmed product record; do not reuse unconfirmed price/rating content. |
| `src/pages/blog/blogData.ts` | Blog list/by-slug APIs. Content remains the current restricted Markdown-like body format. |
| `src/components/layout/AnnouncementBar.tsx` | Announcements API. Persist dismissal by `dismissalVersion`, not a perpetual key. |
| `src/pages/warranty/warrantyService.ts` | No route/payload change required. |
| `src/pages/contact/contactService.ts` | No route/payload change required. |
| `src/config/site.ts` | Public settings after the values are client-approved. |

Pagination/filtering is management-only for the current frontend. Public product/category filters, product slug pages, tag pages, tracking, sitemap generation, and SEO rendering are not current UI contracts.
