# Rojmel / Wallet Module

## Purpose

Rojmel is the cash-wallet ledger for operational cash movements. It is separate from the Purchase/Expense business module: a Rojmel expense changes a cash wallet balance; it does not create a supplier expense record, tax record, or inventory movement.

## Wallets and entries

- `Company`: exactly one protected master company wallet, seeded by the migration.
- `User`: a wallet linked to a COSMOS login user. Operationally, every My Wallet-enabled user must have exactly one active user wallet; the migration enforces one active default wallet and the deployment verification script reports additional active user-wallet duplicates.
- `External`, `PettyCash`, and `BankCash`: administrator-managed wallets with no login-user link.
- `Income` and `Expense`: affect the wallet balance and income/expense reporting.
- `TransferIn` and `TransferOut`: linked balance movements only; they never contribute to income or expense totals.
- `OpeningBalance`, `AdjustmentIn`, and `AdjustmentOut`: separately typed, auditable movements. They are excluded from income/expense totals.

Negative balances are blocked. Posted transactions and transfers are never physically deleted. Cancelling creates a reversal entry and retains the cancelled original for audit history.

## Visibility and permissions

Every endpoint uses a page/action `RequirePermission` check. Service calls additionally evaluate `Rojmel.Admin/View`; without it, SQL procedures accept only wallets whose `LinkedUserId` equals the authenticated user ID. The SQL procedures receive both the actor ID and all-wallet flag, so query-string filters cannot bypass ownership.

Normal users can view their primary wallet and its ledger with `Rojmel.MyWallet/View`, and may create own-wallet income/expense entries with `Rojmel.MyWallet/Create`. The self-service endpoints do not require `Rojmel.Transactions/Create`; that permission remains for the general transaction workspace. Transfers require `Rojmel.Transfers/Create`; without all-wallet access both source and destination must belong to the current user. Wallet creation, adjustment, status changes, and cancellation are administrator operations.

## Database

Migration: `backend/database/migrations/20260720_rojmel_wallet_module.sql`. The migration automatically seeds the company wallet only. An administrator must create and link each active user wallet before granting My Wallet access. Use `backend/database/verify_rojmel_my_wallet_403.sql` to report missing, duplicate, and orphaned wallet links before deployment.

Tables: `Wallets`, `WalletCategories`, `WalletTransactions`, and `WalletTransfers`. The migration provides filtered unique indexes for wallet code, the single company wallet, and each active user’s default wallet. Transaction and transfer procedures use `UPDLOCK, HOLDLOCK`, explicit transactions, and consistent wallet lock ordering for balance-changing transfers.

## API groups

Swagger group: `rojmel`.

- My wallet: `/api/v1/rojmel/my-wallet`
- Wallet administration: `/api/v1/rojmel/wallets`
- Transactions: `/api/v1/rojmel/transactions`
- Transfers: `/api/v1/rojmel/transfers`
- Dashboard: `/api/v1/rojmel/dashboard`
- Reports: `/api/v1/rojmel/reports`

## Dashboard and reports

The summary exposes company/total balances, income, expense, transfers, active-wallet count, and date range. Wallet balance and recent-entry widgets are scoped exactly like the ledger.

Reports include wallet ledger, all transactions, income/expense, category-wise expense, transfers, daily cash flow, and user wallet balances. Income/expense and daily cash-flow reports use only posted `Income` and `Expense` transaction types.

## Phase 1 limits / Phase 2

- Categories are seeded and read-only; category administration is intentionally not exposed yet.
- No attachment storage or export file endpoints are included. `Export` permission is seeded for future implementation.
- There is no approval/draft workflow; new movements are posted immediately.
- The migration was verified on a fresh disposable local SQL Server database; target-environment deployment and representative concurrency validation remain required before production use.
