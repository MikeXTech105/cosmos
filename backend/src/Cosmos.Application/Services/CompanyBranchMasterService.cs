using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Organization;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Organization;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;

namespace Cosmos.Application.Services;

/// <summary>
/// Applies record scope after the controller's page/action permission check.
/// A company-level assignment can administer its company and branches; a branch-only
/// assignment can view or edit only that branch and can never create branches.
/// </summary>
public sealed class CompanyBranchMasterService(
    ICompanyBranchMasterRepository repository,
    ICompanyBranchScopeRepository scopes,
    IUserRepository users,
    IAuditRepository audit,
    ICurrentUser currentUser,
    IValidator<SaveCompanyRequest> companyValidator,
    IValidator<SaveBranchRequest> branchValidator) : ICompanyBranchMasterService
{
    public async Task<ApiResponse<IReadOnlyCollection<CompanyDto>>> CompaniesAsync(string? search, bool activeOnly, CancellationToken ct)
    {
        var companies = await repository.CompaniesAsync(search, activeOnly, ct);
        if (await IsSystemOwnerAsync(ct))
            return ApiResponse<IReadOnlyCollection<CompanyDto>>.Success(companies);

        var userId = RequireUserId();
        var visible = new List<CompanyDto>();
        foreach (var company in companies)
            if (await scopes.CanAccessAsync(userId, company.Id, null, ct))
                visible.Add(company);
        return ApiResponse<IReadOnlyCollection<CompanyDto>>.Success(visible);
    }

    public async Task<ApiResponse<CompanyDto>> CompanyAsync(long id, CancellationToken ct)
    {
        var company = await repository.CompanyAsync(id, ct) ?? throw new NotFoundException("Company was not found.");
        await DemandCompanyAccessAsync(company.Id, ct);
        return ApiResponse<CompanyDto>.Success(company);
    }

    public async Task<ApiResponse<CompanyDto>> SaveCompanyAsync(long? id, SaveCompanyRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(companyValidator, request, ct);

        CompanyDto? old = null;
        if (id is null)
        {
            if (!await IsSystemOwnerAsync(ct))
                throw new ForbiddenCosmosException("Only the System Owner can create a company.");
        }
        else
        {
            old = await repository.CompanyAsync(id.Value, ct) ?? throw new NotFoundException("Company was not found.");
            await DemandCompanyAccessAsync(old.Id, ct);
        }

        var saved = await repository.SaveCompanyAsync(id, request.Code.Trim(), request.Name.Trim(), request.IsActive, RequireUserId(), ct);
        await audit.AddAsync(new AuditEntryRequest("Companies", saved.Id.ToString(), id is null ? "Create" : saved.IsActive ? "Update" : "Deactivate", old is null ? null : AuditSerializer.Serialize(old), AuditSerializer.Serialize(saved), currentUser.UserId), ct);
        return ApiResponse<CompanyDto>.Success(saved);
    }

    public async Task<ApiResponse<IReadOnlyCollection<BranchDto>>> BranchesAsync(long? companyId, string? search, bool activeOnly, CancellationToken ct)
    {
        var branches = await repository.BranchesAsync(companyId, search, activeOnly, ct);
        if (await IsSystemOwnerAsync(ct))
            return ApiResponse<IReadOnlyCollection<BranchDto>>.Success(branches);

        var userId = RequireUserId();
        var visible = new List<BranchDto>();
        foreach (var branch in branches)
            if (await scopes.CanAccessAsync(userId, branch.CompanyId, branch.Id, ct))
                visible.Add(branch);
        return ApiResponse<IReadOnlyCollection<BranchDto>>.Success(visible);
    }

    public async Task<ApiResponse<BranchDto>> BranchAsync(long id, CancellationToken ct)
    {
        var branch = await repository.BranchAsync(id, ct) ?? throw new NotFoundException("Branch was not found.");
        await DemandBranchAccessAsync(branch, ct);
        return ApiResponse<BranchDto>.Success(branch);
    }

    public async Task<ApiResponse<BranchDto>> SaveBranchAsync(long? id, SaveBranchRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(branchValidator, request, ct);

        var company = await repository.CompanyAsync(request.CompanyId, ct) ?? throw new NotFoundException("Company was not found.");
        if (!company.IsActive)
            throw new CosmosException("Branch must belong to an active company.", 409);

        BranchDto? old = null;
        if (id is null)
        {
            // Branch-only assignments deliberately cannot create additional branches.
            await DemandCompanyAccessAsync(company.Id, ct);
        }
        else
        {
            old = await repository.BranchAsync(id.Value, ct) ?? throw new NotFoundException("Branch was not found.");
            await DemandBranchAccessAsync(old, ct);
            if (old.CompanyId != request.CompanyId)
                throw new CosmosException("Branch company reassignment is not allowed.", 409);
        }

        var saved = await repository.SaveBranchAsync(id, request.CompanyId, request.Code.Trim(), request.Name.Trim(), request.IsActive, RequireUserId(), ct);
        await audit.AddAsync(new AuditEntryRequest("Branches", saved.Id.ToString(), id is null ? "Create" : saved.IsActive ? "Update" : "Deactivate", old is null ? null : AuditSerializer.Serialize(old), AuditSerializer.Serialize(saved), currentUser.UserId), ct);
        return ApiResponse<BranchDto>.Success(saved);
    }

    private async Task DemandCompanyAccessAsync(long companyId, CancellationToken ct)
    {
        if (await IsSystemOwnerAsync(ct))
            return;
        if (!await scopes.CanAccessAsync(RequireUserId(), companyId, null, ct))
            throw new NotFoundException("Company was not found.");
    }

    private async Task DemandBranchAccessAsync(BranchDto branch, CancellationToken ct)
    {
        if (await IsSystemOwnerAsync(ct))
            return;
        if (!await scopes.CanAccessAsync(RequireUserId(), branch.CompanyId, branch.Id, ct))
            throw new NotFoundException("Branch was not found.");
    }

    private int RequireUserId() => currentUser.UserId ?? throw new UnauthorizedCosmosException();

    private async Task<bool> IsSystemOwnerAsync(CancellationToken ct) =>
        currentUser.UserId is { } userId && await users.IsSystemOwnerAsync(userId, ct);
}
