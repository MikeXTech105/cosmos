/*
  COSMOS ERP: canonical item HSN/GST consolidation

  This script is intentionally safe by default. It never drops the old
  classification tables or changes live item data unless an operator changes
  @ApplyItemHsnBackfill after reviewing the result set and taking a backup.
  Historical invoice and GST calculation snapshots are never updated.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @ApplyItemHsnBackfill BIT = 0; -- requires an approved non-production/production change

IF OBJECT_ID(N'dbo.Items', N'U') IS NULL
    THROW 51000, 'Items table was not found; consolidation was not applied.', 1;
IF COL_LENGTH(N'dbo.Items', N'HSNCode') IS NULL OR COL_LENGTH(N'dbo.Items', N'GSTRate') IS NULL
    THROW 51001, 'Items.HSNCode and Items.GSTRate are required before consolidation.', 1;

IF OBJECT_ID(N'dbo.ItemHsnOverrides', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.HsnSacMasters', N'U') IS NOT NULL
BEGIN
    IF OBJECT_ID(N'dbo.ItemHsnGstConsolidationRecovery', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.ItemHsnGstConsolidationRecovery
        (
            Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ItemHsnGstConsolidationRecovery PRIMARY KEY,
            CapturedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ItemHsnGstConsolidationRecovery_CapturedAtUtc DEFAULT SYSUTCDATETIME(),
            ItemId BIGINT NOT NULL,
            ItemHsnCode NVARCHAR(50) NULL,
            ItemGstRate DECIMAL(18,4) NULL,
            ClassificationHsnCode NVARCHAR(50) NULL,
            ClassificationSource NVARCHAR(40) NULL,
            ConflictStatus NVARCHAR(40) NOT NULL,
            CONSTRAINT UX_ItemHsnGstConsolidationRecovery UNIQUE(ItemId, ClassificationHsnCode, ClassificationSource)
        );
    END;

    ;WITH CurrentClassification AS
    (
        SELECT i.Id AS ItemId, i.HSNCode AS ItemHsnCode, i.GSTRate AS ItemGstRate,
               h.Code AS ClassificationHsnCode, m.ClassificationSource,
               ROW_NUMBER() OVER (PARTITION BY i.Id ORDER BY SourcePriority, EffectiveFrom DESC, MappingId DESC) AS RowNumber
        FROM dbo.Items AS i
        INNER JOIN
        (
            SELECT ItemId, HsnSacId, EffectiveFrom, Id AS MappingId, 1 AS SourcePriority, N'ItemHsnOverride' AS ClassificationSource
            FROM dbo.ItemHsnOverrides
            WHERE EffectiveFrom <= CONVERT(date, SYSUTCDATETIME())
              AND (EffectiveTo IS NULL OR EffectiveTo >= CONVERT(date, SYSUTCDATETIME()))
            UNION ALL
            SELECT i2.Id, m.HsnSacId, m.EffectiveFrom, m.Id, 2, N'CategoryHsnDefault'
            FROM dbo.Items AS i2
            INNER JOIN dbo.CategoryHsnDefaults AS m ON m.CategoryId = i2.CategoryId
            WHERE m.EffectiveFrom <= CONVERT(date, SYSUTCDATETIME())
              AND (m.EffectiveTo IS NULL OR m.EffectiveTo >= CONVERT(date, SYSUTCDATETIME()))
        ) AS m ON m.ItemId = i.Id
        INNER JOIN dbo.HsnSacMasters AS h ON h.Id = m.HsnSacId
        WHERE h.IsDeleted = 0 AND h.IsActive = 1
    )
    INSERT dbo.ItemHsnGstConsolidationRecovery
        (ItemId, ItemHsnCode, ItemGstRate, ClassificationHsnCode, ClassificationSource, ConflictStatus)
    SELECT ItemId, ItemHsnCode, ItemGstRate, ClassificationHsnCode, ClassificationSource,
           CASE WHEN NULLIF(LTRIM(RTRIM(ItemHsnCode)), N'') IS NULL THEN N'ItemHsnMissing'
                WHEN ItemHsnCode = ClassificationHsnCode THEN N'Match'
                ELSE N'ConflictRequiresReview' END
    FROM CurrentClassification
    WHERE RowNumber = 1
      AND NOT EXISTS
      (
          SELECT 1 FROM dbo.ItemHsnGstConsolidationRecovery AS r
          WHERE r.ItemId = CurrentClassification.ItemId
            AND r.ClassificationHsnCode = CurrentClassification.ClassificationHsnCode
            AND r.ClassificationSource = CurrentClassification.ClassificationSource
      );

    IF @ApplyItemHsnBackfill = 1
    BEGIN
        BEGIN TRANSACTION;
        UPDATE i
        SET HSNCode = r.ClassificationHsnCode
        FROM dbo.Items AS i
        INNER JOIN dbo.ItemHsnGstConsolidationRecovery AS r ON r.ItemId = i.Id
        WHERE r.ConflictStatus = N'ItemHsnMissing'
          AND NULLIF(LTRIM(RTRIM(i.HSNCode)), N'') IS NULL;
        COMMIT TRANSACTION;
    END;
END;

/* Reconciliation report: review this before enabling the optional backfill. */
SELECT i.Id AS ItemId, i.HSNCode AS CurrentItemHsnCode, i.GSTRate AS CurrentItemGstRate,
       r.ClassificationHsnCode, r.ClassificationSource, r.ConflictStatus,
       CASE WHEN r.ConflictStatus = N'ItemHsnMissing' THEN N'Backfill candidate; no GST rate is inferred.'
            WHEN r.ConflictStatus = N'ConflictRequiresReview' THEN N'Preserved in recovery table; manual tax review required.'
            ELSE N'No action.' END AS ProposedResolution
FROM dbo.Items AS i
LEFT JOIN dbo.ItemHsnGstConsolidationRecovery AS r ON r.ItemId = i.Id
ORDER BY i.Id;

/*
  Retirement is a separate, approved deployment step. Do not drop HsnSacMasters,
  ItemHsnOverrides, CategoryHsnDefaults, or GstCalculationSnapshots here: the last
  table has historical foreign-keyed tax snapshots. The application no longer exposes
  classification CRUD/routes; retained data is recovery evidence until retention and
  statutory review approve a dedicated archival migration.
*/
