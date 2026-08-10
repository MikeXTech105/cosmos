using System.Net;
using System.Security.Claims;
using Cosmos.API.Audit;
using Cosmos.API.Middleware;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Services;
using Cosmos.Application.Validators;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Microsoft.AspNetCore.Http;
using Moq;

namespace Cosmos.Tests.Audit;

public sealed class ActivityLogServiceAndContextTests
{
    [Fact]
    public async Task List_validates_filters_and_normalizes_the_safe_sort_name_before_repository_access()
    {
        ActivityLogListQuery? captured = null;
        var repository = new Mock<IAuditRepository>();
        repository.Setup(x => x.GetListAsync(It.IsAny<ActivityLogListQuery>(), It.IsAny<CancellationToken>()))
            .Callback<ActivityLogListQuery, CancellationToken>((query, _) => captured = query)
            .ReturnsAsync(new PagedResult<ActivityLogListItemDto>(
                [new ActivityLogListItemDto(9, DateTime.UtcNow, 7, "auditor", "Auditor", "Updated", "Items", "Items", "125", "Item 125", "Updated item", "PUT", "/api/v1/items/125", 200, "corr", 1)],
                1, 50, 1));
        var service = new ActivityLogService(repository.Object, new ActivityLogListQueryValidator(), new ActivityLogExportRequestValidator());

        var response = await service.GetListAsync(new ActivityLogListQuery(
            Search: "item", UserId: 7, Module: "Items", Action: "Updated", EntityType: "Items", EntityId: "125",
            FromDate: DateTime.UtcNow.AddDays(-1), ToDate: DateTime.UtcNow, HttpMethod: "put", StatusCode: 200,
            CorrelationId: "corr", PageNumber: 1, PageSize: 50, SortBy: "module", SortDirection: "ASC"), CancellationToken.None);

        Assert.True(response.Succeeded);
        Assert.Equal(9, Assert.Single(response.Data!.Items).Id);
        Assert.NotNull(captured);
        Assert.Equal("Module", captured!.SortBy);
        Assert.Equal("asc", captured.SortDirection);
        Assert.Equal("PUT", captured.HttpMethod);
    }

    [Fact]
    public void Http_context_adapter_uses_existing_actor_and_correlation_information_without_forwarded_headers()
    {
        var context = new DefaultHttpContext();
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim("UserId", "11"), new Claim("Username", "admin"), new Claim("FullName", "Admin User")], "test"));
        context.Request.Method = "PATCH";
        context.Request.Path = "/api/v1/items/125";
        context.Request.Headers.UserAgent = "COSMOS test browser";
        context.Connection.RemoteIpAddress = IPAddress.Parse("2001:db8::1");
        context.Items[CorrelationIdMiddleware.HeaderName] = "existing-correlation";

        var result = new HttpAuditRequestContext(new HttpContextAccessor { HttpContext = context }).GetCurrent();

        Assert.Equal(11, result.UserId);
        Assert.Equal("admin", result.Username);
        Assert.Equal("Admin User", result.UserDisplayName);
        Assert.Equal("existing-correlation", result.CorrelationId);
        Assert.Equal("2001:db8::1", result.IpAddress);
        Assert.Equal("HttpApi", result.Source);
    }
}
