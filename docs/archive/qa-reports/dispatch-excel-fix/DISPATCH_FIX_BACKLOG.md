# Dispatch Fix Backlog — Final Status

| ID | Final status | Resolution / required next action |
|---|---|---|
| D-01 | BLOCKED — BUSINESS DECISION REQUIRED | Repair/version the workbook baseline and provide the requested `(3)` workbook if it is distinct. Broken reference/cached ranges remain excluded. |
| D-02 | FIXED AND VERIFIED | `DispatchExcelParityCalculationService` implements strict Excel tiers in an explicit parity strategy. Production activation is blocked pending 30-day source and policy approval. |
| D-03 | FIXED AND VERIFIED | The parity strategy implements the verified warehouse-share safety formula and zero-denominator rejection. Production activation requires approved data sources/network scope. |
| D-04 | FIXED AND VERIFIED | The parity strategy implements safety gate, tier-specific suppression, loose Tier 3 quantity, and nearest-box rounding. Current production settings remain unchanged pending approval. |
| D-05 | INTENTIONALLY RETAINED | Production continues to include only inbound statuses 2/3; this avoids treating undelivered/cancelled inventory as available. |
| D-06 | BLOCKED — BUSINESS DECISION REQUIRED | Retain current priority allocator until W total meaning, proportional residual handling, zero-proposal rule, and audit workflow are approved. |
| D-07 | INTENTIONALLY RETAINED | Production retains sellable/net inventory semantics rather than the workbook's unspecified raw-stock value. |
| D-08 | BLOCKED — BUSINESS DECISION REQUIRED | Production mapping for weekly vs 30-day sales is not defined. Parity calculation keeps both inputs explicit. |
| D-09 | BLOCKED — BUSINESS DECISION REQUIRED | Manual-allocation governance is required before implementation. |
| D-10 | NOT APPLICABLE | Legacy/suspect workbook ranges are excluded from primary-formula acceptance. |
| D-11 | FIXED AND VERIFIED | Added deterministic parity unit tests and executed Dispatch plus full backend regression suites. End-to-end test-database parity remains unverified. |

## Deployment gate

Do not set `dispatch-excel-parity-v1` as the production calculation policy until the blocked decisions are approved and a backward-compatible source/persistence path is reviewed in an isolated database.
