using Cosmos.Application.Abstractions.Repositories;
using Cosmos.Domain.Entities;
using Cosmos.Infrastructure.Database;
using Cosmos.Shared.Models;
using Dapper;

namespace Cosmos.Infrastructure.Repositories;

public sealed class UserRepository(IDbConnectionFactory connectionFactory) : BaseRepository(connectionFactory), IUserRepository
{
    public async Task<PagedResult<User>> GetPagedAsync(QueryParameters query, Guid? roleId, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = (await connection.QueryAsync<UserRow>(Command(
            "select * from cosmos.fn_users_get_all(@SearchTerm, @SortBy, @SortDirection, @PageNumber, @PageSize, @IsActive, @RoleId);",
            new { query.SearchTerm, query.SortBy, query.SortDirection, query.PageNumber, query.PageSize, query.IsActive, RoleId = roleId },
            cancellationToken))).ToArray();

        return new PagedResult<User>
        {
            Items = rows.Select(x => x.ToEntity()).ToArray(),
            PageNumber = query.PageNumber,
            PageSize = query.PageSize,
            TotalCount = rows.FirstOrDefault()?.TotalCount ?? 0
        };
    }

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<User>(Command("select * from cosmos.fn_users_get_by_id(@Id);", new { Id = id }, cancellationToken));
    }

    public async Task<Guid> CreateAsync(User user, Guid? createdBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<Guid>(Command(
            "select cosmos.fn_users_create(@FirstName, @LastName, @Email, @PasswordHash, @RoleId, @IsActive, @CreatedBy);",
            new { user.FirstName, user.LastName, user.Email, user.PasswordHash, user.RoleId, user.IsActive, CreatedBy = createdBy },
            cancellationToken));
    }

    public async Task UpdateAsync(User user, Guid? updatedBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(Command(
            "select cosmos.fn_users_update(@Id, @FirstName, @LastName, @Email, @RoleId, @IsActive, @UpdatedBy);",
            new { user.Id, user.FirstName, user.LastName, user.Email, user.RoleId, user.IsActive, UpdatedBy = updatedBy },
            cancellationToken));
    }

    public async Task SetActiveStatusAsync(Guid id, bool isActive, Guid? updatedBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(Command(
            "select cosmos.fn_users_set_active(@Id, @IsActive, @UpdatedBy);",
            new { Id = id, IsActive = isActive, UpdatedBy = updatedBy },
            cancellationToken));
    }

    public async Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(Command("select cosmos.fn_users_delete(@Id, @DeletedBy);", new { Id = id, DeletedBy = deletedBy }, cancellationToken));
    }

    private sealed class UserRow : User
    {
        public long TotalCount { get; init; }
        public User ToEntity() => new()
        {
            Id = Id,
            FirstName = FirstName,
            LastName = LastName,
            Email = Email,
            PasswordHash = PasswordHash,
            RoleId = RoleId,
            RoleName = RoleName,
            IsActive = IsActive,
            IsDeleted = IsDeleted,
            CreatedAt = CreatedAt,
            CreatedBy = CreatedBy,
            UpdatedAt = UpdatedAt,
            UpdatedBy = UpdatedBy
        };
    }
}
