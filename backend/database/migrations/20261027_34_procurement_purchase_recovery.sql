SET XACT_ABORT ON;
GO
/* Read the persisted original planning identity after retries; this procedure never creates a purchase. */
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementContinuity_PurchaseSources @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Data NVARCHAR(MAX);
 IF NOT EXISTS(SELECT 1 FROM dbo.ProcurementPlanningRuns WHERE Id=@Id) THROW 51104,N'NOT_FOUND|The procurement planning run was not found in this catalog.',1;
 SET @Data=(SELECT @Id Id,JSON_QUERY((SELECT s.Id PlanningRunLineId,p.Id PurchaseOrderId,p.PurchaseOrderNo,l.Id PurchaseOrderLineId,l.ItemId,l.UnitId,l.Quantity,p.Status,l.PriceSourceReference
  FROM dbo.ProcurementPlanningRunLines s JOIN dbo.PurchaseOrderItems l ON l.SourcePlanningRunLineId=s.Id AND l.IsDeleted=0
  JOIN dbo.PurchaseOrders p ON p.Id=l.PurchaseOrderId AND p.IsDeleted=0
  WHERE s.PlanningRunId=@Id ORDER BY p.Id,l.Id FOR JSON PATH,INCLUDE_NULL_VALUES)) Lines FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
