using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Roles;
using Cosmos.Domain.Entities;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using FluentValidation;

namespace Cosmos.Application.Services;

public sealed class RoleService : IRoleService
{
    private readonly IRoleRepository _repository;
    private readonly IAuditRepository _auditRepository;
    private readonly IValidator<CreateRoleRequest> _createValidator;
    private readonly IValidator<UpdateRoleRequest> _updateValidator;

    public RoleService(IRoleRepository repository, IAuditRepository auditRepository, IValidator<CreateRoleRequest> createValidator, IValidator<UpdateRoleRequest> updateValidator)
    {
        _repository = repository;
        _auditRepository = auditRepository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
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
        await _auditRepository.AddAsync(new AuditEntryRequest("Roles", created.Id.ToString(), "Create", null, AuditSerializer.Serialize(created), null), cancellationToken);
        return ApiResponse<RoleDetailDto>.Success(created, "Role created.");
    }

    public async Task<ApiResponse<RoleDetailDto>> UpdateAsync(int id, UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_updateValidator, request, cancellationToken);
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Role was not found.");
        var updated = await _repository.UpdateAsync(id, request, cancellationToken);
        await _auditRepository.AddAsync(new AuditEntryRequest("Roles", id.ToString(), "Update", AuditSerializer.Serialize(old), AuditSerializer.Serialize(updated), null), cancellationToken);
        return ApiResponse<RoleDetailDto>.Success(updated, "Role updated.");
    }

    public async Task<ApiResponse> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Role was not found.");
        var result = await _repository.DeleteAsync(id, cancellationToken);
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);
        await _auditRepository.AddAsync(new AuditEntryRequest("Roles", id.ToString(), "Delete", AuditSerializer.Serialize(old), null, null), cancellationToken);
        return ApiResponse.Success(result.Message);
    }
}
