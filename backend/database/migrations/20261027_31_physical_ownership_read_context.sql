SET XACT_ABORT ON;
GO
/* Operator source links and a shipment-only packing read avoid granting invoice visibility for packing. */
CREATE OR ALTER PROCEDURE dbo.sp_PhysicalInventory_Read @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Kind NVARCHAR(30)=JSON_VALUE(@RequestJson,'$.kind'),@Data NVARCHAR(MAX);
 IF @Kind=N'invoice'
  SET @Data=(SELECT h.Id,CONVERT(VARCHAR(18),h.RowVersion,1) Version,JSON_QUERY((SELECT si.Id InvoiceLineId,si.ItemId,COALESCE(si.UnitId,i.UnitId) UnitId,si.Quantity,si.InventoryOwner Owner,h.Id InvoiceId,h.InvoiceNumber,si.ItemNameSnapshot ItemName,u.Name UnitName
   FROM dbo.SalesInvoiceItems si JOIN dbo.Items i ON i.Id=si.ItemId LEFT JOIN dbo.Units u ON u.Id=COALESCE(si.UnitId,i.UnitId)
   WHERE si.SalesInvoiceId=@Id AND si.IsDeleted=0 ORDER BY si.Id FOR JSON PATH,INCLUDE_NULL_VALUES)) Lines FROM dbo.SalesInvoices h WHERE h.Id=@Id AND h.IsDeleted=0 FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 ELSE IF @Kind=N'shipment'
  SET @Data=(SELECT h.Id,CONVERT(VARCHAR(18),h.RowVersion,1) Version,JSON_QUERY((SELECT l.InvoiceLineId,l.ShipmentItemId,s.ItemId,COALESCE(s.BaseUnitIdSnapshot,i.UnitId) UnitId,l.Quantity,2 Owner,inv.Id InvoiceId,inv.InvoiceNumber,s.ItemNameSnapshot ItemName,u.Name UnitName
   FROM dbo.ShipmentInvoiceLineLinks l JOIN dbo.ShipmentItems s ON s.Id=l.ShipmentItemId JOIN dbo.Items i ON i.Id=s.ItemId
   JOIN dbo.SalesInvoiceItems il ON il.Id=l.InvoiceLineId JOIN dbo.SalesInvoices inv ON inv.Id=il.SalesInvoiceId LEFT JOIN dbo.Units u ON u.Id=COALESCE(s.BaseUnitIdSnapshot,i.UnitId)
   WHERE s.ShipmentId=@Id AND l.CompanyKey=@CompanyKey ORDER BY s.Id,l.InvoiceLineId FOR JSON PATH,INCLUDE_NULL_VALUES)) Lines FROM dbo.Shipments h WHERE h.Id=@Id AND h.IsDeleted=0 FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 ELSE IF @Kind=N'packing'
  SET @Data=(SELECT h.Id,CONVERT(VARCHAR(18),h.RowVersion,1) Version,JSON_QUERY((SELECT si.Id ShipmentItemId,si.ItemId,si.BaseUnitIdSnapshot UnitId,si.PlannedQuantity Quantity,si.ItemNameSnapshot ItemName,u.Name UnitName,si.PackagingProfileId,si.UnitsPerBoxSnapshot UnitsPerBox
   FROM dbo.ShipmentItems si LEFT JOIN dbo.Units u ON u.Id=si.BaseUnitIdSnapshot WHERE si.ShipmentId=@Id ORDER BY si.Id FOR JSON PATH,INCLUDE_NULL_VALUES)) Lines FROM dbo.Shipments h WHERE h.Id=@Id AND h.IsDeleted=0 FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 ELSE THROW 51100,N'INVALID_CONTEXT|Unknown physical ownership context.',1;
 IF @Data IS NULL THROW 51104,N'NOT_FOUND|The invoice or shipment was not found in this catalog.',1;
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
