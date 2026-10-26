# COSMOS ERP

## Documentation

Start with the [enterprise documentation portal](docs/README.md). It consolidates architecture, status, modules, API/data contracts, operations, QA and risk, and maintains an [evidence register](docs/DOCUMENT_REGISTER.md) for historical files.


Enterprise ERP project using **ASP.NET Core .NET 10**, **Dapper / SQL Server** and a **React/Vite** frontend.

## Source code
- [Backend solution](backend/Cosmos.slnx) — Web API, services, repositories and tests under `backend/src/` and `backend/tests/`.
- [SQL assets](backend/database/) — setup, ordered migrations, verification and staging scripts. Apply only using the documented deployment plan and after database backup.
- [Frontend](frontend/) — React/Vite UI and runtime API configuration.
- [Deployment workflow](.github/workflows/deploy.yml) and [Docker Compose](docker-compose.yml) — review environment/secrets before use.

## Project documentation
- [Repository structure and cleanup policy](docs/REPOSITORY_STRUCTURE.md)
- [Repository audit, 2026-10-26](docs/COSMOS_REPOSITORY_AUDIT_2026-10-26.md)
- [Historical project progress](docs/PROJECT_PROGRESS.md)
- [Backend progress updates](backend/docs/PROJECT_PROGRESS.md)
- [QA evidence](qa-reports/)

## Local verification
Backend (requires .NET 10 SDK and restored dependencies):

```bash
dotnet restore backend/Cosmos.slnx
dotnet build backend/Cosmos.slnx --no-restore
dotnet test backend/Cosmos.slnx --no-build
```

Frontend (requires compatible Node.js/npm as defined by the project dependencies):

```bash
cd frontend
npm ci
npm run lint
npm test
npm run build
```

Do not interpret these commands as proof they passed; the repository structure cleanup did not execute them. SQL integration verification also requires a disposable SQL Server database and the correct ordered migrations.

**Security:** Do not use committed sample credentials for deployment. Rotate previously committed keys and supply configuration through a secret manager or secured environment injection.
