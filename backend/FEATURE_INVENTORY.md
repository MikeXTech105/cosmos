# Feature Inventory

## Summary

| Area | Status | Evidence |
|---|---|---|
| Authentication | Implemented | `AuthController`, `AuthService`, `AuthRepository`, security SQL procedures |
| Authorization | Implemented | `[RequirePermission]`, `RequirePermissionFilter`, `PermissionService`, SQL permission view/procedure |
| User management | Implemented | Users controller/service/repository/SQL |
| Role management | Implemented | Roles controller/service/repository/SQL |
| Page management | Implemented | Pages controller/service/repository/SQL |
| Role permission management | Implemented | Permissions controller/service/repository/TVP SQL |
| Audit logging | Partially implemented | Service audit inserts exist; current user attribution incomplete; middleware only logs |
| Party management | Implemented | Parties controller/service/repository/SQL |
| Party settings | Implemented | Party settings controller/service/repository/SQL |
| Category management | Implemented | Categories controller/service/repository/SQL |
| Unit management | Implemented | Units controller/service/repository/SQL |
| Item management | Implemented | Items controller/service/repository/SQL |
| Item image upload | Partially implemented | Create supports multipart upload to local disk; update/replacement/storage hardening absent |
| HR departments | Implemented | HR departments endpoint/service/repository/SQL |
| HR designations | Implemented | HR designations endpoint/service/repository/SQL |
| HR shifts | Implemented | HR shifts endpoint/service/repository/SQL |
| HR employees | Implemented | HR employee endpoint/service/repository/SQL |
| HR employee documents | Partially implemented | Metadata endpoints exist; no binary upload/storage integration for documents |
| HR bank details | Implemented | Bank detail endpoints/repository/procedure |
| Attendance | Implemented | Check-in/out/manual/list/report endpoints and procedures |
| Attendance adjustments | Implemented | Request/approve/reject endpoints and procedures |
| Leave management | Implemented | Apply/cancel/approve/reject/list/balance/pending endpoints and procedures |
| Payroll processing | Implemented | Process/approve/run/history/payslip endpoints and SQL |
| Salary structures/components | Partially implemented | Tables exist; no API/service endpoints found |
| Forgot password email | Not implemented | Token generation exists; no email provider/integration |
| Background jobs | Not implemented | No hosted services or queue consumers found |
| Database deployment automation | Not implemented | SQL scripts exist; no runner/migration automation |
| Integration tests | Not implemented | Unit tests only |

## Authentication Features

- `POST /api/auth/login`: implemented.
- `POST /api/auth/refresh-token`: implemented.
- `POST /api/auth/logout`: implemented.
- `POST /api/auth/change-password`: implemented.
- `POST /api/auth/forgot-password`: token generation implemented, email delivery absent.
- `POST /api/auth/reset-password`: implemented.

## Authorization Features

- JWT bearer authentication implemented.
- SQL-backed permission checks implemented.
- Roles, pages, role permissions, user-role assignments implemented.
- Permissions supported: `View`, `Create`, `Edit`, `Delete`, `Export`, `Approve`.
- SuperAdmin seed permissions implemented in SQL scripts.

## Security Administration Features

- Users:
  - list, get, create, update, delete, activate, deactivate, assign roles.
- Roles:
  - list, get, create, update, delete.
- Pages:
  - list, get, create, update, delete.
- Permissions:
  - get role permissions, replace role permissions.

## Party Features

- Party list with search, pagination, sorting, active filter.
- Party get by ID.
- Party create/update/delete/status toggle.
- Party settings get/update.
- GSTIN validation in application.
- Party seed page and SuperAdmin permissions in SQL.

## Item/Catalog Features

- Categories:
  - list, get, create, update, delete.
- Units:
  - list, get, create, update, delete.
- Items:
  - list, get, create with multipart image upload, update, delete.
- Item validation:
  - unique item code.
  - category/unit existence.
  - item type enum.
  - nonnegative prices/stocks.
  - GST rate between 0 and 100.
- Item SQL constraints mirror several validation rules.

## HRMS Features

- Departments:
  - list, get, create, update, delete.
- Designations:
  - list, get, create, update, delete.
- Shifts:
  - list, get, create, update, delete.
- Employees:
  - list, dropdown, reporting manager lookup, get, create, update, delete.
  - addresses supported in create/update payloads.
  - bank details can be created/listed.
  - document metadata can be created/listed/deleted.
- Attendance:
  - check-in, check-out, manual entry.
  - list and employee-specific history.
  - monthly and department reports.
  - adjustment request, approve, reject.
- Leave:
  - apply, cancel, approve, reject.
  - list applications.
  - get balances.
  - pending approvals.
- Payroll:
  - process month/year.
  - approve processed payroll.
  - get payroll run and details.
  - get employee payroll history.
  - get payslip.

## Platform Features

- Swagger/OpenAPI UI implemented.
- Health endpoint implemented at `/health`.
- Serilog console and file logging implemented.
- Correlation ID middleware implemented.
- Global exception handling implemented.
- Dockerfile implemented for API container.

## Test Inventory

- `CreateUserRequestValidatorTests`
  - weak password rejected.
  - enterprise password accepted.
- `BcryptPasswordHasherTests`
  - matching password verifies.
  - wrong password fails.
  - BCrypt hash prefix asserted.
- `JwtTokenServiceTests`
  - access token includes identity claims.
  - access token excludes role/permission/page claims.

Verification result:
- `dotnet test Cosmos.slnx --no-restore` passed with 4 tests.
# Procurement Planning

Status: Backend implemented and staging-verified; frontend and confirmed client Item/SKU migration remain.

- Configurable AMZ/BLI/INS and future sales channels.
- Channel SKU to existing finished-product Item mapping with unresolved history.
- Manual sales plus safe CSV/XLSX preview/confirm, duplicate protection, batch history, and audited cancellation.
- Configurable finished-product BOMs using the existing Item and Unit masters.
- Material lead-time history, override/configured fallback, safety factor, MOQ, order multiple, automatic/manual flags.
- Workbook-compatible calculation using global `Items.CurrentStock`, excluding reservations, inbound, and open orders.
- Validation, preview, saved Draft snapshot, reason-required adjustment, finalization, history filters, and true XLSX export.
- Swagger group `procurement-planning` and six permission pages.
- Migration/report artifact and detailed backend/frontend documentation in `backend/docs`.
