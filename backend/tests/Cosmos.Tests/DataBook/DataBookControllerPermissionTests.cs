using Cosmos.API.Controllers.DataBook;
using Cosmos.API.Security;
using Cosmos.Contracts.DataBook;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.Tests.DataBook;

public sealed class DataBookControllerPermissionTests
{
    [Theory]
    [InlineData("List", PermissionAction.View)]
    [InlineData("Get", PermissionAction.View)]
    [InlineData("Create", PermissionAction.Create)]
    [InlineData("Update", PermissionAction.Edit)]
    [InlineData("Delete", PermissionAction.Delete)]
    [InlineData("History", PermissionAction.View)]
    [InlineData("Export", PermissionAction.Export)]
    public void Every_data_book_action_uses_the_expected_existing_permission_action(string methodName, PermissionAction action)
    {
        var method = typeof(DataBookEntriesController).GetMethods().Single(method => method.Name == methodName);
        var permission = Assert.Single(method.GetCustomAttributes(typeof(RequirePermissionAttribute), inherit: true).Cast<RequirePermissionAttribute>());

        Assert.Equal(new object[] { DataBookPermissions.Entries, action }, permission.Arguments);
    }

    [Fact]
    public void History_openapi_metadata_exposes_the_normalized_contract()
    {
        var method = typeof(DataBookEntriesController).GetMethods().Single(method => method.Name == "History");
        var response = Assert.Single(method.GetCustomAttributes(typeof(ProducesResponseTypeAttribute), inherit: true)
            .Cast<ProducesResponseTypeAttribute>());

        Assert.Equal(typeof(ApiResponse<IReadOnlyCollection<DataBookEntryHistoryDto>>), response.Type);
        Assert.Equal(typeof(IReadOnlyList<string>), typeof(DataBookEntryHistoryDto).GetProperty(nameof(DataBookEntryHistoryDto.ChangedFields))!.PropertyType);
        Assert.Equal(typeof(DataBookEntryHistorySnapshotDto), typeof(DataBookEntryHistoryDto).GetProperty(nameof(DataBookEntryHistoryDto.OldData))!.PropertyType);
        Assert.Equal(typeof(DataBookEntryHistorySnapshotDto), typeof(DataBookEntryHistoryDto).GetProperty(nameof(DataBookEntryHistoryDto.NewData))!.PropertyType);
    }
}
