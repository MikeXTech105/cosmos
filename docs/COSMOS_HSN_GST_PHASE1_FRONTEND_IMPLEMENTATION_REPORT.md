# COSMOS HSN/GST Phase 1 — Frontend Implementation Report

## Scope and source of truth

This implementation adds only the React client for the executed Phase 1 HSN/GST backend contract. It does not modify application backend code, database scripts, migrations, tax calculation, sales/purchase behaviour, or GST component calculation.

The API source inspected before implementation was:

- `backend/src/Cosmos.API/Controllers/HsnGstController.cs`
- `backend/src/Cosmos.Contracts/HsnGst/HsnGstDtos.cs`

## Delivered frontend work

| Area | Delivered behaviour | Permission page / route |
| --- | --- | --- |
| HSN/SAC master | Search, code-type/status filters, list, create, and edit of Code, CodeType, Description, and IsActive. | `GST.HsnSac` / `/gst/hsn-sac` |
| GST rate history | List and create effective-dated total-rate versions. The copy explicitly states that component calculation is outside this phase. | `GST.RateHistory` / `/gst/rate-history` |
| Category defaults | Load active categories and active HSN/SAC values; save dated category defaults through the supported endpoint. | `GST.CategoryMapping` / `/gst/category-mappings` |
| Product overrides | Load active products, retrieve and label the current effective classification, and save a dated product override. | `GST.ProductMapping` / `/gst/product-mappings` |

The four routes are protected through the existing `PermissionGuard`. Sidebar visibility remains data-driven from the `Pages` records supplied by the already executed migration; no hard-coded navigation was added.

## API calls added

- `GET`, `POST`, `PUT /api/v1/gst/hsn-sac`
- `GET`, `POST /api/v1/gst/rate-versions`
- `PUT /api/v1/gst/categories/{categoryId}/hsn-default`
- `PUT /api/v1/gst/items/{itemId}/hsn-override`
- `GET /api/v1/gst/items/{itemId}/effective-classification?onDate=YYYY-MM-DD`

The shared service uses the existing Axios client, response-envelope handling, authentication interceptor, and API-error presentation.

## Deliberate limitations and blockers

| Item | Status | Reason |
| --- | --- | --- |
| Show an existing category default after reload | BLOCKED | There is no category-default read/list endpoint in `HsnGstController`. The category screen labels its blank selector truthfully and only permits adding a new dated mapping. |
| Clear/remove a category default | BLOCKED | No delete/clear endpoint is available. |
| Clear/remove a product override | BLOCKED | No delete/clear endpoint is available. The product screen never presents a false “clear” action. |
| Browse more than 200 category/product/active-code choices | PARTIAL | The current shared master APIs are called with their supported 200-row lookup page. Add server-side search/lookup endpoints before making this an unrestricted production catalogue. |
| Live endpoint and permission verification | NOT EXECUTED | No authenticated runtime/API environment was used during this frontend-only work. |

These limitations require backend/API decisions and are not silently worked around in the UI.

## Tests executed

| Command | Result |
| --- | --- |
| `npm test -- --run src/pages/gst/hsnGstHelpers.test.js src/services/gst/hsnGstService.test.js` | PASS — 2 files, 4 tests |
| `npx eslint src/pages/gst src/services/gst src/api/endpoints.js src/routes/AppRoutes.jsx` | PASS |
| `npm run build` | PASS — Vite production build completed |

The tests assert the response-envelope handling, endpoint paths, dated item-override payload, and effective-classification source labels. They do not claim a live API or browser workflow was executed.

## Files changed

- `frontend/src/api/endpoints.js`
- `frontend/src/routes/AppRoutes.jsx`
- `frontend/src/services/gst/hsnGstService.js`
- `frontend/src/services/gst/hsnGstService.test.js`
- `frontend/src/pages/gst/HsnSacMasterPage.jsx`
- `frontend/src/pages/gst/GstRateHistoryPage.jsx`
- `frontend/src/pages/gst/CategoryHsnMappingPage.jsx`
- `frontend/src/pages/gst/ProductHsnMappingPage.jsx`
- `frontend/src/pages/gst/hsnGstHelpers.js`
- `frontend/src/pages/gst/hsnGstHelpers.test.js`
- `frontend/src/pages/gst/index.js`

## Manual verification next steps

1. Sign in as a role assigned the four `GST.*` page records by the executed migration.
2. Confirm each GST page appears in the data-driven sidebar and its route opens.
3. Create a test HSN/SAC code, then verify it appears in category/product selectors only while active.
4. Save a dated category default and a dated product override for a test item.
5. Reload Product HSN Overrides and verify the effective source is `Category default` or `Product override` as appropriate.
6. Verify unauthorised roles receive the existing 403 route behaviour and that disabled UI actions align with the page permissions.
