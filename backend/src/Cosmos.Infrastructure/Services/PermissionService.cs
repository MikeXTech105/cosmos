using Cosmos.Application.Abstractions.Repositories;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.DTOs.Permissions;
using Cosmos.Domain.Entities;

namespace Cosmos.Infrastructure.Services;

public sealed class PermissionService(IPermissionRepository permissionRepository) : IPermissionService
{
    public async Task<IReadOnlyCollection<PermissionResponse>> GetByRoleAsync(Guid roleId, CancellationToken cancellationToken)
    {
        var permissions = await permissionRepository.GetByRoleAsync(roleId, cancellationToken);
        return permissions.Select(ToResponse).ToArray();
    }

    public Task<IReadOnlyCollection<string>> GetPermissionKeysByUserAsync(Guid userId, CancellationToken cancellationToken) =>
        permissionRepository.GetPermissionKeysByUserAsync(userId, cancellationToken);

    public Task UpsertAsync(UpsertRolePermissionRequest request, Guid? updatedBy, CancellationToken cancellationToken) =>
        permissionRepository.UpsertAsync(new RolePermission
        {
            RoleId = request.RoleId,
            PageId = request.PageId,
            SectionId = request.SectionId,
            FieldId = request.FieldId,
            CanView = request.CanView,
            CanCreate = request.CanCreate,
            CanEdit = request.CanEdit,
            CanDelete = request.CanDelete,
            CanFullAccess = request.CanFullAccess
        }, updatedBy, cancellationToken);

    public Task<bool> UserHasPermissionAsync(Guid userId, string permissionKey, CancellationToken cancellationToken) =>
        permissionRepository.UserHasPermissionAsync(userId, permissionKey, cancellationToken);

    private static PermissionResponse ToResponse(RolePermission permission) =>
        new(permission.Id, permission.RoleId, permission.PageId, permission.SectionId, permission.FieldId, permission.PermissionKey, permission.CanView, permission.CanCreate, permission.CanEdit, permission.CanDelete, permission.CanFullAccess);
}
