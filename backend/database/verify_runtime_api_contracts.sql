/*
   Read-only pre-deployment check for the runtime contracts repaired in
   migrations/20260721_runtime_api_contract_fixes.sql.
*/
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

SELECT
    DB_NAME() AS DatabaseName,
    CAST(DATABASEPROPERTYEX(DB_NAME(), 'Version') AS INT) AS DatabaseVersion,
    @@VERSION AS SqlServerVersion;

IF OBJECT_ID(N'dbo.sp_PurchaseBill_GetListSummary', N'P') IS NULL
    THROW 51060, 'sp_PurchaseBill_GetListSummary is not deployed.', 1;

;WITH Expected AS
(
    SELECT * FROM (VALUES
        (N'@Search', N'nvarchar', 400),
        (N'@SupplierId', N'uniqueidentifier', 16),
        (N'@Status', N'int', 4),
        (N'@FromDate', N'date', 3),
        (N'@ToDate', N'date', 3)
    ) AS value(ParameterName, TypeName, MaxLength)
),
Actual AS
(
    SELECT p.name AS ParameterName, TYPE_NAME(p.user_type_id) AS TypeName, p.max_length AS MaxLength
    FROM sys.parameters p
    WHERE p.object_id = OBJECT_ID(N'dbo.sp_PurchaseBill_GetListSummary')
)
SELECT e.ParameterName AS ExpectedParameter, e.TypeName AS ExpectedType, a.TypeName AS ActualType, a.MaxLength AS ActualMaxLength
FROM Expected e
LEFT JOIN Actual a ON a.ParameterName = e.ParameterName
UNION ALL
SELECT a.ParameterName, NULL, a.TypeName, a.MaxLength
FROM Actual a
LEFT JOIN Expected e ON e.ParameterName = a.ParameterName
WHERE e.ParameterName IS NULL;

IF (SELECT COUNT(*) FROM sys.parameters WHERE object_id = OBJECT_ID(N'dbo.sp_PurchaseBill_GetListSummary')) <> 5
    THROW 51061, 'sp_PurchaseBill_GetListSummary must expose exactly five filter parameters.', 1;

IF EXISTS
(
    SELECT 1
    FROM (VALUES
        (N'@Search', N'nvarchar', 400),
        (N'@SupplierId', N'uniqueidentifier', 16),
        (N'@Status', N'int', 4),
        (N'@FromDate', N'date', 3),
        (N'@ToDate', N'date', 3)
    ) AS expected(ParameterName, TypeName, MaxLength)
    FULL JOIN
    (
        SELECT p.name AS ParameterName, TYPE_NAME(p.user_type_id) AS TypeName, p.max_length AS MaxLength
        FROM sys.parameters p
        WHERE p.object_id = OBJECT_ID(N'dbo.sp_PurchaseBill_GetListSummary')
    ) actual ON actual.ParameterName = expected.ParameterName
    WHERE expected.ParameterName IS NULL
       OR actual.ParameterName IS NULL
       OR expected.TypeName <> actual.TypeName
       OR expected.MaxLength <> actual.MaxLength
)
    THROW 51062, 'sp_PurchaseBill_GetListSummary parameter signature does not match the API contract.', 1;

IF OBJECT_ID(N'dbo.sp_Party_GetList', N'P') IS NULL
    THROW 51063, 'sp_Party_GetList is not deployed.', 1;

SELECT
    column_ordinal,
    name,
    system_type_name,
    is_nullable,
    error_number,
    error_message
INTO #PartyListMetadata
FROM sys.dm_exec_describe_first_result_set
(
    N'EXEC dbo.sp_Party_GetList @Search = NULL, @PageNumber = 1, @PageSize = 20, @SortBy = N''PartyName'', @SortDirection = N''ASC'', @IsActive = NULL, @PartyType = NULL, @HasGstin = NULL, @HasCreditLimit = NULL;',
    NULL,
    0
)
WHERE is_hidden = 0;

SELECT column_ordinal, name, system_type_name, is_nullable, error_number, error_message
FROM #PartyListMetadata
ORDER BY column_ordinal;

IF EXISTS (SELECT 1 FROM #PartyListMetadata WHERE error_number IS NOT NULL)
    THROW 51064, 'SQL Server could not describe the Party list result set.', 1;

IF (SELECT COUNT(*) FROM #PartyListMetadata) <> 16
    THROW 51065, 'sp_Party_GetList must return sixteen columns in its first result set.', 1;

IF EXISTS
(
    SELECT 1
    FROM (VALUES
        (1, N'Id', N'uniqueidentifier'),
        (2, N'PartyCode', N'nvarchar(50)'),
        (3, N'PartyName', N'nvarchar(200)'),
        (4, N'PartyType', N'nvarchar(10)'),
        (5, N'MobileNo', N'nvarchar(20)'),
        (6, N'Email', N'nvarchar(200)'),
        (7, N'GSTTreatment', N'int'),
        (8, N'GSTIN', N'nvarchar(20)'),
        (9, N'OpeningBalance', N'decimal(18,2)'),
        (10, N'OpeningBalanceType', N'int'),
        (11, N'CreditLimit', N'decimal(18,2)'),
        (12, N'CreditPeriodDays', N'int'),
        (13, N'IsActive', N'bit'),
        (14, N'CreatedOn', N'datetime2(3)'),
        (15, N'ModifiedOn', N'datetime2(3)'),
        (16, N'TotalCount', N'int')
    ) AS expected(column_ordinal, name, system_type_name)
    FULL JOIN #PartyListMetadata actual
        ON actual.column_ordinal = expected.column_ordinal
    WHERE expected.column_ordinal IS NULL
       OR actual.column_ordinal IS NULL
       OR expected.name <> actual.name
       OR expected.system_type_name <> actual.system_type_name
)
    THROW 51066, 'sp_Party_GetList result contract does not match the API materialization contract.', 1;

SELECT
    o.name AS ObjectName,
    o.modify_date AS LastModifiedUtc,
    CONVERT(varchar(64), HASHBYTES('SHA2_256', CONVERT(varbinary(max), OBJECT_DEFINITION(o.object_id))), 2) AS DefinitionSha256
FROM sys.objects o
WHERE o.object_id IN
(
    OBJECT_ID(N'dbo.sp_Party_GetList'),
    OBJECT_ID(N'dbo.sp_PurchaseBill_GetList'),
    OBJECT_ID(N'dbo.sp_PurchaseBill_GetListSummary'),
    OBJECT_ID(N'dbo.sp_HR_Employee_Update'),
    OBJECT_ID(N'dbo.sp_HR_Employee_Resign'),
    OBJECT_ID(N'dbo.sp_HR_Employee_Rejoin')
)
ORDER BY o.name;

IF OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NOT NULL
    SELECT MigrationId, ProductVersion FROM dbo.__EFMigrationsHistory ORDER BY MigrationId;
ELSE
    SELECT N'No database migration-history table is maintained by this Dapper deployment.' AS MigrationHistory;
