namespace Cosmos.Contracts.Auth;

public sealed record LoginRequest(string UsernameOrEmail, string Password);
public sealed record RefreshTokenRequest(string RefreshToken);
public sealed record LogoutRequest(string RefreshToken);
public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword, string ConfirmPassword);
public sealed record ForgotPasswordRequest(string Email);
public sealed record ResetPasswordRequest(string Email, string ResetToken, string NewPassword, string ConfirmPassword);

public sealed record UserSummaryDto(int Id, string Username, string Email, string FullName, bool IsActive);
public sealed record RoleDto(int Id, string Name, string? Description, bool IsActive);
public sealed record LoginPagePermissionDto(
    int PageId,
    string PageName,
    string DisplayName,
    string Route,
    string? Icon,
    int? ParentPageId,
    int SortOrder,
    bool CanView,
    bool CanCreate,
    bool CanEdit,
    bool CanDelete,
    bool CanExport,
    bool CanApprove);

public sealed record LoginResponse(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresOn,
    DateTime RefreshTokenExpiresOn,
    UserSummaryDto User,
    IReadOnlyCollection<RoleDto> Roles,
    IReadOnlyCollection<LoginPagePermissionDto> Pages);
