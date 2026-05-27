using Cosmos.Application.Abstractions.Repositories;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.DTOs.Roles;
using Cosmos.Domain.Entities;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Models;

namespace Cosmos.Infrastructure.Services;

public sealed class RoleService(IRoleRepository roleRepository) : IRoleService
{
    public async Task<PagedResult<RoleResponse>> GetPagedAsync(QueryParameters query, CancellationToken cancellationToken)
    {
        var result = await roleRepository.GetPagedAsync(query, cancellationToken);
        return new PagedResult<RoleResponse>
        {
            Items = result.Items.Select(ToResponse).ToArray(),
            PageNumber = result.PageNumber,
            PageSize = result.PageSize,
            TotalCount = result.TotalCount
        };
    }

    public async Task<RoleResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        ToResponse(await roleRepository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Role", id));

    public Task<Guid> CreateAsync(CreateRoleRequest request, Guid? createdBy, CancellationToken cancellationToken) =>
        roleRepository.CreateAsync(new Role { RoleName = request.RoleName.Trim().ToUpperInvariant(), Description = request.Description, IsActive = request.IsActive }, createdBy, cancellationToken);

    public async Task UpdateAsync(Guid id, UpdateRoleRequest request, Guid? updatedBy, CancellationToken cancellationToken)
    {
        _ = await roleRepository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Role", id);
        await roleRepository.UpdateAsync(new Role { Id = id, RoleName = request.RoleName.Trim().ToUpperInvariant(), Description = request.Description, IsActive = request.IsActive }, updatedBy, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken)
    {
        _ = await roleRepository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Role", id);
        await roleRepository.DeleteAsync(id, deletedBy, cancellationToken);
    }

    private static RoleResponse ToResponse(Role role) => new(role.Id, role.RoleName, role.Description, role.IsActive, role.CreatedAt);
}
