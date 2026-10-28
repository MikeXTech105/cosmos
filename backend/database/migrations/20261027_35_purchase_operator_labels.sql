SET XACT_ABORT ON;
GO
/* Add existing Party/Item/Unit labels to operational reads without changing physical/financial calculations. */
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
  CONVERT(BIT,CASE WHEN p.ExpectedDeliveryDate<@Date AND p.Status NOT IN(4,5) AND l.Quantity>COALESCE(r.Accepted,0) THEN 1 ELSE 0 END) IsOverdue,
  party.PartyName SupplierName,i.Name ItemName,u.Name UnitName
 INTO #Followup FROM dbo.PurchaseOrders p JOIN dbo.PurchaseOrderItems l ON l.PurchaseOrderId=p.Id AND l.IsDeleted=0 JOIN dbo.Items i ON i.Id=l.ItemId
 LEFT JOIN dbo.Parties party ON party.Id=p.SupplierId LEFT JOIN dbo.Units u ON u.Id=COALESCE(l.UnitId,i.UnitId)
 OUTER APPLY(SELECT SUM(x.AcceptedQuantity) Accepted,SUM(x.RejectedQuantity) Rejected,SUM(x.QuarantinedQuantity) Quarantine,SUM(x.ReturnedAcceptedQuantity+x.ReturnedRejectedQuantity+x.ReturnedQuarantinedQuantity) Returned FROM dbo.PurchasePhysicalReceiptLines x JOIN dbo.PurchasePhysicalReceipts h ON h.Id=x.ReceiptId AND h.CompanyKey=@CompanyKey WHERE x.PurchaseOrderLineId=l.Id AND h.BusinessDate<=@Date) r
 WHERE p.IsDeleted=0 AND p.OrderDate<=@Date AND(@Supplier IS NULL OR p.SupplierId=@Supplier);
 IF @Overdue=1 DELETE #Followup WHERE IsOverdue=0;
 SET @Data=(SELECT JSON_QUERY((SELECT * FROM #Followup ORDER BY IsOverdue DESC,ExpectedDate,PurchaseOrderId,PurchaseOrderLineId OFFSET (@Page-1)*@Size ROWS FETCH NEXT @Size ROWS ONLY FOR JSON PATH,INCLUDE_NULL_VALUES)) Items,@Page PageNumber,@Size PageSize,(SELECT COUNT(*) FROM #Followup) TotalCount,
 JSON_QUERY((SELECT UnitId,MAX(UnitName) UnitName,SUM(OrderedQuantity) OrderedQuantity,SUM(AcceptedQuantity) AcceptedQuantity,SUM(PendingQuantity) PendingQuantity FROM #Followup GROUP BY UnitId FOR JSON PATH,INCLUDE_NULL_VALUES)) Summary FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseSupplier_Performance @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @From DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.fromDate')),@To DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.toDate')),@Supplier UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(@RequestJson,'$.supplierId')),
 @Page INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.pageNumber')),1),@Size INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.pageSize')),50),@Data NVARCHAR(MAX);
 SELECT h.SupplierId,l.UnitId,SUM(l.AcceptedQuantity) AcceptedQuantity,SUM(l.ReturnedAcceptedQuantity+l.ReturnedRejectedQuantity+l.ReturnedQuarantinedQuantity) ReturnedQuantity,
 SUM(CASE WHEN h.ExpectedDateSnapshot IS NOT NULL AND h.BusinessDate<=h.ExpectedDateSnapshot THEN l.AcceptedQuantity ELSE 0 END) OnTimeAcceptedQuantity,
 SUM(CASE WHEN h.ExpectedDateSnapshot IS NOT NULL THEN l.AcceptedQuantity ELSE 0 END) DatedAcceptedQuantity,
 SUM(CASE WHEN h.ExpectedDateSnapshot IS NULL THEN l.AcceptedQuantity ELSE 0 END) UndatedAcceptedQuantity,
 SUM(CAST(DATEDIFF(DAY,o.OrderDate,h.BusinessDate) AS DECIMAL(22,6))*l.AcceptedQuantity)/NULLIF(SUM(l.AcceptedQuantity),0) QuantityWeightedLeadDays,
 MAX(party.PartyName) SupplierName,MAX(u.Name) UnitName
 INTO #Performance FROM dbo.PurchasePhysicalReceipts h JOIN dbo.PurchasePhysicalReceiptLines l ON l.ReceiptId=h.Id JOIN dbo.PurchaseOrders o ON o.Id=h.PurchaseOrderId
 LEFT JOIN dbo.Parties party ON party.Id=h.SupplierId LEFT JOIN dbo.Units u ON u.Id=l.UnitId
 OUTER APPLY(SELECT TOP(1) ph.ExpectedDate FROM dbo.PurchasePromiseHistory ph WHERE ph.CompanyKey=@CompanyKey AND ph.PurchaseOrderId=o.Id AND ph.CreatedAtUtc<=h.CreatedAtUtc ORDER BY ph.Id DESC) p
 WHERE h.CompanyKey=@CompanyKey AND h.BusinessDate BETWEEN @From AND @To AND(@Supplier IS NULL OR h.SupplierId=@Supplier) GROUP BY h.SupplierId,l.UnitId;
 SET @Data=(SELECT JSON_QUERY((SELECT *,OnTimeAcceptedQuantity*100.0/NULLIF(DatedAcceptedQuantity,0) OnTimePercent FROM #Performance ORDER BY SupplierId,UnitId OFFSET(@Page-1)*@Size ROWS FETCH NEXT @Size ROWS ONLY FOR JSON PATH,INCLUDE_NULL_VALUES)) Items,@Page PageNumber,@Size PageSize,(SELECT COUNT(*) FROM #Performance) TotalCount,
 JSON_QUERY((SELECT UnitId,MAX(UnitName) UnitName,SUM(AcceptedQuantity) AcceptedQuantity,SUM(ReturnedQuantity) ReturnedQuantity,SUM(OnTimeAcceptedQuantity) OnTimeAcceptedQuantity,SUM(DatedAcceptedQuantity) DatedAcceptedQuantity,SUM(UndatedAcceptedQuantity) UndatedAcceptedQuantity,SUM(OnTimeAcceptedQuantity)*100.0/NULLIF(SUM(DatedAcceptedQuantity),0) OnTimePercent FROM #Performance GROUP BY UnitId FOR JSON PATH,INCLUDE_NULL_VALUES)) Summary FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
