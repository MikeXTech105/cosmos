using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Manufacturing;
using Cosmos.Application.Items.Commands;
using Cosmos.Application.Validators;
using Cosmos.Application.Services;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Security;
using Moq;

namespace Cosmos.Tests.Manufacturing;

public sealed class ProductionCommandValidationTests
{
    [Theory]
    [InlineData("0.000001",true)]
    [InlineData("0.0000001",false)]
    [InlineData("9999999999999999.999999",true)]
    [InlineData("10000000000000000",false)]
    public async Task Item_opening_uses_the_reviewed_six_place_and_sixteen_integer_digit_boundary(string amount,bool expected)
    {
        var items=new Mock<IItemRepository>();items.Setup(x=>x.CategoryExistsAsync(1,It.IsAny<CancellationToken>())).ReturnsAsync(true);items.Setup(x=>x.UnitExistsAsync(1,It.IsAny<CancellationToken>())).ReturnsAsync(true);
        var value=decimal.Parse(amount,System.Globalization.CultureInfo.InvariantCulture);
        var command=new CreateItemCommand("Material","MAT",null,1,1,1,null,0,0,null,0,true,false,value,0,value,0,0,null,null,true);
        Assert.Equal(expected,(await new CreateItemValidator(items.Object).ValidateAsync(command)).IsValid);
    }
    private readonly Mock<IProductionWorkspaceRepository> repository=new(MockBehavior.Strict);
    private readonly Mock<IProductionCompanyScope> scope=new();
    private readonly Mock<ICurrentUser> user=new();
    private ProductionWorkspaceService Service()
    {
        scope.SetupGet(x=>x.CurrentBusinessDate).Returns(new DateOnly(2026,10,27));
        scope.SetupGet(x=>x.BusinessTimeZone).Returns("India Standard Time");
        scope.SetupGet(x=>x.CompanyKey).Returns("catalog-a");user.SetupGet(x=>x.UserId).Returns(7);
        return new(repository.Object,scope.Object,user.Object,new ProductionOrderDraftValidator(),new ProductionCompletionValidator());
    }
    [Theory]
    [InlineData("0.0000001")]
    [InlineData("10000000000000000")]
    [InlineData("-1")]
    public async Task Unrepresentable_release_never_reaches_a_stock_procedure(string value)
    {
        await Assert.ThrowsAsync<CosmosException>(()=>Service().ReleaseAsync(1,new("0x0000000000000001",decimal.Parse(value,System.Globalization.CultureInfo.InvariantCulture),"release"),default));
        repository.VerifyNoOtherCalls();
    }
    [Fact]
    public async Task Completion_timestamp_must_match_the_configured_business_date()
    {
        var r=new ProductionCompletionRequest("0x0000000000000001","complete",new(2026,10,27),new DateTimeOffset(2026,10,26,12,0,0,TimeSpan.Zero),1,0,1,1,1,[new(1,1,1)]);
        await Assert.ThrowsAsync<CosmosException>(()=>Service().CompleteAsync(1,r,default));repository.VerifyNoOtherCalls();
    }
    [Fact]
    public async Task Receipt_rejects_silently_rounded_quantity_or_price()
    {
        _=Service();var physical=new PhysicalInventoryService(repository.Object,scope.Object,user.Object);
        var r=new PurchaseReceiptRequest("0x0000000000000001","receive",new(2026,10,27),Guid.NewGuid(),"GRN",[new(1,1,1,0.0000001m)]);
        await Assert.ThrowsAsync<CosmosException>(()=>physical.ReceiptAsync(1,r,default));
        await Assert.ThrowsAsync<CosmosException>(()=>physical.ReceiptAsync(1,r with {Lines=[new(1,1,1,1,SourceUnitCost:1.001m)]},default));repository.VerifyNoOtherCalls();
    }
    [Fact]
    public async Task Unknown_supplier_price_cannot_become_a_zero_price_purchase_draft()
    {
        _=Service();var physical=new PhysicalInventoryService(repository.Object,scope.Object,user.Object);
        var r=new ProcurementPurchaseDraftRequest("convert",Guid.NewGuid(),new(2026,10,27),null,[new(1,null,0,"Supplier quote")]);
        await Assert.ThrowsAsync<CosmosException>(()=>physical.PurchaseDraftAsync(1,r,default));repository.VerifyNoOtherCalls();
    }
}
