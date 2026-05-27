using Cosmos.Application.Abstractions.Repositories;
using Cosmos.Domain.Entities;
using Cosmos.Infrastructure.Database;
using Dapper;

namespace Cosmos.Infrastructure.Repositories;

public sealed class PermissionRepository(IDbConnectionFactory connectionFactory) : BaseRepository(connectionFactory), IPermissionRepository
{
    public async Task<IReadOnlyCollection<RolePermission>> GetByRoleAsync(Guid roleId, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        var permissions = await connection.QueryAsync<RolePermission>(Command(
            "select * from cosmos.fn_permissions_get_by_role(@RoleId);",
            new { RoleId = roleId },
            cancellationToken));
        return permissions.ToArray();
    }

    public async Task<IReadOnlyCollection<string>> GetPermissionKeysByUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        var keys = await connection.QueryAsync<string>(Command(
            "select * from cosmos.fn_permissions_get_keys_by_user(@UserId);",
            new { UserId = userId },
            cancellationToken));
        return keys.ToArray();
    }

    public async Task UpsertAsync(RolePermission permission, Guid? updatedBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(Command(
            "select cosmos.fn_permissions_upsert(@RoleId, @PageId, @SectionId, @FieldId, @CanView, @CanCreate, @CanEdit, @CanDelete, @CanFullAccess, @UpdatedBy);",
            new
            {
                permission.RoleId,
                permission.PageId,
                permission.SectionId,
                permission.FieldId,
                permission.CanView,
                permission.CanCreate,
                permission.CanEdit,
                permission.CanDelete,
                permission.CanFullAccess,
                UpdatedBy = updatedBy
            },
            cancellationToken));
    }

    public async Task<bool> UserHasPermissionAsync(Guid userId, string permissionKey, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<bool>(Command(
            "select cosmos.fn_user_has_permission(@UserId, @PermissionKey);",
            new { UserId = userId, PermissionKey = permissionKey },
            cancellationToken));
    }
}
