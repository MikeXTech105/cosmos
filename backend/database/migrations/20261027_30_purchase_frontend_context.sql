SET XACT_ABORT ON;
GO
-- Add real source identities to the existing scoped physical read model. No stock writes.
CREATE OR ALTER PROCEDURE dbo.sp_PurchasePhysical_Read @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Kind NVARCHAR(20)=JSON_VALUE(@RequestJson,'$.kind'),@Version NVARCHAR(18),@Data NVARCHAR(MAX);
 IF @Kind=N'order' SELECT @Version=CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.PurchaseOrders WHERE Id=@Id AND IsDeleted=0;
 ELSE IF @Kind=N'bill' SELECT @Version=CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.PurchaseBills WHERE Id=@Id AND IsDeleted=0;
 ELSE IF @Kind=N'receipt' SELECT @Version=CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.PurchasePhysicalReceipts WHERE Id=@Id AND CompanyKey=@CompanyKey;
 IF @Version IS NULL THROW 51104,N'NOT_FOUND|Purchase source was not found in this catalog.',1;
 SELECT r.*,h.PurchaseOrderId,h.BusinessDate,h.SourceReference,CONVERT(VARCHAR(18),h.RowVersion,1) ReceiptVersion
 INTO #ReceiptLines FROM dbo.PurchasePhysicalReceiptLines r JOIN dbo.PurchasePhysicalReceipts h ON h.Id=r.ReceiptId
 WHERE h.CompanyKey=@CompanyKey AND ((@Kind=N'order' AND h.PurchaseOrderId=@Id) OR (@Kind=N'receipt' AND h.Id=@Id)
 OR (@Kind=N'bill' AND EXISTS(SELECT 1 FROM dbo.PurchaseBillReceiptLinks l JOIN dbo.PurchaseBillItems b ON b.Id=l.BillItemId AND b.IsDeleted=0 WHERE l.ReceiptLineId=r.Id AND l.CompanyKey=@CompanyKey AND b.PurchaseBillId=@Id)));
 SET @Data=(SELECT @Id Id,@Version Version,
 JSON_QUERY((SELECT r.Id,r.PurchaseOrderLineId,r.ItemId,r.UnitId,r.AcceptedQuantity,r.RejectedQuantity,r.QuarantinedQuantity,r.ReturnedAcceptedQuantity,r.ReturnedRejectedQuantity,r.ReturnedQuarantinedQuantity,
 COALESCE((SELECT SUM(l.Quantity) FROM dbo.PurchaseBillReceiptLinks l JOIN dbo.PurchaseBillItems bi ON bi.Id=l.BillItemId JOIN dbo.PurchaseBills b ON b.Id=bi.PurchaseBillId WHERE l.ReceiptLineId=r.Id AND l.CompanyKey=@CompanyKey AND b.Status<>5 AND bi.IsDeleted=0),0) BilledQuantity,
 r.BusinessDate,r.ReceiptId,r.ReceiptVersion,r.SourceReference,r.SourceUnitCost,i.Name ItemName,u.Name UnitName
 FROM #ReceiptLines r JOIN dbo.Items i ON i.Id=r.ItemId JOIN dbo.Units u ON u.Id=r.UnitId ORDER BY r.BusinessDate,r.Id FOR JSON PATH,INCLUDE_NULL_VALUES)) Lines,
 JSON_QUERY((SELECT x.Id,r.ReceiptId,x.ReceiptLineId,x.BusinessDate,x.AcceptedQuantity,x.RejectedQuantity,x.QuarantinedQuantity,x.Reason,c.Id PurchaseReturnId,ci.PurchaseBillItemId BillItemId
 FROM dbo.PurchasePhysicalReturns x JOIN #ReceiptLines r ON r.Id=x.ReceiptLineId
 LEFT JOIN dbo.PurchaseReturns c ON c.PhysicalReceiptReturnId=x.Id AND c.IsDeleted=0
 LEFT JOIN dbo.PurchaseReturnItems ci ON ci.PurchaseReturnId=c.Id AND ci.IsDeleted=0
 WHERE x.CompanyKey=@CompanyKey ORDER BY x.BusinessDate,x.Id FOR JSON PATH,INCLUDE_NULL_VALUES)) Returns,
 JSON_QUERY((SELECT l.Id,l.ReceiptLineId,l.BillItemId,b.PurchaseBillId,l.Quantity,h.PurchaseBillNo,h.Status BillStatus FROM dbo.PurchaseBillReceiptLinks l JOIN #ReceiptLines r ON r.Id=l.ReceiptLineId JOIN dbo.PurchaseBillItems b ON b.Id=l.BillItemId AND b.IsDeleted=0 JOIN dbo.PurchaseBills h ON h.Id=b.PurchaseBillId AND h.IsDeleted=0 AND h.Status<>5 WHERE l.CompanyKey=@CompanyKey ORDER BY l.Id FOR JSON PATH)) BillLinks,
 JSON_QUERY((SELECT h.Id,h.PreviousDate,h.ExpectedDate,h.Reason,h.CreatedAtUtc FROM dbo.PurchasePromiseHistory h WHERE h.CompanyKey=@CompanyKey AND ((@Kind=N'order' AND h.PurchaseOrderId=@Id) OR EXISTS(SELECT 1 FROM #ReceiptLines r WHERE r.PurchaseOrderId=h.PurchaseOrderId)) ORDER BY h.Id FOR JSON PATH,INCLUDE_NULL_VALUES)) PromiseHistory,
 JSON_QUERY((SELECT l.Id,l.ItemId,i.UnitId,l.Quantity OrderedQuantity,i.Name ItemName,u.Name UnitName FROM dbo.PurchaseOrderItems l JOIN dbo.Items i ON i.Id=l.ItemId JOIN dbo.Units u ON u.Id=i.UnitId WHERE l.IsDeleted=0 AND ((@Kind=N'order' AND l.PurchaseOrderId=@Id) OR EXISTS(SELECT 1 FROM #ReceiptLines r WHERE r.PurchaseOrderId=l.PurchaseOrderId)) ORDER BY l.Id FOR JSON PATH,INCLUDE_NULL_VALUES)) OrderLines
 FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
