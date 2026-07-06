namespace Cosmos.Domain.Entities;

public sealed class RolePermission
{
    public int RoleId { get; set; }
    public int PageId { get; set; }
    public bool CanView { get; set; }
    public bool CanCreate { get; set; }
    public bool CanEdit { get; set; }
    public bool CanDelete { get; set; }
    public bool CanExport { get; set; }
    public bool CanApprove { get; set; }
}
