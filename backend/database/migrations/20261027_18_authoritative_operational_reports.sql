SET XACT_ABORT ON;
GO
CREATE OR ALTER FUNCTION dbo.ufn_ProductionStockAsOf(@CompanyKey NVARCHAR(64),@AsOf DATE,@CurrentBusinessDate DATE)
RETURNS TABLE AS RETURN
 SELECT i.Id ItemId,i.UnitId,o.Id OpeningId,o.CutoverDate,
 CASE WHEN o.Id IS NULL OR o.UnitId<>i.UnitId OR COALESCE(m.UnknownUnits,0)>0 OR COALESCE(m.Undated,0)>0 THEN NULL ELSE o.Quantity+COALESCE(m.Quantity,0) END OnHandQuantity,
 CASE WHEN @AsOf=@CurrentBusinessDate THEN i.ReservedStock WHEN o.Id IS NOT NULL THEN COALESCE(e.OwnedReserved,0) ELSE NULL END ReservedQuantity,
 COALESCE(e.OwnedReserved,0) OwnedReservedQuantity,i.CurrentStock CurrentCachedQuantity,
 CASE WHEN o.Id IS NULL THEN N'APPROVED_OPENING_REQUIRED' WHEN o.UnitId<>i.UnitId THEN N'OPENING_UNIT_CHANGED'
 WHEN COALESCE(m.Undated,0)>0 THEN N'UNDATED_LEDGER_EVENTS' WHEN COALESCE(m.UnknownUnits,0)>0 THEN N'UNVERIFIED_LEDGER_UNITS'
 WHEN @AsOf=@CurrentBusinessDate AND o.Quantity+COALESCE(m.Quantity,0)<>i.CurrentStock THEN N'CACHE_LEDGER_DIFFERENCE' ELSE NULL END DataQualityFlag
 FROM dbo.Items i
 OUTER APPLY(SELECT TOP(1) * FROM dbo.ProductionApprovedOpenings WHERE CompanyKey=@CompanyKey AND ItemId=i.Id AND CutoverDate<=@AsOf ORDER BY CutoverDate DESC,Id DESC) o
 OUTER APPLY(SELECT SUM(CASE WHEN BusinessDate>=o.CutoverDate AND BusinessDate<=@AsOf THEN Quantity ELSE 0 END) Quantity,
  SUM(CASE WHEN BusinessDate>=o.CutoverDate AND BusinessDate<=@AsOf AND(UnitIdSnapshot IS NULL OR UnitIdSnapshot<>o.UnitId) THEN 1 ELSE 0 END) UnknownUnits,
  SUM(CASE WHEN BusinessDate IS NULL THEN 1 ELSE 0 END) Undated FROM dbo.StockMovements WHERE ItemId=i.Id AND(CompanyKey=@CompanyKey OR CompanyKey IS NULL) AND SourceType<>N'CutoverOpening') m
 OUTER APPLY(SELECT SUM(e.ReservedDelta-e.ConsumedDelta-e.ReleasedDelta) OwnedReserved FROM dbo.ProductionReservationEvents e JOIN dbo.ProductionReservations r ON r.Id=e.ReservationId WHERE r.ItemId=i.Id AND e.CompanyKey=@CompanyKey AND e.BusinessDate<=@AsOf) e
 WHERE i.TrackInventory=1 OR EXISTS(SELECT 1 FROM dbo.StockMovements WHERE ItemId=i.Id);
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionOperationalReport_Read @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Kind NVARCHAR(30)=JSON_VALUE(@RequestJson,'$.kind'),@AsOf DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.query.asOfDate')),@Today DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.currentBusinessDate')),
 @From DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.query.fromDate')),@To DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.query.toDate')),@Item BIGINT=COALESCE(TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.query.itemId')),TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.query.finishedItemId'))),@Channel BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.query.channelId')),
 @Search NVARCHAR(200)=JSON_VALUE(@RequestJson,'$.query.search'),@Page INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.query.pageNumber')),1),@Size INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.query.pageSize')),50),@Data NVARCHAR(MAX);
 SET @Page=IIF(@Page<1,1,@Page);SET @Size=IIF(@Size<1,1,IIF(@Size>200,200,@Size));
 CREATE TABLE #Rows(SourceId BIGINT,SourceType NVARCHAR(50),BusinessDate DATE NULL,ItemId BIGINT,UnitId BIGINT NULL,ChannelId BIGINT NULL,
 GoodOutput DECIMAL(22,6) NULL,RejectedOutput DECIMAL(22,6) NULL,DispatchedQuantity DECIMAL(22,6) NULL,ReturnedQuantity DECIMAL(22,6) NULL,PlannedQuantity DECIMAL(22,6) NULL,
 OnHandQuantity DECIMAL(22,6) NULL,ReservedQuantity DECIMAL(22,6) NULL,AvailableQuantity DECIMAL(22,6) NULL,ReconciliationDifference DECIMAL(22,6) NULL,DataQualityFlag NVARCHAR(200) NULL,
 ItemCode NVARCHAR(50) NULL,ItemName NVARCHAR(200) NULL,UnitName NVARCHAR(100) NULL,SourceLineId BIGINT NULL,SignedQuantity DECIMAL(22,6) NULL,OwnedReservedQuantity DECIMAL(22,6) NULL,RequiredMinutes DECIMAL(22,6) NULL,DueDate DATE NULL,OnTime BIT NULL);
 IF @Kind=N'stock-as-of'
 BEGIN
  IF @AsOf IS NULL THROW 51100,N'ASOF_REQUIRED|An explicit business date is required.',1;
  INSERT #Rows(SourceId,SourceType,BusinessDate,ItemId,UnitId,OnHandQuantity,ReservedQuantity,OwnedReservedQuantity,AvailableQuantity,ReconciliationDifference,DataQualityFlag)
  SELECT s.ItemId,N'StockAsOf',@AsOf,s.ItemId,s.UnitId,s.OnHandQuantity,s.ReservedQuantity,s.OwnedReservedQuantity,s.OnHandQuantity-s.ReservedQuantity,
  CASE WHEN @AsOf=@Today THEN s.CurrentCachedQuantity-s.OnHandQuantity ELSE NULL END,s.DataQualityFlag FROM dbo.ufn_ProductionStockAsOf(@CompanyKey,@AsOf,@Today) s;
 END
 ELSE IF @Kind=N'ledger'
  INSERT #Rows(SourceId,SourceType,BusinessDate,ItemId,UnitId,SourceLineId,SignedQuantity,DataQualityFlag)
  SELECT SourceId,SourceType,BusinessDate,ItemId,UnitIdSnapshot,SourceLineId,Quantity,CASE WHEN BusinessDate IS NULL THEN N'BUSINESS_DATE_UNAVAILABLE' WHEN UnitIdSnapshot IS NULL THEN N'POSTED_UNIT_UNAVAILABLE' ELSE NULL END FROM dbo.StockMovements WHERE CompanyKey=@CompanyKey OR CompanyKey IS NULL;
 ELSE IF @Kind=N'scorecard'
 BEGIN
  INSERT #Rows(SourceId,SourceType,BusinessDate,ItemId,UnitId,ChannelId,GoodOutput,RejectedOutput)
  SELECT c.Id,CASE WHEN c.ReversalOfId IS NULL THEN N'ProductionCompletion' ELSE N'ProductionReversal' END,c.BusinessDate,o.ItemId,o.UnitId,o.ChannelId,
  c.GoodOutput*CASE WHEN c.ReversalOfId IS NULL THEN 1 ELSE -1 END,c.RejectedOutput*CASE WHEN c.ReversalOfId IS NULL THEN 1 ELSE -1 END FROM dbo.ProductionCompletions c JOIN dbo.ProductionOrders o ON o.Id=c.OrderId AND o.CompanyKey=c.CompanyKey WHERE c.CompanyKey=@CompanyKey;
  INSERT #Rows(SourceId,SourceType,BusinessDate,ItemId,UnitId,GoodOutput,DataQualityFlag)
  SELECT sm.SourceId,sm.SourceType,sm.BusinessDate,sm.ItemId,sm.UnitIdSnapshot,sm.Quantity,CASE WHEN sm.UnitIdSnapshot IS NULL THEN N'LEGACY_OUTPUT_UNIT_UNAVAILABLE' ELSE NULL END
  FROM dbo.StockMovements sm JOIN dbo.ManufacturingProductions p ON p.Id=sm.SourceId AND p.FinishedItemId=sm.ItemId WHERE sm.SourceType IN(N'ManufacturingProduction',N'ManufacturingCancellation') AND(sm.CompanyKey=@CompanyKey OR sm.CompanyKey IS NULL);
  INSERT #Rows(SourceId,SourceType,BusinessDate,ItemId,UnitId,ChannelId,DispatchedQuantity,DataQualityFlag)
  SELECT sm.SourceId,sm.SourceType,sm.BusinessDate,sm.ItemId,sm.UnitIdSnapshot,s.ChannelId,-sm.Quantity,CASE WHEN sm.UnitIdSnapshot IS NULL THEN N'LEGACY_DISPATCH_UNIT_UNAVAILABLE' ELSE NULL END FROM dbo.StockMovements sm LEFT JOIN dbo.Shipments s ON s.Id=sm.SourceId AND sm.SourceType=N'ShipmentDispatch' WHERE sm.SourceType IN(N'ShipmentDispatch',N'SalesInvoice') AND(sm.CompanyKey=@CompanyKey OR sm.CompanyKey IS NULL);
  INSERT #Rows(SourceId,SourceType,BusinessDate,ItemId,UnitId,ChannelId,ReturnedQuantity,DataQualityFlag)
  SELECT sm.SourceId,sm.SourceType,sm.BusinessDate,sm.ItemId,sm.UnitIdSnapshot,s.ChannelId,sm.Quantity,CASE WHEN sm.UnitIdSnapshot IS NULL THEN N'LEGACY_RETURN_UNIT_UNAVAILABLE' ELSE NULL END FROM dbo.StockMovements sm JOIN dbo.ShipmentReturnItems ri ON ri.Id=sm.SourceId JOIN dbo.ShipmentItems si ON si.Id=ri.ShipmentItemId JOIN dbo.Shipments s ON s.Id=si.ShipmentId WHERE sm.SourceType=N'ShipmentReturn' AND(sm.CompanyKey=@CompanyKey OR sm.CompanyKey IS NULL);
  INSERT #Rows(SourceId,SourceType,BusinessDate,ItemId,UnitId,ChannelId,GoodOutput,DispatchedQuantity)
  SELECT Id,CASE Disposition WHEN 1 THEN N'ImportedProductionHistory' ELSE N'ImportedDispatchHistory' END,BusinessDate,ItemId,UnitId,ChannelId,CASE WHEN Disposition=1 THEN BaseQuantity END,CASE WHEN Disposition=2 THEN BaseQuantity END FROM dbo.ProductionImportedHistory WHERE CompanyKey=@CompanyKey AND IsEffective=1 AND Disposition IN(1,2);
 END
 ELSE IF @Kind=N'plan-actual'
  INSERT #Rows(SourceId,SourceType,BusinessDate,ItemId,UnitId,ChannelId,GoodOutput,RejectedOutput,PlannedQuantity,DueDate,OnTime)
  SELECT o.Id,N'ProductionOrder',o.BusinessDate,o.ItemId,o.UnitId,o.ChannelId,o.CompletedQuantity,o.RejectedQuantity,o.ReleasedQuantity,o.DueDate,
  CASE WHEN o.Status=4 AND c.LastCompletion IS NOT NULL THEN CONVERT(BIT,CASE WHEN c.LastCompletion<=o.DueDate THEN 1 ELSE 0 END) ELSE NULL END
  FROM dbo.ProductionOrders o OUTER APPLY(SELECT MAX(BusinessDate) LastCompletion FROM dbo.ProductionCompletions WHERE OrderId=o.Id AND CompanyKey=@CompanyKey AND ReversalOfId IS NULL AND ReversedById IS NULL) c WHERE o.CompanyKey=@CompanyKey;
 ELSE IF @Kind=N'capacity'
  INSERT #Rows(SourceId,SourceType,BusinessDate,ItemId,UnitId,RequiredMinutes,SourceLineId,DueDate)
  SELECT r.OrderId,N'CapacityReservation',r.BusinessDate,o.ItemId,NULL,r.RequiredMinutes,r.Id,o.DueDate FROM dbo.ProductionCapacityReservations r JOIN dbo.ProductionOrders o ON o.Id=r.OrderId AND o.CompanyKey=r.CompanyKey WHERE r.CompanyKey=@CompanyKey AND r.IsActive=1;
 ELSE THROW 51100,N'INVALID_REPORT|Unknown operational report.',1;
 UPDATE r SET ItemCode=i.ItemCode,ItemName=i.Name,UnitName=u.ShortName FROM #Rows r JOIN dbo.Items i ON i.Id=r.ItemId LEFT JOIN dbo.Units u ON u.Id=r.UnitId;
 DELETE #Rows WHERE(@Item IS NOT NULL AND ItemId<>@Item) OR(@Channel IS NOT NULL AND(ChannelId IS NULL OR ChannelId<>@Channel)) OR(@From IS NOT NULL AND BusinessDate<@From) OR(@To IS NOT NULL AND BusinessDate>@To) OR(@AsOf IS NOT NULL AND BusinessDate>@AsOf) OR(@Search IS NOT NULL AND ItemCode NOT LIKE N'%'+@Search+N'%' AND ItemName NOT LIKE N'%'+@Search+N'%');
 SET @Data=(SELECT JSON_QUERY((SELECT * FROM #Rows ORDER BY BusinessDate DESC,SourceType,SourceId,ItemId,SourceLineId OFFSET(@Page-1)*@Size ROWS FETCH NEXT @Size ROWS ONLY FOR JSON PATH,INCLUDE_NULL_VALUES)) Items,@Page PageNumber,@Size PageSize,(SELECT COUNT(*) FROM #Rows) TotalCount,
 JSON_QUERY((SELECT JSON_QUERY((SELECT UnitId,MAX(UnitName) UnitName,SUM(GoodOutput) GoodOutput,SUM(RejectedOutput) RejectedOutput,SUM(DispatchedQuantity) DispatchedQuantity,SUM(ReturnedQuantity) ReturnedQuantity,SUM(PlannedQuantity) PlannedQuantity,SUM(OnHandQuantity) OnHandQuantity,SUM(ReservedQuantity) ReservedQuantity,SUM(SignedQuantity) SignedQuantity FROM #Rows WHERE UnitId IS NOT NULL GROUP BY UnitId FOR JSON PATH,INCLUDE_NULL_VALUES)) QuantityTotals,(SELECT COUNT(*) FROM #Rows WHERE DataQualityFlag IS NOT NULL) DataQualityRows,(SELECT SUM(RequiredMinutes) FROM #Rows) RequiredMinutes,(SELECT COUNT(*) FROM #Rows WHERE OnTime IS NOT NULL) OnTimeDenominator,(SELECT COUNT(*) FROM #Rows WHERE OnTime=1) OnTimeNumerator,N'business-ledger-events-v1' CalculationVersion FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES)) Summary FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
