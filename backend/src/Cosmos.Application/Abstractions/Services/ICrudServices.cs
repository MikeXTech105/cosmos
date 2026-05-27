using Cosmos.Application.DTOs.Navigation;
using Cosmos.Application.DTOs.Roles;
using Cosmos.Application.DTOs.Users;
using Cosmos.Shared.Models;

namespace Cosmos.Application.Abstractions.Services;

public interface IRoleService
{
    Task<PagedResult<RoleResponse>> GetPagedAsync(QueryParameters query, CancellationToken cancellationToken);
    Task<RoleResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Guid> CreateAsync(CreateRoleRequest request, Guid? createdBy, CancellationToken cancellationToken);
    Task UpdateAsync(Guid id, UpdateRoleRequest request, Guid? updatedBy, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken);
}

public interface IUserService
{
    Task<PagedResult<UserResponse>> GetPagedAsync(UserQueryParameters query, CancellationToken cancellationToken);
    Task<UserResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Guid> CreateAsync(CreateUserRequest request, Guid? createdBy, CancellationToken cancellationToken);
    Task UpdateAsync(Guid id, UpdateUserRequest request, Guid? updatedBy, CancellationToken cancellationToken);
    Task SetActiveStatusAsync(Guid id, bool isActive, Guid? updatedBy, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken);
}

public interface IPageService
{
    Task<PagedResult<PageResponse>> GetPagedAsync(QueryParameters query, CancellationToken cancellationToken);
    Task<PageResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Guid> CreateAsync(CreatePageRequest request, Guid? createdBy, CancellationToken cancellationToken);
    Task UpdateAsync(Guid id, UpdatePageRequest request, Guid? updatedBy, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken);
}

public interface ISectionService
{
    Task<PagedResult<SectionResponse>> GetPagedAsync(SectionQueryParameters query, CancellationToken cancellationToken);
    Task<SectionResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Guid> CreateAsync(CreateSectionRequest request, Guid? createdBy, CancellationToken cancellationToken);
    Task UpdateAsync(Guid id, UpdateSectionRequest request, Guid? updatedBy, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken);
}

public interface IFieldService
{
    Task<PagedResult<FieldResponse>> GetPagedAsync(FieldQueryParameters query, CancellationToken cancellationToken);
    Task<FieldResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Guid> CreateAsync(CreateFieldRequest request, Guid? createdBy, CancellationToken cancellationToken);
    Task UpdateAsync(Guid id, UpdateFieldRequest request, Guid? updatedBy, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken);
}
