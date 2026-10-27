SET XACT_ABORT ON;
GO
/* Only real, dated PO supply inside the 21-day top-up horizon is eligible here.
   Untimed external inbound snapshots remain a procurement basis, not fabricated dated receipts. */
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ProductionPlanning_Inputs'));
IF CHARINDEX(N'EligibleInboundQuantity',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N'COALESCE(o.OpenOutput,0) OpenReleasedOutput,',N'COALESCE(o.OpenOutput,0) OpenReleasedOutput,COALESCE(inbound.Quantity,0) EligibleInboundQuantity,CASE WHEN COALESCE(inbound.Undated,0)>0 THEN N''UNDATED_INBOUND_EXCLUDED'' ELSE NULL END InboundDataQualityFlag,');
 SET @Definition=REPLACE(@Definition,N'WHERE i.IsManufactured=1',N'OUTER APPLY(SELECT SUM(CASE WHEN h.ExpectedDeliveryDate<=DATEADD(DAY,21,@AsOf) AND p.Quantity>COALESCE(r.Accepted,0) THEN p.Quantity-COALESCE(r.Accepted,0) ELSE 0 END) Quantity,SUM(CASE WHEN h.ExpectedDeliveryDate IS NULL THEN 1 ELSE 0 END) Undated FROM dbo.PurchaseOrderItems p JOIN dbo.PurchaseOrders h ON h.Id=p.PurchaseOrderId OUTER APPLY(SELECT SUM(AcceptedQuantity) Accepted FROM dbo.PurchasePhysicalReceiptLines WHERE PurchaseOrderLineId=p.Id) r WHERE p.ItemId=i.Id AND p.IsDeleted=0 AND h.IsDeleted=0 AND h.Status IN(2,3) AND h.OrderDate<=@AsOf) inbound WHERE i.IsManufactured=1');
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
END;
GO
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID('dbo.ufn_ProductionPlanRevision'));
IF CHARINDEX(N'FINISHED_INBOUND_REVISION',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N'DECLARE @Parts NVARCHAR(MAX),@Demand NVARCHAR(MAX);',N'DECLARE @Parts NVARCHAR(MAX),@Demand NVARCHAR(MAX),@Inbound NVARCHAR(MAX); /* FINISHED_INBOUND_REVISION */ SELECT @Inbound=STRING_AGG(CONVERT(NVARCHAR(MAX),CONCAT(p.Id,N'':'',p.Quantity,N'':'',h.Status,N'':'',h.ExpectedDeliveryDate,N'':'',h.IsDeleted,N'':'',p.IsDeleted,N'':'',r.Accepted)),N'';'') WITHIN GROUP(ORDER BY p.Id) FROM dbo.PurchaseOrderItems p JOIN dbo.PurchaseOrders h ON h.Id=p.PurchaseOrderId OUTER APPLY(SELECT SUM(AcceptedQuantity) Accepted FROM dbo.PurchasePhysicalReceiptLines WHERE PurchaseOrderLineId=p.Id) r WHERE p.ItemId=@ItemId;');
 SET @Definition=REPLACE(@Definition,N'i.UnitId,N'':''',N'i.UnitId,N'':'',@Inbound,N'':''');
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'FUNCTION',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
END;
GO
