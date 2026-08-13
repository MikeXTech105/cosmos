# Website Management Module

## Purpose and scope

Website Management is the COSMOS module for WEWEL’s public catalogue, editorial content, top-bar announcements, warranty operations, and approved public settings. It is deliberately independent of ERP Items: `WebsiteProducts` has no `Items` foreign key and does not participate in stock, procurement, purchase, sales, dispatch, or warehouse processes.

The implementation follows the existing COSMOS slice: controller → application service → Dapper repository → `usp_` stored procedure. Management uses JWT, existing page/action permissions, `ApiResponse<T>`, correlation IDs, the centralized `AuditLogs` repository, and the protected System Owner permission bypass. Public APIs use the existing WEWEL client’s plain JSON success/error contract.

## Implemented entities

| Area | Tables | Design decision |
| --- | --- | --- |
| Catalogue | `WebsiteProducts`, `WebsiteProductBenefits`, `WebsiteProductMedia` | Typed comparison fields and normalized benefits/media; no speculative category relationship. |
| Blog | `WebsiteBlogCategories`, `WebsiteBlogPosts` | Markdown/plain-text body is returned unchanged. Only published posts are public. |
| Announcement | `WebsiteAnnouncements` | `TopBar` only; deterministic order is priority descending, sort order ascending, ID ascending. |
| Warranty | `WebsiteWarrantyClaims`, attachments, immutable history, notes, customer messages, claim-number sequence | Claims are never deleted. Notes and evidence are private; customer messages are separate. |
| Settings | `WebsiteSettings` | Centrally allow-listed public/business keys only; no technical configuration or secrets. |
| Contact compatibility | `WebsiteContactEnquiries` | Retains the existing public submit route without expanding it into CRM. |

Product categories, blog tags, product detail pages, public tracking, public statistics, product gallery/video, and generic CMS blocks are intentionally not implemented: the reviewed frontend does not consume them.

## Permissions

The migration seeds the parent `WebsiteManagement` and these exact child page names:

| Page | Actions used |
| --- | --- |
| `WebsiteManagement.Dashboard` | View |
| `WebsiteManagement.Products` | View, Create, Edit, Delete |
| `WebsiteManagement.Blogs` | View, Create, Edit, Delete |
| `WebsiteManagement.Announcements` | View, Create, Edit, Delete |
| `WebsiteManagement.WarrantyClaims` | View, Create/Edit, Approve, Export |
| `WebsiteManagement.Settings` | View, Edit |
| `WebsiteManagement.Media` | View, Create (public CMS image upload) |

No action type was added. Permissions are seeded by page/role name lookup; no page or role IDs are hard-coded. The existing `PermissionService` grants the protected System Owner before checking role/page permissions.

## Warranty rules and workflow

Claim references are generated in one SQL transaction using `WebsiteWarrantyClaimSequences` and `UPDLOCK,HOLDLOCK`, producing `WC-YYYY-NNNNNN`. The public request must contain one invoice and one through five damage images. Evidence is stored outside `wwwroot` via `IWebsiteFileStorage`; the local implementation is replaceable by S3/R2/Azure storage.

```text
Submitted → UnderReview → NeedMoreInformation → UnderReview
                         ↘ Approved → Completed
                         ↘ Rejected
```

Only approved claims can receive a resolution. A completed claim must have a resolution; refund needs amount plus reference, replacement needs a replacement reference, and repair needs a repair reference. Every assignment, transition, resolution, note/message operation writes one immutable domain-history row. Management activity emits sanitized centralized audit events without attachment/file content, email, or storage key.

## Security decisions

- Management routes require both JWT and page/action authorization.
- Public CMS images use the existing image upload pipeline at `POST /api/uploads/website/images` and are stored beneath the controlled `wwwroot/uploads/website` root. Warranty attachments are listed as metadata only; download requires warranty View permission and resolves an opaque storage key server-side.
- Public posts allow 8 requests per source IP per 10 minutes. Uploads are capped at 40 MiB overall.
- Warranty files enforce count, extensions, declared MIME, detected PDF/JPEG/PNG/WebP signatures, and 10 MiB/5 MiB size limits. Paths use a generated key, not client filenames.
- Public responses never include audit data, staff identity, internal notes, attachment storage keys, refund references, or customer personal detail beyond the submission acknowledgement.
- Correlation IDs remain available in public errors. CAPTCHA and malware scanning are future infrastructure additions; attachment records are scan-ready with `Pending|Clean|Rejected` state.

## Audit and concurrency

Products, blogs, announcements, settings, warranty assignment, transitions, resolution, notes, and customer messages reuse `IAuditRepository` / `AuditLogs`; no second audit framework exists. SQL row versions protect management product/blog/category/announcement saves. Warranty operations use explicit locked transition procedures. `WebsiteWarrantyClaimHistory` is append-only at the database level.

## Known limitations and client confirmation

`CLIENT CONFIRMATION REQUIRED` before seed/publication: approved product price/rating/review/warranty/Amazon values; need for product categories or product pages; warranty eligibility and exclusions; supported operational resolution/refund/replacement process; claim tracking/public status; top-bar priority/dismissal policy; support/social/WhatsApp values; public statistics truth/source; dynamic SEO/sitemap strategy; and contact-enquiry ownership.

No current marketing content is automatically seeded because the frontend has conflicting duplicated product data and placeholder/factual marketing claims.
