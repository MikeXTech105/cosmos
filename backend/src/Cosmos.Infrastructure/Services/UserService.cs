using Cosmos.Application.Abstractions.Repositories;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.DTOs.Users;
using Cosmos.Domain.Entities;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Models;

namespace Cosmos.Infrastructure.Services;

public sealed class UserService(IUserRepository userRepository, IPasswordHasher passwordHasher) : IUserService
{
    public async Task<PagedResult<UserResponse>> GetPagedAsync(UserQueryParameters query, CancellationToken cancellationToken)
    {
        var result = await userRepository.GetPagedAsync(query, query.RoleId, cancellationToken);
        return new PagedResult<UserResponse>
        {
            Items = result.Items.Select(ToResponse).ToArray(),
            PageNumber = result.PageNumber,
            PageSize = result.PageSize,
            TotalCount = result.TotalCount
        };
    }

    public async Task<UserResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        ToResponse(await userRepository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("User", id));

    public Task<Guid> CreateAsync(CreateUserRequest request, Guid? createdBy, CancellationToken cancellationToken) =>
        userRepository.CreateAsync(new User
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            PasswordHash = passwordHasher.Hash(request.Password),
            RoleId = request.RoleId,
            IsActive = request.IsActive
        }, createdBy, cancellationToken);

    public async Task UpdateAsync(Guid id, UpdateUserRequest request, Guid? updatedBy, CancellationToken cancellationToken)
    {
        _ = await userRepository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("User", id);
        await userRepository.UpdateAsync(new User
        {
            Id = id,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            RoleId = request.RoleId,
            IsActive = request.IsActive
        }, updatedBy, cancellationToken);
    }

    public async Task SetActiveStatusAsync(Guid id, bool isActive, Guid? updatedBy, CancellationToken cancellationToken)
    {
        _ = await userRepository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("User", id);
        await userRepository.SetActiveStatusAsync(id, isActive, updatedBy, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken)
    {
        _ = await userRepository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("User", id);
        await userRepository.DeleteAsync(id, deletedBy, cancellationToken);
    }

    private static UserResponse ToResponse(User user) =>
        new(user.Id, user.FirstName, user.LastName, user.Email, user.RoleId, user.RoleName, user.IsActive, user.CreatedAt);
}
