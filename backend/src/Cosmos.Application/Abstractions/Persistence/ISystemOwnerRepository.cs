namespace Cosmos.Application.Abstractions.Persistence;

public interface ISystemOwnerRepository
{
    Task<SystemOwnerProvisioningState> GetProvisioningStateAsync(CancellationToken cancellationToken);
    Task<SystemOwnerProvisioningResult> ProvisionAsync(
        string username,
        string email,
        string passwordHash,
        CancellationToken cancellationToken);
}

public sealed record SystemOwnerProvisioningState(
    int SystemUserCount,
    int SystemRoleCount,
    int LinkedOwnerCount,
    int SystemRolePermissionCount,
    int InvalidProtectedRoleLinkCount)
{
    public bool IsProvisioned =>
        SystemUserCount == 1 &&
        SystemRoleCount == 1 &&
        LinkedOwnerCount == 1 &&
        SystemRolePermissionCount == 0 &&
        InvalidProtectedRoleLinkCount == 0;

    public bool IsEmpty =>
        SystemUserCount == 0 &&
        SystemRoleCount == 0 &&
        LinkedOwnerCount == 0 &&
        SystemRolePermissionCount == 0 &&
        InvalidProtectedRoleLinkCount == 0;
}

public sealed record SystemOwnerProvisioningResult(int UserId, int RoleId, bool Created);
