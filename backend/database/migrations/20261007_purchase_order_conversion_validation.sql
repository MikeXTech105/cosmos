/* Prevent invalid conversion input from reaching the PurchaseBills foreign key. */
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseOrder_Convert
    @Id BIGINT,
    @BillDate DATE,
    @DueDate DATE = NULL,
    @PaymentType INT = 2,
    @PaidAmount DECIMAL(18,2) = 0,
    @SupplierInvoiceNo NVARCHAR(100) = NULL,
    @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.PurchaseOrders WHERE Id = @Id AND IsDeleted = 0 AND Status IN (1,2))
        BEGIN SELECT 409 StatusCode, N'Purchase order cannot be converted.' Message; RETURN; END
        IF NOT EXISTS (SELECT 1 FROM dbo.PaymentModes WHERE Id = @PaymentType AND IsActive = 1)
        BEGIN SELECT 400 StatusCode, N'Payment type is invalid.' Message; RETURN; END

        DECLARE @Supplier UNIQUEIDENTIFIER, @Grand DECIMAL(18,2);
        SELECT @Supplier = SupplierId, @Grand = GrandTotal FROM dbo.PurchaseOrders WHERE Id = @Id;
        IF @PaidAmount < 0 OR @PaidAmount > @Grand
        BEGIN SELECT 400 StatusCode, N'Paid amount is invalid.' Message; RETURN; END

        BEGIN TRAN;
        DECLARE @N BIGINT, @P NVARCHAR(20), @Pad INT;
        SELECT @N = NextNumber, @P = Prefix, @Pad = PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName = N'PurchaseBill';
        IF @N IS NULL
        BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'PurchaseBill',N'PB-',1,6); SELECT @N = 1, @P = N'PB-', @Pad = 6; END
        UPDATE dbo.NumberSequences SET NextNumber = @N + 1, UpdatedAtUtc = SYSUTCDATETIME() WHERE ModuleName = N'PurchaseBill';
        INSERT dbo.PurchaseBills(PurchaseBillNo,SupplierId,SupplierInvoiceNo,BillDate,DueDate,PaymentType,PaymentStatus,SubTotal,DiscountAmount,TaxAmount,RoundOff,GrandTotal,PaidAmount,BalanceAmount,Notes,Status,CreatedBy)
        SELECT @P + RIGHT(REPLICATE('0',@Pad) + CONVERT(VARCHAR,@N),@Pad), SupplierId, @SupplierInvoiceNo, @BillDate, @DueDate, @PaymentType, IIF(@PaidAmount=0,1,IIF(@PaidAmount=@Grand,3,2)), SubTotal, DiscountAmount, TaxAmount, 0, GrandTotal, @PaidAmount, GrandTotal-@PaidAmount, Notes, IIF(@PaidAmount=GrandTotal,4,IIF(@PaidAmount>0,3,2)), @UserId FROM dbo.PurchaseOrders WHERE Id = @Id;
        DECLARE @BillId BIGINT = SCOPE_IDENTITY();
        INSERT dbo.PurchaseBillItems(PurchaseBillId,ItemId,ItemNameSnapshot,Quantity,UnitId,UnitNameSnapshot,PurchasePrice,DiscountPercentage,DiscountAmount,TaxPercentage,TaxAmount,LineTotal,CreatedBy) SELECT @BillId,ItemId,ItemNameSnapshot,Quantity,UnitId,UnitNameSnapshot,PurchasePrice,DiscountPercentage,DiscountAmount,TaxPercentage,TaxAmount,LineTotal,@UserId FROM dbo.PurchaseOrderItems WHERE PurchaseOrderId=@Id AND IsDeleted=0;
        UPDATE i SET CurrentStock=i.CurrentStock+x.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.PurchaseOrderItems x ON x.ItemId=i.Id WHERE x.PurchaseOrderId=@Id AND x.IsDeleted=0 AND i.ItemType=1 AND i.TrackInventory=1;
        INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy) SELECT ItemId,N'PurchaseBill',@BillId,3,Quantity,@UserId FROM dbo.PurchaseOrderItems WHERE PurchaseOrderId=@Id AND IsDeleted=0;
        INSERT dbo.PartyLedgerEntries(PartyId,EntryDate,SourceType,SourceId,EntryType,Amount,CreatedBy) VALUES(@Supplier,@BillDate,N'PurchaseBill',@BillId,N'Purchase',@Grand,@UserId);
        IF @PaidAmount > 0 INSERT dbo.PartyLedgerEntries(PartyId,EntryDate,SourceType,SourceId,EntryType,Amount,CreatedBy) VALUES(@Supplier,@BillDate,N'PurchaseBill',@BillId,N'PaymentOut',-@PaidAmount,@UserId);
        UPDATE dbo.PurchaseOrders SET Status=4,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
        COMMIT;
        SELECT 201 StatusCode, N'Purchase order converted.' Message;
        SELECT @BillId;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK;
        SELECT 500 StatusCode, ERROR_MESSAGE() Message;
    END CATCH
END;
GO
