# Rojmel / Wallet Implementation Tracker

| Area | Status | Notes |
|---|---|---|
| Contracts/domain | Implemented | Rojmel DTOs, enums, permission constants. |
| Application services | Implemented | Wallet, transaction, transfer, dashboard, report services plus ownership scope. |
| Persistence | Implemented | Dapper repository calls the wallet procedures. |
| API/Swagger | Implemented | Six permission-protected controller surfaces in group `rojmel`. |
| Migration | Added | `20260720_rojmel_wallet_module.sql`; idempotent tables, indexes, seeds, pages, permissions, procedures. |
| Tests | Added | Rules, balance/transfer/report exclusions, Dapper contract mapping, controller permission metadata. |
| Build/test | Verified | `dotnet build Cosmos.slnx --no-restore -m:1` passed; `dotnet test tests/Cosmos.Tests/Cosmos.Tests.csproj --no-build --no-restore -m:1` passed 112/112. |
| Live database validation | Verified on disposable local SQL Server | Canonical setup plus migration rerun passed. Income, expense rejection, transfer, ownership filtering, report exclusion, and reversal smoke tests passed; the temporary database was removed. |
| Export | Pending | Permission seeded; no fake endpoint added. |

## Added/changed files

- `Cosmos.Contracts/Rojmel/RojmelDtos.cs`
- `Cosmos.Contracts/Rojmel/RojmelEnums.cs`, `Cosmos.Domain/Security/RojmelPermissions.cs`
- `Cosmos.Application/Rojmel/*`, `Services/RojmelServices.cs`, validators, DI registration
- `Cosmos.Persistence/Repositories/RojmelRepository.cs`, DI registration
- `Cosmos.API/Controllers/Rojmel/RojmelControllers.cs`, Swagger registration
- `Cosmos.Tests/Rojmel/*`
- The migration and these three documentation files

## Required live SQL smoke tests

1. Apply the migration twice to a disposable database.
2. Create a user wallet and an external wallet; verify the single company wallet constraint.
3. Create income, expense, and a company-to-user transfer; verify source/destination balances and linked `TransferOut`/`TransferIn` rows.
4. Attempt an over-balance expense and transfer; expect a conflict and unchanged balances.
5. Query as a normal user and confirm all list/detail/report procedures return only the linked wallet.
6. Query as a Rojmel administrator and confirm global dashboard/report visibility.

## Verification executed

- `dotnet build Cosmos.slnx --no-restore -m:1` — passed (one pre-existing `Microsoft.OpenApi` NU1903 advisory warning).
- `dotnet test tests/Cosmos.Tests/Cosmos.Tests.csproj --no-build --no-restore -m:1` — passed, 112/112.
- Created `Cosmos_Rojmel_Verify_20260720` on local SQL Server, applied `001_Full_Database_Setup.sql`, then applied the Rojmel migration three times successfully.
- Smoke verification: company income 100, company-to-external transfer 40 produced one `TransferOut` and one `TransferIn`, balances became 60/40, an expense of 50 returned 409, normal-user list returned only the linked wallet, income/expense remained 100/0 with transfer amount 40 excluded, and both reversal procedures restored balances to zero.
- The temporary verification database was removed after testing.
