using Cosmos.Application.Abstractions.Repositories;
using Cosmos.Domain.Entities;
using Cosmos.Infrastructure.Database;
using Cosmos.Shared.Models;
using Dapper;

namespace Cosmos.Infrastructure.Repositories;

public sealed class RoleRepository(IDbConnectionFactory connectionFactory) : BaseRepository(connectionFactory), IRoleRepository
{
    public async Task<PagedResult<Role>> GetPagedAsync(QueryParameters query, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = (await connection.QueryAsync<RoleRow>(Command(
            "select * from cosmos.fn_roles_get_all(@SearchTerm, @SortBy, @SortDirection, @PageNumber, @PageSize, @IsActive);",
            query,
            cancellationToken))).ToArray();

        return new PagedResult<Role>
        {
            Items = rows.Select(x => x.ToEntity()).ToArray(),
            PageNumber = query.PageNumber,
            PageSize = query.PageSize,
            TotalCount = rows.FirstOrDefault()?.TotalCount ?? 0
        };
    }

    public async Task<Role?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<Role>(Command("select * from cosmos.fn_roles_get_by_id(@Id);", new { Id = id }, cancellationToken));
    }

    public async Task<Guid> CreateAsync(Role role, Guid? createdBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<Guid>(Command(
            "select cosmos.fn_roles_create(@RoleName, @Description, @IsActive, @CreatedBy);",
            new { role.RoleName, role.Description, role.IsActive, CreatedBy = createdBy },
            cancellationToken));
    }

    public async Task UpdateAsync(Role role, Guid? updatedBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(Command(
            "select cosmos.fn_roles_update(@Id, @RoleName, @Description, @IsActive, @UpdatedBy);",
            new { role.Id, role.RoleName, role.Description, role.IsActive, UpdatedBy = updatedBy },
            cancellationToken));
    }

    public async Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(Command("select cosmos.fn_roles_delete(@Id, @DeletedBy);", new { Id = id, DeletedBy = deletedBy }, cancellationToken));
    }

    private sealed class RoleRow : Role
    {
        public long TotalCount { get; init; }
        public Role ToEntity() => new()
        {
            Id = Id,
            RoleName = RoleName,
            Description = Description,
            IsActive = IsActive,
            IsDeleted = IsDeleted,
            CreatedAt = CreatedAt,
            CreatedBy = CreatedBy,
            UpdatedAt = UpdatedAt,
            UpdatedBy = UpdatedBy
        };
    }
}
