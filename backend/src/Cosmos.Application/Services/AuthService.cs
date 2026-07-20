using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Auth;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using FluentValidation;

namespace Cosmos.Application.Services;

public sealed class AuthService : IAuthService
{
    private readonly IAuthRepository _authRepository;
    private readonly IUserRepository _userRepository;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IValidator<LoginRequest> _loginValidator;
    private readonly IValidator<RefreshTokenRequest> _refreshValidator;
    private readonly IValidator<LogoutRequest> _logoutValidator;
    private readonly IValidator<ChangePasswordRequest> _changePasswordValidator;
    private readonly IValidator<ForgotPasswordRequest> _forgotPasswordValidator;
    private readonly IValidator<ResetPasswordRequest> _resetPasswordValidator;
    private readonly IValidator<UpdateCurrentUserProfileRequest> _updateProfileValidator;

    public AuthService(
        IAuthRepository authRepository,
        IUserRepository userRepository,
        ITokenService tokenService,
        IPasswordHasher passwordHasher,
        IValidator<LoginRequest> loginValidator,
        IValidator<RefreshTokenRequest> refreshValidator,
        IValidator<LogoutRequest> logoutValidator,
        IValidator<ChangePasswordRequest> changePasswordValidator,
        IValidator<ForgotPasswordRequest> forgotPasswordValidator,
        IValidator<ResetPasswordRequest> resetPasswordValidator,
        IValidator<UpdateCurrentUserProfileRequest> updateProfileValidator)
    {
        _authRepository = authRepository;
        _userRepository = userRepository;
        _tokenService = tokenService;
        _passwordHasher = passwordHasher;
        _loginValidator = loginValidator;
        _refreshValidator = refreshValidator;
        _logoutValidator = logoutValidator;
        _changePasswordValidator = changePasswordValidator;
        _forgotPasswordValidator = forgotPasswordValidator;
        _resetPasswordValidator = resetPasswordValidator;
        _updateProfileValidator = updateProfileValidator;
    }

    public async Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_loginValidator, request, cancellationToken);

        var user = await _authRepository.GetUserForLoginAsync(request.UsernameOrEmail, cancellationToken);
        if (user is null || !user.IsActive || user.IsDeleted || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedCosmosException("Invalid username or password.");
        }

        var response = await BuildLoginResponseAsync(user, cancellationToken);
        return ApiResponse<LoginResponse>.Success(response, "Login successful.");
    }

    public async Task<ApiResponse<LoginResponse>> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_refreshValidator, request, cancellationToken);

        var existingToken = await _authRepository.GetRefreshTokenAsync(request.RefreshToken, cancellationToken);
        if (existingToken is null || existingToken.IsRevoked || existingToken.ExpiryDate <= DateTime.UtcNow)
        {
            throw new UnauthorizedCosmosException("Refresh token is invalid or expired.");
        }

        var user = await _userRepository.GetEntityByIdAsync(existingToken.UserId, cancellationToken);
        if (user is null || !user.IsActive || user.IsDeleted)
        {
            throw new UnauthorizedCosmosException("User is not active.");
        }

        await _authRepository.RevokeRefreshTokenAsync(request.RefreshToken, cancellationToken);
        var response = await BuildLoginResponseAsync(user, cancellationToken);
        return ApiResponse<LoginResponse>.Success(response, "Token refreshed.");
    }

    public async Task<ApiResponse<CurrentUserProfileDto>> GetCurrentUserProfileAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetEntityByIdAsync(userId, cancellationToken)
            ?? throw new UnauthorizedCosmosException("Authentication identity is no longer valid.");
        if (!user.IsActive || user.IsDeleted)
        {
            throw new UnauthorizedCosmosException("Authentication identity is no longer valid.");
        }

        return ApiResponse<CurrentUserProfileDto>.Success(await BuildCurrentUserProfileAsync(user, cancellationToken));
    }

    public async Task<ApiResponse<CurrentUserProfileDto>> UpdateCurrentUserProfileAsync(
        int userId,
        UpdateCurrentUserProfileRequest request,
        CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_updateProfileValidator, request, cancellationToken);
        var user = await _userRepository.GetEntityByIdAsync(userId, cancellationToken)
            ?? throw new UnauthorizedCosmosException("Authentication identity is no longer valid.");
        if (!user.IsActive || user.IsDeleted)
        {
            throw new UnauthorizedCosmosException("Authentication identity is no longer valid.");
        }

        await _userRepository.UpdateSelfAsync(userId, request.Email.Trim(), request.FullName.Trim(), cancellationToken);
        var updated = await _userRepository.GetEntityByIdAsync(userId, cancellationToken)
            ?? throw new UnauthorizedCosmosException("Authentication identity is no longer valid.");
        return ApiResponse<CurrentUserProfileDto>.Success(
            await BuildCurrentUserProfileAsync(updated, cancellationToken),
            "Profile updated.");
    }

    public async Task<ApiResponse> LogoutAsync(LogoutRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_logoutValidator, request, cancellationToken);
        await _authRepository.RevokeRefreshTokenAsync(request.RefreshToken, cancellationToken);
        return ApiResponse.Success("Logged out successfully.");
    }

    public async Task<ApiResponse> ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_changePasswordValidator, request, cancellationToken);

        var user = await _userRepository.GetEntityByIdAsync(userId, cancellationToken) ?? throw new NotFoundException("User was not found.");
        if (!_passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
        {
            throw new UnauthorizedCosmosException("Current password is incorrect.");
        }

        var result = await _authRepository.UpdatePasswordAsync(userId, _passwordHasher.Hash(request.NewPassword), cancellationToken);
        if (!result.Succeeded)
        {
            throw new CosmosException(result.Message, result.StatusCode);
        }

        return ApiResponse.Success("Password changed successfully.");
    }

    public async Task<ApiResponse> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_forgotPasswordValidator, request, cancellationToken);

        var resetToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray()).Replace("/", "_").Replace("+", "-");
        await _authRepository.CreatePasswordResetTokenAsync(request.Email, resetToken, DateTime.UtcNow.AddMinutes(30), cancellationToken);

        return ApiResponse.Success("If the account exists, a password reset token has been generated.");
    }

    public async Task<ApiResponse> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_resetPasswordValidator, request, cancellationToken);

        var result = await _authRepository.ResetPasswordAsync(request.Email, request.ResetToken, _passwordHasher.Hash(request.NewPassword), cancellationToken);
        if (!result.Succeeded)
        {
            throw new CosmosException(result.Message, result.StatusCode);
        }

        return ApiResponse.Success("Password reset successfully.");
    }

    private async Task<LoginResponse> BuildLoginResponseAsync(Cosmos.Domain.Entities.User user, CancellationToken cancellationToken)
    {
        var access = _tokenService.CreateAccessToken(user);
        var refresh = _tokenService.CreateRefreshToken();
        await _authRepository.SaveRefreshTokenAsync(user.Id, refresh.Token, refresh.ExpiresOn, cancellationToken);

        var roles = await _userRepository.GetRolesByUserIdAsync(user.Id, cancellationToken);
        var pages = await _userRepository.GetPagePermissionsByUserIdAsync(user.Id, cancellationToken);

        var isSuperAdmin = await _userRepository.IsPrivilegedAdministratorAsync(user.Id, cancellationToken);

        return new LoginResponse(
            access.Token,
            refresh.Token,
            access.ExpiresOn,
            refresh.ExpiresOn,
            new UserSummaryDto(user.Id, user.Username, user.Email, user.FullName, user.IsActive, isSuperAdmin),
            roles,
            pages,
            isSuperAdmin);
    }

    private async Task<CurrentUserProfileDto> BuildCurrentUserProfileAsync(Cosmos.Domain.Entities.User user, CancellationToken cancellationToken)
    {
        var roles = await _userRepository.GetRolesByUserIdAsync(user.Id, cancellationToken);
        var isSuperAdmin = await _userRepository.IsPrivilegedAdministratorAsync(user.Id, cancellationToken);
        return new CurrentUserProfileDto(
            user.Id,
            user.Username,
            user.FullName,
            user.Email,
            user.IsActive,
            isSuperAdmin,
            roles);
    }
}
