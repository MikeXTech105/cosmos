using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Permissions;
using Cosmos.Domain.Security;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using FluentValidation;

namespace Cosmos.Application.Services;

public sealed class PermissionService : IPermissionService
{
    private readonly IPermissionRepository _repository;
    private readonly IAuditRepository _auditRepository;
    private readonly IValidator<SaveRolePermissionsRequest> _validator;

    public PermissionService(IPermissionRepository repository, IAuditRepository auditRepository, IValidator<SaveRolePermissionsRequest> validator)
    {
        _repository = repository;
        _auditRepository = auditRepository;
        _validator = validator;
    }

    public async Task<ApiResponse<IReadOnlyCollection<PermissionDto>>> GetByRoleIdAsync(int roleId, CancellationToken cancellationToken) =>
        ApiResponse<IReadOnlyCollection<PermissionDto>>.Success(await _repository.GetByRoleIdAsync(roleId, cancellationToken));

    public async Task<ApiResponse> SaveAsync(int roleId, SaveRolePermissionsRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_validator, request, cancellationToken);
        var old = await _repository.GetByRoleIdAsync(roleId, cancellationToken);
        var result = await _repository.SaveAsync(roleId, request.Permissions, cancellationToken);
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);
        await _auditRepository.AddAsync(new AuditEntryRequest("RolePermissions", roleId.ToString(), "Update", AuditSerializer.Serialize(old), AuditSerializer.Serialize(request), null), cancellationToken);
        return ApiResponse.Success(result.Message);
    }

    public Task<bool> UserHasPermissionAsync(int userId, string pageName, PermissionAction action, CancellationToken cancellationToken) =>
        _repository.UserHasPermissionAsync(userId, pageName, action, cancellationToken);
}
