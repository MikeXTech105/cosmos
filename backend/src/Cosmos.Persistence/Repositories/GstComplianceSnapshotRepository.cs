using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Gst;
using Cosmos.Persistence.Connection;
using Cosmos.Shared.Exceptions;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class GstComplianceSnapshotRepository(ISqlConnectionFactory factory):IGstComplianceSnapshotRepository
{
    // One serializable transaction covers the invoice, lines and the current master evidence.
    // No mutable Party/Item read is described as an invoice-time statutory identity snapshot.
    internal const string SourceSql="""
        SELECT i.Id SalesInvoiceId,i.Status,i.CompanyGstRegistrationId,
          CONVERT(VARCHAR(18),i.RowVersion,1) SourceVersion,
          CAST(CASE WHEN EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations r WHERE r.Id=i.CompanyGstRegistrationId AND r.IsDeleted=0 AND r.Status=N'Active') THEN 1 ELSE 0 END AS BIT) IssuerActive,
          (SELECT i.Id,i.InvoiceNumber,i.InvoiceDate,i.CustomerPartyId,i.CompanyGstRegistrationId,i.PlaceOfSupplyStateCode,i.PlaceOfSupplySource,i.PriceBasis,i.SubTotal,i.DiscountAmount,i.TaxAmount,i.GrandTotal,i.Status FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES) InvoiceJson,
          (SELECT r.Id,r.Gstin,r.LegalName,r.TradeName,r.StateCode,r.StateName,r.BranchName,r.AddressLine1,r.AddressLine2,r.City,r.District,r.Pincode,r.Status FROM dbo.CompanyGstRegistrations r WHERE r.Id=i.CompanyGstRegistrationId FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES) SellerJson,
          (SELECT p.Id,p.PartyCode,p.PartyName,p.LegalName,p.TradeName,p.GSTIN,p.GSTTreatment,p.BillingAddressLine1,p.BillingAddressLine2,p.BillingCity,p.BillingState,p.BillingCountry,p.BillingPincode,p.ShippingAddressLine1,p.ShippingAddressLine2,p.ShippingCity,p.ShippingState,p.ShippingCountry,p.ShippingPincode,p.IsActive,p.IsDeleted FROM dbo.Parties p WHERE p.Id=i.CustomerPartyId FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES) BuyerJson,
          (SELECT l.Id,l.ItemId,l.ItemNameSnapshot,l.HsnSacCodeSnapshot,l.UnitId,l.UnitNameSnapshot,l.Quantity,l.Rate,l.DiscountPercentage,l.DiscountAmount,l.TaxRateId,l.TaxPercentageSnapshot,l.TaxAmount,l.LineTotal FROM dbo.SalesInvoiceItems l WHERE l.SalesInvoiceId=i.Id AND l.IsDeleted=0 ORDER BY l.Id FOR JSON PATH,INCLUDE_NULL_VALUES) LinesJson,
          (SELECT l.Id InvoiceLineId,l.ItemId,m.MappingId,m.HsnSacId,m.Code,m.CodeType,m.Source,m.EffectiveFrom,m.EffectiveTo FROM dbo.SalesInvoiceItems l JOIN dbo.Items product ON product.Id=l.ItemId OUTER APPLY(
              SELECT TOP(1) candidate.* FROM(
                SELECT x.Id MappingId,h.Id HsnSacId,h.Code,h.CodeType,N'ProductOverride' Source,x.EffectiveFrom,x.EffectiveTo,1 Priority FROM dbo.ItemHsnOverrides x JOIN dbo.HsnSacMasters h ON h.Id=x.HsnSacId AND h.IsActive=1 AND h.IsDeleted=0 WHERE x.ItemId=l.ItemId AND x.EffectiveFrom<=i.InvoiceDate AND (x.EffectiveTo IS NULL OR x.EffectiveTo>=i.InvoiceDate)
                UNION ALL SELECT x.Id,h.Id,h.Code,h.CodeType,N'CategoryDefault',x.EffectiveFrom,x.EffectiveTo,2 FROM dbo.CategoryHsnDefaults x JOIN dbo.HsnSacMasters h ON h.Id=x.HsnSacId AND h.IsActive=1 AND h.IsDeleted=0 WHERE x.CategoryId=product.CategoryId AND x.EffectiveFrom<=i.InvoiceDate AND (x.EffectiveTo IS NULL OR x.EffectiveTo>=i.InvoiceDate)
              ) candidate ORDER BY candidate.Priority,candidate.EffectiveFrom DESC,candidate.MappingId DESC
          )m WHERE l.SalesInvoiceId=i.Id AND l.IsDeleted=0 ORDER BY l.Id FOR JSON PATH,INCLUDE_NULL_VALUES) ClassificationsJson
        FROM dbo.SalesInvoices i WITH(UPDLOCK,HOLDLOCK) WHERE i.Id=@invoiceId AND i.IsDeleted=0;
        """;
    public async Task<GstSnapshotSource> ReadSourceAsync(long invoiceId,string companyKey,CancellationToken ct)
    {
        using var connection=await factory.CreateOpenConnectionAsync(ct);using var transaction=connection.BeginTransaction(IsolationLevel.Serializable);
        var source=await Capture(connection,transaction,invoiceId,companyKey,ct);transaction.Commit();return source;
    }
    public async Task<GstPendingSnapshot> PrepareAsync(long invoiceId,string companyKey,GstPrepareSnapshotRequest request,long? userId,CancellationToken ct)
    {
        using var connection=await factory.CreateOpenConnectionAsync(ct);using var transaction=connection.BeginTransaction(IsolationLevel.Serializable);
        var policy=JsonSerializer.Serialize(new{roundingCandidate=request.RoundingCandidate??"Undecided",headerDiscountCandidate=request.HeaderDiscountCandidate??"Undecided",approved=false});
        var prior=await connection.QuerySingleOrDefaultAsync<SnapshotRow>(new CommandDefinition("SELECT *,CONVERT(VARCHAR(18),SourceRowVersion,1) SourceVersion,CONVERT(VARCHAR(64),SourceFingerprint,2) Fingerprint FROM dbo.GstComplianceSnapshots WITH(UPDLOCK,HOLDLOCK) WHERE PreparationRequestKey=@key;",new{key=request.RequestKey},transaction,cancellationToken:ct));
        if(prior is not null)
        {
            if(prior.CatalogCompanyKey!=companyKey||prior.SalesInvoiceId!=invoiceId||!string.Equals(prior.Fingerprint,request.SourceFingerprint,StringComparison.OrdinalIgnoreCase)||prior.SourceVersion!=request.SourceVersion||prior.PolicyOptionsJson!=policy)throw new ConflictException("A preparation key cannot be reused for another source or changed policy proposals.");
            transaction.Commit();return Map(prior);
        }
        var source=await Capture(connection,transaction,invoiceId,companyKey,ct);
        if(source.SourceVersion!=request.SourceVersion||!source.SourceFingerprint.Equals(request.SourceFingerprint,StringComparison.OrdinalIgnoreCase))throw new ConflictException("Invoice or master details changed since review. Reload and review the current source before preparing again.");
        var id=Guid.NewGuid();var created=DateTime.UtcNow;
        var version=await connection.QuerySingleAsync<int>(new CommandDefinition("SELECT ISNULL(MAX(SnapshotVersion),0)+1 FROM dbo.GstComplianceSnapshots WITH(UPDLOCK,HOLDLOCK) WHERE SalesInvoiceId=@invoiceId;",new{invoiceId},transaction,cancellationToken:ct));
        var payload=JsonSerializer.Serialize(new{schemaVersion=1,status="PendingPolicy",capturedAtUtc=created,document=source.Document,policyProposals=JsonSerializer.Deserialize<JsonElement>(policy),identityEvidence="Current master details reviewed at preparation; not historical invoice-time identity",canIssue=false});
        await connection.ExecuteAsync(new CommandDefinition("""
            INSERT dbo.GstComplianceSnapshots(Id,SalesInvoiceId,CompanyGstRegistrationId,SnapshotVersion,Status,CanonicalPayloadJson,SnapshotHash,CreatedAt,CreatedBy,CatalogCompanyKey,SourceRowVersion,SourceFingerprint,PreparationRequestKey,PolicyOptionsJson)
            VALUES(@id,@invoiceId,@registration,@version,N'PendingPolicy',@payload,@hash,@created,@userId,@companyKey,CONVERT(BINARY(8),@sourceVersion,1),@sourceHash,@requestKey,@policy);
            """,new{id,invoiceId,registration=source.Document.GetProperty("invoice").GetProperty("CompanyGstRegistrationId").GetInt64(),version,payload,hash=SHA256.HashData(Encoding.UTF8.GetBytes(payload)),created,userId,companyKey,sourceVersion=source.SourceVersion,sourceHash=Convert.FromHexString(source.SourceFingerprint),requestKey=request.RequestKey,policy},transaction,cancellationToken:ct));
        transaction.Commit();return new(id,invoiceId,version,"PendingPolicy",source.SourceVersion,source.SourceFingerprint,request.RequestKey,created,JsonSerializer.Deserialize<JsonElement>(policy),source.Document);
    }
    public async Task<GstPendingSnapshot?> GetPreparedAsync(long invoiceId,string companyKey,Guid requestKey,CancellationToken ct)
    {
        using var connection=await factory.CreateOpenConnectionAsync(ct);
        var row=await connection.QuerySingleOrDefaultAsync<SnapshotRow>(new CommandDefinition("SELECT *,CONVERT(VARCHAR(18),SourceRowVersion,1) SourceVersion,CONVERT(VARCHAR(64),SourceFingerprint,2) Fingerprint FROM dbo.GstComplianceSnapshots WHERE SalesInvoiceId=@invoiceId AND CatalogCompanyKey=@companyKey AND PreparationRequestKey=@requestKey;",new{invoiceId,companyKey,requestKey},cancellationToken:ct));return row is null?null:Map(row);
    }
    private static GstPendingSnapshot Map(SnapshotRow row)=>new(row.Id,row.SalesInvoiceId,row.SnapshotVersion,row.Status,row.SourceVersion,row.Fingerprint,row.PreparationRequestKey,row.CreatedAt,JsonSerializer.Deserialize<JsonElement>(row.PolicyOptionsJson),JsonSerializer.Deserialize<JsonElement>(row.CanonicalPayloadJson).GetProperty("document"));
    private static async Task<GstSnapshotSource> Capture(IDbConnection connection,IDbTransaction transaction,long invoiceId,string companyKey,CancellationToken ct)
    {
        var row=await connection.QuerySingleOrDefaultAsync<SourceRow>(new CommandDefinition(SourceSql,new{invoiceId},transaction,cancellationToken:ct))??throw new NotFoundException("Sales invoice was not found.");
        if(row.Status is not (2 or 3 or 4))throw new ConflictException("Only a confirmed sales invoice can have preparation evidence frozen.");
        if(row.CompanyGstRegistrationId is null||!row.IssuerActive)throw new ConflictException("Select an active issuing GST registration on the accounting invoice before preparation.");
        var document=JsonSerializer.SerializeToElement(new{catalogCompanyKey=companyKey,sourceRowVersion=row.SourceVersion,invoice=JsonSerializer.Deserialize<JsonElement>(row.InvoiceJson),sellerCurrentMaster=JsonSerializer.Deserialize<JsonElement>(row.SellerJson),buyerCurrentMaster=JsonSerializer.Deserialize<JsonElement>(row.BuyerJson),lines=JsonSerializer.Deserialize<JsonElement>(row.LinesJson),effectiveClassificationsAtPreparation=JsonSerializer.Deserialize<JsonElement>(row.ClassificationsJson),identityEvidence="CurrentAtPreparation",taxComponentEvidence="Not snapshotted; policy and approved effective components required"});
        return new(invoiceId,companyKey,row.SourceVersion,Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(document.GetRawText()))),document);
    }
    private sealed class SourceRow
    {
        public long SalesInvoiceId{get;set;} public int Status{get;set;} public long? CompanyGstRegistrationId{get;set;} public bool IssuerActive{get;set;} public string SourceVersion{get;set;}="";
        public string InvoiceJson{get;set;}="{}";public string SellerJson{get;set;}="{}";public string BuyerJson{get;set;}="{}";public string LinesJson{get;set;}="[]";public string ClassificationsJson{get;set;}="[]";
    }
    private sealed class SnapshotRow
    {
        public Guid Id{get;set;} public long SalesInvoiceId{get;set;}public int SnapshotVersion{get;set;}public string Status{get;set;}="";public string SourceVersion{get;set;}="";public string Fingerprint{get;set;}="";public string CatalogCompanyKey{get;set;}="";public Guid PreparationRequestKey{get;set;}public DateTime CreatedAt{get;set;}public string PolicyOptionsJson{get;set;}="{}";public string CanonicalPayloadJson{get;set;}="{}";
    }
}
