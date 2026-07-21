using System.Security.Claims;
using System.Text.Json;
using Cosmos.API.Middleware;
using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Services;
using Cosmos.Application.Validators;
using Cosmos.Contracts.Rojmel;
using Cosmos.Domain.Security;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Cosmos.Tests.Rojmel;

public sealed class RojmelMyWalletAuthorizationTests
{
    [Fact]
    public async Task My_wallet_create_permission_allows_the_self_service_authorization_filter()
    {
        var permissions = new Mock<IPermissionService>();
        permissions.Setup(x => x.UserHasPermissionAsync(2, RojmelPermissions.MyWallet, PermissionAction.Create, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        var filter = new RequirePermissionFilter(RojmelPermissions.MyWallet, PermissionAction.Create, permissions.Object, NullLogger<RequirePermissionFilter>.Instance);
        var context = CreateFilterContext(new ClaimsPrincipal(new ClaimsIdentity([new Claim("UserId", "2")], "test")));

        await filter.OnAuthorizationAsync(context);

        Assert.Null(context.Result);
        permissions.Verify(x => x.UserHasPermissionAsync(2, RojmelPermissions.Transactions, PermissionAction.Create, It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Unauthenticated_request_returns_401()
    {
        var filter = new RequirePermissionFilter(
            RojmelPermissions.MyWallet,
            PermissionAction.Create,
            Mock.Of<IPermissionService>(),
            NullLogger<RequirePermissionFilter>.Instance);
        var context = CreateFilterContext(new ClaimsPrincipal(new ClaimsIdentity()));

        await filter.OnAuthorizationAsync(context);

        var response = Assert.IsType<ObjectResult>(context.Result);
        Assert.Equal(StatusCodes.Status401Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Authenticated_user_without_my_wallet_create_returns_403()
    {
        var permissions = new Mock<IPermissionService>();
        permissions.Setup(x => x.UserHasPermissionAsync(2, RojmelPermissions.MyWallet, PermissionAction.Create, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        var filter = new RequirePermissionFilter(RojmelPermissions.MyWallet, PermissionAction.Create, permissions.Object, NullLogger<RequirePermissionFilter>.Instance);
        var context = CreateFilterContext(new ClaimsPrincipal(new ClaimsIdentity([new Claim("UserId", "2")], "test")));

        await filter.OnAuthorizationAsync(context);

        var response = Assert.IsType<ObjectResult>(context.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Self_service_income_uses_only_the_authenticated_users_linked_wallet()
    {
        var repository = new Mock<IRojmelRepository>();
        repository.Setup(x => x.GetMyWalletAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync(new RojmelWalletDto { Id = 19, LinkedUserId = 2, IsActive = true });
        repository.Setup(x => x.CreateTransactionAsync(WalletTransactionType.Income, It.IsAny<CreateRojmelTransactionRequest>(), 2, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RojmelTransactionDto { Id = 44, WalletId = 19, TransactionType = WalletTransactionType.Income, Amount = 12.5m });

        var service = CreateTransactionService(repository.Object, new StubCurrentUser(2));
        var response = await service.CreateMyIncomeAsync(new CreateMyWalletTransactionRequest(new DateOnly(2026, 7, 21), null, 12.5m, null, null, null), CancellationToken.None);

        Assert.True(response.Succeeded);
        Assert.Equal(19, response.Data!.WalletId);
        repository.Verify(x => x.CreateTransactionAsync(
            WalletTransactionType.Income,
            It.Is<CreateRojmelTransactionRequest>(request => request.WalletId == 19 && request.Amount == 12.5m),
            2,
            false,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Missing_my_wallet_returns_a_safe_machine_readable_404()
    {
        var repository = new Mock<IRojmelRepository>();
        repository.Setup(x => x.GetMyWalletAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync((RojmelWalletDto?)null);
        var service = CreateTransactionService(repository.Object, new StubCurrentUser(2));

        var exception = await Assert.ThrowsAsync<CosmosException>(() => service.CreateMyIncomeAsync(new CreateMyWalletTransactionRequest(new DateOnly(2026, 7, 21), null, 12.5m, null, null, null), CancellationToken.None));

        Assert.Equal(StatusCodes.Status404NotFound, exception.StatusCode);
        Assert.Contains("ROJMEL_MY_WALLET_NOT_PROVISIONED", JsonSerializer.Serialize(exception.ResponseData), StringComparison.Ordinal);
        repository.Verify(x => x.CreateTransactionAsync(It.IsAny<WalletTransactionType>(), It.IsAny<CreateRojmelTransactionRequest>(), It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private static AuthorizationFilterContext CreateFilterContext(ClaimsPrincipal user)
    {
        var httpContext = new DefaultHttpContext { User = user };
        httpContext.Items[CorrelationIdMiddleware.HeaderName] = "test-correlation";
        return new AuthorizationFilterContext(new ActionContext(httpContext, new RouteData(), new ActionDescriptor()), []);
    }

    private static RojmelTransactionService CreateTransactionService(IRojmelRepository repository, ICurrentUser currentUser)
    {
        var permissions = new Mock<IPermissionService>();
        permissions.Setup(x => x.UserHasPermissionAsync(2, RojmelPermissions.Admin, PermissionAction.View, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        var audit = new Mock<IAuditRepository>();
        audit.Setup(x => x.AddAsync(It.IsAny<Cosmos.Contracts.Audit.AuditEntryRequest>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        return new RojmelTransactionService(
            repository,
            audit.Object,
            currentUser,
            permissions.Object,
            new RojmelTransactionListQueryValidator(),
            new CreateRojmelTransactionRequestValidator(),
            new CreateMyWalletTransactionRequestValidator(),
            new CreateRojmelAdjustmentRequestValidator(),
            new CancelRojmelTransactionRequestValidator());
    }

    private sealed class StubCurrentUser(int userId) : ICurrentUser
    {
        public int? UserId => userId;
        public string? Username => null;
        public string? Email => null;
    }
}
