using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Gst;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
namespace Cosmos.Application.Services;
public sealed class GstComplianceSnapshotService(IGstComplianceSnapshotRepository repository,IProductionCompanyScope scope,ICurrentUser user):IGstComplianceSnapshotService
{
    public async Task<ApiResponse<GstSnapshotPreparation>> ReadAsync(long invoiceId,CancellationToken ct)
    {
        var source=await repository.ReadSourceAsync(invoiceId,scope.CompanyKey,ct);
        return ApiResponse<GstSnapshotPreparation>.Success(new(source,GstSnapshotPolicyChoices.All,[
            "Issuance policy was explicitly deferred. Choosing a proposal does not approve or activate tax calculation.",
            "Buyer and seller master identity/address are captured as current-at-preparation evidence, not represented as historical invoice-time facts.",
            "Only approved effective tax-component rules may support a future validated snapshot; aggregate invoice tax must never be split by inference.",
            "Government-document issuance and transport review remain separate controlled actions. This preparation calls no provider."]));
    }
    public async Task<ApiResponse<GstPendingSnapshot>> PrepareAsync(long invoiceId,GstPrepareSnapshotRequest request,CancellationToken ct)
    {
        var companyKey=scope.CompanyKey;
        if(request.RequestKey==Guid.Empty||!System.Text.RegularExpressions.Regex.IsMatch(request.SourceVersion??"","^0x[0-9a-fA-F]{16}$")||!System.Text.RegularExpressions.Regex.IsMatch(request.SourceFingerprint??"","^[0-9A-Fa-f]{64}$"))throw new CosmosException("Reload the source details before preparing a snapshot.");
        if(!request.CurrentMasterDetailsReviewed)throw new CosmosException("Review the current buyer and seller identity/address before freezing preparation evidence.");
        if(!GstSnapshotPolicyChoices.IsAllowed("rounding",request.RoundingCandidate)||!GstSnapshotPolicyChoices.IsAllowed("headerDiscount",request.HeaderDiscountCandidate))throw new CosmosException("Select a supported policy proposal or decide later.");
        return ApiResponse<GstPendingSnapshot>.Success(await repository.PrepareAsync(invoiceId,companyKey,request,user.UserId,ct),"Immutable preparation saved as PendingPolicy. No government document was issued.");
    }
    public async Task<ApiResponse<GstPendingSnapshot>> GetPreparedAsync(long invoiceId,Guid requestKey,CancellationToken ct)=>ApiResponse<GstPendingSnapshot>.Success(await repository.GetPreparedAsync(invoiceId,scope.CompanyKey,requestKey,ct)??throw new NotFoundException("Preparation command was not found for this invoice and company."));
}
