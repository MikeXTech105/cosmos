using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Permissions;
using Cosmos.Domain.Security;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;

namespace Cosmos.Application.Services;

public sealed class PermissionService : IPermissionService
{
    private readonly IPermissionRepository _repository;
    private readonly IAuditRepository _auditRepository;
    private readonly IUserRepository _userRepository;
    private readonly IRoleRepository _roleRepository;
    private readonly IValidator<SaveRolePermissionsRequest> _validator;
    private readonly ICurrentUser _currentUser;

    public PermissionService(
        IPermissionRepository repository,
        IAuditRepository auditRepository,
        IUserRepository userRepository,
        IRoleRepository roleRepository,
        IValidator<SaveRolePermissionsRequest> validator,
        ICurrentUser currentUser)
    {
        _repository = repository;
        _auditRepository = auditRepository;
        _userRepository = userRepository;
        _roleRepository = roleRepository;
        _validator = validator;
        _currentUser = currentUser;
    }

    public async Task<ApiResponse<IReadOnlyCollection<PermissionDto>>> GetByRoleIdAsync(int roleId, CancellationToken cancellationToken)
    {
        await EnsureManageableRoleAsync(roleId, cancellationToken);
        return ApiResponse<IReadOnlyCollection<PermissionDto>>.Success(await _repository.GetByRoleIdAsync(roleId, cancellationToken));
    }

    public async Task<ApiResponse> SaveAsync(int roleId, SaveRolePermissionsRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_validator, request, cancellationToken);
        await EnsureManageableRoleAsync(roleId, cancellationToken);
        var old = await _repository.GetByRoleIdAsync(roleId, cancellationToken);
        var result = await _repository.SaveAsync(roleId, request.Permissions, cancellationToken);
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);
        await _auditRepository.AddAsync(new AuditEntryRequest("RolePermissions", roleId.ToString(), "Update", AuditSerializer.Serialize(old), AuditSerializer.Serialize(request), _currentUser.UserId), cancellationToken);
        return ApiResponse.Success(result.Message);
    }

    public async Task<bool> UserHasPermissionAsync(int userId, string pageName, PermissionAction action, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetEntityByIdAsync(userId, cancellationToken);
        if (user is null || !user.IsActive || user.IsDeleted)
        {
            throw new UnauthorizedCosmosException("Authentication identity is no longer valid.");
        }

        if (await _userRepository.IsSystemOwnerAsync(userId, cancellationToken))
        {
            return true;
        }

        return await _repository.UserHasPermissionAsync(userId, pageName, action, cancellationToken);
    }

    private async Task EnsureManageableRoleAsync(int roleId, CancellationToken cancellationToken)
    {
        var role = await _roleRepository.GetEntityByIdAsync(roleId, cancellationToken);
        if (role is null || role.IsSystemRole)
        {
            throw new NotFoundException("Role was not found.");
        }
    }
}
