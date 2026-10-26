# Next Development Plan

## Phase 1: Stabilize Security and Configuration

1. Rotate exposed credentials and JWT signing key.
2. Remove secrets from `appsettings.json`.
3. Add local user-secrets instructions and production environment/secret-store configuration.
4. Add startup validation for:
   - `ConnectionStrings:CosmosDb`.
   - `Jwt:Issuer`.
   - `Jwt:Audience`.
   - `Jwt:SigningKey` length.
   - `Cors:AllowedOrigins`.
5. Restrict or protect Swagger outside Development.
6. Replace seeded admin bootstrap with deployment-time credential creation or mandatory rotation.

## Phase 2: Fix Correctness Issues

1. Fix HR update validator route ID extraction for uniqueness checks.
2. Decide whether `IUnitOfWork` should be removed or redesigned.
3. Make audit attribution consistent across all modules.
4. Normalize failure status handling so clients receive stable HTTP statuses.
5. Review identity key type consistency across security, HR, party, and audit fields.

## Phase 3: Database and Deployment Hardening

1. Document exact SQL script order:
   - `database/CosmosERP.Security.sql`
   - `database/001_Party_Module.sql`
   - `database/Scripts/002_ItemModule.sql`
   - `database/Scripts/HR/001_HRMS_Module.sql`
2. Add a repeatable migration/deployment tool or CI/CD database step.
3. Add SQL Server health check.
4. Add deployment documentation for:
   - required environment variables.
   - database provisioning.
   - Docker runtime port.
   - CORS origin setup.
   - log location and retention.

## Phase 4: Test Coverage

1. Add API integration tests with `WebApplicationFactory<Program>` for:
   - unauthenticated protected endpoint returns 401.
   - missing permission returns 403.
   - login response shape.
   - global exception response shape.
2. Add unit tests for service validation and audit behavior.
3. Add repository/stored-procedure smoke tests against a disposable SQL Server database if project workflow allows.
4. Add tests for HR validator route ID exclusion after fixing the bug.
5. Add file upload tests for allowed/denied extensions and max size.

## Phase 5: Module Refactoring

1. Split `HrService` and `HrRepository` into smaller services/repositories:
   - HR master data: departments, designations, shifts.
   - Employees.
   - Attendance.
   - Leave.
   - Payroll.
2. Introduce an audit service to avoid repeated audit code.
3. Replace reflection-based validators where safer typed validators are practical.
4. Introduce storage abstraction for item images and future HR documents.

## Phase 6: Feature Completion

1. Add email delivery for forgot-password/reset-password.
2. Hash password reset tokens at rest.
3. Complete salary structure/component management APIs.
4. Add HR document binary upload/storage if documents are expected to be managed by the backend.
5. Add item image update/delete lifecycle support.
6. Add current user/profile endpoint for clients to refresh identity/permission state.

## Suggested Immediate First Sprint

1. Secrets/config cleanup.
2. Swagger production gating.
3. HR route ID validator fix.
4. Audit current-user attribution design.
5. Database deployment README or automation decision.
6. First integration test suite for auth/authorization pipeline.

## Stop Point

No code changes have been made beyond these documentation files. Wait for explicit direction before implementing fixes or features.
