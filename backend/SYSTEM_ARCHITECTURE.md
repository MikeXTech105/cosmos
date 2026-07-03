# System Architecture

## High-Level View

```mermaid
flowchart TB
    Client["Frontend / API Client"] --> API["Cosmos.API<br/>ASP.NET Core Controllers"]
    API --> Middleware["Middleware<br/>Correlation, Exceptions, Logging, JWT Claim Guard, Audit Log"]
    API --> Authz["RequirePermissionFilter"]
    Authz --> PermissionService["PermissionService"]
    Middleware --> Services["Cosmos.Application Services"]
    API --> Services
    Services --> Validators["FluentValidation Validators"]
    Services --> Repositories["Persistence Abstractions"]
    Services --> Audit["AuditRepository"]
    Repositories --> Persistence["Cosmos.Persistence<br/>Dapper Repositories"]
    Audit --> Persistence
    Persistence --> Sql["SQL Server<br/>Tables, Views, Stored Procedures"]
    Services --> Security["Cosmos.Infrastructure<br/>JWT + BCrypt"]
```

## Project Dependency Model

```mermaid
flowchart LR
    API["Cosmos.API"] --> Application["Cosmos.Application"]
    API --> Contracts["Cosmos.Contracts"]
    API --> Domain["Cosmos.Domain"]
    API --> Infrastructure["Cosmos.Infrastructure"]
    API --> Persistence["Cosmos.Persistence"]
    API --> Shared["Cosmos.Shared"]

    Application --> Domain
    Application --> Contracts
    Application --> Shared

    Persistence --> Application
    Persistence --> Domain
    Persistence --> Shared

    Infrastructure --> Application
    Infrastructure --> Contracts
    Infrastructure --> Shared

    Tests["Cosmos.Tests"] --> Application
    Tests --> Contracts
    Tests --> Domain
    Tests --> Infrastructure
    Tests --> Persistence
    Tests --> Shared
```

## Runtime Request Pipeline

Order in `Program.cs`:
1. `CorrelationIdMiddleware`
2. `GlobalExceptionMiddleware`
3. `UseHsts` outside Development
4. `UseSwagger` and `UseSwaggerUI`
5. `UseHttpsRedirection`
6. `UseStaticFiles`
7. `UseSerilogRequestLogging`
8. `RequestLoggingMiddleware`
9. `UseCors("CorsPolicy")`
10. `UseAuthentication`
11. `JwtClaimsMiddleware`
12. `UseAuthorization`
13. `AuditMiddleware`
14. `MapControllers`
15. `MapHealthChecks("/health")`

```mermaid
sequenceDiagram
    participant Client
    participant Pipeline
    participant Auth as JWT/AuthZ
    participant Controller
    participant Service
    participant Repo
    participant DB

    Client->>Pipeline: Request
    Pipeline->>Pipeline: Correlation ID
    Pipeline->>Pipeline: Exception boundary
    Pipeline->>Pipeline: HTTPS/static/logging/CORS
    Pipeline->>Auth: Authenticate JWT
    Auth->>Auth: Require UserId claim
    Auth->>DB: Permission check via service/repository
    Auth-->>Controller: Authorized
    Controller->>Service: Use-case call
    Service->>Service: Validate
    Service->>Repo: Repository call
    Repo->>DB: Stored procedure
    DB-->>Repo: Status/data
    Repo-->>Service: DTO/result
    Service-->>Controller: ApiResponse
    Controller-->>Client: JSON
```

## Data Architecture

- Primary database: SQL Server.
- Application data access style: Dapper against stored procedures.
- Schema management style: idempotent SQL scripts in `database/`.
- Result convention:
  - Plain read procedures return result sets.
  - Mutating procedures usually return first row `OperationResult(StatusCode, Message)` and then a DTO row.
  - `StoredProcedureExecutor.QueryWithStatusAsync<T>` throws `CosmosException` on non-2xx status.

```mermaid
flowchart TD
    Service["Application Service"] --> Repository["Repository Interface"]
    Repository --> Implementation["Dapper Repository"]
    Implementation --> Executor["StoredProcedureExecutor"]
    Executor --> Procedure["SQL Stored Procedure"]
    Procedure --> Tables["SQL Tables / View"]
    Tables --> Procedure
    Procedure --> Executor
    Executor --> DTO["DTO / OperationResult"]
```

## Security Architecture

- Authentication:
  - Login validates BCrypt hash stored in `Users.PasswordHash`.
  - Access token is a JWT signed with configured symmetric signing key.
  - Refresh tokens are generated as 64 random bytes converted to base64 and stored in `RefreshTokens`.
- Authorization:
  - JWT contains identity only: `UserId`, `Username`, `Email`, JTI.
  - Roles and permissions are database state.
  - `[RequirePermission]` checks page/action permissions through SQL.
- Effective permissions:
  - `vw_UserEffectivePermissions` joins active users, roles, role permissions, and pages.
  - `sp_Permission_UserHasAccess` checks the requested `PermissionAction`.

```mermaid
flowchart LR
    JWT["JWT UserId"] --> Filter["RequirePermissionFilter"]
    Filter --> PermService["IPermissionService"]
    PermService --> PermRepo["PermissionRepository"]
    PermRepo --> SP["sp_Permission_UserHasAccess"]
    SP --> View["vw_UserEffectivePermissions"]
    View --> Tables["Users, UserRoles, Roles, RolePermissions, Pages"]
```

## Module Boundaries

| Module | API Boundary | Service | Repository | SQL Script |
|---|---|---|---|---|
| Auth | `AuthController` | `AuthService` | `AuthRepository`, `UserRepository` | `database/CosmosERP.Security.sql` |
| Users | `UsersController` | `UserService` | `UserRepository` | `database/CosmosERP.Security.sql` |
| Roles | `RolesController` | `RoleService` | `RoleRepository` | `database/CosmosERP.Security.sql` |
| Permissions | `PermissionsController`, filter | `PermissionService` | `PermissionRepository` | `database/CosmosERP.Security.sql` |
| Pages | `PagesController` | `PageService` | `PageRepository` | `database/CosmosERP.Security.sql` |
| Parties | `PartiesController` | `PartyService` | `PartyRepository` | `database/001_Party_Module.sql` |
| Party Settings | `PartySettingsController` | `PartySettingsService` | `PartySettingsRepository` | `database/001_Party_Module.sql` |
| Categories | `CategoriesController` | `CategoryService` | `CategoryRepository` | `database/Scripts/002_ItemModule.sql` |
| Units | `UnitsController` | `UnitService` | `UnitRepository` | `database/Scripts/002_ItemModule.sql` |
| Items | `ItemsController` | `ItemService` | `ItemRepository` | `database/Scripts/002_ItemModule.sql` |
| HRMS | `Controllers/HR/*` | `HrService` | `HrRepository` | `database/Scripts/HR/001_HRMS_Module.sql` |

## Deployment Architecture

```mermaid
flowchart TD
    Build["Docker build<br/>mcr.microsoft.com/dotnet/sdk:10.0"] --> Publish["dotnet publish Cosmos.API"]
    Publish --> Runtime["mcr.microsoft.com/dotnet/aspnet:10.0"]
    Runtime --> App["Cosmos.API.dll<br/>http://+:8080"]
    App --> Sql["External SQL Server"]
    Scripts["Manual SQL scripts"] --> Sql
```

Current deployment evidence:
- Dockerfile builds only the API publish artifact.
- Database scripts are separate and must be applied outside the container.
- Runtime environment defaults to Production and port 8080.
- No reverse proxy, Kubernetes, CI/CD, or database migration automation is present in the repository.

## Observability

- Serilog configured from appsettings and enriched from log context.
- Console and rolling file sink configured.
- Request duration logged through both Serilog request logging and custom request logging middleware.
- Correlation ID is added to logs and response header.
- Health endpoint exists at `/health`, but no SQL dependency health check is registered.

## Background Processing

No in-process background services, workers, queues, schedulers, SignalR hubs, gRPC services, or hosted services were found.
