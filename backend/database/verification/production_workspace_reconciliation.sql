/* Read-only post-migration/cutover evidence. Run only in the intended backed-up catalog.
   Set trusted SQL session context using the same approved catalog key/timezone configuration
   as the application before running. This script does not repair balances or post anything. */
SET NOCOUNT ON;
DECLARE @Company NVARCHAR(64)=CONVERT(NVARCHAR(64),SESSION_CONTEXT(N'Cosmos.CompanyKey')),
 @Today DATE=TRY_CONVERT(DATE,SESSION_CONTEXT(N'Cosmos.BusinessDate'));
IF NULLIF(@Company,N'') IS NULL OR @Today IS NULL THROW 51100,N'Configure the intended company/business-date session context before reconciliation.',1;

SELECT DB_NAME() Catalog,@Company CompanyKey,@Today BusinessDate;

-- Row-level null/quality evidence must be inspected, not coalesced to zero.
SELECT * FROM dbo.ufn_ProductionStockAsOf(@Company,@Today,@Today)
WHERE DataQualityFlag IS NOT NULL OR OnHandQuantity<>CurrentCachedQuantity;

-- This compares the new owned pool only. Investigate any pre-existing external/legacy reservation owner.
SELECT i.Id,i.ItemCode,i.UnitId,i.ReservedStock CachedReserved,COALESCE(r.OwnedReserved,0) OwnedReserved,
 i.ReservedStock-COALESCE(r.OwnedReserved,0) UnexplainedReserved
FROM dbo.Items i OUTER APPLY(SELECT SUM(ReservedQuantity-ConsumedQuantity-ReleasedQuantity) OwnedReserved FROM dbo.ProductionReservations WHERE CompanyKey=@Company AND ItemId=i.Id) r
WHERE i.ReservedStock<>COALESCE(r.OwnedReserved,0);

SELECT r.Id,r.OrderId,r.ItemId,r.ReservedQuantity,r.ConsumedQuantity,r.ReleasedQuantity,
 COALESCE(e.Reserved,0) EventReserved,COALESCE(e.Consumed,0) EventConsumed,COALESCE(e.Released,0) EventReleased
FROM dbo.ProductionReservations r OUTER APPLY(SELECT SUM(ReservedDelta) Reserved,SUM(ConsumedDelta) Consumed,SUM(ReleasedDelta) Released FROM dbo.ProductionReservationEvents WHERE CompanyKey=@Company AND ReservationId=r.Id) e
WHERE r.CompanyKey=@Company AND(r.ReservedQuantity<>COALESCE(e.Reserved,0) OR r.ConsumedQuantity<>COALESCE(e.Consumed,0) OR r.ReleasedQuantity<>COALESCE(e.Released,0) OR r.ReservedQuantity<r.ConsumedQuantity+r.ReleasedQuantity);

-- Every actual original completion balances its component and good output movements by source line/unit.
SELECT c.Id,c.OrderId,m.ItemId,m.UnitId,m.ConsumedQuantity,m.ScrapQuantity,SUM(sm.Quantity) PostedSignedQuantity
FROM dbo.ProductionCompletions c JOIN dbo.ProductionCompletionMaterials m ON m.CompletionId=c.Id
LEFT JOIN dbo.StockMovements sm ON sm.SourceType=N'ProductionCompletion' AND sm.SourceId=c.Id AND sm.ItemId=m.ItemId
WHERE c.CompanyKey=@Company AND c.ReversalOfId IS NULL
GROUP BY c.Id,c.OrderId,m.ItemId,m.UnitId,m.ConsumedQuantity,m.ScrapQuantity
HAVING COALESCE(SUM(sm.Quantity),0)<>-m.ConsumedQuantity-m.ScrapQuantity;

SELECT PhysicalEventId,SourceLineId,ItemId,COUNT(*) DuplicateCount FROM dbo.StockMovements WHERE CompanyKey=@Company AND PhysicalEventId IS NOT NULL GROUP BY PhysicalEventId,SourceLineId,ItemId HAVING COUNT(*)>1;

-- Owner=2 billing/invoicing must not produce its own physical movement.
SELECT N'ShipmentOwnedInvoicePostedAgain' Issue,sm.Id,sm.SourceId,sm.SourceLineId,sm.ItemId,sm.Quantity
FROM dbo.StockMovements sm JOIN dbo.SalesInvoiceItems i ON i.Id=sm.SourceLineId AND i.SalesInvoiceId=sm.SourceId
WHERE sm.SourceType=N'SalesInvoice' AND i.InventoryOwner=2;
SELECT N'ReceiptOwnedBillPostedAgain' Issue,sm.Id,sm.SourceId,sm.SourceLineId,sm.ItemId,sm.Quantity
FROM dbo.StockMovements sm JOIN dbo.PurchaseBillItems i ON i.Id=sm.SourceLineId AND i.PurchaseBillId=sm.SourceId
WHERE sm.SourceType=N'PurchaseBill' AND i.InventoryOwner=2;

SELECT p.Id,p.PurchaseOrderId,p.ItemId,p.UnitId,p.Quantity OrderedQuantity,SUM(r.AcceptedQuantity) AcceptedQuantity
FROM dbo.PurchaseOrderItems p JOIN dbo.PurchasePhysicalReceiptLines r ON r.PurchaseOrderLineId=p.Id JOIN dbo.PurchasePhysicalReceipts h ON h.Id=r.ReceiptId AND h.CompanyKey=@Company
GROUP BY p.Id,p.PurchaseOrderId,p.ItemId,p.UnitId,p.Quantity HAVING SUM(r.AcceptedQuantity)>p.Quantity;

SELECT r.Id,r.ReceiptId,r.AcceptedQuantity,r.RejectedQuantity,r.QuarantinedQuantity,r.ReturnedAcceptedQuantity,r.ReturnedRejectedQuantity,r.ReturnedQuarantinedQuantity
FROM dbo.PurchasePhysicalReceiptLines r JOIN dbo.PurchasePhysicalReceipts h ON h.Id=r.ReceiptId
WHERE h.CompanyKey=@Company AND(r.ReturnedAcceptedQuantity>r.AcceptedQuantity OR r.ReturnedRejectedQuantity>r.RejectedQuantity OR r.ReturnedQuarantinedQuantity>r.QuarantinedQuantity);

SELECT r.BatchId,r.Id,r.Tab,r.RowNumber,r.ColumnName,r.RowStatus,r.ExceptionCode
FROM dbo.ProductionImportRows r JOIN dbo.ProductionImportBatches b ON b.Id=r.BatchId
WHERE b.CompanyKey=@Company AND(r.ExceptionCode IS NOT NULL OR r.RowStatus<>N'Posted');

SELECT SourceType,COUNT(*) RowsMissingEvidence FROM dbo.StockMovements WHERE BusinessDate IS NULL OR UnitIdSnapshot IS NULL GROUP BY SourceType;
SELECT FinishedItemId,COUNT(*) ApplicableBomCount FROM dbo.ManufacturingBoms WHERE IsDeleted=0 AND IsActive=1 AND Status=2 AND EffectiveFrom<=@Today AND(EffectiveTo IS NULL OR EffectiveTo>=@Today) GROUP BY FinishedItemId HAVING COUNT(*)>1;

-- Summaries are grouped by actual unit, never one cross-unit company quantity.
SELECT UnitId,SUM(OnHandQuantity) ProvenOnHand,SUM(ReservedQuantity) Reserved,COUNT(*) Items,
 SUM(CASE WHEN OnHandQuantity IS NULL THEN 1 ELSE 0 END) UnavailableItems
FROM dbo.ufn_ProductionStockAsOf(@Company,@Today,@Today) GROUP BY UnitId;
