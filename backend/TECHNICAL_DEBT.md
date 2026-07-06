# Technical Debt

## Critical

### Committed Production-Like Secrets
- Evidence: `src/Cosmos.API/appsettings.json` contains a SQL Server connection string with `User Id=sa;Password=...` and a JWT signing key.
- Risk: credential compromise, database takeover, token forgery if deployed as-is.
- Recommendation: rotate credentials/signing key, remove from source, use user secrets locally and a secure production secret store or environment injection.

### Seeded Default Admin Account
- Evidence: `database/CosmosERP.Security.sql` seeds `admin` / `admin@cosmoserp.com` with a committed BCrypt hash.
- Risk: predictable bootstrap account if password is known or inferred from prior AI/project context.
- Recommendation: move admin bootstrap to deployment-time secret input or force rotation on first login.

### Swagger Enabled in Production
- Evidence: `Program.cs` calls `app.UseSwagger()` and `app.UseSwaggerUI()` unconditionally.
- Risk: exposes full API shape in production.
- Recommendation: restrict to Development or protect Swagger with authentication/network rules.

## High

### No Automated Database Migration/Deployment
- Evidence: SQL scripts exist in `database/`; no DbUp/Flyway/Liquibase/migration runner/startup migrator found.
- Risk: app/container can deploy without required schema/procedures.
- Recommendation: define script order and add deployment automation.

### Unit of Work Is Not Transactionally Effective
- Evidence: `UnitOfWork` opens a connection/transaction, but repository methods open their own connections and do not accept a transaction.
- Risk: developers may believe multi-step service operations are atomic when they are not.
- Recommendation: remove until needed, or redesign repositories to share connection/transaction context.

### Audit Attribution Is Incomplete
- Evidence: many `AuditEntryRequest` calls pass `CreatedBy = null`; non-HR modules do not use `ICurrentUser`.
- Risk: audit logs cannot reliably answer who changed data.
- Recommendation: inject current user into services/audit service and centralize audit writes.

### Route ID Extraction Bug in Validators
- Evidence: `UpdateDepartmentValidator.RouteId` and `UpdateEmployeeValidator.RouteId` use `value as long?` against boxed values.
- Risk: uniqueness checks may not exclude the current entity, creating false duplicate errors on update.
- Recommendation: use pattern matching: `value is long id ? id : null`.

### CORS Configuration Can Fail at Startup
- Evidence: `allowedOrigins!` is passed to `.WithOrigins(...)` with no null/empty validation.
- Risk: missing config can crash startup or misconfigure CORS.
- Recommendation: validate options at startup and fail with a clear message or safe default per environment.

## Medium

### HR Service and Repository Are Too Broad
- Evidence: `HrService` and `HrRepository` handle departments, designations, shifts, employees, attendance, leave, payroll.
- Risk: difficult testing, review, ownership, and future feature evolution.
- Recommendation: split by HR subdomain.

### File Upload Storage Is Local and Lightly Validated
- Evidence: `ItemsController` writes item images to local `wwwroot/uploads/items`, checks only extension and size.
- Risk: local files do not scale across instances; content spoofing/malware not detected; orphaned files possible.
- Recommendation: validate content type/signature, consider image decoding, use storage abstraction, add cleanup strategy.

### Forgot Password Has No Delivery Integration
- Evidence: `AuthService.ForgotPasswordAsync` creates a token and returns a generic message; no email service exists.
- Risk: users cannot complete password reset unless token is extracted out-of-band.
- Recommendation: add email provider abstraction and send reset link securely.

### Password Reset Tokens Stored Plain
- Evidence: SQL stores `PasswordResetTokens.Token` and reset procedure compares raw token.
- Risk: database read access exposes usable reset tokens.
- Recommendation: store token hashes and compare hashes.

### Inconsistent Identity Types
- Evidence: security users use `int`, HR uses `long?`, party audit columns use `Guid?`.
- Risk: inconsistent audit attribution and integration friction.
- Recommendation: standardize user identifier strategy or document mapping explicitly.

### Response Status Semantics Are Mixed
- Evidence: exceptions preserve status via middleware, while `FromResponse` maps failed response envelopes to HTTP 400.
- Risk: clients may see inconsistent statuses for equivalent failures.
- Recommendation: make service failures consistently throw typed exceptions or include status in response envelope and respect it.

### Multiple SQL Connections per Use Case
- Evidence: services often read old state, mutate, and audit through separate repository calls; each repository opens a connection.
- Risk: non-atomic workflows and unnecessary connection churn.
- Recommendation: introduce transactional workflow support where business atomicity matters.

## Low

### Reflection/Dynamic Validator Helpers
- Evidence: `ItemCommandValidator<T>` and `PartyCommandValidator<T>` use reflection; repositories use dynamic parameter builders for party/item commands.
- Risk: compile-time safety is reduced and refactors can break at runtime.
- Recommendation: prefer typed validators/helpers if duplication remains manageable.

### Limited Test Coverage
- Evidence: only 4 unit tests exist.
- Risk: controllers, DI, auth filters, repositories, SQL scripts, and HR workflows can regress without tests.
- Recommendation: add integration tests with `WebApplicationFactory` and database-backed repository tests where feasible.

### Health Check Is Minimal
- Evidence: `AddHealthChecks` and `/health` exist without SQL health check.
- Risk: health endpoint may report healthy while SQL dependency is unavailable.
- Recommendation: add SQL Server health check and readiness/liveness distinction if deployed to orchestration platforms.

### Dockerfile Excludes Tests and Database Setup
- Evidence: Dockerfile restores/publishes API only.
- Risk: image can be built without test validation or schema provisioning.
- Recommendation: keep tests in CI rather than runtime image, but document/automate DB setup separately.

### Duplicate Request Logging
- Evidence: both `UseSerilogRequestLogging` and custom `RequestLoggingMiddleware` log requests.
- Risk: noisy duplicate logs.
- Recommendation: keep both only if they serve distinct operational needs; otherwise consolidate.

## Positive Debt Already Paid Down

- Layers are separated clearly.
- Controllers are thin.
- Password and JWT claim behavior has unit tests.
- Stored procedure names are explicit and traceable.
- SQL scripts include many indexes, unique constraints, and check constraints.
- JWT excludes roles/permissions, reducing stale authorization claim risk.
