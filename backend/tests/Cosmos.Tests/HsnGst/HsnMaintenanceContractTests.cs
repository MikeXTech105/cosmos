using System.Reflection;
using Cosmos.API.Controllers;
using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Services;
using Cosmos.Application.Validators;
using Cosmos.Contracts.HsnGst;
using Cosmos.Domain.Security;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Security;
using Moq;

namespace Cosmos.Tests.HsnGst;

public sealed class HsnMaintenanceContractTests
{
    [Theory]
    [InlineData(nameof(HsnGstController.ListHsnSacs), "GST.RateHistory", PermissionAction.View)]
    [InlineData(nameof(HsnGstController.CreateHsnSac), "GST.RateHistory", PermissionAction.Create)]
    [InlineData(nameof(HsnGstController.UpdateHsnSac), "GST.RateHistory", PermissionAction.Edit)]
    [InlineData(nameof(HsnGstController.SaveCategoryDefault), "Categories", PermissionAction.Edit)]
    [InlineData(nameof(HsnGstController.RetireCategoryDefault), "Categories", PermissionAction.Edit)]
    [InlineData(nameof(HsnGstController.SaveItemOverride), "Items", PermissionAction.Edit)]
    [InlineData(nameof(HsnGstController.RetireItemOverride), "Items", PermissionAction.Edit)]
    [InlineData(nameof(HsnGstController.GetEffectiveClassification), "Items", PermissionAction.View)]
    public void MaintenanceAndLookupRespectExistingMasterPermission(string method, string page, PermissionAction action)
    {
        var permission = Assert.Single(typeof(HsnGstController).GetMethod(method)!.GetCustomAttributes<RequirePermissionAttribute>());
        Assert.Equal(page, permission.Arguments![0]);
        Assert.Equal(action, permission.Arguments[1]);
    }

    [Fact]
    public async Task InvalidMappingDatesNeverReachPersistence()
    {
        var repository = new Mock<IHsnGstRepository>(MockBehavior.Strict);
        var service = Service(repository.Object);
        await Assert.ThrowsAsync<CosmosException>(() => service.SaveItemOverrideAsync(7, new SaveItemHsnOverrideRequest(9, new DateOnly(2026,10,28), new DateOnly(2026,10,27)), default));
        await Assert.ThrowsAsync<CosmosException>(() => service.SaveCategoryDefaultAsync(7, new SaveCategoryHsnDefaultRequest(0, new DateOnly(2026,10,28)), default));
        await Assert.ThrowsAsync<CosmosException>(() => service.GetEffectiveClassificationAsync(7, default, default));
        repository.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ClassificationRetainsLongItemIdentityExplicitDateAndSource()
    {
        const long item = 9007199254740993;
        var date = new DateOnly(2026,10,28);
        var repository = new Mock<IHsnGstRepository>();
        repository.Setup(x => x.GetEffectiveClassificationAsync(item,date,It.IsAny<CancellationToken>())).ReturnsAsync(new EffectiveProductClassificationDto(item,42,9,"3924","HSN","Household plastic","ProductOverride",date,null,"OLD"));
        var result = await Service(repository.Object).GetEffectiveClassificationAsync(item,date,default);
        Assert.Equal(item,result.Data!.ItemId);
        Assert.Equal("ProductOverride",result.Data.Source);
        Assert.Equal(date,result.Data.EffectiveFrom);
        repository.Verify(x=>x.GetEffectiveClassificationAsync(item,date,It.IsAny<CancellationToken>()),Times.Once);
    }

    private static HsnGstService Service(IHsnGstRepository repository) => new(repository, Mock.Of<IAuditRepository>(), Mock.Of<ICurrentUser>(), new SaveHsnSacRequestValidator(), new SaveGstRateRuleVersionRequestValidator(), new RetireHsnMappingRequestValidator());
}
