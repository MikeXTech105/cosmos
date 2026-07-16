using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Roles;
using Cosmos.Domain.Entities;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;

namespace Cosmos.Application.Services;

public sealed class RoleService : IRoleService
{
    private readonly IRoleRepository _repository;
    private readonly IAuditRepository _auditRepository;
    private readonly IValidator<CreateRoleRequest> _createValidator;
    private readonly IValidator<UpdateRoleRequest> _updateValidator;
    private readonly ICurrentUser _currentUser;

    public RoleService(IRoleRepository repository, IAuditRepository auditRepository, IValidator<CreateRoleRequest> createValidator, IValidator<UpdateRoleRequest> updateValidator, ICurrentUser currentUser)
    {
        _repository = repository;
        _auditRepository = auditRepository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _currentUser = currentUser;
    }

    public async Task<ApiResponse<IReadOnlyCollection<RoleDetailDto>>> GetAllAsync(CancellationToken cancellationToken) =>
        ApiResponse<IReadOnlyCollection<RoleDetailDto>>.Success(await _repository.GetAllAsync(cancellationToken));

    public async Task<ApiResponse<RoleDetailDto>> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        ApiResponse<RoleDetailDto>.Success(await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Role was not found."));

    public async Task<ApiResponse<RoleDetailDto>> CreateAsync(CreateRoleRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_createValidator, request, cancellationToken);
        var role = new Role { Name = request.Name.Trim(), Description = request.Description?.Trim(), IsActive = request.IsActive };
        var created = await _repository.CreateAsync(role, cancellationToken);
        await _auditRepository.AddAsync(new AuditEntryRequest("Roles", created.Id.ToString(), "Create", null, AuditSerializer.Serialize(created), _currentUser.UserId), cancellationToken);
        return ApiResponse<RoleDetailDto>.Success(created, "Role created.");
    }

    public async Task<ApiResponse<RoleDetailDto>> UpdateAsync(int id, UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_updateValidator, request, cancellationToken);
        await EnsureManageableRoleAsync(id, cancellationToken);
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Role was not found.");
        var updated = await _repository.UpdateAsync(id, request, cancellationToken);
        await _auditRepository.AddAsync(new AuditEntryRequest("Roles", id.ToString(), "Update", AuditSerializer.Serialize(old), AuditSerializer.Serialize(updated), _currentUser.UserId), cancellationToken);
        return ApiResponse<RoleDetailDto>.Success(updated, "Role updated.");
    }

    public async Task<ApiResponse> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        await EnsureManageableRoleAsync(id, cancellationToken);
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Role was not found.");
        var result = await _repository.DeleteAsync(id, cancellationToken);
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);
        await _auditRepository.AddAsync(new AuditEntryRequest("Roles", id.ToString(), "Delete", AuditSerializer.Serialize(old), null, _currentUser.UserId), cancellationToken);
        return ApiResponse.Success(result.Message);
    }

    private async Task EnsureManageableRoleAsync(int id, CancellationToken cancellationToken)
    {
        var role = await _repository.GetEntityByIdAsync(id, cancellationToken);
        if (role is null || role.IsSystemRole)
        {
            throw new NotFoundException("Role was not found.");
        }
    }
}
