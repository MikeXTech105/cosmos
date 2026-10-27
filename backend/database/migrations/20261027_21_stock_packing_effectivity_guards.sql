SET XACT_ABORT ON;
GO
/* Preserve the deployed Item metadata/HSN contract, but serialize edits with stock posting.
   Stale edit forms never overwrite ledger caches or approved opening valuation. */
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID('dbo.sp_Item_Update'));
IF CHARINDEX(N'ATOMIC_ITEM_METADATA',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N'OpeningStock=@OpeningStock,',N'');SET @Definition=REPLACE(@Definition,N'OpeningStock = @OpeningStock,',N'');
 SET @Definition=REPLACE(@Definition,N'CurrentStock=@CurrentStock,',N'');SET @Definition=REPLACE(@Definition,N'CurrentStock = @CurrentStock,',N'');
 SET @Definition=REPLACE(@Definition,N'ReservedStock=@ReservedStock,',N'');SET @Definition=REPLACE(@Definition,N'ReservedStock = @ReservedStock,',N'');
 SET @Definition=REPLACE(@Definition,N'OpeningStockValue=@OpeningStockValue,',N'');SET @Definition=REPLACE(@Definition,N'OpeningStockValue = @OpeningStockValue,',N'');
 SET @Definition=REPLACE(@Definition,N'BEGIN TRY',N'BEGIN TRY /* ATOMIC_ITEM_METADATA */ BEGIN TRAN; EXEC dbo.sp_StockCommand_Lock; IF EXISTS(SELECT 1 FROM dbo.Items WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND(UnitId<>@UnitId OR TrackInventory<>@TrackInventory) AND(CurrentStock<>0 OR ReservedStock<>0 OR EXISTS(SELECT 1 FROM dbo.StockMovements WHERE ItemId=@Id) OR EXISTS(SELECT 1 FROM dbo.ProductionOrderMaterials WHERE ItemId=@Id) OR EXISTS(SELECT 1 FROM dbo.ProductionOrders WHERE ItemId=@Id))) BEGIN SELECT 409 StatusCode,N''Item units/tracking are frozen by stock history or owned work.'' Message;RETURN;END;');
 SET @Definition=REPLACE(@Definition,N'RETURN;',N'IF XACT_STATE()<>0 ROLLBACK;RETURN;');
 SET @Definition=REPLACE(@Definition,N'SELECT 200 StatusCode',N'COMMIT;SELECT 200 StatusCode');
 SET @Definition=REPLACE(@Definition,N'SELECT 200 AS StatusCode',N'COMMIT;SELECT 200 AS StatusCode');
 SET @Definition=REPLACE(@Definition,N'BEGIN CATCH',N'BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;');
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
END;
GO
/* Activating an overlapping BOM is a conflict; retire/close the old effective revision first. */
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ManufacturingBom_Activate'));
IF CHARINDEX(N'CANONICAL_BOM_NONOVERLAP',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N'BEGIN TRAN;',N'BEGIN TRAN; /* CANONICAL_BOM_NONOVERLAP */ EXEC dbo.sp_StockCommand_Lock; IF EXISTS(SELECT 1 FROM dbo.ManufacturingBoms n JOIN dbo.ManufacturingBoms b ON b.FinishedItemId=n.FinishedItemId AND b.Id<>n.Id AND b.IsDeleted=0 AND b.IsActive=1 AND b.Status=2 AND b.EffectiveFrom<=COALESCE(n.EffectiveTo,CONVERT(DATE,''99991231'')) AND COALESCE(b.EffectiveTo,CONVERT(DATE,''99991231''))>=n.EffectiveFrom WHERE n.Id=@Id) BEGIN ROLLBACK;SELECT 409 StatusCode,N''Close the previous BOM effective period before activating an overlapping revision.'' Message;RETURN;END;');
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
END;
GO
/* Shipment creation captures verified packaging and base units; missing conversion is never one. */
DECLARE @Name SYSNAME,@Definition NVARCHAR(MAX),@OldApply NVARCHAR(MAX);
DECLARE shipment_creates CURSOR LOCAL FAST_FORWARD FOR SELECT name FROM sys.procedures WHERE name IN(N'usp_ShipmentOperations_Shipment_CreateManual',N'usp_ShipmentOperations_Shipment_CreateFromDispatchPlan');
OPEN shipment_creates;FETCH NEXT FROM shipment_creates INTO @Name;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @Definition=OBJECT_DEFINITION(OBJECT_ID(N'dbo.'+@Name));
 IF CHARINDEX(N'VERIFIED_PACK_SNAPSHOT',@Definition)=0
 BEGIN
  SET @Definition=REPLACE(@Definition,N'BEGIN TRAN;',N'BEGIN TRAN; EXEC dbo.sp_StockCommand_Lock; /* VERIFIED_PACK_SNAPSHOT */');
  IF @Name=N'usp_ShipmentOperations_Shipment_CreateManual'
  BEGIN
   SET @OldApply=N'OUTER APPLY(SELECT TOP(1) pp.UnitsPerBox FROM dbo.ItemPackagingProfiles pp WHERE pp.Id=x.PackagingProfileId OR (x.PackagingProfileId IS NULL AND pp.ItemId=x.ItemId AND pp.IsActive=1 AND pp.IsDeleted=0 AND (pp.ChannelId=@ChannelId OR pp.ChannelId IS NULL)) ORDER BY CASE WHEN pp.ChannelId=@ChannelId THEN 0 ELSE 1 END,pp.IsDefault DESC,pp.Id) p;';
   IF CHARINDEX(@OldApply,@Definition)=0 THROW 51100,N'PACK_PATCH_PREFLIGHT|Review deployed manual shipment packaging resolver.',1;
   SET @Definition=REPLACE(@Definition,@OldApply,N'OUTER APPLY(SELECT TOP(1) pp.Id,pp.UnitsPerBox FROM dbo.ItemPackagingProfiles pp WHERE (x.PackagingProfileId IS NULL OR pp.Id=x.PackagingProfileId) AND pp.ItemId=x.ItemId AND pp.IsActive=1 AND pp.IsDeleted=0 AND pp.UnitsPerBox>0 AND(pp.ChannelId=@ChannelId OR pp.ChannelId IS NULL) AND(pp.EffectiveFrom IS NULL OR pp.EffectiveFrom<=@ShipmentDate) AND(pp.EffectiveTo IS NULL OR pp.EffectiveTo>=@ShipmentDate) ORDER BY CASE WHEN pp.ChannelId=@ChannelId THEN 0 ELSE 1 END,pp.IsDefault DESC,pp.Id) p;');
   SET @Definition=REPLACE(@Definition,N'COALESCE(p.UnitsPerBox,1),x.PackagingProfileId',N'p.UnitsPerBox,p.Id');
   SET @Definition=REPLACE(@Definition,N'INSERT dbo.ShipmentItems(',N'IF EXISTS(SELECT 1 FROM @Items x WHERE NOT EXISTS(SELECT 1 FROM dbo.ItemPackagingProfiles p WHERE p.ItemId=x.ItemId AND(x.PackagingProfileId IS NULL OR p.Id=x.PackagingProfileId) AND(p.ChannelId=@ChannelId OR p.ChannelId IS NULL) AND p.IsActive=1 AND p.IsDeleted=0 AND p.UnitsPerBox>0 AND(p.EffectiveFrom IS NULL OR p.EffectiveFrom<=@ShipmentDate) AND(p.EffectiveTo IS NULL OR p.EffectiveTo>=@ShipmentDate))) BEGIN ROLLBACK;SELECT 409 StatusCode,N''Verified effective packaging is required for every shipment Item.'' Message;RETURN;END; INSERT dbo.ShipmentItems(');
  END;
  SET @Definition=REPLACE(@Definition,N'UPDATE dbo.Shipments SET TotalPlannedQuantity=',N'UPDATE si SET BaseUnitIdSnapshot=i.UnitId FROM dbo.ShipmentItems si JOIN dbo.Items i ON i.Id=si.ItemId WHERE si.ShipmentId=@ShipmentId; IF EXISTS(SELECT 1 FROM dbo.ShipmentItems si LEFT JOIN dbo.ItemPackagingProfiles p ON p.Id=si.PackagingProfileId WHERE si.ShipmentId=@ShipmentId AND(p.Id IS NULL OR p.ItemId<>si.ItemId OR(p.ChannelId IS NOT NULL AND p.ChannelId<>@ChannelId) OR p.UnitsPerBox<>si.UnitsPerBoxSnapshot OR p.IsDeleted=1 OR p.IsActive=0 OR(p.EffectiveFrom IS NOT NULL AND p.EffectiveFrom>@ShipmentDate) OR(p.EffectiveTo IS NOT NULL AND p.EffectiveTo<@ShipmentDate))) BEGIN ROLLBACK;SELECT 409 StatusCode,N''Refresh the allocation: verified packaging is missing or stale.'' Message;RETURN;END; UPDATE dbo.Shipments SET TotalPlannedQuantity=');
  SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
 END;
 FETCH NEXT FROM shipment_creates INTO @Name;
END;
CLOSE shipment_creates;DEALLOCATE shipment_creates;
GO
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID('dbo.usp_ShipmentOperations_Shipment_Transition'));
IF CHARINDEX(N'DISPATCH_UNIT_PACK_GUARD',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N'IF @TargetStatus=6',N'IF @TargetStatus=6 AND EXISTS(SELECT 1 FROM dbo.ShipmentItems si JOIN dbo.Items i ON i.Id=si.ItemId LEFT JOIN dbo.ItemPackagingProfiles p ON p.Id=si.PackagingProfileId WHERE si.ShipmentId=@Id AND(si.BaseUnitIdSnapshot IS NULL OR si.BaseUnitIdSnapshot<>i.UnitId OR p.Id IS NULL OR p.ItemId<>si.ItemId OR p.UnitsPerBox<>si.UnitsPerBoxSnapshot OR p.IsActive=0 OR p.IsDeleted=1)) BEGIN ROLLBACK;SELECT 409 StatusCode,N''Reconcile shipment base units and verified packaging before dispatch.'' Message;RETURN;END; /* DISPATCH_UNIT_PACK_GUARD */ IF @TargetStatus=6');
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
END;
GO
/* Legacy production units are captured only when newly posted, never inferred for old history. */
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ManufacturingProduction_Post'));
IF CHARINDEX(N'LEGACY_OUTPUT_UNIT_CAPTURE',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N'EXEC dbo.sp_StockCommand_Lock;',N'EXEC dbo.sp_StockCommand_Lock; /* LEGACY_OUTPUT_UNIT_CAPTURE */ UPDATE p SET UnitIdSnapshot=i.UnitId FROM dbo.ManufacturingProductions p JOIN dbo.Items i ON i.Id=p.FinishedItemId WHERE p.Id=@Id AND p.Status=1;');
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
END;
GO
MERGE dbo.RolePermissions AS target USING(
 SELECT r.Id RoleId,p.Id PageId FROM dbo.Roles r CROSS JOIN dbo.Pages p WHERE r.Name=N'SuperAdmin' AND p.Name IN(N'Manufacturing.Configuration',N'Manufacturing.Orders',N'Manufacturing.Reports',N'Manufacturing.Productions')
) source ON target.RoleId=source.RoleId AND target.PageId=source.PageId
WHEN MATCHED THEN UPDATE SET CanView=1,CanCreate=1,CanEdit=1,CanApprove=1,CanExport=1
WHEN NOT MATCHED THEN INSERT(RoleId,PageId,CanView,CanCreate,CanEdit,CanDelete,CanExport,CanApprove) VALUES(source.RoleId,source.PageId,1,1,1,0,1,1);
GO
