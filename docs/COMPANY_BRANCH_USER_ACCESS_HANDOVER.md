# Company, Branch & User Access handover

## Purpose

Phase 4 Increment 1 provides the shared legal-entity, branch, and user-scope foundation used by Sales. It does not activate authoritative GST calculation, immutable statutory snapshots, E-Invoice, E-Way Bill, or GSTZen generation.

## Administrator workflows

- **Company Master:** System Owners create, edit, activate, and deactivate legal entities. A Company is a legal entity; it is not a manufacturing configuration record.
- **Branch Master:** a Branch belongs to exactly one Company. Administrators select its Company on creation; the relationship is immutable through ordinary branch editing.
- **User scope assignments:** System Owners and explicitly authorized Company-level administrators grant Company-wide or Branch-only access. Revocation deactivates an assignment instead of deleting its history. Delegated administrators cannot self-grant or administer another Company.
- **Sales ownership:** new Sales drafts require `CompanyId`; `BranchId` is optional and null represents Company-level ownership. Existing unscoped invoices are preserved and are System Owner-only until an approved remediation policy exists.

## RBAC and record scope

The Company/Branch page resource is `System.CompanyBranchScope`; assignment administration uses `System.CompanyBranchScopeAssignments`. Global page/action permission is required in addition to record scope. Individual cross-scope resources return the existing not-found response. The protected System Owner convention requires an active system user and active system role membership.

## APIs

- Company/Branch administration is exposed by `CompanyBranchesController` through the organization API service.
- Assignment endpoints: `GET /api/v1/organization/scope-assignments/me`, `GET /api/v1/organization/scope-assignments/users/{userId}`, `POST /api/v1/organization/scope-assignments`, and `DELETE /api/v1/organization/scope-assignments/{assignmentId}`.
- Sales create/update validates Company/Branch scope and requires an active GST registration matching the invoice Company and applicable Branch.

## Database and audit model

`Companies`, `Branches`, and `UserCompanyBranchScopes` enforce Company-to-Branch integrity and active assignment uniqueness. Sales invoices retain nullable `CompanyId` and `BranchId`; historical rows are not backfilled. Company and Branch writes use `sp_Company_*` and `sp_Branch_*` procedures and transactional audit triggers. Assignment procedures audit grants/revocations in the same guarded transaction.

Migration order is forward-only: `20261027_30_company_branch_scope.sql`, `20261027_31_company_branch_scope_permissions.sql`, `20261027_32_company_branch_master_procedures.sql`, `20261027_33_company_branch_master_scope_authorization.sql`, `20261028_34_company_branch_safe_deactivation.sql`, `20261028_35_company_branch_atomic_audit.sql`, and `20261028_36_company_branch_scope_assignments.sql`.

## Frontend use

Administrators use **Settings / Organization** to manage Company, Branch, and User Access tabs. Sales users choose an authorized Company first; the optional Branch selector and issuing GST registration are filtered from that choice. Changing Company clears incompatible Branch and registration values.

## Verification and limitations

- Frontend deterministic coverage: 116 files and 730 passing tests; the normal monolithic Vitest run remains scale-sensitive on the verification host.
- Scoped disposable SQL regression: 5 passed, 0 failed, 0 skipped. It covers master rules, scope authorization, assignment audit rollback/concurrency, and Sales GST lifecycle context.
- Browser acceptance requires an authenticated local environment.
- Independent post-run audit-residue counts must be captured against `CosmosSalesGstIntegrationTests_Local` before release evidence is considered complete.

## Staging deployment checklist

1. Obtain explicit approval and confirm a recent, restorable backup.
2. Run migration preflight and apply migrations in the listed order only to approved staging.
3. Verify tables, foreign keys, procedures, RBAC seeds, audit triggers, and historical unscoped invoice preservation.
4. Smoke-test administrator scope management and authorized Sales draft ownership with an authenticated browser.
5. Keep GSTZen/E-Invoice/E-Way Bill generation disabled.
