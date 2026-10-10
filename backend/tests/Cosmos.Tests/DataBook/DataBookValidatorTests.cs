using Cosmos.Application.Validators;
using Cosmos.Contracts.DataBook;

namespace Cosmos.Tests.DataBook;

public sealed class DataBookValidatorTests
{
    [Fact]
    public async Task Create_rejects_blank_name_and_value()
    {
        var result = await new CreateDataBookEntryRequestValidator().ValidateAsync(new CreateDataBookEntryRequest("  ", "\t", null, null, false));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == "Name");
        Assert.Contains(result.Errors, error => error.PropertyName == "Value");
    }

    [Fact]
    public async Task List_rejects_unsafe_visibility_sort_and_date_range()
    {
        var request = new DataBookEntryListQuery(Visibility: "other-user-private", FromDate: new DateTime(2026, 8, 2), ToDate: new DateTime(2026, 8, 1), SortBy: "OwnerUserId", SortDirection: "sideways");

        var result = await new DataBookEntryListQueryValidator().ValidateAsync(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == "Visibility");
        Assert.Contains(result.Errors, error => error.PropertyName == "SortBy");
        Assert.Contains(result.Errors, error => error.PropertyName == "SortDirection");
        Assert.Contains(result.Errors, error => error.ErrorMessage.Contains("FromDate", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("AQIDBAUGBwg=")]
    [InlineData("not-base64")]
    public async Task Delete_requires_an_eight_byte_base64_row_version(string rowVersion)
    {
        var result = await new DeleteDataBookEntryRequestValidator().ValidateAsync(new DeleteDataBookEntryRequest(rowVersion));

        Assert.Equal(rowVersion == "AQIDBAUGBwg=", result.IsValid);
    }
}
