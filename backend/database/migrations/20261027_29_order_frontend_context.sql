SET XACT_ABORT ON;
GO
/* Draft editing and actual posting require the persisted resource and source
   identities. Extend every order read projection without changing commands. */
DECLARE @Name SYSNAME,@Definition NVARCHAR(MAX),@Original NVARCHAR(MAX);
DECLARE order_contexts CURSOR LOCAL FAST_FORWARD FOR
 SELECT Name FROM(VALUES(N'vw_ProductionOrderContract'),(N'sp_ProductionOrder_Read'),(N'sp_ProductionWorkspace_Context')) x(Name);
OPEN order_contexts; FETCH NEXT FROM order_contexts INTO @Name;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @Definition=OBJECT_DEFINITION(OBJECT_ID(N'dbo.'+@Name));
 IF @Definition IS NULL THROW 51100,N'ORDER_CONTEXT_MIGRATION|Apply production workspace migrations before extending order context.',1;
 SET @Original=@Definition;
 IF CHARINDEX(N'Version,Notes,MachineId,MouldId,ShiftId,ChannelId,Reference,SourcePlanId,SourceLineId',@Definition)=0
  SET @Definition=REPLACE(@Definition,N'Version,Notes',N'Version,Notes,MachineId,MouldId,ShiftId,ChannelId,Reference,SourcePlanId,SourceLineId');
 IF @Definition=@Original AND CHARINDEX(N'Version,Notes,MachineId,MouldId,ShiftId,ChannelId,Reference,SourcePlanId,SourceLineId',@Definition)=0
  THROW 51100,N'ORDER_CONTEXT_MIGRATION|Expected order projection was not found. Review the deployed procedure before continuing.',1;
 IF @Name=N'sp_ProductionOrder_Read'
  SET @Definition=REPLACE(@Definition,N'OrderNumber LIKE N''%''+@Search+N''%'')',N'(OrderNumber LIKE N''%''+@Search+N''%'' OR Reference LIKE N''%''+@Search+N''%''))');
 IF @Name=N'vw_ProductionOrderContract' SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'VIEW',UPPER(@Definition)),LEN(@Definition));
 ELSE SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));
 EXEC sys.sp_executesql @Definition;
 FETCH NEXT FROM order_contexts INTO @Name;
END;
CLOSE order_contexts; DEALLOCATE order_contexts;
GO
/* Preserve the context's other configuration branches while exposing actual
   reservation balances and immutable component quantities for each posting. */
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID(N'dbo.sp_ProductionWorkspace_Context'));
IF CHARINDEX(N'ProductionCompletionMaterials cm WHERE cm.CompletionId=c.Id',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,
  N'SELECT Id,BusinessDate,OccurredAt,GoodOutput,RejectedOutput,MachineId,MouldId,ShiftId,ReversalOfId,ReversedById,SourceReference,VarianceReason FROM dbo.ProductionCompletions WHERE OrderId=@Id AND CompanyKey=@CompanyKey ORDER BY Id',
  N'SELECT c.Id,c.BusinessDate,c.OccurredAt,c.GoodOutput,c.RejectedOutput,c.MachineId,c.MouldId,c.ShiftId,c.ReversalOfId,c.ReversedById,c.SourceReference,c.VarianceReason,JSON_QUERY((SELECT cm.ItemId,cm.UnitId,cm.ExpectedQuantity,cm.ConsumedQuantity,cm.ScrapQuantity,cm.ReturnedQuantity FROM dbo.ProductionCompletionMaterials cm WHERE cm.CompletionId=c.Id ORDER BY cm.ItemId FOR JSON PATH)) Materials FROM dbo.ProductionCompletions c WHERE c.OrderId=@Id AND c.CompanyKey=@CompanyKey ORDER BY c.Id');
 IF CHARINDEX(N'ProductionCompletionMaterials cm WHERE cm.CompletionId=c.Id',@Definition)=0 THROW 51100,N'ORDER_HISTORY_MIGRATION|Expected completion context projection was not found.',1;
END;
IF CHARINDEX(N'OnHandQuantity',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N')) [Order],',
  N')) [Order], JSON_QUERY((SELECT r.ItemId,i.UnitId,r.ReservedQuantity,r.ConsumedQuantity,r.ReleasedQuantity,r.ReservedQuantity-r.ConsumedQuantity-r.ReleasedQuantity RemainingQuantity,i.CurrentStock OnHandQuantity,i.CurrentStock-i.ReservedStock FreeQuantity FROM dbo.ProductionReservations r JOIN dbo.Items i ON i.Id=r.ItemId WHERE r.OrderId=@Id AND r.CompanyKey=@CompanyKey ORDER BY r.ItemId FOR JSON PATH)) Reservations,');
 IF CHARINDEX(N'OnHandQuantity',@Definition)=0 THROW 51100,N'ORDER_RESERVATION_MIGRATION|Expected order context projection was not found.',1;
END;
SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));
EXEC sys.sp_executesql @Definition;
GO
