/*
  Phase 3: explicit issuing GST registration for Sales invoices.
  Forward-only and additive: historical invoices intentionally remain NULL.
  This does not create a statutory snapshot, calculate tax, or enable generation.
*/
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.SalesInvoices', N'U') IS NULL
   OR OBJECT_ID(N'dbo.CompanyGstRegistrations', N'U') IS NULL
    THROW 51220, N'SalesInvoices and CompanyGstRegistrations must exist before applying issuer registration migration.', 1;
GO

IF COL_LENGTH(N'dbo.SalesInvoices', N'CompanyGstRegistrationId') IS NULL
    ALTER TABLE dbo.SalesInvoices ADD CompanyGstRegistrationId BIGINT NULL;
GO
IF COL_LENGTH(N'dbo.SalesInvoices', N'PlaceOfSupplyStateCode') IS NULL
    ALTER TABLE dbo.SalesInvoices ADD PlaceOfSupplyStateCode NVARCHAR(10) NULL;
IF COL_LENGTH(N'dbo.SalesInvoices', N'PlaceOfSupplySource') IS NULL
    ALTER TABLE dbo.SalesInvoices ADD PlaceOfSupplySource NVARCHAR(50) NULL;
IF COL_LENGTH(N'dbo.SalesInvoices', N'PriceBasis') IS NULL
    ALTER TABLE dbo.SalesInvoices ADD PriceBasis TINYINT NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.SalesInvoices') AND name=N'CK_SalesInvoices_PriceBasis')
    ALTER TABLE dbo.SalesInvoices ADD CONSTRAINT CK_SalesInvoices_PriceBasis CHECK(PriceBasis IS NULL OR PriceBasis IN(0,1));
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_SalesInvoices_CompanyGstRegistrations')
    ALTER TABLE dbo.SalesInvoices ADD CONSTRAINT FK_SalesInvoices_CompanyGstRegistrations
        FOREIGN KEY (CompanyGstRegistrationId) REFERENCES dbo.CompanyGstRegistrations(Id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_SalesInvoices_CompanyGstRegistrationId' AND object_id=OBJECT_ID(N'dbo.SalesInvoices'))
    CREATE INDEX IX_SalesInvoices_CompanyGstRegistrationId ON dbo.SalesInvoices(CompanyGstRegistrationId) WHERE CompanyGstRegistrationId IS NOT NULL;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_GetById @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.Id,i.InvoiceNumber,i.InvoiceDate,i.DueDate,i.CustomerPartyId,p.PartyName AS CustomerName,p.MobileNo AS CustomerMobileNo,
           i.SubTotal,i.DiscountAmount,i.TaxAmount,i.GrandTotal,i.PaidAmount,i.DueAmount,i.Status,i.PaymentStatus,i.Notes,i.TermsAndConditions,
           i.CompanyGstRegistrationId,r.Gstin AS CompanyGstin,r.LegalName AS CompanyGstLegalName,r.BranchName AS CompanyGstBranchName,
           i.PlaceOfSupplyStateCode,i.PlaceOfSupplySource,i.PriceBasis,
           i.CreatedAtUtc,i.UpdatedAtUtc,0 AS TotalCount
    FROM dbo.SalesInvoices i JOIN dbo.Parties p ON p.Id=i.CustomerPartyId
    LEFT JOIN dbo.CompanyGstRegistrations r ON r.Id=i.CompanyGstRegistrationId
    WHERE i.Id=@Id AND i.IsDeleted=0;
    SELECT Id,SalesInvoiceId,ItemId,ItemNameSnapshot,HsnSacCodeSnapshot,Quantity,UnitId,UnitNameSnapshot,Rate,DiscountPercentage,DiscountAmount,TaxRateId,TaxPercentageSnapshot,TaxAmount,LineTotal FROM dbo.SalesInvoiceItems WHERE SalesInvoiceId=@Id AND IsDeleted=0 ORDER BY Id;
    SELECT Id,SalesInvoiceId,PaymentDate,Amount,PaymentMode,ReferenceNumber,Notes,CreatedAtUtc FROM dbo.SalesInvoicePayments WHERE SalesInvoiceId=@Id AND IsDeleted=0 ORDER BY PaymentDate,Id;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_Update
    @Id BIGINT,@CustomerPartyId UNIQUEIDENTIFIER,@InvoiceDate DATE,@DueDate DATE=NULL,@DiscountAmount DECIMAL(18,2)=0,@Notes NVARCHAR(1000)=NULL,@TermsAndConditions NVARCHAR(2000)=NULL,
    @CompanyGstRegistrationId BIGINT=NULL,@PlaceOfSupplyStateCode NVARCHAR(10)=NULL,@PlaceOfSupplySource NVARCHAR(50)=NULL,@PriceBasis TINYINT=NULL,
    @Items dbo.SalesInvoiceItemInput READONLY,@UserId BIGINT=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF NOT EXISTS(SELECT 1 FROM dbo.SalesInvoices WHERE Id=@Id AND IsDeleted=0 AND Status=1) BEGIN SELECT 409 StatusCode,N'Only draft sales invoices can be updated.' Message; RETURN; END
  IF NOT EXISTS(SELECT 1 FROM dbo.Parties WHERE Id=@CustomerPartyId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 404 StatusCode,N'Customer party was not found.' Message; RETURN; END
  IF @CompanyGstRegistrationId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations WHERE Id=@CompanyGstRegistrationId AND IsDeleted=0 AND Status=N'Active') BEGIN SELECT 409 StatusCode,N'Selected GST registration was not found or is inactive.' Message; RETURN; END
  IF @PriceBasis NOT IN(0,1) AND @PriceBasis IS NOT NULL BEGIN SELECT 400 StatusCode,N'Pricing basis is invalid.' Message; RETURN; END
  IF @PlaceOfSupplyStateCode IS NOT NULL AND (@PlaceOfSupplyStateCode NOT LIKE N'[0-9][0-9]' OR @PlaceOfSupplySource IS NULL) BEGIN SELECT 400 StatusCode,N'Place of supply requires a normalized state code and reviewed source.' Message; RETURN; END
  IF NOT EXISTS(SELECT 1 FROM @Items) BEGIN SELECT 400 StatusCode,N'At least one invoice item is required.' Message; RETURN; END
  IF EXISTS(SELECT 1 FROM @Items WHERE Quantity<=0 OR Rate<0 OR DiscountPercentage<0 OR DiscountAmount<0 OR TaxPercentage<0) BEGIN SELECT 400 StatusCode,N'Invoice item amounts are invalid.' Message; RETURN; END
  IF EXISTS(SELECT 1 FROM @Items x WHERE NOT EXISTS(SELECT 1 FROM dbo.Items i WHERE i.Id=x.ItemId AND i.IsDeleted=0 AND i.IsActive=1)) BEGIN SELECT 404 StatusCode,N'One or more items were not found.' Message; RETURN; END
  DECLARE @SubTotal DECIMAL(18,2),@ItemDiscount DECIMAL(18,2),@TaxAmount DECIMAL(18,2),@GrandTotal DECIMAL(18,2),@Paid DECIMAL(18,2),@Due DECIMAL(18,2),@PaymentStatus INT;
  SELECT @Paid=PaidAmount FROM dbo.SalesInvoices WHERE Id=@Id; SELECT @SubTotal=SUM(Quantity*Rate),@ItemDiscount=SUM(CASE WHEN DiscountAmount>0 THEN DiscountAmount ELSE ROUND((Quantity*Rate)*DiscountPercentage/100,2) END),@TaxAmount=SUM(ROUND(((Quantity*Rate)-CASE WHEN DiscountAmount>0 THEN DiscountAmount ELSE ROUND((Quantity*Rate)*DiscountPercentage/100,2) END)*TaxPercentage/100,2)) FROM @Items;
  SET @GrandTotal=@SubTotal-@ItemDiscount-@DiscountAmount+@TaxAmount; IF @DiscountAmount<0 OR @GrandTotal<0 BEGIN SELECT 400 StatusCode,N'Invoice discount is invalid.' Message; RETURN; END
  IF @Paid>@GrandTotal BEGIN SELECT 400 StatusCode,N'Paid amount cannot exceed invoice grand total.' Message; RETURN; END
  SET @Due=@GrandTotal-@Paid; SET @PaymentStatus=CASE WHEN @Paid=0 THEN 1 WHEN @Due=0 THEN 3 ELSE 2 END;
  BEGIN TRAN;
  UPDATE dbo.SalesInvoices SET CustomerPartyId=@CustomerPartyId,CompanyGstRegistrationId=@CompanyGstRegistrationId,PlaceOfSupplyStateCode=@PlaceOfSupplyStateCode,PlaceOfSupplySource=@PlaceOfSupplySource,PriceBasis=@PriceBasis,InvoiceDate=@InvoiceDate,DueDate=@DueDate,SubTotal=@SubTotal,DiscountAmount=@ItemDiscount+@DiscountAmount,TaxAmount=@TaxAmount,GrandTotal=@GrandTotal,DueAmount=@Due,PaymentStatus=@PaymentStatus,Notes=@Notes,TermsAndConditions=@TermsAndConditions,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
  UPDATE dbo.SalesInvoiceItems SET IsDeleted=1,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE SalesInvoiceId=@Id AND IsDeleted=0;
  INSERT dbo.SalesInvoiceItems(SalesInvoiceId,ItemId,ItemNameSnapshot,HsnSacCodeSnapshot,Quantity,UnitId,UnitNameSnapshot,Rate,DiscountPercentage,DiscountAmount,TaxRateId,TaxPercentageSnapshot,TaxAmount,LineTotal,CreatedBy)
  SELECT @Id,i.Id,i.Name,i.HSNCode,x.Quantity,i.UnitId,u.Name,x.Rate,x.DiscountPercentage,CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END,x.TaxRateId,x.TaxPercentage,ROUND(((x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END)*x.TaxPercentage/100,2),(x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END+ROUND(((x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END)*x.TaxPercentage/100,2),@UserId FROM @Items x JOIN dbo.Items i ON i.Id=x.ItemId JOIN dbo.Units u ON u.Id=i.UnitId;
  COMMIT; SELECT 200 StatusCode,N'Sales invoice updated.' Message; SELECT @Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

/* Explicit procedure bodies are intentionally maintained here; do not rewrite procedure text dynamically. */
CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_Create
    @CustomerPartyId UNIQUEIDENTIFIER,@InvoiceDate DATE,@DueDate DATE=NULL,@DiscountAmount DECIMAL(18,2)=0,@Notes NVARCHAR(1000)=NULL,@TermsAndConditions NVARCHAR(2000)=NULL,
    @CompanyGstRegistrationId BIGINT=NULL,@PlaceOfSupplyStateCode NVARCHAR(10)=NULL,@PlaceOfSupplySource NVARCHAR(50)=NULL,@PriceBasis TINYINT=NULL,
    @Items dbo.SalesInvoiceItemInput READONLY,@UserId BIGINT=NULL,@InitialPaymentDate DATE=NULL,@InitialPaymentAmount DECIMAL(18,2)=NULL,@InitialPaymentMode INT=NULL,@InitialPaymentReferenceNumber NVARCHAR(100)=NULL,@InitialPaymentNotes NVARCHAR(500)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF NOT EXISTS(SELECT 1 FROM dbo.Parties WHERE Id=@CustomerPartyId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 404 StatusCode,N'Customer party was not found.' Message; RETURN; END
  IF @CompanyGstRegistrationId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations WHERE Id=@CompanyGstRegistrationId AND IsDeleted=0 AND Status=N'Active') BEGIN SELECT 409 StatusCode,N'Selected GST registration was not found or is inactive.' Message; RETURN; END
  IF @PriceBasis NOT IN(0,1) AND @PriceBasis IS NOT NULL BEGIN SELECT 400 StatusCode,N'Pricing basis is invalid.' Message; RETURN; END
  IF @PlaceOfSupplyStateCode IS NOT NULL AND (@PlaceOfSupplyStateCode NOT LIKE N'[0-9][0-9]' OR @PlaceOfSupplySource IS NULL) BEGIN SELECT 400 StatusCode,N'Place of supply requires a normalized state code and reviewed source.' Message; RETURN; END
  IF NOT EXISTS(SELECT 1 FROM @Items) BEGIN SELECT 400 StatusCode,N'At least one invoice item is required.' Message; RETURN; END
  IF EXISTS(SELECT 1 FROM @Items WHERE Quantity<=0 OR Rate<0 OR DiscountPercentage<0 OR DiscountAmount<0 OR TaxPercentage<0) BEGIN SELECT 400 StatusCode,N'Invoice item amounts are invalid.' Message; RETURN; END
  IF EXISTS(SELECT 1 FROM @Items x WHERE NOT EXISTS(SELECT 1 FROM dbo.Items i WHERE i.Id=x.ItemId AND i.IsDeleted=0 AND i.IsActive=1)) BEGIN SELECT 404 StatusCode,N'One or more items were not found.' Message; RETURN; END
  DECLARE @SubTotal DECIMAL(18,2),@ItemDiscount DECIMAL(18,2),@TaxAmount DECIMAL(18,2),@GrandTotal DECIMAL(18,2),@Paid DECIMAL(18,2)=ISNULL(@InitialPaymentAmount,0),@Due DECIMAL(18,2),@PaymentStatus INT;
  SELECT @SubTotal=SUM(Quantity*Rate),@ItemDiscount=SUM(CASE WHEN DiscountAmount>0 THEN DiscountAmount ELSE ROUND((Quantity*Rate)*DiscountPercentage/100,2) END),@TaxAmount=SUM(ROUND(((Quantity*Rate)-CASE WHEN DiscountAmount>0 THEN DiscountAmount ELSE ROUND((Quantity*Rate)*DiscountPercentage/100,2) END)*TaxPercentage/100,2)) FROM @Items;
  IF @DiscountAmount<0 OR @DiscountAmount>@SubTotal BEGIN SELECT 400 StatusCode,N'Invoice discount is invalid.' Message; RETURN; END
  SET @GrandTotal=@SubTotal-@ItemDiscount-@DiscountAmount+@TaxAmount; IF @Paid<0 OR @Paid>@GrandTotal BEGIN SELECT 400 StatusCode,N'Paid amount cannot exceed invoice grand total.' Message; RETURN; END
  SET @Due=@GrandTotal-@Paid; SET @PaymentStatus=CASE WHEN @Paid=0 THEN 1 WHEN @Due=0 THEN 3 ELSE 2 END;
  IF @Paid>0 AND NOT EXISTS(SELECT 1 FROM dbo.PaymentModes WHERE Id=@InitialPaymentMode AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Payment mode is invalid.' Message; RETURN; END
  BEGIN TRAN;
  DECLARE @Next BIGINT,@Prefix NVARCHAR(20),@Padding INT; SELECT @Next=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'SalesInvoice';
  IF @Next IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'SalesInvoice',N'SINV-',1,5); SET @Next=1; SET @Prefix=N'SINV-'; SET @Padding=5; END
  DECLARE @InvoiceNumber NVARCHAR(50)=@Prefix+RIGHT(REPLICATE(N'0',@Padding)+CONVERT(NVARCHAR(30),@Next),@Padding); UPDATE dbo.NumberSequences SET NextNumber=@Next+1,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'SalesInvoice';
  INSERT dbo.SalesInvoices(InvoiceNumber,InvoiceDate,DueDate,CustomerPartyId,CompanyGstRegistrationId,PlaceOfSupplyStateCode,PlaceOfSupplySource,PriceBasis,SubTotal,DiscountAmount,TaxAmount,GrandTotal,PaidAmount,DueAmount,Status,PaymentStatus,Notes,TermsAndConditions,CreatedBy) VALUES(@InvoiceNumber,@InvoiceDate,@DueDate,@CustomerPartyId,@CompanyGstRegistrationId,@PlaceOfSupplyStateCode,@PlaceOfSupplySource,@PriceBasis,@SubTotal,@ItemDiscount+@DiscountAmount,@TaxAmount,@GrandTotal,@Paid,@Due,1,@PaymentStatus,@Notes,@TermsAndConditions,@UserId);
  DECLARE @Id BIGINT=SCOPE_IDENTITY();
  INSERT dbo.SalesInvoiceItems(SalesInvoiceId,ItemId,ItemNameSnapshot,HsnSacCodeSnapshot,Quantity,UnitId,UnitNameSnapshot,Rate,DiscountPercentage,DiscountAmount,TaxRateId,TaxPercentageSnapshot,TaxAmount,LineTotal,CreatedBy)
  SELECT @Id,i.Id,i.Name,i.HSNCode,x.Quantity,i.UnitId,u.Name,x.Rate,x.DiscountPercentage,CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END,x.TaxRateId,x.TaxPercentage,ROUND(((x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END)*x.TaxPercentage/100,2),(x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END+ROUND(((x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END)*x.TaxPercentage/100,2),@UserId FROM @Items x JOIN dbo.Items i ON i.Id=x.ItemId JOIN dbo.Units u ON u.Id=i.UnitId;
  IF @Paid>0 INSERT dbo.SalesInvoicePayments(SalesInvoiceId,PaymentDate,Amount,PaymentMode,ReferenceNumber,Notes,CreatedBy) VALUES(@Id,COALESCE(@InitialPaymentDate,@InvoiceDate),@Paid,@InitialPaymentMode,@InitialPaymentReferenceNumber,@InitialPaymentNotes,@UserId);
  COMMIT; SELECT 201 StatusCode,N'Sales invoice created.' Message; SELECT @Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO
