/* Disposable-test-only bootstrap. Never run on retained staging or production. */
SET NOCOUNT ON;
GO
IF DB_NAME() NOT LIKE N'CosmosSalesGstIntegrationTests[_]%'
    THROW 51240, N'This bootstrap is restricted to CosmosSalesGstIntegrationTests_* databases.', 1;
IF OBJECT_ID(N'dbo.sp_SalesInvoice_Create', N'P') IS NULL
   OR OBJECT_ID(N'dbo.sp_SalesInvoice_Update', N'P') IS NULL
   OR TYPE_ID(N'dbo.SalesInvoiceItemInput') IS NULL
    THROW 51241, N'The Sales GST test baseline is incomplete.', 1;
GO
IF TYPE_ID(N'dbo.SalesInvoiceItemInputV2') IS NULL
    EXEC(N'CREATE TYPE dbo.SalesInvoiceItemInputV2 AS TABLE(ItemId BIGINT NOT NULL,Quantity DECIMAL(22,6) NOT NULL,Rate DECIMAL(18,2) NOT NULL,DiscountPercentage DECIMAL(5,2) NOT NULL,DiscountAmount DECIMAL(18,2) NOT NULL,TaxRateId BIGINT NULL,TaxPercentage DECIMAL(5,2) NOT NULL)');
GO
DECLARE @procedure sysname, @definition nvarchar(max), @createPosition int, @procedurePosition int;
DECLARE sales_contracts CURSOR LOCAL FAST_FORWARD FOR
SELECT name FROM sys.procedures WHERE schema_id=SCHEMA_ID(N'dbo') AND name IN(N'sp_SalesInvoice_Create',N'sp_SalesInvoice_Update');
OPEN sales_contracts; FETCH NEXT FROM sales_contracts INTO @procedure;
WHILE @@FETCH_STATUS=0
BEGIN
    SELECT @definition=OBJECT_DEFINITION(OBJECT_ID(N'dbo.'+@procedure));
    IF @definition IS NULL THROW 51242, N'A required Sales procedure is unreadable.', 1;
    SET @definition=REPLACE(@definition,N'dbo.SalesInvoiceItemInput READONLY',N'dbo.SalesInvoiceItemInputV2 READONLY');
    SET @createPosition=CHARINDEX(N'CREATE',UPPER(@definition));
    SET @procedurePosition=CHARINDEX(N'PROCEDURE',UPPER(@definition),@createPosition);
    IF @createPosition=0 OR @procedurePosition=0 THROW 51243, N'Unexpected Sales procedure definition.', 1;
    SET @definition=STUFF(@definition,@createPosition,@procedurePosition+LEN(N'PROCEDURE')-@createPosition,N'ALTER PROCEDURE');
    EXEC sys.sp_executesql @definition;
    FETCH NEXT FROM sales_contracts INTO @procedure;
END;
CLOSE sales_contracts; DEALLOCATE sales_contracts;
GO
