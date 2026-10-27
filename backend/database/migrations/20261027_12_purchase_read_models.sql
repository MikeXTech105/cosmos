SET XACT_ABORT ON;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchasePhysical_Read @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Kind NVARCHAR(20)=JSON_VALUE(@RequestJson,'$.kind'),@Version NVARCHAR(18),@Data NVARCHAR(MAX);
 IF @Kind=N'order' SELECT @Version=CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.PurchaseOrders WHERE Id=@Id AND IsDeleted=0;
 ELSE IF @Kind=N'bill' SELECT @Version=CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.PurchaseBills WHERE Id=@Id AND IsDeleted=0;
 ELSE IF @Kind=N'receipt' SELECT @Version=CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.PurchasePhysicalReceipts WHERE Id=@Id AND CompanyKey=@CompanyKey;
 IF @Version IS NULL THROW 51104,N'NOT_FOUND|Purchase source was not found in this catalog.',1;
 SET @Data=(SELECT @Id Id,@Version Version,JSON_QUERY((SELECT r.Id,r.PurchaseOrderLineId,r.ItemId,r.UnitId,r.AcceptedQuantity,r.RejectedQuantity,r.QuarantinedQuantity,r.ReturnedAcceptedQuantity,r.ReturnedRejectedQuantity,r.ReturnedQuarantinedQuantity,
  COALESCE((SELECT SUM(l.Quantity) FROM dbo.PurchaseBillReceiptLinks l JOIN dbo.PurchaseBillItems bi ON bi.Id=l.BillItemId JOIN dbo.PurchaseBills b ON b.Id=bi.PurchaseBillId WHERE l.ReceiptLineId=r.Id AND l.CompanyKey=@CompanyKey AND b.Status<>5 AND bi.IsDeleted=0),0) BilledQuantity,h.BusinessDate
  FROM dbo.PurchasePhysicalReceiptLines r JOIN dbo.PurchasePhysicalReceipts h ON h.Id=r.ReceiptId WHERE h.CompanyKey=@CompanyKey AND((@Kind=N'order' AND h.PurchaseOrderId=@Id) OR(@Kind=N'receipt' AND h.Id=@Id) OR(@Kind=N'bill' AND EXISTS(SELECT 1 FROM dbo.PurchaseBillReceiptLinks l JOIN dbo.PurchaseBillItems b ON b.Id=l.BillItemId WHERE l.ReceiptLineId=r.Id AND l.CompanyKey=@CompanyKey AND b.PurchaseBillId=@Id))) ORDER BY h.BusinessDate,r.Id FOR JSON PATH)) Lines FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchasePhysical_Followups @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Date DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.asOfDate')),@Supplier UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(@RequestJson,'$.supplierId')),@Overdue BIT=CASE JSON_VALUE(@RequestJson,'$.overdueOnly') WHEN N'true' THEN 1 ELSE 0 END,
 @Page INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.pageNumber')),1),@Size INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.pageSize')),50),@Data NVARCHAR(MAX);
 IF @Date IS NULL THROW 51100,N'INVALID_ASOF|An explicit follow-up business date is required.',1;
 SET @Page=IIF(@Page<1,1,@Page);SET @Size=IIF(@Size<1,1,IIF(@Size>200,200,@Size));
 SELECT p.Id PurchaseOrderId,p.PurchaseOrderNo,p.SupplierId,l.Id PurchaseOrderLineId,l.ItemId,COALESCE(l.UnitId,i.UnitId) UnitId,p.OrderDate,p.ExpectedDeliveryDate ExpectedDate,l.Quantity OrderedQuantity,
  COALESCE(r.Accepted,0) AcceptedQuantity,COALESCE(r.Rejected,0) RejectedQuantity,COALESCE(r.Quarantine,0) QuarantinedQuantity,COALESCE(r.Returned,0) ReturnedQuantity,
  CASE WHEN p.Status IN(4,5) THEN 0 WHEN l.Quantity>=COALESCE(r.Accepted,0) THEN l.Quantity-COALESCE(r.Accepted,0) ELSE NULL END PendingQuantity,
  CONVERT(BIT,CASE WHEN p.ExpectedDeliveryDate<@Date AND p.Status NOT IN(4,5) AND l.Quantity>COALESCE(r.Accepted,0) THEN 1 ELSE 0 END) IsOverdue
 INTO #Followup FROM dbo.PurchaseOrders p JOIN dbo.PurchaseOrderItems l ON l.PurchaseOrderId=p.Id AND l.IsDeleted=0 JOIN dbo.Items i ON i.Id=l.ItemId
 OUTER APPLY(SELECT SUM(x.AcceptedQuantity) Accepted,SUM(x.RejectedQuantity) Rejected,SUM(x.QuarantinedQuantity) Quarantine,SUM(x.ReturnedAcceptedQuantity+x.ReturnedRejectedQuantity+x.ReturnedQuarantinedQuantity) Returned FROM dbo.PurchasePhysicalReceiptLines x JOIN dbo.PurchasePhysicalReceipts h ON h.Id=x.ReceiptId AND h.CompanyKey=@CompanyKey WHERE x.PurchaseOrderLineId=l.Id AND h.BusinessDate<=@Date) r
 WHERE p.IsDeleted=0 AND p.OrderDate<=@Date AND(@Supplier IS NULL OR p.SupplierId=@Supplier);
 IF @Overdue=1 DELETE #Followup WHERE IsOverdue=0;
 SET @Data=(SELECT JSON_QUERY((SELECT * FROM #Followup ORDER BY IsOverdue DESC,ExpectedDate,PurchaseOrderId,PurchaseOrderLineId OFFSET (@Page-1)*@Size ROWS FETCH NEXT @Size ROWS ONLY FOR JSON PATH,INCLUDE_NULL_VALUES)) Items,@Page PageNumber,@Size PageSize,(SELECT COUNT(*) FROM #Followup) TotalCount,
 JSON_QUERY((SELECT UnitId,SUM(OrderedQuantity) OrderedQuantity,SUM(AcceptedQuantity) AcceptedQuantity,SUM(PendingQuantity) PendingQuantity FROM #Followup GROUP BY UnitId FOR JSON PATH,INCLUDE_NULL_VALUES)) Summary FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
