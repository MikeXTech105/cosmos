# Rojmel filters and totals — 17 September 2026

## Implemented in this update

- Preserved shared date-range presets and existing wallet, user, category, type and status filters.
- Added API-supported sorting for wallet lists and transaction/my-wallet lists.
- Added status filtering to the own-wallet ledger and non-admin transaction view.
- Expanded income/expense, category-expense and cash-flow report filters; added wallet selection to user-wallet balances (existing permission gating retained).
- Added amount/balance footer totals to Wallets, Transfers, Transactions, My Wallet, Rojmel tabular reports and dashboard wallet balances.
- Paginated totals explicitly say **Page total**. They recalculate from the returned rows, not from records on other pages.
- Cancelled transactions/transfers are excluded from amount totals. Transaction amount is a gross total, not net cash flow. Running balances are not added together.
- Monetary sums use integer paise to avoid ordinary floating-point accumulation errors.

## Verification

- 337 automated tests passed, including three new total-calculation tests.
- Targeted ESLint and production build passed.
- Filter parameters checked against the live Rojmel Swagger document.
- Authenticated browser/end-to-end API behaviour has not been verified in this update.

## Still needed / backend coordination

- All-pages filtered grand totals are not implemented. Prefer aggregate amounts in paginated API responses, computed with exactly the same filters and authorization scope. Current page totals must not be mistaken for these grand totals.
- Min/max amount, separate source/destination wallet filters and transfer sorting are not exposed by the inspected transfer/list API contracts; no misleading frontend-only page filters were added.
- Server behaviour for newly exposed report parameters still needs authenticated verification; shared Swagger parameters do not prove every report applies each parameter correctly.
- This is a scoped update, not a completion report for the earlier full ERP bug backlog.
