# Procurement Planning Frontend Integration

## API Basics

- Base: `/api/v1/procurement-planning`
- Swagger document: `/swagger/procurement-planning/swagger.json`
- Authentication: bearer JWT
- Dates: ISO `yyyy-MM-dd`
- Quantities: JSON numbers, up to six decimal places
- Standard JSON response: the existing COSMOS `ApiResponse<T>` envelope
- File/template/export endpoints return file content directly
- Default page size: 20; maximum: 200

The UI should initialize a last-30-calendar-day range including today. The API requires explicit dates so client and business timezone behavior remains visible.

## Enums

```ts
export enum ProcurementItemClassification {
  FinishedProduct = 1,
  RawMaterial = 2,
  Component = 3,
  PackingMaterial = 4,
}

export enum PlanningRunStatus { Draft = 1, Finalized = 2 }
export enum PlanningRoundingRule { None = 1, UpToOrderMultiple = 2 }
export enum PlanningMessageSeverity { Information = 1, Warning = 2, BlockingError = 3 }
export enum SalesImportBatchStatus { Completed = 1, Cancelled = 2 }
```

## Item Search

Use the existing Item endpoint. The new optional filter avoids building another product/material master:

```http
GET /api/items?search=rainbow&procurementClassification=1&isActive=true&pageNumber=1&pageSize=20
GET /api/items?search=clip&procurementClassification=3&isActive=true&pageNumber=1&pageSize=20
```

Existing Item create/update contracts now accept nullable `procurementClassification`. Existing callers may omit it.

## Endpoint Catalogue

### Sales Channels

| Method | Route | Permission | Purpose |
|---|---|---|---|
| GET | `/channels` | Settings/View | Paged channel list. |
| GET | `/channels/{id}` | Settings/View | Channel detail. |
| POST | `/channels` | Settings/Create | Create channel. |
| PUT | `/channels/{id}` | Settings/Edit | Update channel. |
| PATCH | `/channels/{id}/status` | Settings/Edit | Activate/deactivate. |

```json
{
  "code": "D2C",
  "name": "Direct Store",
  "displayOrder": 40,
  "isActive": true
}
```

Initial rows are AMZ/Amazon, BLI/Blinkit, and INS/Instamart. Do not render fixed channel columns from constants: load active channels and build summary columns from the returned collection.

### Channel SKU Mapping

| Method | Route | Permission | Purpose |
|---|---|---|---|
| GET | `/sku-mappings` | SkuMapping/View | Filter by search, channel, Item, status, and page. |
| GET | `/sku-mappings/unmapped` | SkuMapping/View | Unresolved imported SKUs with occurrence/date range. |
| GET | `/sku-mappings/{id}` | SkuMapping/View | Detail. |
| POST | `/sku-mappings` | SkuMapping/Create | Create mapping. |
| PUT | `/sku-mappings/{id}` | SkuMapping/Edit | Update mapping. |
| PATCH | `/sku-mappings/{id}/status` | SkuMapping/Edit | Activate/deactivate. |

```json
{
  "salesChannelId": 1,
  "channelSku": "AMZ-BUH20",
  "channelProductName": "Black Ultimate Hanger 20",
  "itemId": 123,
  "isActive": true
}
```

Only active Items are accepted. `ProcurementClassification=FinishedProduct` is preferred; legacy null-classified Items remain selectable with an explicit warning until classified.

### Sales Import and Manual History

| Method | Route | Permission | Purpose |
|---|---|---|---|
| GET | `/sales/import-template` | SalesImport/View | Download true XLSX template. |
| POST | `/sales/imports/preview` | SalesImport/Create | Multipart preview (`file`). |
| POST | `/sales/imports/confirm` | SalesImport/Create | Multipart confirm (`file`, `allowDuplicate`, `correctionReason`). |
| GET | `/sales/import-batches` | SalesImport/View | Paged batch history. |
| GET | `/sales/import-batches/{id}` | SalesImport/View | Batch header and every retained row. |
| POST | `/sales/import-batches/{id}/cancel` | SalesImport/Delete | Cancel with a reason. |
| POST | `/sales/manual` | SalesImport/Create | Create manual sale. |
| PUT | `/sales/manual/{id}` | SalesImport/Edit | Update manual sale. |
| DELETE | `/sales/manual/{id}` | SalesImport/Delete | Soft-delete manual sale. |
| GET | `/sales/history` | SalesImport/View | Filtered, paged sales rows. |
| GET | `/sales/summary?fromDate=...&toDate=...` | SalesImport/View | Workbook-style product/channel summary. |

CSV/XLSX header:

```text
SalesDate,ChannelCode,ChannelSku,ChannelProductName,Quantity
```

Preview response data shape:

```ts
interface SalesImportPreview {
  fileName: string;
  fileHash: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  unmappedRows: number;
  duplicateFile: boolean;
  rows: Array<{
    rowNumber: number;
    salesDate?: string;
    channelCode?: string;
    channelSku?: string;
    channelProductName?: string;
    quantity?: number;
    salesChannelId?: number;
    itemId?: number;
    itemCode?: string;
    itemName?: string;
    errors: string[];
    isValid: boolean;
    isMapped: boolean;
  }>;
}
```

Confirm only when `invalidRows === 0`. An unmapped row may be imported but must be shown prominently because it blocks planning. If `duplicateFile` is true, the correction flow must collect a reason before sending `allowDuplicate=true`.

```json
{
  "reason": "Wrong date range imported; cancelling before corrected re-import."
}
```

Manual entry:

```json
{
  "salesDate": "2026-07-14",
  "salesChannelId": 1,
  "channelSku": "AMZ-BUH20",
  "channelProductName": "Black Ultimate Hanger 20",
  "itemId": 123,
  "quantity": 12.5,
  "notes": "Manual correction"
}
```

History filters: `fromDate`, `toDate`, `salesChannelId`, `itemId`, `importBatchId`, `isMapped`, `pageNumber`, `pageSize`.

Summary rows contain a dynamic `channelQuantities: Record<string, number>` and a `channels` collection that defines visible columns/order.

### BOM Mapping

| Method | Route | Permission | Purpose |
|---|---|---|---|
| GET | `/boms/products/{productId}` | BomMapping/View | Product plus active components. |
| PUT | `/boms/products/{productId}` | BomMapping/Edit | Replace the active BOM transactionally. |
| GET | `/boms/issues` | BomMapping/View | Missing BOM and inactive-component issues. |

```json
{
  "components": [
    { "componentItemId": 501, "quantityRequired": 20, "unitId": 3, "isActive": true },
    { "componentItemId": 710, "quantityRequired": 1, "unitId": 3, "isActive": true }
  ]
}
```

Treat the PUT as replace-all. Keep a dirty-state warning. Reject duplicates client-side, prevent selecting the product itself, and display server validation messages. The backend preserves the previous rows as inactive history.

### Procurement Settings and Lead Time

| Method | Route | Permission | Purpose |
|---|---|---|---|
| GET | `/settings` | Settings/View | Paged material settings. |
| GET | `/settings/items/{itemId}` | Settings/View | One setting. |
| PUT | `/settings/items/{itemId}` | Settings/Edit | Create/update by Item. |
| GET | `/settings/missing` | Settings/View | Required Items missing valid configuration. |
| POST | `/settings/lead-time-history` | Settings/Edit | Add ordered/received record. |
| GET | `/settings/items/{itemId}/lead-time-history` | Settings/View | Lead-time rows. |

```json
{
  "itemId": 501,
  "configuredLeadTimeDays": 30,
  "leadTimeOverrideDays": null,
  "safetyFactor": 2.5,
  "minimumOrderQuantity": 42,
  "orderMultiple": null,
  "automaticCalculationEnabled": true,
  "manualPlanning": false,
  "roundingRule": 2,
  "isActive": true
}
```

```json
{
  "itemId": 501,
  "reference": "GRN-2026-0142",
  "orderedDate": "2026-06-01",
  "receivedDate": "2026-06-29",
  "notes": "Normal receipt"
}
```

Show all three lead-time values. Label the effective value with its source: Override, History average, or Configured. `receivedDate` cannot precede `orderedDate`.

### Planning

| Method | Route | Permission | Purpose |
|---|---|---|---|
| POST | `/plans/validate` | GeneratePlan/View | Prerequisite messages only. |
| POST | `/plans/preview` | GeneratePlan/Create | Recalculate and return non-persisted lines. |
| POST | `/plans/runs` | GeneratePlan/Create | Recalculate and save a Draft snapshot. |
| GET | `/plans/runs` | PlanningHistory/View | Paged history; filter dates/status. |
| GET | `/plans/runs/{id}` | PlanningHistory/View | Header plus all snapshot lines. |
| GET | `/plans/runs/{id}/lines` | PlanningHistory/View | Filter lines by search/purchase/warning/manual flags. |
| PATCH | `/plans/runs/{runId}/lines/{lineId}` | PlanningHistory/Edit | Adjust Draft final quantity. |
| POST | `/plans/runs/{id}/finalize` | PlanningHistory/Approve | Finalize immutable snapshot. |
| GET | `/plans/runs/{id}/export` | PlanningHistory/Export | Download true XLSX snapshot. |

Request used by validate/preview/save:

```json
{
  "fromDate": "2026-06-15",
  "toDate": "2026-07-14",
  "notes": "Rolling 30-day plan"
}
```

Key preview model:

```ts
interface PlanningPreview {
  fromDate: string;
  toDate: string;
  numberOfDays: number;
  calculatedAtUtc: string;
  validation: {
    canCalculate: boolean;
    blockingErrors: PlanningMessage[];
    warnings: PlanningMessage[];
    information: PlanningMessage[];
  };
  lines: PlanningLine[];
}

interface PlanningLine {
  materialItemId: number;
  materialItemCode: string;
  materialItemName: string;
  unitId: number;
  unitName: string;
  unitShortName: string;
  materialRequirement: number;
  averageDailyUsage: number;
  leadTimeDays: number;
  leadTimeSource: string;
  leadTimeDemand: number;
  safetyFactor: number;
  safetyStock: number;
  reorderPoint: number;
  physicalStock: number;
  shortage: number;
  minimumOrderQuantity: number;
  orderMultiple?: number;
  roundingRule: PlanningRoundingRule;
  automaticCalculationEnabled: boolean;
  manualPlanning: boolean;
  calculatedSuggestedQuantity: number;
  finalQuantity: number;
  adjustmentReason?: string;
  warnings: string[];
  calculationExplanation: string;
}
```

Adjustment:

```json
{
  "finalQuantity": 250,
  "adjustmentReason": "Supplier pack size and confirmed shelf capacity"
}
```

If final quantity equals calculated quantity, reason may be blank and is cleared. Otherwise a reason is mandatory. Disable all edit controls when status is Finalized.

Line filters:

```text
search=clip
purchaseOnly=true
hasWarnings=true
manualPlanning=false
```

## Exact Request/Response Map

The names below are the implemented C# contract types in `Cosmos.Contracts.ProcurementPlanning`; JSON uses camelCase. `PagedResult<T>` contains `items`, `pageNumber`, `pageSize`, `totalCount`, and the project-calculated page metadata.

| Endpoint | Input contract | Success data contract | Primary validation/conflict states |
|---|---|---|---|
| GET `/channels` | `ProcurementListQuery` | `PagedResult<SalesChannelDto>` | Page range. |
| GET `/channels/{id}` | positive path `id` | `SalesChannelDto` | 404 if absent. |
| POST `/channels` | `SaveSalesChannelRequest` | `SalesChannelDto` | Code/name/length/display order; duplicate code 409. |
| PUT `/channels/{id}` | path `id`, `SaveSalesChannelRequest` | `SalesChannelDto` | Same as create; 404. |
| PATCH `/channels/{id}/status` | `ChangeActiveStatusRequest` | no data (`ApiResponse`) | 404. |
| GET `/sku-mappings` | `ChannelSkuMappingQuery` | `PagedResult<ChannelSkuMappingDto>` | Positive IDs and page range. |
| GET `/sku-mappings/unmapped` | none | `UnmappedChannelSkuDto[]` | None beyond authorization. |
| GET `/sku-mappings/{id}` | path `id` | `ChannelSkuMappingDto` | 404. |
| POST `/sku-mappings` | `SaveChannelSkuMappingRequest` | `ChannelSkuMappingDto` | Active channel/Item, SKU required; duplicate active channel/SKU 409. |
| PUT `/sku-mappings/{id}` | path `id`, `SaveChannelSkuMappingRequest` | `ChannelSkuMappingDto` | Same as create; 404/409. |
| PATCH `/sku-mappings/{id}/status` | `ChangeActiveStatusRequest` | no data | Duplicate active mapping 409; 404. |
| GET `/sales/import-template` | none | XLSX file | 401/403. |
| POST `/sales/imports/preview` | multipart `SalesImportPreviewForm` (`file`) | `SalesImportPreviewDto` | Empty, >10 MB, wrong extension, unsafe/invalid workbook or row errors. |
| POST `/sales/imports/confirm` | multipart `SalesImportConfirmForm` | `SalesImportConfirmResultDto` | Invalid rows 400; duplicate 409; correction reason required. |
| GET `/sales/import-batches` | `SalesImportBatchQuery` | `PagedResult<SalesImportBatchDto>` | Page range. |
| GET `/sales/import-batches/{id}` | path `id` | `SalesImportBatchDetailsDto` | 404. |
| POST `/sales/import-batches/{id}/cancel` | `CancelSalesImportBatchRequest` | no data | Reason required; already cancelled/non-active batch 409. |
| POST `/sales/manual` | `ManualSalesEntryRequest` | `SalesHistoryDto` | Date/channel/SKU/positive quantity/active optional Item. |
| PUT `/sales/manual/{id}` | path `id`, `ManualSalesEntryRequest` | `SalesHistoryDto` | Same as create; non-manual/missing row 409. |
| DELETE `/sales/manual/{id}` | path `id` | no data | Non-manual/missing row 409. |
| GET `/sales/history` | `SalesHistoryQuery` | `PagedResult<SalesHistoryDto>` | Date order, positive filters, page range. |
| GET `/sales/summary` | `fromDate`, `toDate` | `ProductSalesSummaryDto` | Inclusive range required, maximum 366 days. |
| GET `/boms/products/{productId}` | path `productId` | `ProductBomDto` | 404. |
| PUT `/boms/products/{productId}` | `SaveProductBomRequest` | `ProductBomDto` | Positive quantities, no self/duplicate component, active Items, compatible units. |
| GET `/boms/issues` | none | `ProcurementConfigurationIssueDto[]` | None beyond authorization. |
| GET `/settings` | `ProcurementSettingQuery` | `PagedResult<ProcurementSettingDto>` | Page range. |
| GET `/settings/items/{itemId}` | path `itemId` | `ProcurementSettingDto` | 404. |
| PUT `/settings/items/{itemId}` | matching path/body `itemId`, `SaveProcurementSettingRequest` | `ProcurementSettingDto` | Nonnegative values, positive multiple, valid rounding, effective lead time unless manual. |
| GET `/settings/missing` | none | `ProcurementConfigurationIssueDto[]` | None beyond authorization. |
| POST `/settings/lead-time-history` | `CreateLeadTimeHistoryRequest` | `LeadTimeHistoryDto` | Positive Item, received >= ordered. |
| GET `/settings/items/{itemId}/lead-time-history` | path `itemId` | `LeadTimeHistoryDto[]` | Invalid/missing Item yields empty or server validation as configured. |
| POST `/plans/validate` | `PlanningRequest` | `PlanningValidationDto` | Date range; business prerequisites returned as messages. |
| POST `/plans/preview` | `PlanningRequest` | `PlanningPreviewDto` | Date range; calculation returns blocking/warning/info messages. |
| POST `/plans/runs` | `PlanningRequest` | `PlanningRunDto` | Blocking prerequisites produce 409; otherwise creates Draft. |
| GET `/plans/runs` | `PlanningRunQuery` | `PagedResult<PlanningRunSummaryDto>` | Date order, valid status, page range. |
| GET `/plans/runs/{id}` | path `id` | `PlanningRunDto` | 404. |
| GET `/plans/runs/{id}/lines` | path `id`, `PlanningRunLineQuery` | `PlanningRunLineDto[]` | Search length; 404 run. |
| PATCH `/plans/runs/{runId}/lines/{lineId}` | `UpdatePlanningLineRequest` | `PlanningRunLineDto` | Nonnegative final quantity; reason on difference; Draft only. |
| POST `/plans/runs/{id}/finalize` | path `id` | `PlanningRunDto` | Missing/already finalized 409. |
| GET `/plans/runs/{id}/export` | path `id` | XLSX file | 404; 401/403. |

Success envelope example:

```json
{
  "succeeded": true,
  "message": "Planning run saved as draft.",
  "data": {
    "id": 42,
    "runNumber": "PP-000042",
    "fromDate": "2026-06-15",
    "toDate": "2026-07-14",
    "numberOfDays": 30,
    "status": 1,
    "calculationVersion": "workbook-compatible-v1",
    "inventoryBasis": "Items.CurrentStock (global on-hand; inbound/open orders/reservations excluded)",
    "lines": []
  },
  "errors": [],
  "correlationId": null
}
```

Validation/conflict envelope example:

```json
{
  "succeeded": false,
  "message": "Planning prerequisites contain blocking errors.",
  "errors": ["MISSING_BOM: No active BOM is configured for a sold finished product."],
  "correlationId": "0HN..."
}
```

File responses have no JSON envelope. For downloads, read `Content-Disposition`; for API errors on a download request, read the JSON error envelope.

## Screen Specification

### 1. Sales Import

- Date-range selector initialized to trailing 30 days.
- Download-template action.
- Drag/drop CSV/XLSX, 10 MB client limit.
- Preview summary cards: total, valid, invalid, unmapped, duplicate.
- Row grid with errors and mapping status; filters for Invalid and Unmapped.
- Confirm disabled while invalid rows exist.
- Duplicate correction dialog requires reason.
- Manual-entry drawer and paged history tab.
- Import-batch tab with detail and reason-required cancel action.
- Product summary tab using dynamic channel columns.

### 2. Channel SKU Mapping

- Unmapped-first queue plus all-mappings tab.
- Channel selector, channel SKU/name, finished-product Item autocomplete.
- Show Item code/classification/active state.
- Save should refresh unresolved counts; historical unresolved rows resolve server-side.

### 3. BOM Mapping

- Finished Product Item selector (`procurementClassification=1`).
- Component Item selector filtered to active non-finished-product Items.
- Editable quantity and read-only Item unit.
- Replace-all save confirmation and dirty-state guard.
- Issues panel for sold products with missing BOM.

### 4. Procurement Settings

- Material list with Missing/Inactive/Manual/Automatic filters.
- Lead-time override, history average, configured value, and effective-source badge.
- Safety factor, MOQ, order multiple, rounding rule.
- Mutually understandable Automatic and Manual toggles; manual forces zero automatic result.
- Missing-settings and lead-history drawers.

### 5. Generate Plan

- Last-30-days default with inclusive-day count.
- Validate first; group blocking errors, warnings, and information.
- Preview table containing every calculation input/result and expandable explanation.
- Save Draft disabled if blocking errors exist.
- Never label this action “Create PO”.

### 6. Planning History

- Date/status filters and run cards/table with line/purchase-line counts.
- Detail: stored snapshot values only.
- Optional line filters for purchase-only, warnings, manual, or search.
- Draft adjustment with reason.
- Finalize confirmation and permission check.
- Export permission-aware action.

## UI State and Error Rules

- `401`: use existing token refresh/sign-in flow.
- `403`: hide or disable the action based on page/action permissions and still handle server denial.
- `400/422`: bind validation errors to fields and retain form state.
- `404`: return to list after a contextual notification.
- `409`: show conflict inline; examples include duplicate import, duplicate mapping, finalized run edit, or invalid planning prerequisites.
- Import file errors belong to the preview grid; do not collapse them into one toast.
- Blocking calculation messages prevent Save Draft. Warnings do not.
- Always show the inventory-basis information message so users know inbound/open/reserved quantities were excluded.
- Keep decimal values unrounded in state; format to at most six decimal places only for display.

## Permission Keys

```ts
const procurementPages = {
  salesImport: "ProcurementPlanning.SalesImport",
  skuMapping: "ProcurementPlanning.SkuMapping",
  bomMapping: "ProcurementPlanning.BomMapping",
  settings: "ProcurementPlanning.Settings",
  generatePlan: "ProcurementPlanning.GeneratePlan",
  planningHistory: "ProcurementPlanning.PlanningHistory",
} as const;
```

Use the existing page actions: `View`, `Create`, `Edit`, `Delete`, `Export`, `Approve`.
