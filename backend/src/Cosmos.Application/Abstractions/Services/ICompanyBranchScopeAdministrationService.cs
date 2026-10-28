using Cosmos.Application.Organization;
using Cosmos.Contracts.Organization;
using Cosmos.Shared.Responses;
namespace Cosmos.Application.Abstractions.Services;
public interface ICompanyBranchScopeAdministrationService
{
    Task<ApiResponse<IReadOnlyCollection<UserCompanyBranchScopeDto>>> GetUserAssignmentsAsync(int userId,CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<EffectiveCompanyBranchScopeDto>>> GetMyEffectiveScopeAsync(CancellationToken ct);
    Task<ApiResponse<UserCompanyBranchScopeDto>> GrantAsync(GrantCompanyBranchScopeRequest request,CancellationToken ct);
    Task<ApiResponse> RevokeAsync(long assignmentId,CancellationToken ct);
}
