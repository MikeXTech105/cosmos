using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Services;
using Cosmos.Application.Validators;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.DataBook;
using Cosmos.Domain.Security;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Security;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Cosmos.Tests.DataBook;

public sealed class DataBookServicePrivacyTests
{
    [Fact]
    public async Task List_passes_the_authenticated_user_to_the_repository_and_drops_an_unexpected_foreign_private_row_and_count()
    {
        var repository = new Mock<IDataBookRepository>();
        repository.Setup(x => x.GetListAsync(It.IsAny<DataBookEntryListQuery>(), 2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PagedResult<DataBookEntryListItemDto>(
            [ListItem(1, false, 1), ListItem(2, true, 1), ListItem(3, true, 2)], 1, 20, 3));
        var service = CreateService(repository.Object, 2);

        var result = await service.GetListAsync(new DataBookEntryListQuery(), CancellationToken.None);

        Assert.Equal(new long[] { 1, 3 }, result.Data!.Items.Select(entry => entry.Id));
        Assert.Equal(2, result.Data.TotalCount);
        repository.Verify(x => x.GetListAsync(It.IsAny<DataBookEntryListQuery>(), 2, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Other_users_private_detail_is_indistinguishable_from_not_found()
    {
        var repository = new Mock<IDataBookRepository>();
        repository.Setup(x => x.GetByIdAsync(44, 2, It.IsAny<CancellationToken>())).ReturnsAsync((DataBookEntryDto?)null);
        var service = CreateService(repository.Object, 2);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(44, CancellationToken.None));

        Assert.Equal(404, exception.StatusCode);
        Assert.Equal("Data Book entry was not found.", exception.Message);
    }

    [Fact]
    public async Task Defence_in_depth_blocks_private_update_if_a_repository_returns_a_foreign_row()
    {
        var repository = new Mock<IDataBookRepository>();
        repository.Setup(x => x.GetByIdAsync(44, 2, It.IsAny<CancellationToken>())).ReturnsAsync(Detail(44, true, 1));
        var service = CreateService(repository.Object, 2);
        var request = new UpdateDataBookEntryRequest("Name", "Value", null, null, true, "AQIDBAUGBwg=");

        var exception = await Assert.ThrowsAsync<NotFoundException>(() => service.UpdateAsync(44, request, "correlation", CancellationToken.None));

        Assert.Equal(404, exception.StatusCode);
        repository.Verify(x => x.UpdateAsync(It.IsAny<long>(), It.IsAny<UpdateDataBookEntryRequest>(), It.IsAny<byte[]>(), It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Public_entry_can_be_updated_by_another_authorized_user_without_changing_its_original_owner()
    {
        var repository = new Mock<IDataBookRepository>();
        repository.Setup(x => x.GetByIdAsync(44, 2, It.IsAny<CancellationToken>())).ReturnsAsync(Detail(44, false, 1));
        repository.Setup(x => x.UpdateAsync(44, It.IsAny<UpdateDataBookEntryRequest>(), It.IsAny<byte[]>(), 2, "correlation", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Detail(44, false, 1) with { UpdatedBy = 2, UpdatedByName = "User B", UpdatedAtUtc = new DateTime(2026, 8, 6, 12, 0, 0, DateTimeKind.Utc) });
        var service = CreateService(repository.Object, 2);
        var request = new UpdateDataBookEntryRequest("Name", "Updated", null, null, false, "AQIDBAUGBwg=");

        var result = await service.UpdateAsync(44, request, "correlation", CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal(1, result.Data!.OwnerUserId);
        Assert.Equal(1, result.Data.CreatedBy);
        Assert.Equal(2, result.Data.UpdatedBy);
    }

    [Fact]
    public async Task Private_history_owner_receives_normalized_history()
    {
        var repository = new Mock<IDataBookRepository>();
        repository.Setup(x => x.GetByIdAsync(44, 2, It.IsAny<CancellationToken>())).ReturnsAsync(Detail(44, true, 2));
        repository.Setup(x => x.GetHistoryAsync(44, 2, It.IsAny<CancellationToken>()))
            .ReturnsAsync([HistoryRow(44, 2, "[\"Value\"]")]);
        var service = CreateService(repository.Object, 2);

        var result = await service.GetHistoryAsync(44, CancellationToken.None);

        var history = Assert.Single(result.Data!);
        Assert.Equal(new[] { "Value" }, history.ChangedFields);
        Assert.Equal("Value", history.NewData!.Value);
    }

    [Theory]
    [InlineData(3, "SuperAdmin")]
    [InlineData(1, "System Owner")]
    public async Task Private_history_for_privileged_non_owner_remains_not_found(int userId, string roleName)
    {
        var repository = new Mock<IDataBookRepository>();
        // Full page permission is intentionally insufficient: SQL scoping returns no foreign private row for either role.
        repository.Setup(x => x.GetByIdAsync(44, userId, It.IsAny<CancellationToken>())).ReturnsAsync((DataBookEntryDto?)null);
        var service = CreateService(repository.Object, userId);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() => service.GetHistoryAsync(44, CancellationToken.None));

        Assert.Equal(404, exception.StatusCode);
        repository.Verify(x => x.GetHistoryAsync(It.IsAny<long>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never, roleName);
    }

    private static DataBookService CreateService(IDataBookRepository repository, int userId)
    {
        var permissions = new Mock<IPermissionService>();
        permissions.Setup(x => x.UserHasPermissionAsync(userId, DataBookPermissions.Entries, It.IsAny<PermissionAction>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        return new DataBookService(
            repository,
            Mock.Of<IAuditRepository>(),
            new StubCurrentUser(userId),
            permissions.Object,
            new CreateDataBookEntryRequestValidator(),
            new UpdateDataBookEntryRequestValidator(),
            new DeleteDataBookEntryRequestValidator(),
            new DataBookEntryListQueryValidator(),
            new DataBookExportRequestValidator(),
            NullLogger<DataBookService>.Instance);
    }

    private static DataBookEntryListItemDto ListItem(long id, bool isPrivate, int ownerUserId) =>
        new(id, $"Name {id}", "Preview", null, null, isPrivate, ownerUserId, $"User {ownerUserId}", "Creator", new DateTime(2026, 8, 6), null, null, new byte[8], 3);

    private static DataBookEntryDto Detail(long id, bool isPrivate, int ownerUserId) =>
        new(id, "Name", "Value", null, null, isPrivate, ownerUserId, $"User {ownerUserId}", 1, "User A", new DateTime(2026, 8, 6), null, null, null, new byte[8]);

    private static DataBookEntryHistoryRow HistoryRow(long entryId, int changedByUserId, string changedFieldsJson) =>
        new(15, entryId, "Updated", changedByUserId, "User A", new DateTime(2026, 8, 10, 5, 19, 14), changedFieldsJson,
            "{\"Name\":\"Name\",\"Value\":\"Previous\",\"IsPrivate\":false,\"OwnerUserId\":2}",
            "{\"Name\":\"Name\",\"Value\":\"Value\",\"IsPrivate\":false,\"OwnerUserId\":2}",
            "history-test");

    private sealed class StubCurrentUser(int userId) : ICurrentUser
    {
        public int? UserId => userId;
        public string? Username => null;
        public string? Email => null;
    }
}
