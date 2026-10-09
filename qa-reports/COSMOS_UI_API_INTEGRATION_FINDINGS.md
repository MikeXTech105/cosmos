# COSMOS ERP — UI API Integration Findings

## Evidence boundary

This report separates rendering evidence from transport evidence. The live browser session displayed API-backed content on sampled pages, but its available network inspector did not return individual request URLs, status codes, content types, or bodies. No tokens/cookies were read. Therefore the table does **not** invent request-level pass results.

| Page family | Live UI result | Browser transport result | Contract status |
|---|---|---|---|
| Dashboard | Rendered metrics/no-data states | Individual request metadata unavailable | UNVERIFIED |
| RBAC Users | Failed with UI-001 | Underlying response not inspectable | **PROBABLE contract/deployment mismatch** |
| RBAC Roles/Pages/Permissions | Rendered lists/selector | Metadata unavailable | UNVERIFIED |
| Items, Party, Data Book | Rendered populated read-only tables | Metadata unavailable | UNVERIFIED |
| Sales Invoices | Rendered empty table/filters | Metadata unavailable | UNVERIFIED |
| Purchase Bills/Orders | Rendered populated lists with badges | Metadata unavailable | UNVERIFIED |
| Supply Chain Channels | Rendered empty state | Metadata unavailable | UNVERIFIED |
| Procurement | Rendered calculated recommendations | Metadata unavailable | UNVERIFIED |
| Dispatch, Shipments, HR, OEE, Rojmel, Activity Logs | Rendered dashboard/table states | Metadata unavailable | UNVERIFIED |

## Current finding

**UI-001 / High / CONFIRMED UI failure:** `/users` visibly reports `t.find is not a function`. Treat the exact response-shape root cause as **PROBABLE**, not confirmed, until a sanitized staging capture correlates `/api/users`, roles lookup and deployed frontend asset version.

## Prior evidence reviewed, not reclassified as current live execution

Existing reports identify INT-001: a prior deployment sent frontend-origin `/api` calls to SPA HTML while `:8080` returned JSON. Source remediation and compose runtime configuration exist, but this audit did not independently observe per-request headers/status/content type. INT-001 remains **UNVERIFIED on the current deployment**; it must not be marked resolved merely from source.

## Required controlled-staging capture

For each page/service invocation, record sanitized effective URL, method, HTTP status, content type, response envelope keys, UI consumer outcome, and error behavior. Start with `/users`, `/roles`, `/api/auth/me`, Sales list/detail, Purchase bill/order list/detail and Procurement run list/detail. Confirm every `/api/*` call returns API JSON rather than SPA HTML.
