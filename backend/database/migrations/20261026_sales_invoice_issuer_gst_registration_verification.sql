/* Read-only post-deployment checks; do not backfill historical invoices. */
SELECT c.name, c.is_nullable FROM sys.columns c WHERE c.object_id=OBJECT_ID(N'dbo.SalesInvoices') AND c.name=N'CompanyGstRegistrationId';
SELECT c.name, c.is_nullable FROM sys.columns c WHERE c.object_id=OBJECT_ID(N'dbo.SalesInvoices') AND c.name IN(N'PlaceOfSupplyStateCode',N'PlaceOfSupplySource',N'PriceBasis');
SELECT fk.name FROM sys.foreign_keys fk WHERE fk.name=N'FK_SalesInvoices_CompanyGstRegistrations';
SELECT i.name,i.has_filter,i.filter_definition FROM sys.indexes i WHERE i.object_id=OBJECT_ID(N'dbo.SalesInvoices') AND i.name=N'IX_SalesInvoices_CompanyGstRegistrationId';
SELECT COUNT(*) AS HistoricalInvoicesWithoutIssuer FROM dbo.SalesInvoices WHERE CompanyGstRegistrationId IS NULL;
SELECT si.Id,si.CompanyGstRegistrationId FROM dbo.SalesInvoices si LEFT JOIN dbo.CompanyGstRegistrations r ON r.Id=si.CompanyGstRegistrationId WHERE si.CompanyGstRegistrationId IS NOT NULL AND r.Id IS NULL;
SELECT Id,CompanyGstRegistrationId,PlaceOfSupplyStateCode,PlaceOfSupplySource,PriceBasis FROM dbo.SalesInvoices WHERE (PlaceOfSupplyStateCode IS NULL)<>(PlaceOfSupplySource IS NULL) OR PriceBasis NOT IN(0,1);
