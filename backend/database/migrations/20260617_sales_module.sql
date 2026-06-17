/*
    Cosmos ERP Sales Module
    SQL Server, idempotent deployment script.

    Adds:
    - NumberSequences for reusable invoice numbering.
    - PaymentModes for reusable payment mode lookup.
    - StockMovements for product stock issue/restoration history.
    - SalesInvoices, SalesInvoiceItems, SalesInvoicePayments.
    - Stored procedures used by the Dapper SalesRepository.
    - Sales permission pages for the existing role/page permission model.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF TYPE_ID(N'dbo.SalesInvoiceItemInput') IS NULL
    CREATE TYPE dbo.SalesInvoiceItemInput AS TABLE
    (
        ItemId BIGINT NOT NULL,
        Quantity DECIMAL(18,2) NOT NULL,
        Rate DECIMAL(18,2) NOT NULL,
        DiscountPercentage DECIMAL(5,2) NOT NULL,
        DiscountAmount DECIMAL(18,2) NOT NULL,
        TaxRateId BIGINT NULL,
        TaxPercentage DECIMAL(5,2) NOT NULL
    );
GO

IF OBJECT_ID(N'dbo.NumberSequences', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.NumberSequences
    (
        Id BIGINT IDENTITY(1,1) CONSTRAINT PK_NumberSequences PRIMARY KEY,
        ModuleName NVARCHAR(100) NOT NULL,
        Prefix NVARCHAR(20) NOT NULL,
        NextNumber BIGINT NOT NULL,
        PaddingLength INT NOT NULL CONSTRAINT DF_NumberSequences_Padding DEFAULT (5),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_NumberSequences_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        UpdatedAtUtc DATETIME2(3) NULL,
        CONSTRAINT UQ_NumberSequences_ModuleName UNIQUE(ModuleName)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.NumberSequences WHERE ModuleName = N'SalesInvoice')
    INSERT dbo.NumberSequences(ModuleName, Prefix, NextNumber, PaddingLength) VALUES(N'SalesInvoice', N'SINV-', 1, 5);
GO

IF OBJECT_ID(N'dbo.PaymentModes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PaymentModes
    (
        Id INT NOT NULL CONSTRAINT PK_PaymentModes PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_PaymentModes_IsActive DEFAULT (1)
    );
END;
GO

MERGE dbo.PaymentModes AS target
USING (VALUES
    (1, N'Cash', 1),
    (2, N'Bank Transfer', 1),
    (3, N'Card', 1),
    (4, N'UPI', 1),
    (5, N'Cheque', 1),
    (99, N'Other', 1)
) AS source(Id, Name, IsActive)
ON target.Id = source.Id
WHEN MATCHED THEN UPDATE SET Name = source.Name, IsActive = source.IsActive
WHEN NOT MATCHED THEN INSERT(Id, Name, IsActive) VALUES(source.Id, source.Name, source.IsActive);
GO

IF OBJECT_ID(N'dbo.SalesInvoices', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SalesInvoices
    (
        Id BIGINT IDENTITY(1,1) CONSTRAINT PK_SalesInvoices PRIMARY KEY,
        InvoiceNumber NVARCHAR(50) NOT NULL,
        InvoiceDate DATE NOT NULL,
        DueDate DATE NULL,
        CustomerPartyId UNIQUEIDENTIFIER NOT NULL,
        SubTotal DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoices_SubTotal DEFAULT(0),
        DiscountAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoices_Discount DEFAULT(0),
        TaxAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoices_Tax DEFAULT(0),
        GrandTotal DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoices_GrandTotal DEFAULT(0),
        PaidAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoices_Paid DEFAULT(0),
        DueAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoices_Due DEFAULT(0),
        Status INT NOT NULL CONSTRAINT DF_SalesInvoices_Status DEFAULT(1),
        PaymentStatus INT NOT NULL CONSTRAINT DF_SalesInvoices_PaymentStatus DEFAULT(1),
        Notes NVARCHAR(1000) NULL,
        TermsAndConditions NVARCHAR(2000) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_SalesInvoices_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_SalesInvoices_IsDeleted DEFAULT(0),
        DeletedAtUtc DATETIME2(3) NULL,
        DeletedBy BIGINT NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT UQ_SalesInvoices_InvoiceNumber UNIQUE(InvoiceNumber),
        CONSTRAINT FK_SalesInvoices_Parties FOREIGN KEY(CustomerPartyId) REFERENCES dbo.Parties(Id),
        CONSTRAINT CK_SalesInvoices_Status CHECK(Status IN (1,2,3,4,5)),
        CONSTRAINT CK_SalesInvoices_PaymentStatus CHECK(PaymentStatus IN (1,2,3)),
        CONSTRAINT CK_SalesInvoices_Amounts CHECK(SubTotal >= 0 AND DiscountAmount >= 0 AND TaxAmount >= 0 AND GrandTotal >= 0 AND PaidAmount >= 0 AND DueAmount >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.SalesInvoiceItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SalesInvoiceItems
    (
        Id BIGINT IDENTITY(1,1) CONSTRAINT PK_SalesInvoiceItems PRIMARY KEY,
        SalesInvoiceId BIGINT NOT NULL,
        ItemId BIGINT NOT NULL,
        ItemNameSnapshot NVARCHAR(200) NOT NULL,
        HsnSacCodeSnapshot NVARCHAR(50) NULL,
        Quantity DECIMAL(18,2) NOT NULL,
        UnitId BIGINT NULL,
        UnitNameSnapshot NVARCHAR(100) NULL,
        Rate DECIMAL(18,2) NOT NULL,
        DiscountPercentage DECIMAL(5,2) NOT NULL CONSTRAINT DF_SalesInvoiceItems_DiscountPct DEFAULT(0),
        DiscountAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoiceItems_Discount DEFAULT(0),
        TaxRateId BIGINT NULL,
        TaxPercentageSnapshot DECIMAL(5,2) NOT NULL CONSTRAINT DF_SalesInvoiceItems_TaxPct DEFAULT(0),
        TaxAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoiceItems_Tax DEFAULT(0),
        LineTotal DECIMAL(18,2) NOT NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_SalesInvoiceItems_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_SalesInvoiceItems_IsDeleted DEFAULT(0),
        CONSTRAINT FK_SalesInvoiceItems_Invoices FOREIGN KEY(SalesInvoiceId) REFERENCES dbo.SalesInvoices(Id),
        CONSTRAINT FK_SalesInvoiceItems_Items FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT FK_SalesInvoiceItems_Units FOREIGN KEY(UnitId) REFERENCES dbo.Units(Id),
        CONSTRAINT CK_SalesInvoiceItems_Amounts CHECK(Quantity > 0 AND Rate >= 0 AND DiscountPercentage >= 0 AND DiscountAmount >= 0 AND TaxPercentageSnapshot >= 0 AND TaxAmount >= 0 AND LineTotal >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.SalesInvoicePayments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SalesInvoicePayments
    (
        Id BIGINT IDENTITY(1,1) CONSTRAINT PK_SalesInvoicePayments PRIMARY KEY,
        SalesInvoiceId BIGINT NOT NULL,
        PaymentDate DATE NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        PaymentMode INT NOT NULL,
        ReferenceNumber NVARCHAR(100) NULL,
        Notes NVARCHAR(500) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_SalesInvoicePayments_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_SalesInvoicePayments_IsDeleted DEFAULT(0),
        CONSTRAINT FK_SalesInvoicePayments_Invoices FOREIGN KEY(SalesInvoiceId) REFERENCES dbo.SalesInvoices(Id),
        CONSTRAINT FK_SalesInvoicePayments_PaymentModes FOREIGN KEY(PaymentMode) REFERENCES dbo.PaymentModes(Id),
        CONSTRAINT CK_SalesInvoicePayments_Amount CHECK(Amount > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.StockMovements', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.StockMovements
    (
        Id BIGINT IDENTITY(1,1) CONSTRAINT PK_StockMovements PRIMARY KEY,
        ItemId BIGINT NOT NULL,
        SourceType NVARCHAR(50) NOT NULL,
        SourceId BIGINT NOT NULL,
        MovementType INT NOT NULL,
        Quantity DECIMAL(18,2) NOT NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_StockMovements_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        CONSTRAINT FK_StockMovements_Items FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_SalesInvoices_Date' AND object_id=OBJECT_ID(N'dbo.SalesInvoices'))
    CREATE INDEX IX_SalesInvoices_Date ON dbo.SalesInvoices(InvoiceDate, IsDeleted);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_SalesInvoices_Customer' AND object_id=OBJECT_ID(N'dbo.SalesInvoices'))
    CREATE INDEX IX_SalesInvoices_Customer ON dbo.SalesInvoices(CustomerPartyId, IsDeleted);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_SalesInvoiceItems_Invoice' AND object_id=OBJECT_ID(N'dbo.SalesInvoiceItems'))
    CREATE INDEX IX_SalesInvoiceItems_Invoice ON dbo.SalesInvoiceItems(SalesInvoiceId, IsDeleted);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_SalesInvoicePayments_Invoice' AND object_id=OBJECT_ID(N'dbo.SalesInvoicePayments'))
    CREATE INDEX IX_SalesInvoicePayments_Invoice ON dbo.SalesInvoicePayments(SalesInvoiceId, IsDeleted);
GO

CREATE OR ALTER PROCEDURE dbo.sp_Sales_CustomerExists @CustomerPartyId UNIQUEIDENTIFIER AS
BEGIN
    SET NOCOUNT ON;
    SELECT CONVERT(BIT, CASE WHEN EXISTS(SELECT 1 FROM dbo.Parties WHERE Id=@CustomerPartyId AND IsDeleted=0 AND IsActive=1) THEN 1 ELSE 0 END);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Sales_ItemExists @ItemId BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT CONVERT(BIT, CASE WHEN EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@ItemId AND IsDeleted=0 AND IsActive=1) THEN 1 ELSE 0 END);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_GetById @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;

    SELECT i.Id, i.InvoiceNumber, i.InvoiceDate, i.DueDate, i.CustomerPartyId,
           p.PartyName AS CustomerName, p.MobileNo AS CustomerMobileNo,
           i.SubTotal, i.DiscountAmount, i.TaxAmount, i.GrandTotal, i.PaidAmount, i.DueAmount,
           i.Status, i.PaymentStatus, i.Notes, i.TermsAndConditions, i.CreatedAtUtc, i.UpdatedAtUtc, 0 AS TotalCount
    FROM dbo.SalesInvoices i
    JOIN dbo.Parties p ON p.Id = i.CustomerPartyId
    WHERE i.Id=@Id AND i.IsDeleted=0;

    SELECT Id, SalesInvoiceId, ItemId, ItemNameSnapshot, HsnSacCodeSnapshot, Quantity, UnitId,
           UnitNameSnapshot, Rate, DiscountPercentage, DiscountAmount, TaxRateId, TaxPercentageSnapshot,
           TaxAmount, LineTotal
    FROM dbo.SalesInvoiceItems
    WHERE SalesInvoiceId=@Id AND IsDeleted=0
    ORDER BY Id;

    SELECT Id, SalesInvoiceId, PaymentDate, Amount, PaymentMode, ReferenceNumber, Notes, CreatedAtUtc
    FROM dbo.SalesInvoicePayments
    WHERE SalesInvoiceId=@Id AND IsDeleted=0
    ORDER BY PaymentDate, Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_GetList
    @Search NVARCHAR(200)=NULL,
    @CustomerPartyId UNIQUEIDENTIFIER=NULL,
    @Status INT=NULL,
    @PaymentStatus INT=NULL,
    @FromDate DATE=NULL,
    @ToDate DATE=NULL,
    @PageNumber INT=1,
    @PageSize INT=20,
    @SortBy NVARCHAR(50)=N'InvoiceDate',
    @SortDirection NVARCHAR(4)=N'DESC'
AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);
    SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
    SET @SortBy=CASE WHEN @SortBy IN(N'InvoiceDate',N'InvoiceNumber',N'CustomerName',N'GrandTotal',N'PaidAmount',N'DueAmount',N'CreatedAtUtc') THEN @SortBy ELSE N'InvoiceDate' END;
    SET @SortDirection=CASE WHEN UPPER(@SortDirection)=N'ASC' THEN N'ASC' ELSE N'DESC' END;

    DECLARE @Sql NVARCHAR(MAX)=N'
        SELECT i.Id, i.InvoiceNumber, i.InvoiceDate, i.DueDate, i.CustomerPartyId,
               p.PartyName CustomerName, p.MobileNo CustomerMobileNo, i.SubTotal, i.DiscountAmount,
               i.TaxAmount, i.GrandTotal, i.PaidAmount, i.DueAmount, i.Status, i.PaymentStatus,
               i.Notes, i.TermsAndConditions, i.CreatedAtUtc, i.UpdatedAtUtc, COUNT(1) OVER() TotalCount
        FROM dbo.SalesInvoices i
        JOIN dbo.Parties p ON p.Id=i.CustomerPartyId
        WHERE i.IsDeleted=0
          AND (@CustomerPartyId IS NULL OR i.CustomerPartyId=@CustomerPartyId)
          AND (@Status IS NULL OR i.Status=@Status)
          AND (@PaymentStatus IS NULL OR i.PaymentStatus=@PaymentStatus)
          AND (@FromDate IS NULL OR i.InvoiceDate>=@FromDate)
          AND (@ToDate IS NULL OR i.InvoiceDate<=@ToDate)
          AND (@SearchPattern IS NULL OR i.InvoiceNumber LIKE @SearchPattern OR p.PartyName LIKE @SearchPattern)
        ORDER BY ' + CASE WHEN @SortBy=N'CustomerName' THEN N'p.PartyName' ELSE N'i.' + QUOTENAME(@SortBy) END + N' ' + @SortDirection + N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';

    EXEC sp_executesql @Sql,
        N'@SearchPattern NVARCHAR(210),@CustomerPartyId UNIQUEIDENTIFIER,@Status INT,@PaymentStatus INT,@FromDate DATE,@ToDate DATE,@Offset INT,@PageSize INT',
        @SearchPattern=CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search))=N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END,
        @CustomerPartyId=@CustomerPartyId,@Status=@Status,@PaymentStatus=@PaymentStatus,@FromDate=@FromDate,@ToDate=@ToDate,
        @Offset=(@PageNumber-1)*@PageSize,@PageSize=@PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_GetPayments @SalesInvoiceId BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, SalesInvoiceId, PaymentDate, Amount, PaymentMode, ReferenceNumber, Notes, CreatedAtUtc
    FROM dbo.SalesInvoicePayments
    WHERE SalesInvoiceId=@SalesInvoiceId AND IsDeleted=0
    ORDER BY PaymentDate, Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_Create
    @CustomerPartyId UNIQUEIDENTIFIER,
    @InvoiceDate DATE,
    @DueDate DATE=NULL,
    @DiscountAmount DECIMAL(18,2)=0,
    @Notes NVARCHAR(1000)=NULL,
    @TermsAndConditions NVARCHAR(2000)=NULL,
    @Items dbo.SalesInvoiceItemInput READONLY,
    @UserId BIGINT=NULL,
    @InitialPaymentDate DATE=NULL,
    @InitialPaymentAmount DECIMAL(18,2)=NULL,
    @InitialPaymentMode INT=NULL,
    @InitialPaymentReferenceNumber NVARCHAR(100)=NULL,
    @InitialPaymentNotes NVARCHAR(500)=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        IF NOT EXISTS(SELECT 1 FROM dbo.Parties WHERE Id=@CustomerPartyId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 404 StatusCode,N'Customer party was not found.' Message; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM @Items) BEGIN SELECT 400 StatusCode,N'At least one invoice item is required.' Message; RETURN; END
        IF EXISTS(SELECT 1 FROM @Items WHERE Quantity<=0 OR Rate<0 OR DiscountPercentage<0 OR DiscountAmount<0 OR TaxPercentage<0) BEGIN SELECT 400 StatusCode,N'Invoice item amounts are invalid.' Message; RETURN; END
        IF EXISTS(SELECT 1 FROM @Items x WHERE NOT EXISTS(SELECT 1 FROM dbo.Items i WHERE i.Id=x.ItemId AND i.IsDeleted=0 AND i.IsActive=1)) BEGIN SELECT 404 StatusCode,N'One or more items were not found.' Message; RETURN; END

        DECLARE @SubTotal DECIMAL(18,2),@ItemDiscount DECIMAL(18,2),@TaxAmount DECIMAL(18,2),@GrandTotal DECIMAL(18,2),@Paid DECIMAL(18,2)=ISNULL(@InitialPaymentAmount,0),@Due DECIMAL(18,2),@PaymentStatus INT;
        SELECT @SubTotal=SUM(Quantity*Rate),
               @ItemDiscount=SUM(CASE WHEN DiscountAmount>0 THEN DiscountAmount ELSE ROUND((Quantity*Rate)*DiscountPercentage/100,2) END),
               @TaxAmount=SUM(ROUND(((Quantity*Rate)-CASE WHEN DiscountAmount>0 THEN DiscountAmount ELSE ROUND((Quantity*Rate)*DiscountPercentage/100,2) END)*TaxPercentage/100,2))
        FROM @Items;
        IF @DiscountAmount<0 OR @DiscountAmount>@SubTotal BEGIN SELECT 400 StatusCode,N'Invoice discount is invalid.' Message; RETURN; END
        SET @GrandTotal=@SubTotal-@ItemDiscount-@DiscountAmount+@TaxAmount;
        IF @Paid<0 OR @Paid>@GrandTotal BEGIN SELECT 400 StatusCode,N'Paid amount cannot exceed invoice grand total.' Message; RETURN; END
        SET @Due=@GrandTotal-@Paid;
        SET @PaymentStatus=CASE WHEN @Paid=0 THEN 1 WHEN @Due=0 THEN 3 ELSE 2 END;
        IF @Paid>0 AND NOT EXISTS(SELECT 1 FROM dbo.PaymentModes WHERE Id=@InitialPaymentMode AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Payment mode is invalid.' Message; RETURN; END

        BEGIN TRAN;
        DECLARE @Next BIGINT,@Prefix NVARCHAR(20),@Padding INT;
        SELECT @Next=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'SalesInvoice';
        IF @Next IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'SalesInvoice',N'SINV-',1,5); SET @Next=1; SET @Prefix=N'SINV-'; SET @Padding=5; END
        DECLARE @InvoiceNumber NVARCHAR(50)=@Prefix + RIGHT(REPLICATE(N'0',@Padding) + CONVERT(NVARCHAR(30),@Next),@Padding);
        UPDATE dbo.NumberSequences SET NextNumber=@Next+1,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'SalesInvoice';

        INSERT dbo.SalesInvoices(InvoiceNumber,InvoiceDate,DueDate,CustomerPartyId,SubTotal,DiscountAmount,TaxAmount,GrandTotal,PaidAmount,DueAmount,Status,PaymentStatus,Notes,TermsAndConditions,CreatedBy)
        VALUES(@InvoiceNumber,@InvoiceDate,@DueDate,@CustomerPartyId,@SubTotal,@ItemDiscount+@DiscountAmount,@TaxAmount,@GrandTotal,@Paid,@Due,1,@PaymentStatus,@Notes,@TermsAndConditions,@UserId);
        DECLARE @Id BIGINT=SCOPE_IDENTITY();

        INSERT dbo.SalesInvoiceItems(SalesInvoiceId,ItemId,ItemNameSnapshot,HsnSacCodeSnapshot,Quantity,UnitId,UnitNameSnapshot,Rate,DiscountPercentage,DiscountAmount,TaxRateId,TaxPercentageSnapshot,TaxAmount,LineTotal,CreatedBy)
        SELECT @Id,i.Id,i.Name,i.HSNCode,x.Quantity,i.UnitId,u.Name,x.Rate,x.DiscountPercentage,
               CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END,
               x.TaxRateId,x.TaxPercentage,
               ROUND(((x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END)*x.TaxPercentage/100,2),
               (x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END+
               ROUND(((x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END)*x.TaxPercentage/100,2),
               @UserId
        FROM @Items x JOIN dbo.Items i ON i.Id=x.ItemId JOIN dbo.Units u ON u.Id=i.UnitId;

        IF @Paid>0
            INSERT dbo.SalesInvoicePayments(SalesInvoiceId,PaymentDate,Amount,PaymentMode,ReferenceNumber,Notes,CreatedBy)
            VALUES(@Id,COALESCE(@InitialPaymentDate,@InvoiceDate),@Paid,@InitialPaymentMode,@InitialPaymentReferenceNumber,@InitialPaymentNotes,@UserId);

        COMMIT; SELECT 201 StatusCode,N'Sales invoice created.' Message; SELECT @Id;
    END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_Update
    @Id BIGINT,
    @CustomerPartyId UNIQUEIDENTIFIER,
    @InvoiceDate DATE,
    @DueDate DATE=NULL,
    @DiscountAmount DECIMAL(18,2)=0,
    @Notes NVARCHAR(1000)=NULL,
    @TermsAndConditions NVARCHAR(2000)=NULL,
    @Items dbo.SalesInvoiceItemInput READONLY,
    @UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        IF NOT EXISTS(SELECT 1 FROM dbo.SalesInvoices WHERE Id=@Id AND IsDeleted=0 AND Status=1) BEGIN SELECT 409 StatusCode,N'Only draft sales invoices can be updated.' Message; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM dbo.Parties WHERE Id=@CustomerPartyId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 404 StatusCode,N'Customer party was not found.' Message; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM @Items) BEGIN SELECT 400 StatusCode,N'At least one invoice item is required.' Message; RETURN; END
        IF EXISTS(SELECT 1 FROM @Items x WHERE NOT EXISTS(SELECT 1 FROM dbo.Items i WHERE i.Id=x.ItemId AND i.IsDeleted=0 AND i.IsActive=1)) BEGIN SELECT 404 StatusCode,N'One or more items were not found.' Message; RETURN; END

        DECLARE @SubTotal DECIMAL(18,2),@ItemDiscount DECIMAL(18,2),@TaxAmount DECIMAL(18,2),@GrandTotal DECIMAL(18,2),@Paid DECIMAL(18,2),@Due DECIMAL(18,2),@PaymentStatus INT;
        SELECT @Paid=PaidAmount FROM dbo.SalesInvoices WHERE Id=@Id;
        SELECT @SubTotal=SUM(Quantity*Rate),
               @ItemDiscount=SUM(CASE WHEN DiscountAmount>0 THEN DiscountAmount ELSE ROUND((Quantity*Rate)*DiscountPercentage/100,2) END),
               @TaxAmount=SUM(ROUND(((Quantity*Rate)-CASE WHEN DiscountAmount>0 THEN DiscountAmount ELSE ROUND((Quantity*Rate)*DiscountPercentage/100,2) END)*TaxPercentage/100,2))
        FROM @Items;
        SET @GrandTotal=@SubTotal-@ItemDiscount-@DiscountAmount+@TaxAmount;
        IF @DiscountAmount<0 OR @GrandTotal<0 BEGIN SELECT 400 StatusCode,N'Invoice discount is invalid.' Message; RETURN; END
        IF @Paid>@GrandTotal BEGIN SELECT 400 StatusCode,N'Paid amount cannot exceed invoice grand total.' Message; RETURN; END
        SET @Due=@GrandTotal-@Paid;
        SET @PaymentStatus=CASE WHEN @Paid=0 THEN 1 WHEN @Due=0 THEN 3 ELSE 2 END;

        BEGIN TRAN;
        UPDATE dbo.SalesInvoices SET CustomerPartyId=@CustomerPartyId,InvoiceDate=@InvoiceDate,DueDate=@DueDate,SubTotal=@SubTotal,DiscountAmount=@ItemDiscount+@DiscountAmount,TaxAmount=@TaxAmount,GrandTotal=@GrandTotal,DueAmount=@Due,PaymentStatus=@PaymentStatus,Notes=@Notes,TermsAndConditions=@TermsAndConditions,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
        UPDATE dbo.SalesInvoiceItems SET IsDeleted=1,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE SalesInvoiceId=@Id AND IsDeleted=0;
        INSERT dbo.SalesInvoiceItems(SalesInvoiceId,ItemId,ItemNameSnapshot,HsnSacCodeSnapshot,Quantity,UnitId,UnitNameSnapshot,Rate,DiscountPercentage,DiscountAmount,TaxRateId,TaxPercentageSnapshot,TaxAmount,LineTotal,CreatedBy)
        SELECT @Id,i.Id,i.Name,i.HSNCode,x.Quantity,i.UnitId,u.Name,x.Rate,x.DiscountPercentage,
               CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END,
               x.TaxRateId,x.TaxPercentage,
               ROUND(((x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END)*x.TaxPercentage/100,2),
               (x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END+
               ROUND(((x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END)*x.TaxPercentage/100,2),
               @UserId
        FROM @Items x JOIN dbo.Items i ON i.Id=x.ItemId JOIN dbo.Units u ON u.Id=i.UnitId;
        COMMIT; SELECT 200 StatusCode,N'Sales invoice updated.' Message; SELECT @Id;
    END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_Confirm @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        IF NOT EXISTS(SELECT 1 FROM dbo.SalesInvoices WHERE Id=@Id AND IsDeleted=0 AND Status=1) BEGIN SELECT 409 StatusCode,N'Only draft sales invoices can be confirmed.' Message; RETURN; END
        IF EXISTS(
            SELECT 1 FROM dbo.SalesInvoiceItems si JOIN dbo.Items i ON i.Id=si.ItemId
            WHERE si.SalesInvoiceId=@Id AND si.IsDeleted=0 AND i.ItemType=1 AND i.TrackInventory=1 AND i.CurrentStock < si.Quantity
        ) BEGIN SELECT 409 StatusCode,N'Insufficient stock for one or more items.' Message; RETURN; END

        BEGIN TRAN;
        UPDATE i SET CurrentStock=i.CurrentStock-si.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId
        FROM dbo.Items i JOIN dbo.SalesInvoiceItems si ON si.ItemId=i.Id
        WHERE si.SalesInvoiceId=@Id AND si.IsDeleted=0 AND i.ItemType=1 AND i.TrackInventory=1;

        INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy)
        SELECT si.ItemId,N'SalesInvoice',@Id,1,-si.Quantity,@UserId
        FROM dbo.SalesInvoiceItems si JOIN dbo.Items i ON i.Id=si.ItemId
        WHERE si.SalesInvoiceId=@Id AND si.IsDeleted=0 AND i.ItemType=1 AND i.TrackInventory=1;

        UPDATE dbo.SalesInvoices
        SET Status=CASE WHEN DueAmount=0 THEN 4 WHEN PaidAmount>0 THEN 3 ELSE 2 END,
            UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId
        WHERE Id=@Id;
        COMMIT; SELECT 200 StatusCode,N'Sales invoice confirmed.' Message; SELECT @Id;
    END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_Cancel @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        DECLARE @Status INT=(SELECT Status FROM dbo.SalesInvoices WHERE Id=@Id AND IsDeleted=0);
        IF @Status IS NULL BEGIN SELECT 404 StatusCode,N'Sales invoice was not found.' Message; RETURN; END
        IF @Status=5 BEGIN SELECT 409 StatusCode,N'Sales invoice is already cancelled.' Message; RETURN; END

        BEGIN TRAN;
        IF @Status IN(2,3,4)
        BEGIN
            UPDATE i SET CurrentStock=i.CurrentStock+si.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId
            FROM dbo.Items i JOIN dbo.SalesInvoiceItems si ON si.ItemId=i.Id
            WHERE si.SalesInvoiceId=@Id AND si.IsDeleted=0 AND i.ItemType=1 AND i.TrackInventory=1;

            INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy)
            SELECT si.ItemId,N'SalesInvoice',@Id,2,si.Quantity,@UserId
            FROM dbo.SalesInvoiceItems si JOIN dbo.Items i ON i.Id=si.ItemId
            WHERE si.SalesInvoiceId=@Id AND si.IsDeleted=0 AND i.ItemType=1 AND i.TrackInventory=1;
        END
        UPDATE dbo.SalesInvoices SET Status=5,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
        COMMIT; SELECT 200 StatusCode,N'Sales invoice cancelled.' Message; SELECT @Id;
    END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_AddPayment
    @SalesInvoiceId BIGINT,@PaymentDate DATE,@Amount DECIMAL(18,2),@PaymentMode INT,@ReferenceNumber NVARCHAR(100)=NULL,@Notes NVARCHAR(500)=NULL,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        DECLARE @Grand DECIMAL(18,2),@Paid DECIMAL(18,2),@Status INT;
        SELECT @Grand=GrandTotal,@Paid=PaidAmount,@Status=Status FROM dbo.SalesInvoices WHERE Id=@SalesInvoiceId AND IsDeleted=0;
        IF @Status IS NULL BEGIN SELECT 404 StatusCode,N'Sales invoice was not found.' Message; RETURN; END
        IF @Status=5 BEGIN SELECT 409 StatusCode,N'Cannot add payment to a cancelled invoice.' Message; RETURN; END
        IF @Amount<=0 OR @Paid+@Amount>@Grand BEGIN SELECT 400 StatusCode,N'Total paid amount cannot exceed invoice grand total.' Message; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM dbo.PaymentModes WHERE Id=@PaymentMode AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Payment mode is invalid.' Message; RETURN; END

        BEGIN TRAN;
        INSERT dbo.SalesInvoicePayments(SalesInvoiceId,PaymentDate,Amount,PaymentMode,ReferenceNumber,Notes,CreatedBy)
        VALUES(@SalesInvoiceId,@PaymentDate,@Amount,@PaymentMode,@ReferenceNumber,@Notes,@UserId);
        DECLARE @Id BIGINT=SCOPE_IDENTITY();
        SET @Paid=@Paid+@Amount;
        UPDATE dbo.SalesInvoices
        SET PaidAmount=@Paid,DueAmount=GrandTotal-@Paid,
            PaymentStatus=CASE WHEN @Paid=0 THEN 1 WHEN GrandTotal-@Paid=0 THEN 3 ELSE 2 END,
            Status=CASE WHEN Status=1 THEN 1 WHEN GrandTotal-@Paid=0 THEN 4 ELSE 3 END,
            UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId
        WHERE Id=@SalesInvoiceId;
        COMMIT; SELECT 201 StatusCode,N'Sales payment added.' Message;
        SELECT Id, SalesInvoiceId, PaymentDate, Amount, PaymentMode, ReferenceNumber, Notes, CreatedAtUtc FROM dbo.SalesInvoicePayments WHERE Id=@Id;
    END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesReport_Summary @FromDate DATE=NULL,@ToDate DATE=NULL AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT(1) TotalInvoices, COALESCE(SUM(GrandTotal),0) TotalSalesAmount, COALESCE(SUM(PaidAmount),0) TotalPaidAmount, COALESCE(SUM(DueAmount),0) TotalDueAmount
    FROM dbo.SalesInvoices
    WHERE IsDeleted=0 AND Status<>5 AND (@FromDate IS NULL OR InvoiceDate>=@FromDate) AND (@ToDate IS NULL OR InvoiceDate<=@ToDate);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesReport_CustomerReceivables @CustomerPartyId UNIQUEIDENTIFIER=NULL AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.CustomerPartyId, p.PartyName CustomerName, SUM(i.GrandTotal) TotalSales, SUM(i.PaidAmount) PaidAmount, SUM(i.DueAmount) DueAmount
    FROM dbo.SalesInvoices i JOIN dbo.Parties p ON p.Id=i.CustomerPartyId
    WHERE i.IsDeleted=0 AND i.Status<>5 AND (@CustomerPartyId IS NULL OR i.CustomerPartyId=@CustomerPartyId)
    GROUP BY i.CustomerPartyId,p.PartyName HAVING SUM(i.DueAmount)>0 ORDER BY p.PartyName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesReport_ItemWiseSales @FromDate DATE=NULL,@ToDate DATE=NULL,@ItemId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON;
    SELECT si.ItemId, si.ItemNameSnapshot ItemName, SUM(si.Quantity) QuantitySold, SUM(si.LineTotal) TotalAmount
    FROM dbo.SalesInvoiceItems si JOIN dbo.SalesInvoices i ON i.Id=si.SalesInvoiceId
    WHERE si.IsDeleted=0 AND i.IsDeleted=0 AND i.Status IN(2,3,4)
      AND (@FromDate IS NULL OR i.InvoiceDate>=@FromDate) AND (@ToDate IS NULL OR i.InvoiceDate<=@ToDate)
      AND (@ItemId IS NULL OR si.ItemId=@ItemId)
    GROUP BY si.ItemId,si.ItemNameSnapshot ORDER BY si.ItemNameSnapshot;
END;
GO

IF OBJECT_ID(N'dbo.Pages', N'U') IS NOT NULL
BEGIN
    MERGE dbo.Pages AS target
    USING (VALUES
        (N'Sales.Invoice', N'Sales Invoices', N'/sales/invoices', N'receipt', 60),
        (N'Sales.Report', N'Sales Reports', N'/sales/reports', N'chart-column', 61)
    ) AS source(Name, DisplayName, Route, Icon, SortOrder)
    ON target.Name = source.Name
    WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName, Route=source.Route, Icon=source.Icon, SortOrder=source.SortOrder, IsActive=1
    WHEN NOT MATCHED THEN INSERT(Name, DisplayName, Route, Icon, SortOrder, IsActive) VALUES(source.Name, source.DisplayName, source.Route, source.Icon, source.SortOrder, 1);
END;
GO

IF OBJECT_ID(N'dbo.Roles',N'U') IS NOT NULL AND OBJECT_ID(N'dbo.Pages',N'U') IS NOT NULL AND OBJECT_ID(N'dbo.RolePermissions',N'U') IS NOT NULL
BEGIN
    DECLARE @RoleId INT=(SELECT TOP(1) Id FROM dbo.Roles WHERE Name=N'SuperAdmin');
    IF @RoleId IS NOT NULL
    BEGIN
        MERGE dbo.RolePermissions AS target
        USING (SELECT @RoleId RoleId, Id PageId, Name FROM dbo.Pages WHERE Name IN(N'Sales.Invoice',N'Sales.Report')) AS source
        ON target.RoleId=source.RoleId AND target.PageId=source.PageId
        WHEN MATCHED THEN UPDATE SET CanView=1,CanCreate=CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END,CanEdit=CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END,CanDelete=CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END,CanExport=1,CanApprove=CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END
        WHEN NOT MATCHED THEN INSERT(RoleId,PageId,CanView,CanCreate,CanEdit,CanDelete,CanExport,CanApprove)
        VALUES(source.RoleId,source.PageId,1,CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END,CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END,CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END,1,CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END);
    END;
END;
GO
