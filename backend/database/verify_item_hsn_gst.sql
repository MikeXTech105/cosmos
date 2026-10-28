SET NOCOUNT ON;

SELECT DB_NAME() AS DatabaseName, @@SERVERNAME AS ServerName;
SELECT c.name AS ColumnName, t.name AS SqlType, c.max_length AS MaxLength, c.is_nullable AS IsNullable
FROM sys.columns AS c
INNER JOIN sys.types AS t ON t.user_type_id = c.user_type_id
WHERE c.object_id = OBJECT_ID(N'dbo.Items') AND c.name IN (N'HSNCode', N'GSTRate');

SELECT
    COUNT(*) AS ItemCount,
    SUM(CASE WHEN NULLIF(LTRIM(RTRIM(HSNCode)), N'') IS NULL THEN 1 ELSE 0 END) AS MissingHsnCount,
    SUM(CASE WHEN GSTRate < 0 OR GSTRate > 100 THEN 1 ELSE 0 END) AS InvalidGstRateCount
FROM dbo.Items;

IF OBJECT_ID(N'dbo.ItemHsnGstConsolidationRecovery', N'U') IS NOT NULL
    SELECT ConflictStatus, COUNT(*) AS RecordCount
    FROM dbo.ItemHsnGstConsolidationRecovery
    GROUP BY ConflictStatus;

IF OBJECT_ID(N'dbo.SalesInvoiceItems', N'U') IS NOT NULL
    SELECT COUNT(*) AS HistoricalInvoiceLineCount, COUNT(HsnSacCodeSnapshot) AS HistoricalInvoiceHsnSnapshotCount
    FROM dbo.SalesInvoiceItems;
