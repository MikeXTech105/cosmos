-- Names for resources already linked to an authorized company-scoped order.
-- These are explicitly current master labels, not fabricated historical snapshots.
SET XACT_ABORT ON;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionOrder_Labels @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX)
AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Data NVARCHAR(MAX);
 IF NOT EXISTS(SELECT 1 FROM dbo.ProductionOrders WHERE Id=@Id AND CompanyKey=@CompanyKey)
  THROW 51104,N'NOT_FOUND|Production order was not found.',1;
 SET @Data=(SELECT i.Name ItemName,m.MachineName,mo.MouldName,sh.ShiftName,ch.Name ChannelName,b.BomNumber,r.Revision RoutingRevision,
  N'Current master names; frozen resource identities and original quantity/routing evidence remain on the order.' LabelSource,
  JSON_QUERY((SELECT st.Sequence,op.Name OperationName,wc.Name WorkCentreName,rm.MachineName,rmo.MouldName
   FROM dbo.ItemProductionRoutingSteps st
   LEFT JOIN dbo.ProductionOperations op ON op.Id=st.OperationId AND op.CompanyKey=@CompanyKey
   LEFT JOIN dbo.ProductionWorkCentres wc ON wc.Id=st.WorkCentreId AND wc.CompanyKey=@CompanyKey
   LEFT JOIN dbo.OeeMachines rm ON rm.Id=st.MachineId
   LEFT JOIN dbo.OeeMoulds rmo ON rmo.Id=st.MouldId
   WHERE st.RoutingId=o.RoutingId ORDER BY st.Sequence FOR JSON PATH,INCLUDE_NULL_VALUES)) Steps
 FROM dbo.ProductionOrders o
 LEFT JOIN dbo.Items i ON i.Id=o.ItemId
 LEFT JOIN dbo.OeeMachines m ON m.Id=o.MachineId
 LEFT JOIN dbo.OeeMoulds mo ON mo.Id=o.MouldId
 LEFT JOIN dbo.HR_Shifts sh ON sh.Id=o.ShiftId
 LEFT JOIN dbo.SalesChannels ch ON ch.Id=o.ChannelId
 LEFT JOIN dbo.ManufacturingBoms b ON b.Id=o.BomId
 LEFT JOIN dbo.ItemProductionRoutings r ON r.Id=o.RoutingId AND r.CompanyKey=@CompanyKey
 WHERE o.Id=@Id AND o.CompanyKey=@CompanyKey FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
