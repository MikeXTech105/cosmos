# Cosmos.API RBAC Backend

Cosmos.API is a production-oriented ASP.NET Core 10 Web API backend for RBAC authentication and authorization. It uses PostgreSQL UUID tables, Dapper-only data access, PostgreSQL functions for database operations, JWT authentication, FluentValidation, Serilog, Swagger/OpenAPI, centralized exception handling, soft delete, audit columns, pagination, filtering, sorting, CORS, health checks, and rate limiting.

## Architecture

```text
src/
  Cosmos.API              HTTP API, controllers, Swagger, auth policies, middleware
  Cosmos.Application      DTOs, validators, service and repository abstractions
  Cosmos.Domain           Entities and common domain models
  Cosmos.Infrastructure   Dapper repositories, PostgreSQL connection, JWT, services
  Cosmos.Shared           API response, pagination, constants, exceptions

Database/
  Tables                  PostgreSQL schema scripts
  Functions               PostgreSQL CRUD/auth/permission functions
  Indexes                 Unique and lookup indexes
  Seed                    Master admin and startup seed scripts
```

## Prerequisites

- .NET SDK 10
- PostgreSQL 15 or newer
- `psql` command line tools

## Database Setup

Create the database:

```powershell
createdb -U postgres cosmos_staging
```

Run scripts in this order from the repository root:

```powershell
psql -U postgres -d cosmos_staging -f Database/Tables/001_initial_schema.sql
psql -U postgres -d cosmos_staging -f Database/Indexes/001_indexes.sql
psql -U postgres -d cosmos_staging -f Database/Functions/001_common_helpers.sql
psql -U postgres -d cosmos_staging -f Database/Functions/010_auth_functions.sql
psql -U postgres -d cosmos_staging -f Database/Functions/020_role_user_functions.sql
psql -U postgres -d cosmos_staging -f Database/Functions/030_navigation_functions.sql
psql -U postgres -d cosmos_staging -f Database/Functions/040_permission_functions.sql
psql -U postgres -d cosmos_staging -f Database/Seed/001_seed_master_admin.sql
```

Seeded administrator:

- Email: `admin@cosmos.com`
- Password: `Admin@123`
- Role: `MASTER_ADMIN`

## Configuration

Update [appsettings.json](D:/Work/My_Projects/cosmos/backend/src/Cosmos.API/appsettings.json) or use environment variables:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=cosmos_rbac;Username=postgres;Password=postgres"
  },
  "Jwt": {
    "Issuer": "Cosmos.API",
    "Audience": "Cosmos.Client",
    "SigningKey": "replace-with-a-long-production-secret",
    "AccessTokenMinutes": 30,
    "RefreshTokenDays": 7
  }
}
```

Production examples are in [appsettings.Production.example.json](D:/Work/My_Projects/cosmos/backend/src/Cosmos.API/appsettings.Production.example.json). Store production secrets in a vault or secret manager, not in source control.

## Run The API

```powershell
dotnet restore Cosmos.slnx
dotnet build Cosmos.slnx
dotnet run --project src/Cosmos.API/Cosmos.API.csproj
```

Swagger UI:

```text
https://localhost:<port>/swagger
```

Health check:

```text
GET /health
```

## Main Endpoints

- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET|POST|PUT|DELETE /api/roles`
- `GET|POST|PUT|PATCH|DELETE /api/users`
- `GET|POST|PUT|DELETE /api/pages`
- `GET|POST|PUT|DELETE /api/sections`
- `GET|POST|PUT|DELETE /api/fields`
- `GET|PUT /api/permissions/roles/{roleId}`

All secured endpoints return the standardized response wrapper:

```json
{
  "success": true,
  "message": "Data fetched successfully",
  "data": {},
  "errors": []
}
```

## Permission Model

Permissions are role scoped and can target a page, section, or field. PostgreSQL generates base permission keys such as:

- `USERS_PAGE`
- `USER_FORM`
- `SALARY_FIELD`

The API expands permission levels into keys such as:

- `USERS_PAGE_VIEW`
- `USERS_PAGE_CREATE`
- `USERS_PAGE_EDIT`
- `USERS_PAGE_DELETE`
- `USERS_PAGE_FULL_ACCESS`

Controllers use:

```csharp
[HasPermission("USERS_PAGE_VIEW")]
```

`MASTER_ADMIN` is also allowed by the authorization handler and is seeded with full page permissions.

## Coding Standards

- Controllers are thin and return `ApiResponse<T>`.
- Business rules live in services.
- Persistence is isolated behind repository interfaces.
- All database calls use Dapper and PostgreSQL functions.
- All request DTOs are validated with FluentValidation.
- All tables use UUID primary keys, soft delete, and audit columns.
- Exceptions are converted centrally by middleware.
- Logs are written through Serilog to console and `logs/`.

## Postman

Import [Cosmos.API.postman_collection.json](D:/Work/My_Projects/cosmos/backend/Postman/Cosmos.API.postman_collection.json). Run `Login` first; the collection stores `accessToken` and `refreshToken` variables automatically.
