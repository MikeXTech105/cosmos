SET XACT_ABORT ON;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionWorkspace_Context @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Kind NVARCHAR(30)=JSON_VALUE(@RequestJson,'$.kind'),@Data NVARCHAR(MAX);
 IF @Kind=N'order'
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM dbo.ProductionOrders WHERE Id=@Id AND CompanyKey=@CompanyKey) THROW 51104,N'NOT_FOUND|Production order was not found.',1;
  SET @Data=(SELECT JSON_QUERY((SELECT Id,OrderNumber,Status,BusinessDate,PlannedStart,DueDate,ItemId,UnitId,BomId,RoutingId,PlannedQuantity,ReleasedQuantity,CompletedQuantity,RejectedQuantity,RemainingQuantity,Version,Notes FROM dbo.vw_ProductionOrderContract WHERE Id=@Id AND CompanyKey=@CompanyKey FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES)) [Order],
   JSON_QUERY((SELECT * FROM dbo.ProductionOrderMaterials WHERE OrderId=@Id ORDER BY ItemId FOR JSON PATH)) Materials,
   (SELECT BomSnapshotJson FROM dbo.ProductionOrders WHERE Id=@Id AND CompanyKey=@CompanyKey) BomSnapshotJson,
   (SELECT RouteSnapshotJson FROM dbo.ProductionOrders WHERE Id=@Id AND CompanyKey=@CompanyKey) RouteSnapshotJson,
   JSON_QUERY((SELECT Id,BusinessDate,OccurredAt,GoodOutput,RejectedOutput,MachineId,MouldId,ShiftId,ReversalOfId,ReversedById,SourceReference,VarianceReason FROM dbo.ProductionCompletions WHERE OrderId=@Id AND CompanyKey=@CompanyKey ORDER BY Id FOR JSON PATH,INCLUDE_NULL_VALUES)) Completions
   FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES);
 END
 ELSE IF @Kind=N'item'
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@Id AND IsDeleted=0) THROW 51104,N'NOT_FOUND|Item was not found in this catalog.',1;
  SET @Data=(SELECT JSON_QUERY((SELECT r.Id,r.Revision,r.EffectiveFrom,r.EffectiveTo,r.IsActive,CONVERT(VARCHAR(18),r.RowVersion,1) Version,
   JSON_QUERY((SELECT Sequence,OperationId,WorkCentreId,RateBasis,Rate,SetupMinutes,QuantityBasis,MachineId,MouldId FROM dbo.ItemProductionRoutingSteps WHERE RoutingId=r.Id ORDER BY Sequence FOR JSON PATH,INCLUDE_NULL_VALUES)) Steps
   FROM dbo.ItemProductionRoutings r WHERE r.ItemId=@Id AND r.CompanyKey=@CompanyKey ORDER BY r.EffectiveFrom,r.Id FOR JSON PATH,INCLUDE_NULL_VALUES)) Routings,
   JSON_QUERY((SELECT Id,MachineId,MouldId,SkuOutputPerShot,EffectiveFrom,EffectiveTo,IsActive,CONVERT(VARCHAR(18),RowVersion,1) Version FROM dbo.ItemProductionEligibility WHERE ItemId=@Id AND CompanyKey=@CompanyKey ORDER BY EffectiveFrom,Id FOR JSON PATH,INCLUDE_NULL_VALUES)) Eligibility,JSON_QUERY(N'[]') Shifts FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 END
 ELSE IF @Kind=N'work-centre'
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM dbo.ProductionWorkCentres WHERE Id=@Id AND CompanyKey=@CompanyKey) THROW 51104,N'NOT_FOUND|Work centre was not found.',1;
  SET @Data=(SELECT JSON_QUERY(N'[]') Routings,JSON_QUERY(N'[]') Eligibility,
   JSON_QUERY((SELECT Id,ShiftId,EffectiveFrom,EffectiveTo,BreakMinutes,CapacityFactor,IsActive,CONVERT(VARCHAR(18),RowVersion,1) Version FROM dbo.ProductionWorkCentreShifts WHERE WorkCentreId=@Id AND CompanyKey=@CompanyKey ORDER BY EffectiveFrom,Id FOR JSON PATH,INCLUDE_NULL_VALUES)) Shifts FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 END ELSE THROW 51100,N'INVALID_CONTEXT|Unknown workspace context.',1;
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PhysicalInventory_Read @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Kind NVARCHAR(30)=JSON_VALUE(@RequestJson,'$.kind'),@Data NVARCHAR(MAX);
 IF @Kind=N'invoice'
  SET @Data=(SELECT h.Id,CONVERT(VARCHAR(18),h.RowVersion,1) Version,JSON_QUERY((SELECT Id InvoiceLineId,ItemId,UnitId,Quantity,InventoryOwner Owner FROM dbo.SalesInvoiceItems WHERE SalesInvoiceId=@Id AND IsDeleted=0 ORDER BY Id FOR JSON PATH,INCLUDE_NULL_VALUES)) Lines FROM dbo.SalesInvoices h WHERE h.Id=@Id AND h.IsDeleted=0 FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 ELSE IF @Kind=N'shipment'
  SET @Data=(SELECT h.Id,CONVERT(VARCHAR(18),h.RowVersion,1) Version,JSON_QUERY((SELECT l.InvoiceLineId,l.ShipmentItemId,s.ItemId,i.UnitId,l.Quantity,2 Owner FROM dbo.ShipmentInvoiceLineLinks l JOIN dbo.ShipmentItems s ON s.Id=l.ShipmentItemId JOIN dbo.Items i ON i.Id=s.ItemId WHERE s.ShipmentId=@Id AND l.CompanyKey=@CompanyKey ORDER BY s.Id,l.InvoiceLineId FOR JSON PATH)) Lines FROM dbo.Shipments h WHERE h.Id=@Id AND h.IsDeleted=0 FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 ELSE THROW 51100,N'INVALID_CONTEXT|Unknown physical ownership context.',1;
 IF @Data IS NULL THROW 51104,N'NOT_FOUND|The invoice or shipment was not found in this catalog.',1;
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
