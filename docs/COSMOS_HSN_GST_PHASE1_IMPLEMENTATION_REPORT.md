# Cosmos HSN/GST Phase 1 Implementation Report

## Summary

Implemented a backend-only Phase 1 foundation for HSN/SAC master data, effective-dated total-rate history, category defaults, product overrides, and effective-classification resolution. The implementation does not calculate GST, seed classifications/rates, alter existing item fields, rewrite invoices, or call compliance APIs.

## Files Added/Modified

- Migration: `backend/database/migrations/20261015_hsn_gst_phase1_foundation.sql`
- Contracts: `backend/src/Cosmos.Contracts/HsnGst/HsnGstDtos.cs`
- API/application/persistence: `HsnGstController.cs`, `IHsnGstService.cs`, `IHsnGstRepository.cs`, `HsnGstService.cs`, `HsnGstRepository.cs`, `HsnGstValidators.cs`, plus DI registrations.
- Tests: `backend/tests/Cosmos.Tests/Gst/HsnGstValidatorTests.cs`

## Database Details

The migration creates `HsnSacMasters`, `GstRateRules`, `GstRateRuleVersions`, `CategoryHsnDefaults`, and `ItemHsnOverrides`, with foreign keys and unique code/rule indexes. It adds stored procedures for listing/saving HSN records, rate versions, category/product mappings, and resolving product override before category default. It never seeds real classifications/rates and never updates `Items.HSNCode`, `Items.GSTRate`, or invoice data.

## APIs and Compatibility

Endpoints are under `/api/v1/gst` for HSN/SAC list/detail/create/update, rate-version list/create, category default, item override, and effective classification. Existing item and invoice contracts remain unchanged. Existing legacy item values remain visible as `LegacyHsnCode` when no approved Phase 1 mapping resolves.

## Permissions and Audit

Endpoints require `GST.HsnSac`, `GST.RateHistory`, `GST.CategoryMapping`, or `GST.ProductMapping` permissions. HSN/rate changes are written through the existing audit repository. Permission-page seed registration is intentionally deferred because the existing page/role bootstrap mechanism needs a reviewed deployment-specific migration entry before authorizing user access.

## Tests and Build

- `dotnet build backend/src/Cosmos.API/Cosmos.API.csproj --no-restore`: passed (existing NuGet warnings NU1903 and NU1510).
- New validator tests were added but not executed in this turn after creation.
- No SQL integration test or browser/UI verification was executed; the migration was not applied.

## Deferred / Business Decisions

- Official HSN/SAC length/format policy and classification authority.
- GST rule scope, CGST/SGST/IGST component model, place-of-supply, inclusive pricing, rounding, exemptions, exports/SEZ/reverse charge.
- Rate activation/approval workflow and any association between HSN mapping and rate rules.
- Frontend master-management page and Product Master lookup remain deferred: backend APIs are ready, but adding a UI without approved permission-page/navigation registration would expose an inaccessible or misleading screen.

## Isolated Migration Instructions

On an approved development/test SQL Server database only, review the migration, back up/schema-snapshot the test database, then run `backend/database/migrations/20261015_hsn_gst_phase1_foundation.sql` in SQLCMD/SSMS. Verify each table/procedure exists and run only synthetic test records. Do not run it against production or staging without change approval.

## Recommended Next Phase

Approve the tax-rule key, component/rounding policy, HSN governance, and permission registration. Then add the frontend master/mapping screens and SQL integration tests before integrating any calculation into Sales.
