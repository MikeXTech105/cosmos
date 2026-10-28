using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Organization;
using Cosmos.Contracts.Organization;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;

namespace Cosmos.Application.Services;

public sealed class CompanyBranchScopeAdministrationService(ICompanyBranchScopeRepository scopes,IUserRepository users,ICurrentUser currentUser) : ICompanyBranchScopeAdministrationService
{
    public async Task<ApiResponse<IReadOnlyCollection<UserCompanyBranchScopeDto>>> GetUserAssignmentsAsync(int userId,CancellationToken ct)
    {
        if(userId<=0) throw new NotFoundException("User was not found.");
        var actor=RequireActor();
        if(actor!=userId && !await users.IsSystemOwnerAsync(actor,ct)) throw new NotFoundException("User was not found.");
        return ApiResponse<IReadOnlyCollection<UserCompanyBranchScopeDto>>.Success(await scopes.GetByUserAsync(userId,ct));
    }
    public Task<ApiResponse<IReadOnlyCollection<EffectiveCompanyBranchScopeDto>>> GetMyEffectiveScopeAsync(CancellationToken ct) => GetEffectiveAsync(RequireActor(),ct);
    public async Task<ApiResponse<UserCompanyBranchScopeDto>> GrantAsync(GrantCompanyBranchScopeRequest request,CancellationToken ct)
    {
        if(request.UserId<=0||request.CompanyId<=0||request.BranchId is <=0) throw new CosmosException("A valid user, company, and optional branch are required.",400);
        var actor=RequireActor();
        if(actor==request.UserId && !await users.IsSystemOwnerAsync(actor,ct)) throw new ForbiddenCosmosException("Administrators cannot grant themselves organizational access.");
        return ApiResponse<UserCompanyBranchScopeDto>.Success(await scopes.GrantAsync(actor,request.UserId,request.CompanyId,request.BranchId,ct));
    }
    public async Task<ApiResponse> RevokeAsync(long assignmentId,CancellationToken ct)
    {
        if(assignmentId<=0) throw new NotFoundException("Assignment was not found.");
        await scopes.RevokeAsync(RequireActor(),assignmentId,ct); return ApiResponse.Success("Assignment revoked.");
    }
    private async Task<ApiResponse<IReadOnlyCollection<EffectiveCompanyBranchScopeDto>>> GetEffectiveAsync(int userId,CancellationToken ct)=>ApiResponse<IReadOnlyCollection<EffectiveCompanyBranchScopeDto>>.Success(await scopes.GetEffectiveAsync(userId,ct));
    private int RequireActor()=>currentUser.UserId??throw new UnauthorizedCosmosException();
}
