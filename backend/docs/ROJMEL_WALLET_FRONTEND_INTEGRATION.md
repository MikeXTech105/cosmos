# Rojmel / Wallet Frontend Integration

## Menu and roles

Create a Rojmel parent menu with Dashboard, My Wallet, Wallets, Transactions, Transfers, and Reports pages. Hide each page/action using the corresponding returned page permissions; do not rely on that hiding for security.

| Page permission | Normal-user experience | Administrator experience |
|---|---|---|
| `Rojmel.MyWallet` | `View` opens own balance, transactions, ledger, and categories; `Create` enables own income/expense forms. | Optional own-wallet shortcut. |
| `Rojmel.Wallets` | Not shown. | Create/edit/deactivate user and external wallets; company wallet is protected. |
| `Rojmel.Transactions` | Not required for My Wallet. Do not show the general transaction workspace unless explicitly granted. | Any accessible wallet, adjustments, cancellation. |
| `Rojmel.Transfers` | Only explicitly granted own-to-own transfers. | Company/user/external wallet transfers and reversals. |
| `Rojmel.Dashboard`, `Rojmel.Reports` | Own-wallet scoped results. | Global data when `Rojmel.Admin/View` is granted. |

Actions use the standard `View`, `Create`, `Edit`, `Delete`, `Approve`, and `Export` permission flags. `Rojmel.Admin/View` is the all-wallet visibility grant.

## Endpoint map

| Purpose | Endpoint |
|---|---|
| Current user wallet | `GET /api/v1/rojmel/my-wallet` |
| Current user entries / ledger | `GET /api/v1/rojmel/my-wallet/transactions`, `GET /api/v1/rojmel/my-wallet/ledger` |
| Own wallet income / expense | `POST /api/v1/rojmel/my-wallet/income`, `POST /api/v1/rojmel/my-wallet/expense` |
| Wallet management | `GET/POST /api/v1/rojmel/wallets`, `GET/PUT /api/v1/rojmel/wallets/{id}`, `PATCH /api/v1/rojmel/wallets/{id}/status` |
| Ledger operations | `GET /api/v1/rojmel/transactions`, `POST /income`, `POST /expense`, `POST /adjustment`, `POST /{id}/cancel` |
| Transfers | `GET/POST /api/v1/rojmel/transfers`, `GET /{id}`, `POST /{id}/cancel` |
| Dashboard | `GET /api/v1/rojmel/dashboard/summary`, `/wallet-balances`, `/recent-transactions` |
| Reports | `GET /api/v1/rojmel/reports/{wallet-ledger|all-transactions|income-expense|category-wise-expense|transfers|daily-cash-flow|user-wallet-balances}` |

`GET /api/v1/rojmel/my-wallet/categories?categoryType=1|2` provides active income/expense categories.

Self-service posts require `Rojmel.MyWallet/Create`; they do not require `Rojmel.Transactions/Create`. Do not send a wallet ID to either My Wallet post endpoint. If the user has not been linked to an active user wallet, the GET or post responds with HTTP 404 and `data.code = "ROJMEL_MY_WALLET_NOT_PROVISIONED"`; show the setup message rather than treating it as a permissions error.

## Filters and widgets

Ledger/report list filters support `fromDate`, `toDate`, `walletId`, `linkedUserId`, `categoryId`, `transactionType`, `status`, `search`, `pageNumber`, and `pageSize`. Render only filters appropriate to the current role; the backend will ignore inaccessible rows.

Dashboard widgets: current balance, period income, period expense, net income/expense, recent transactions, user wallet balances, and category expense breakdown. Treat `totalTransfers`, `transfersExcluded`, `adjustmentsExcluded`, and `openingBalancesExcluded` as informational metrics—not revenue or cost.

## UX rules

- Always label transfers as a movement, never as income or expense.
- Do not offer a normal user another wallet ID in forms, URLs, or selectors.
- Show cancellation as a reversal workflow and require a reason. Do not call a DELETE endpoint.
- Block a transfer where source equals destination; show the API’s insufficient-balance conflict without optimistic balance mutation.
- Refresh the wallet balance and ledger after a posted movement or reversal.
