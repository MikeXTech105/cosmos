using Cosmos.Contracts.Roles;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IRoleService
{
    Task<ApiResponse<IReadOnlyCollection<RoleDetailDto>>> GetAllAsync(CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<RoleExportDto>>> ExportAsync(string? search, bool? isActive, string? sortBy, string? sortDirection, CancellationToken cancellationToken);
    Task<ApiResponse<RoleDetailDto>> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<ApiResponse<RoleDetailDto>> CreateAsync(CreateRoleRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<RoleDetailDto>> UpdateAsync(int id, UpdateRoleRequest request, CancellationToken cancellationToken);
    Task<ApiResponse> DeleteAsync(int id, CancellationToken cancellationToken);
}
