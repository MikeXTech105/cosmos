/*
    Read-only deployment verification for the Rojmel My Wallet authorization fix.
    Run against the selected staging/production database in SSMS. It makes no data
    changes. @UserId defaults to the reported normal-user incident account.
*/
SET NOCOUNT ON;
GO

DECLARE @UserId INT = 2;

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Roles', N'U') IS NULL
   OR OBJECT_ID(N'dbo.UserRoles', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Pages', N'U') IS NULL
   OR OBJECT_ID(N'dbo.RolePermissions', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Wallets', N'U') IS NULL
   OR OBJECT_ID(N'dbo.vw_UserEffectivePermissions', N'V') IS NULL
BEGIN
    THROW 51090, 'Required Rojmel wallet or permission objects are missing. Apply the canonical setup and Rojmel migration before verification.', 1;
END;

SELECT
    u.Id AS UserId,
    u.Username,
    u.IsActive,
    u.IsDeleted,
    u.IsSystemUser
FROM dbo.Users AS u
WHERE u.Id = @UserId;

SELECT
    r.Id AS RoleId,
    r.Name AS RoleName,
    r.IsActive AS RoleIsActive,
    r.IsSystemRole
FROM dbo.UserRoles AS ur
JOIN dbo.Roles AS r ON r.Id = ur.RoleId
WHERE ur.UserId = @UserId
ORDER BY r.Name;

;WITH ExpectedPages AS
(
    SELECT PageName
    FROM (VALUES
        (N'Rojmel.MyWallet'),
        (N'Rojmel.Transactions'),
        (N'Rojmel.Wallets'),
        (N'Rojmel.Transfers'),
        (N'Rojmel.Dashboard'),
        (N'Rojmel.Reports'),
        (N'Rojmel.Admin')
    ) AS pages(PageName)
)
SELECT
    expected.PageName,
    p.Id AS PageId,
    p.IsActive AS PageIsActive,
    effective.CanView,
    effective.CanCreate,
    effective.CanEdit,
    effective.CanDelete,
    effective.CanExport,
    effective.CanApprove
FROM ExpectedPages AS expected
LEFT JOIN dbo.Pages AS p ON p.Name = expected.PageName
LEFT JOIN dbo.vw_UserEffectivePermissions AS effective
    ON effective.UserId = @UserId
   AND effective.PageName = expected.PageName
ORDER BY expected.PageName;

/* The expected incident matrix is MyWallet/Create = 1 and Transactions/Create = 0. */
SELECT
    p.Name AS PageName,
    CAST(MAX(CAST(rp.CanView AS INT)) AS BIT) AS CanView,
    CAST(MAX(CAST(rp.CanCreate AS INT)) AS BIT) AS CanCreate,
    CAST(MAX(CAST(rp.CanEdit AS INT)) AS BIT) AS CanEdit,
    CAST(MAX(CAST(rp.CanDelete AS INT)) AS BIT) AS CanDelete,
    CAST(MAX(CAST(rp.CanExport AS INT)) AS BIT) AS CanExport,
    CAST(MAX(CAST(rp.CanApprove AS INT)) AS BIT) AS CanApprove
FROM dbo.Users AS u
JOIN dbo.UserRoles AS ur ON ur.UserId = u.Id
JOIN dbo.Roles AS r ON r.Id = ur.RoleId AND r.IsActive = 1 AND r.IsSystemRole = 0
JOIN dbo.RolePermissions AS rp ON rp.RoleId = r.Id
JOIN dbo.Pages AS p ON p.Id = rp.PageId AND p.IsActive = 1
WHERE u.Id = @UserId
  AND u.IsActive = 1
  AND u.IsDeleted = 0
  AND u.IsSystemUser = 0
  AND p.Name IN (N'Rojmel.MyWallet', N'Rojmel.Transactions')
GROUP BY p.Name
ORDER BY p.Name;

SELECT
    u.Id AS UserId,
    COUNT_BIG(w.Id) AS ActiveUserWalletCount,
    CAST(IIF(COUNT_BIG(w.Id) = 1, 1, 0) AS BIT) AS HasExactlyOneActiveUserWallet
FROM dbo.Users AS u
LEFT JOIN dbo.Wallets AS w
    ON w.LinkedUserId = u.Id
   AND w.WalletType = 2
   AND w.IsActive = 1
   AND w.IsDeleted = 0
WHERE u.Id = @UserId
GROUP BY u.Id;

SELECT
    w.Id AS WalletId,
    w.WalletCode,
    w.WalletType,
    w.LinkedUserId,
    w.IsDefault,
    w.IsActive,
    w.IsDeleted,
    w.CurrentBalance
FROM dbo.Wallets AS w
WHERE w.LinkedUserId = @UserId
ORDER BY w.IsDeleted, w.IsActive DESC, w.IsDefault DESC, w.Id;

/* Active personal-wallet duplicates violate the My Wallet operational invariant. */
SELECT
    w.LinkedUserId,
    COUNT_BIG(*) AS ActiveUserWalletCount
FROM dbo.Wallets AS w
WHERE w.WalletType = 2
  AND w.IsActive = 1
  AND w.IsDeleted = 0
GROUP BY w.LinkedUserId
HAVING COUNT_BIG(*) > 1;

/* A user wallet must always reference an existing COSMOS user. */
SELECT
    w.Id AS WalletId,
    w.WalletCode,
    w.LinkedUserId,
    w.IsActive,
    w.IsDeleted
FROM dbo.Wallets AS w
LEFT JOIN dbo.Users AS u ON u.Id = w.LinkedUserId
WHERE w.WalletType = 2
  AND w.LinkedUserId IS NOT NULL
  AND u.Id IS NULL;

/* Users who can open or post to My Wallet should each have one active user wallet. */
;WITH MyWalletUsers AS
(
    SELECT effective.UserId
    FROM dbo.vw_UserEffectivePermissions AS effective
    WHERE effective.PageName = N'Rojmel.MyWallet'
      AND (effective.CanView = 1 OR effective.CanCreate = 1)
)
SELECT
    accessUser.UserId,
    COUNT_BIG(w.Id) AS ActiveUserWalletCount
FROM MyWalletUsers AS accessUser
LEFT JOIN dbo.Wallets AS w
    ON w.LinkedUserId = accessUser.UserId
   AND w.WalletType = 2
   AND w.IsActive = 1
   AND w.IsDeleted = 0
GROUP BY accessUser.UserId
HAVING COUNT_BIG(w.Id) <> 1;

SELECT
    required.RequiredObject,
    CAST(IIF(OBJECT_ID(required.RequiredObject, required.ObjectType) IS NULL, 0, 1) AS BIT) AS ExistsInDatabase
FROM (VALUES
    (N'dbo.Wallets', N'U'),
    (N'dbo.WalletCategories', N'U'),
    (N'dbo.WalletTransactions', N'U'),
    (N'dbo.WalletTransfers', N'U'),
    (N'dbo.vw_UserEffectivePermissions', N'V'),
    (N'dbo.usp_Wallet_GetMyWallet', N'P'),
    (N'dbo.usp_WalletTransaction_CreateIncome', N'P'),
    (N'dbo.usp_WalletTransaction_CreateExpense', N'P'),
    (N'dbo.sp_Permission_UserHasAccess', N'P')
) AS required(RequiredObject, ObjectType)
ORDER BY required.RequiredObject;

SELECT
    required.IndexName,
    CAST(IIF(indexes.IndexName IS NULL, 0, 1) AS BIT) AS ExistsInDatabase,
    indexes.FilterDefinition
FROM (VALUES
    (N'UX_Wallets_OnePrimaryUserWallet'),
    (N'IX_Wallets_UserAccess')
) AS required(IndexName)
LEFT JOIN
(
    SELECT i.name AS IndexName, i.filter_definition AS FilterDefinition
    FROM sys.indexes AS i
    WHERE i.object_id = OBJECT_ID(N'dbo.Wallets')
) AS indexes ON indexes.IndexName = required.IndexName
ORDER BY required.IndexName;
