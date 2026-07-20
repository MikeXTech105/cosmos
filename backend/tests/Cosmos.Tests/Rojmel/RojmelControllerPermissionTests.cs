using Cosmos.API.Controllers.Rojmel;
using Cosmos.API.Security;
using Cosmos.Domain.Security;

namespace Cosmos.Tests.Rojmel;

public sealed class RojmelControllerPermissionTests
{
    [Theory]
    [InlineData(typeof(RojmelMyWalletController), "Income", RojmelPermissions.MyWallet, PermissionAction.View)]
    [InlineData(typeof(RojmelMyWalletController), "Income", RojmelPermissions.Transactions, PermissionAction.Create)]
    [InlineData(typeof(RojmelWalletsController), "Create", RojmelPermissions.Wallets, PermissionAction.Create)]
    [InlineData(typeof(RojmelTransactionsController), "List", RojmelPermissions.Transactions, PermissionAction.View)]
    [InlineData(typeof(RojmelTransfersController), "Create", RojmelPermissions.Transfers, PermissionAction.Create)]
    [InlineData(typeof(RojmelReportsController), "WalletLedger", RojmelPermissions.Reports, PermissionAction.View)]
    public void Controller_action_requires_the_expected_page_permission(Type controller, string methodName, string page, PermissionAction action)
    {
        var method = controller.GetMethods().Single(x => x.Name == methodName);
        var attributes = method.GetCustomAttributes(typeof(RequirePermissionAttribute), inherit: true).Cast<RequirePermissionAttribute>();

        Assert.Contains(attributes, attribute => attribute.Arguments is [string actualPage, PermissionAction actualAction] && actualPage == page && actualAction == action);
    }
}
