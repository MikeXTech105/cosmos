# Cosmos ERP — Phase 4 Increment 1: Sales/GST Ownership and Authorization

**Status:** Proposed, not implemented — 27 October 2026. This increment deliberately excludes authoritative GST calculation, statutory snapshots, provider calls, and changes to financial totals.

## Observed baseline

Read-only inspection of `CosmosERP_Staging` found:

- `CompanyGstRegistrations` has nullable `CompanyId` and `BranchId` plus GSTIN and address facts.
- `SalesInvoices` has a nullable `CompanyGstRegistrationId`, but no `CompanyId` or `BranchId`.
- Retained invoices have no issuer-registration link. They must not be backfilled or silently assigned ownership.
- User authorization is global role/page permission through `Users`, `UserRoles`, `Roles`, and `RolePermissions`; no user-to-company/branch assignment table is present.

Therefore, selecting an active GST registration is not evidence that a user may create, read, edit, confirm, or generate a document for its company or branch.

## Required decision before implementation

The business owner must choose the invoice ownership source:

1. **Recommended for review:** persist immutable-at-creation `SalesInvoices.CompanyId` and optional `BranchId`, then require the selected GST registration to match that scope where a registration is supplied.
2. **Alternative:** derive invoice scope solely from the selected GST registration. This does not cover drafts without a registration and makes registration changes a hidden ownership change; it is not recommended unless approved explicitly.

Also decide whether a cross-scope read returns `404` (conceal existence) or `403` (explicit denial), and which roles can manage registrations across scopes. No code should choose these policies implicitly.

## Proposed forward-only SQL shape

After approval, add a versioned migration and read-only verification script with the following minimum shape:

- nullable `CompanyId` and `BranchId` on `SalesInvoices`, initially without backfill; foreign keys only when the referenced company/branch model and historical data compatibility are confirmed;
- a `UserCompanyBranchScopes` (or owner-approved equivalent) relation containing `UserId`, `CompanyId`, nullable `BranchId`, active state, audit columns, and a uniqueness constraint;
- indexes supporting invoice scope lookups and registration-to-company/branch validation;
- bounded procedures for scope-aware Sales Invoice retrieval/listing and registration selection validation. Procedures must take the authenticated user/scope context as server parameters; never trust a company/branch value from a browser alone.

The migration must not alter retained invoice totals, registration links, stock, snapshots, or provider records. Existing invoices remain legacy/unscoped until a separately approved, auditable migration policy exists.

## Proposed application boundary

1. Add an `ICompanyBranchScopeAuthorizer` in the application layer. It receives the authenticated user, target company/branch, operation, and resource type; it does not infer scope from a UI selection.
2. Extend `ICurrentUser`/claims only after the assignment source and token-refresh behavior are approved. Alternatively query the scope repository per request; cache only with invalidation/authorization review.
3. Make `SalesService` validate draft create/update, get/list, confirm, and cancel against the invoice’s persisted scope. Resolve and validate the selected GST registration within the same repository transaction used for the write.
4. Make GST-registration reads/writes/default selection, GST eligibility, future snapshot reads, and future generation-status reads enforce the same scope service in addition to existing page permissions.
5. Keep `EInvoiceService` and `EWayBillService` source-blocked. Scope authorization must not become a path to statutory generation.

## Compatibility and rollout

- Do not require scope values for existing retained invoices until an owner-approved legacy-read policy exists.
- Do not backfill from a party, current registration, user, or branch name. Those are mutable and insufficient historical evidence.
- Gate scope enforcement for newly created invoices behind a controlled deployment switch only after the required assignment records and UI/API contracts exist.
- Keep Phase 3’s nullable registration/place-of-supply/price-basis fields compatible; this increment does not make them tax-authoritative.

## Required integration coverage

Use `CosmosSalesGstIntegrationTests_Local`, never retained staging. Test fixtures must create synthetic companies, branches, registrations, users, roles, and scope assignments.

| Scenario | Required outcome |
|---|---|
| User A creates/reads/updates an invoice in assigned Company/Branch A | Allowed with existing Sales permission |
| User A accesses Company/Branch B invoice or registration | Policy-selected `404` or `403`; no data leakage |
| User A selects registration B for Company/Branch A draft | Rejected atomically |
| Global page permission without a scope assignment | Rejected for scoped resource operations |
| Scope assignment is disabled/revoked | Subsequent operation rejected; no stale authorization cache |
| Legacy invoice with null scope | Behavior follows explicit compatibility policy; no inferred reassignment |
| Concurrent registration/scope change during Sales update or confirmation | Transaction rejects stale/invalid relationship |
| GST eligibility/snapshot read under cross-scope request | Denied before returning persisted diagnostics |

## Explicitly unresolved policy decisions

- Legal meaning and optionality of invoice company/branch on drafts, walk-in sales, and cross-branch fulfillment.
- Whether branch-null means whole-company access, no branch restriction, or an invalid scope.
- User-scope administration roles and audit/approval requirements.
- Legacy invoice visibility and remediation policy.
- `404` versus `403` cross-scope response semantics.
- GST registration reassignment/deactivation effect on draft and confirmed invoices.

## First development task

Obtain the ownership and response-semantics decisions above, then implement only the scope data model, scope authorizer, scoped Sales/GST read-write boundaries, and isolated cross-company tests. Do not invoke `IGstCalculationEngine` from Sales confirmation, create a compliance snapshot, modify tax totals, or call GSTZen in this increment.
