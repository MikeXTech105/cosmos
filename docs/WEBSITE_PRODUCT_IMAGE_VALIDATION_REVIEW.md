# Website product image and validation review

Verified against the current API and database contracts on 22 October 2026.

## Confirmed server blocker

A PNG uploaded through the authenticated website product form returned this URL:

`http://91.108.110.56:8080/uploads/website/bdb73ae3ae6a4080ac199219086a193d.png`

Loading it in the browser failed. An independent HTTP GET returned `404 Not Found`, `Server: Kestrel`. This is a file-serving problem, not an absent image column or a frontend origin-resolution problem. No catalogue product was created during this reproduction.

Backend and deployment files have not been changed, following the user's instruction.

### Required backend/deployment work

1. Check that the uploaded file exists in the deployed instance's `wwwroot/uploads/website` directory and that static-file middleware serves that same directory. Check all replicas and storage mounts if applicable.
2. Ensure the web root/upload directory exists **before** the host initializes its static-file provider. The current controller creates it on the first upload; the Dockerfile does not explicitly create it. A missing web root at startup is a likely cause, but cannot be confirmed without access to the running deployment.
3. Use a persistent upload volume and the same serving path across replicas. Verify an uploaded URL returns 200 with an image content type, including after a restart.
4. Return the complete `media` collection (URL, alt text, primary flag, order) in product detail and save responses. Currently `WebsiteProductDto` returns only `primaryImageUrl`, while `usp_WebsiteProduct_Save` deletes and replaces all media rows. Reopening and saving a multi-image product can discard images and alt text that were never returned. The frontend retains the submitted collection during the current editing session, but cannot reconstruct omitted server data after a fresh load. Do not use fresh-load edits of existing galleries until the API supports this round trip.

## Frontend changes

- Verify a returned upload URL actually loads before adding it to the product; explain server failures.
- Disable product save and media-row removal while uploading/verifying. Do not silently discard unfinished image rows.
- Normalize relative image URLs for previews; show an explicit unavailable-image state in the catalogue.
- Validate code/name, string limits, currency, nonnegative price, rating 0–5, integer review count, sort order, HTTP/HTTPS Amazon URL, benefit rows and image URLs. Preserve nullable numeric values rather than converting them to zero.
- Expose inline API errors and an error summary. Keep optional fields optional; each added benefit/image row must be completed or removed.
- Pause saves after fresh loads that contain a primary image but omit the gallery, to prevent silent deletion. Reuse submitted gallery data only when the returned record ID and row version match the save response.

Limits come from `WebsiteManagementValidators.cs`, `WebsiteManagementDtos.cs` and `20260813_website_management_module.sql`. The browser checks are usability checks; server validation remains authoritative. No database migrations were run.

## Verification

- Full frontend suite: 571 tests passed in 80 files; production build and scoped ESLint passed.
- After adding two gallery/version regression cases, the affected regression suite passed all 81 tests; scoped ESLint passed again.
- Authenticated browser checks: empty required fields, negative price, fractional review count, invalid URL, disabled Save during upload, explicit failure for the inaccessible uploaded image, and save rejection for the unfinished image row.
- Successful persistent-image round-trip testing is blocked by the server's HTTP 404. No catalogue products were created or modified. Two synthetic PNG uploads were used to reproduce the issue.
- Screenshot: `output/product-validation/required-fields.png`.
