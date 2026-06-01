using System.Data;
using Cosmos.Contracts.Permissions;

namespace Cosmos.Persistence.Dapper;

internal static class TableValuedParameters
{
    public static DataTable IntIdList(IEnumerable<int> ids)
    {
        var table = new DataTable();
        table.Columns.Add("Id", typeof(int));
        foreach (var id in ids.Distinct())
        {
            table.Rows.Add(id);
        }

        return table;
    }

    public static DataTable Permissions(IEnumerable<PermissionUpsertDto> permissions)
    {
        var table = new DataTable();
        table.Columns.Add("PageId", typeof(int));
        table.Columns.Add("CanView", typeof(bool));
        table.Columns.Add("CanCreate", typeof(bool));
        table.Columns.Add("CanEdit", typeof(bool));
        table.Columns.Add("CanDelete", typeof(bool));
        table.Columns.Add("CanExport", typeof(bool));
        table.Columns.Add("CanApprove", typeof(bool));

        foreach (var permission in permissions)
        {
            table.Rows.Add(permission.PageId, permission.CanView, permission.CanCreate, permission.CanEdit, permission.CanDelete, permission.CanExport, permission.CanApprove);
        }

        return table;
    }
}
