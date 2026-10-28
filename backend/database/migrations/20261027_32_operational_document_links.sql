SET XACT_ABORT ON;
GO
-- Preserve event/line identities while exposing the actual parent document for UI drilldown.
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID(N'dbo.sp_ProductionOperationalReport_Read'));
IF @Definition IS NULL THROW 51100,N'Operational report migration prerequisite is missing.',1;
IF CHARINDEX(N'SourceDocumentId BIGINT',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N'DueDate DATE NULL,OnTime BIT NULL);',N'DueDate DATE NULL,OnTime BIT NULL,SourceDocumentId BIGINT NULL,SourceDocumentType NVARCHAR(40) NULL);');
 IF CHARINDEX(N'SourceDocumentId BIGINT',@Definition)=0 THROW 51100,N'Operational report shape changed; review document-link migration.',1;
 SET @Definition=REPLACE(@Definition,N' UPDATE r SET ItemCode=',N'
 UPDATE #Rows SET SourceDocumentId=SourceId,SourceDocumentType=N''ProductionOrder'' WHERE SourceType IN(N''ProductionOrder'',N''CapacityReservation'');
 UPDATE r SET SourceDocumentId=c.OrderId,SourceDocumentType=N''ProductionOrder'' FROM #Rows r JOIN dbo.ProductionCompletions c ON c.Id=r.SourceId AND c.CompanyKey=@CompanyKey WHERE r.SourceType IN(N''ProductionCompletion'',N''ProductionReversal'');
 UPDATE #Rows SET SourceDocumentId=SourceId,SourceDocumentType=N''Shipment'' WHERE SourceType=N''ShipmentDispatch'';
 UPDATE r SET SourceDocumentId=i.ShipmentId,SourceDocumentType=N''Shipment'' FROM #Rows r JOIN dbo.ShipmentReturnItems x ON x.Id=r.SourceId JOIN dbo.ShipmentItems i ON i.Id=x.ShipmentItemId WHERE r.SourceType=N''ShipmentReturn'';
 UPDATE #Rows SET SourceDocumentId=SourceId,SourceDocumentType=N''SalesInvoice'' WHERE SourceType=N''SalesInvoice'';
 UPDATE r SET SourceDocumentId=h.PurchaseOrderId,SourceDocumentType=N''PurchaseOrder'' FROM #Rows r JOIN dbo.PurchasePhysicalReceipts h ON h.Id=r.SourceId AND h.CompanyKey=@CompanyKey WHERE r.SourceType=N''PurchasePhysicalReceipt'';
 UPDATE r SET SourceDocumentId=h.PurchaseOrderId,SourceDocumentType=N''PurchaseOrder'' FROM #Rows r JOIN dbo.PurchasePhysicalReturns x ON x.Id=r.SourceId AND x.CompanyKey=@CompanyKey JOIN dbo.PurchasePhysicalReceiptLines l ON l.Id=x.ReceiptLineId JOIN dbo.PurchasePhysicalReceipts h ON h.Id=l.ReceiptId AND h.CompanyKey=@CompanyKey WHERE r.SourceType=N''PurchasePhysicalReturn'';
 UPDATE #Rows SET SourceDocumentId=SourceId,SourceDocumentType=N''PurchaseBill'' WHERE SourceType=N''PurchaseBill'';
 UPDATE #Rows SET SourceDocumentId=SourceId,SourceDocumentType=N''PurchaseReturn'' WHERE SourceType=N''PurchaseReturn'';
 UPDATE r SET ItemCode=');
 SET @Definition=REPLACE(REPLACE(@Definition,N'CREATE OR ALTER PROCEDURE',N'ALTER PROCEDURE'),N'CREATE PROCEDURE',N'ALTER PROCEDURE');
 EXEC sys.sp_executesql @Definition;
END;
GO
