# Project Module Map

## Audit basis

Static-source audit completed 11 September 2026. The solution is \`Cosmos.slnx\` and contains the \`Cosmos.API\`, \`Cosmos.Application\`, \`Cosmos.Contracts\`, \`Cosmos.Domain\`, \`Cosmos.Infrastructure\`, \`Cosmos.Persistence\`, \`Cosmos.Shared\`, and \`Cosmos.Tests\` projects. All projects target .NET 10 with nullable reference types enabled. The HTTP surface is controller-based (\`[ApiController]\` is inherited from \`ApiControllerBase\`, \`src/Cosmos.API/Controllers/ApiControllerBase.cs:6\`); the persistence path is Dapper plus SQL Server stored procedures (\`src/Cosmos.Persistence/Dapper/StoredProcedureExecutor.cs:10\`).

There is no \`DbContext\`, EF Core package/reference, model builder, \`IsRequired\`, or EF migration in the repository. SQL scripts in \`database/\` are therefore the schema/configuration authority available to this audit. The live database could not be authenticated, so this map describes repository artifacts, not a verified deployed schema.

| Module | Projects | Controllers | Services | Repositories | Main DB tables | Important APIs |
|---|---|---|---|---|---|---|
| Authentication | API, Application, Contracts, Infrastructure, Persistence | \`AuthController\` | \`AuthService\`, \`JwtTokenService\` | \`AuthRepository\`, \`UserRepository\` | \`Users\`, \`RefreshTokens\`, \`PasswordResetTokens\` | \`/api/auth/*\` |
| Security administration | API, Application, Contracts, Domain, Persistence | \`UsersController\`, \`RolesController\`, \`PagesController\`, \`PermissionsController\` | User/role/page/permission/system-owner services | corresponding security repositories | \`Users\`, \`Roles\`, \`Pages\`, \`UserRoles\`, \`RolePermissions\` | \`/api/users\`, \`/api/roles\`, \`/api/pages\`, \`/api/permissions\` |
| Master data | API, Application, Contracts, Domain, Persistence | categories, units, items, uploads | category/unit/item services | category/unit/item repositories | \`Categories\`, \`Units\`, \`Items\` | \`/api/categories\`, \`/api/units\`, \`/api/items\`, \`/api/uploads\` |
| Parties | API, Application, Contracts, Domain, Persistence | \`PartiesController\`, \`PartySettingsController\` | party services | party repositories | \`Parties\`, \`PartySettings\`, \`PartyLedgerEntries\` | \`/api/v1/parties\`, \`/api/v1/settings/party\` |
| Sales | API, Application, Contracts, Domain, Persistence | sales invoice/report controllers | sales and calculation services | sales repository | \`SalesInvoices\`, line/payment/stock tables | \`/api/v1/sales/*\` |
| Purchase and expense | API, Application, Contracts, Persistence | purchase, expense and supplier-payment controllers | \`PurchaseExpenseService\` | \`PurchaseExpenseRepository\` | purchase bills/orders/returns, expenses, payments | \`/api/purchase-*\`, \`/api/expenses\` |
| GST integration | API, Application, Contracts, Infrastructure, Persistence | GST controller set | GST and \`GstZenProviderService\` services | \`GstRepository\` | registration, session, e-way bill, e-invoice and log tables | \`/api/v1/gst/*\` |
| OEE | API, Application, Contracts, Persistence | OEE controller set | \`OeeService\` | \`OeeRepository\` | \`OeeMachines\`, \`OeeMoulds\`, reasons, entries | \`/api/v1/oee/*\` |
| Human resources | API, Application, Contracts, Domain, Persistence | HR controller set | \`HrService\` | \`HrRepository\` | \`HR_*\` tables | \`/api/hr/*\` |
| Dashboard | API, Application, Contracts, Persistence | \`DashboardController\` | \`DashboardService\` | \`DashboardRepository\` | reporting procedures | \`/api/v1/dashboard/*\` |
| Reports | API, Application, Contracts, Persistence | report controllers and sales/purchase reports | reports services | report repositories | reporting procedures | \`/api/v1/reports/*\` |
| Procurement planning | API, Application, Contracts, Persistence | procurement-planning controllers | planning/calculation/spreadsheet services | \`ProcurementPlanningRepository\` | \`Procurement*\`, \`ProductBomComponents\`, \`SalesChannels\` | \`/api/v1/procurement-planning/*\` |
| Supply chain foundation | API, Application, Contracts, Persistence | supply-chain controllers | \`SupplyChainService\` | \`SupplyChainRepository\` | warehouse, package/profile and import tables | \`/api/v1/supply-chain/*\` |
| Dispatch planning | API, Application, Contracts, Persistence | dispatch-planning controllers | planning/calculation/allocation services | \`DispatchPlanningRepository\` | \`Dispatch*\` tables | \`/api/v1/dispatch-planning/*\` |
| Shipment operations | API, Application, Contracts, Domain, Persistence | shipment-operations controllers | shipment, packing and status services | \`ShipmentOperationsRepository\` | \`Shipments\` and related \`Shipment*\` tables | \`/api/v1/shipment-operations/*\` |
| Data Book | API, Application, Contracts, Persistence | \`DataBookEntriesController\` | \`DataBookService\` | \`DataBookRepository\` | \`DataBookEntries\`, history | \`/api/v1/data-book/entries/*\` |
| Activity logs | API, Application, Contracts, Persistence | \`ActivityLogsController\` | \`ActivityLogService\` | \`AuditRepository\` | \`AuditLogs\`, \`vw_ActivityLogs\` | \`/api/v1/activity-logs/*\` |
| Website management | API, Application, Contracts, Domain, Infrastructure, Persistence | management controllers | product/blog/announcement/warranty/settings services | \`WebsiteManagementRepository\` | website product/blog/warranty/settings tables | \`/api/v1/website-management/*\` |
| Public website | API, Application, Contracts, Infrastructure, Persistence | \`PublicWebsiteController\` | contact/warranty/public-content services | \`WebsiteManagementRepository\` | public website tables and upload storage | \`/api/website/*\` |
| Rojmel / wallet | API, Application, Contracts, Domain, Persistence | Rojmel controllers | wallet/transaction/transfer/report services | \`RojmelRepository\` | \`Wallets\`, categories, transactions, transfers | \`/api/v1/rojmel/*\` |

## Cross-cutting components

\`Program.cs\` registers controllers, FluentValidation discovery, Dapper persistence, JWT authentication, CORS, Swagger, rate limiting, health checks and middleware. The request pipeline applies correlation, exception, request/audit and JWT-claims middleware before controller execution (\`src/Cosmos.API/Program.cs:79-264\`). No hosted service, message consumer, queue worker, or background job implementation was found by the repository-wide source inventory.

