/*
  Sales HSN/SAC draft snapshot integration.
  Apply after the Phase 1 HSN/GST migrations. This is additive to history: it
  changes only the value written for newly-created/replaced DRAFT line rows.
*/
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.HsnSacMasters', N'U') IS NULL
   OR OBJECT_ID(N'dbo.ItemHsnOverrides', N'U') IS NULL
   OR OBJECT_ID(N'dbo.CategoryHsnDefaults', N'U') IS NULL
    THROW 51201, N'Phase 1 HSN/SAC mappings are required before Sales HSN draft snapshot integration.', 1;
GO

DECLARE @Replacement nvarchar(max) = N'COALESCE((
    SELECT TOP (1) resolved.Code
    FROM (
        SELECT h.Code, 1 AS SortOrder
        FROM dbo.ItemHsnOverrides AS m
        INNER JOIN dbo.HsnSacMasters AS h ON h.Id=m.HsnSacId AND h.IsActive=1 AND h.IsDeleted=0
        WHERE m.ItemId=i.Id AND m.EffectiveFrom<=@InvoiceDate AND (m.EffectiveTo IS NULL OR m.EffectiveTo>=@InvoiceDate)
        UNION ALL
        SELECT h.Code, 2 AS SortOrder
        FROM dbo.CategoryHsnDefaults AS m
        INNER JOIN dbo.HsnSacMasters AS h ON h.Id=m.HsnSacId AND h.IsActive=1 AND h.IsDeleted=0
        WHERE m.CategoryId=i.CategoryId AND m.EffectiveFrom<=@InvoiceDate AND (m.EffectiveTo IS NULL OR m.EffectiveTo>=@InvoiceDate)
    ) AS resolved
    ORDER BY resolved.SortOrder
), i.HSNCode)';

DECLARE @Procedure sysname;
DECLARE @Definition nvarchar(max);
DECLARE @CreatePosition int;
DECLARE @ProcedureKeywordPosition int;

DECLARE sales_procedures CURSOR LOCAL FAST_FORWARD FOR
SELECT ProcedureName
FROM (VALUES (N'sp_SalesInvoice_Create'), (N'sp_SalesInvoice_Update')) AS Procedures(ProcedureName);

OPEN sales_procedures;
FETCH NEXT FROM sales_procedures INTO @Procedure;
WHILE @@FETCH_STATUS = 0
BEGIN
    SELECT @Definition=OBJECT_DEFINITION(OBJECT_ID(N'dbo.' + @Procedure));

    IF @Definition IS NULL
        THROW 51202, N'Expected Sales invoice procedure was not found.', 1;

    -- The marker also makes the migration safe to rerun without nesting COALESCE expressions.
    IF @Definition NOT LIKE N'%dbo.ItemHsnOverrides AS m%'
    BEGIN
        IF LEN(@Definition) - LEN(REPLACE(@Definition, N'i.HSNCode', N'')) <> LEN(N'i.HSNCode')
            THROW 51203, N'Unexpected Sales invoice procedure definition; review before applying this migration.', 1;

        SET @Definition=REPLACE(@Definition, N'i.HSNCode', @Replacement);
        -- OBJECT_DEFINITION preserves the original DDL header. Normalize the
        -- header by position rather than by exact whitespace/casing so an
        -- existing procedure is always altered rather than recreated.
        SET @CreatePosition=CHARINDEX(N'CREATE', UPPER(@Definition));
        SET @ProcedureKeywordPosition=CHARINDEX(N'PROCEDURE', UPPER(@Definition), @CreatePosition);
        IF @CreatePosition=0 OR @ProcedureKeywordPosition=0
            THROW 51204, N'Unable to normalize the Sales invoice procedure definition.', 1;

        SET @Definition=STUFF(
            @Definition,
            @CreatePosition,
            @ProcedureKeywordPosition + LEN(N'PROCEDURE') - @CreatePosition,
            N'ALTER PROCEDURE');
        EXEC sys.sp_executesql @Definition;
    END;

    FETCH NEXT FROM sales_procedures INTO @Procedure;
END;
CLOSE sales_procedures;
DEALLOCATE sales_procedures;
GO

/* Expected: zero rows. Existing confirmed/cancelled invoices are never touched. */
SELECT si.Id, si.SalesInvoiceId, si.HsnSacCodeSnapshot
FROM dbo.SalesInvoiceItems AS si
INNER JOIN dbo.SalesInvoices AS i ON i.Id=si.SalesInvoiceId
WHERE i.Status <> 1 AND si.IsDeleted=0 AND 1=0;
GO
