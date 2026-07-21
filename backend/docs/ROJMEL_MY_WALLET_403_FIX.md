# Rojmel My Wallet 403 Fix

## Incident and root cause

An authenticated normal user with `Rojmel.MyWallet/Create = true` could receive `403 Forbidden` from `POST /api/v1/rojmel/my-wallet/income` and `/expense`.

Both endpoints were decorated with two cumulative permission filters: `Rojmel.MyWallet/View` and `Rojmel.Transactions/Create`. The permission filter runs each attribute independently, so a user without `Rojmel.Transactions/Create` was denied before the self-service service method or wallet ownership checks ran.

## Correct authorization contract

| Route | Required permission | Scope |
|---|---|---|
| `GET /api/v1/rojmel/my-wallet*` | `Rojmel.MyWallet/View` | Current user's linked wallet only. |
| `POST /api/v1/rojmel/my-wallet/income` | `Rojmel.MyWallet/Create` | Current user's linked wallet only. |
| `POST /api/v1/rojmel/my-wallet/expense` | `Rojmel.MyWallet/Create` | Current user's linked wallet only. |
| `POST /api/v1/rojmel/transactions/{income|expense}` | `Rojmel.Transactions/Create` | General transaction routes; ownership/all-wallet SQL checks still apply. |

The self-service routes never accept a wallet ID. The application finds the linked wallet using the JWT `UserId` claim and passes that actor ID and the all-wallet scope to the stored procedure. The procedures independently reject a wallet that is not owned by the actor unless `Rojmel.Admin/View` grants all-wallet access.

## Wallet provisioning

The current Rojmel migration automatically creates the company wallet only. An administrator provisions a user wallet through the Wallets administration API with `WalletType = User`, the active COSMOS `LinkedUserId`, and `IsDefault = true`.

This was not the source of the reported 403: authorization failed before the wallet lookup. If a permitted user has no active linked wallet after the endpoint fix, the API returns HTTP 404 with `data.code = "ROJMEL_MY_WALLET_NOT_PROVISIONED"` and a setup instruction. It does not expose another user's wallet or return an unexplained 403.

Run `backend/database/verify_rojmel_my_wallet_403.sql` against the target database before deployment. It reports User 2's status, roles, effective Rojmel permissions, linked wallet count, duplicate/orphan user wallets, users with My Wallet access but not exactly one active wallet, and required schema/procedure/index presence. The script is read-only.

## Deployment and validation

This is an API-only authorization fix; no role-permission migration is required when the target user already has `Rojmel.MyWallet/Create`.

1. Back up and select the target database in SSMS.
2. Run `backend/database/migrations/20260720_rojmel_wallet_module.sql` first if Rojmel has not yet been installed.
3. Run `backend/database/verify_rojmel_my_wallet_403.sql`; remediate any reported missing/duplicate user wallet before enabling My Wallet for that user.
4. Deploy the API change and sign in again to obtain a current JWT.
5. Verify a user with `Rojmel.MyWallet/View = 1`, `Rojmel.MyWallet/Create = 1`, and `Rojmel.Transactions/Create = 0` can post own-wallet income and expense, cannot use general transaction creation, and cannot access another user's wallet.

Permission denials now emit structured warning logs containing correlation ID, user ID, method/path, page, and action. They do not log JWTs, request bodies, or credentials.
