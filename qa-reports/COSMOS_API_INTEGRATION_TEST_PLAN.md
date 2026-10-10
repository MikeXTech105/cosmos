# Cosmos ERP — API Integration Test Plan

## Inventory baseline

- Frontend endpoint-registry declarations: **282** (not all are distinct routes; aliases/dynamic factories require semantic deduplication).
- Frontend Axios verb call sites: **316**.
- Backend controller files: **58**.
- Backend HTTP action attributes: **454**.

An exact endpoint-by-endpoint matrix has not been completed: 0% of the 316 call sites have authenticated runtime contract verification, and only the static enum families named in `COSMOS_FLAGS_STATUS_AUDIT.md` were compared property-by-property. Do not treat similarly named routes as matched.

## P0 staging prerequisites

1. Deploy INT-001 frontend fix with a non-secret `COSMOS_API_BASE_URL`.
2. Provide admin, standard, and restricted staging identities.
3. Provide a dedicated, resettable test company/warehouse dataset and read-only SQL Server account.
4. Disable real payment, GST, email, file delivery, and shipment integrations.

## Contract test matrix required for each call site

For every service invocation, record API ID; effective URL; method; auth; request DTO; query/route fields; response/error envelope; controller/action; permission; repository/SP; consumer page; and static/runtime result. Test happy path, 400 validation, 401, 403, 404, conflict where supported, null/empty lists, pagination/filter/sort, and content type.

## Priority workflow tests

| Module | Tests |
|---|---|
| Sales | all invoice/payment/status enum values; create-confirm-cancel; reload after each mutation; stock/ledger reconciliation |
| Purchase | separate bill/order/return lifecycles; payment modes; conversion and cancellation idempotency |
| Procurement | Draft/Calculated/Reviewed/Finalized/Cancelled; calculation/reload/filter values |
| Dispatch/shipment | calculate/allocate/finalize; duplicate retry; stock movement and status reconciliation |
| RBAC | visible UI versus direct API 401/403 for view/create/edit/delete/approve/export |
| Shared auth | login, refresh, retry header, logout, expired token, frontend API origin/content type |

## Automation approach

Use mocked frontend service tests for URL/query/payload shape, API integration tests against staging for DTO serialization and errors, and browser tests for rendered tables/badges/form state. Fail CI if enum fixtures or frontend endpoint constants diverge from the approved backend contract artifact.
