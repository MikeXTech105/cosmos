# HSN/GST consolidation test report

| Check | Result |
|---|---|
| `dotnet build backend/Cosmos.slnx --no-restore` | Passed; package warnings only. |
| `dotnet test backend/Cosmos.slnx --no-build --no-restore` | 351 passed, 1 skipped, 1 failed because `COSMOS_DISPATCH_INTEGRATION_CONNECTION_STRING` is absent. |
| Frontend lint | Passed. |
| Focused GST/item/invoice Vitest tests | Passed: 18 tests across 4 files. |
| Frontend production build | Passed. |
| Full frontend Vitest suite | 576 passed; 3 pre-existing HR validation failures in `src/utils/validationRules.test.js`. |
| SQL verification | Not run: no configured or explicitly authorised SQL Server environment. |

No SQL Server connection string is configured in the committed settings, so no environment, backup, migration run, reconciliation count, or destructive schema operation is claimed here.
