/* Run manually in SSMS after 20261019_sales_hsn_draft_snapshot.sql. Read-only verification. */
SET NOCOUNT ON;

SELECT ProcedureName=OBJECT_NAME(object_id), DefinitionContainsEffectiveResolver=
       CASE WHEN definition LIKE N'%dbo.ItemHsnOverrides AS m%' AND definition LIKE N'%dbo.CategoryHsnDefaults AS m%'
            THEN N'PASS' ELSE N'FAIL' END
FROM sys.sql_modules
WHERE object_id IN (OBJECT_ID(N'dbo.sp_SalesInvoice_Create'), OBJECT_ID(N'dbo.sp_SalesInvoice_Update'));

SELECT TOP (20)
    si.SalesInvoiceId,
    i.Status AS InvoiceStatus,
    si.ItemId,
    si.HsnSacCodeSnapshot,
    si.CreatedAtUtc
FROM dbo.SalesInvoiceItems AS si
INNER JOIN dbo.SalesInvoices AS i ON i.Id=si.SalesInvoiceId
WHERE si.IsDeleted=0
ORDER BY si.Id DESC;
