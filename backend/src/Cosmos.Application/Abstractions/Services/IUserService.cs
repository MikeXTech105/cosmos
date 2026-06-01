using Cosmos.Contracts.Users;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IUserService
{
    Task<ApiResponse<IReadOnlyCollection<UserDto>>> GetAllAsync(CancellationToken cancellationToken);
    Task<ApiResponse<UserDto>> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<ApiResponse<UserDto>> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<UserDto>> UpdateAsync(int id, UpdateUserRequest request, CancellationToken cancellationToken);
    Task<ApiResponse> DeleteAsync(int id, CancellationToken cancellationToken);
    Task<ApiResponse> ActivateAsync(int id, CancellationToken cancellationToken);
    Task<ApiResponse> DeactivateAsync(int id, CancellationToken cancellationToken);
    Task<ApiResponse> AssignRolesAsync(int id, AssignUserRolesRequest request, CancellationToken cancellationToken);
}
