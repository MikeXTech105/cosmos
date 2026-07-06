using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Users;
using Cosmos.Domain.Entities;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using FluentValidation;

namespace Cosmos.Application.Services;

public sealed class UserService : IUserService
{
    private readonly IUserRepository _repository;
    private readonly IAuditRepository _auditRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IValidator<CreateUserRequest> _createValidator;
    private readonly IValidator<UpdateUserRequest> _updateValidator;
    private readonly IValidator<AssignUserRolesRequest> _assignRolesValidator;

    public UserService(IUserRepository repository, IAuditRepository auditRepository, IPasswordHasher passwordHasher, IValidator<CreateUserRequest> createValidator, IValidator<UpdateUserRequest> updateValidator, IValidator<AssignUserRolesRequest> assignRolesValidator)
    {
        _repository = repository;
        _auditRepository = auditRepository;
        _passwordHasher = passwordHasher;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _assignRolesValidator = assignRolesValidator;
    }

    public async Task<ApiResponse<IReadOnlyCollection<UserDto>>> GetAllAsync(CancellationToken cancellationToken) =>
        ApiResponse<IReadOnlyCollection<UserDto>>.Success(await _repository.GetAllAsync(cancellationToken));

    public async Task<ApiResponse<UserDto>> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        ApiResponse<UserDto>.Success(await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("User was not found."));

    public async Task<ApiResponse<UserDto>> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_createValidator, request, cancellationToken);
        var user = new User
        {
            Username = request.Username.Trim(),
            Email = request.Email.Trim(),
            FullName = request.FullName.Trim(),
            PasswordHash = _passwordHasher.Hash(request.Password),
            IsActive = request.IsActive
        };

        var created = await _repository.CreateAsync(user, cancellationToken);
        await _auditRepository.AddAsync(new AuditEntryRequest("Users", created.Id.ToString(), "Create", null, AuditSerializer.Serialize(created), null), cancellationToken);
        return ApiResponse<UserDto>.Success(created, "User created.");
    }

    public async Task<ApiResponse<UserDto>> UpdateAsync(int id, UpdateUserRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_updateValidator, request, cancellationToken);
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("User was not found.");
        var updated = await _repository.UpdateAsync(id, request, cancellationToken);
        await _auditRepository.AddAsync(new AuditEntryRequest("Users", id.ToString(), "Update", AuditSerializer.Serialize(old), AuditSerializer.Serialize(updated), null), cancellationToken);
        return ApiResponse<UserDto>.Success(updated, "User updated.");
    }

    public async Task<ApiResponse> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("User was not found.");
        var result = await _repository.DeleteAsync(id, cancellationToken);
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);
        await _auditRepository.AddAsync(new AuditEntryRequest("Users", id.ToString(), "Delete", AuditSerializer.Serialize(old), null, null), cancellationToken);
        return ApiResponse.Success(result.Message);
    }

    public Task<ApiResponse> ActivateAsync(int id, CancellationToken cancellationToken) => SetActiveAsync(id, true, cancellationToken);
    public Task<ApiResponse> DeactivateAsync(int id, CancellationToken cancellationToken) => SetActiveAsync(id, false, cancellationToken);

    public async Task<ApiResponse> AssignRolesAsync(int id, AssignUserRolesRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_assignRolesValidator, request, cancellationToken);
        var result = await _repository.AssignRolesAsync(id, request.RoleIds, cancellationToken);
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);
        await _auditRepository.AddAsync(new AuditEntryRequest("UserRoles", id.ToString(), "Update", null, AuditSerializer.Serialize(request), null), cancellationToken);
        return ApiResponse.Success(result.Message);
    }

    private async Task<ApiResponse> SetActiveAsync(int id, bool isActive, CancellationToken cancellationToken)
    {
        var result = await _repository.SetActiveAsync(id, isActive, cancellationToken);
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);
        await _auditRepository.AddAsync(new AuditEntryRequest("Users", id.ToString(), isActive ? "Activate" : "Deactivate", null, null, null), cancellationToken);
        return ApiResponse.Success(result.Message);
    }
}
