using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Gst;
using Cosmos.Application.Services;
using Cosmos.Application.Validators;
using Cosmos.Contracts.Gst;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Security;
using Moq;

namespace Cosmos.Tests.Gst;

public sealed class GstEWayExtensionServiceTests
{
    private readonly Mock<IGstRepository> repository=new();
    private readonly Mock<IGstZenProviderService> provider=new();
    private readonly Guid key=Guid.NewGuid();
    private const string Number="141010282840";
    private readonly DateTime prior=new(2026,10,28,23,59,0);

    private ExtendEWayBillRequest Request()=>new(7,Number,"GJ01AB1234","50","1","Flood delay",null,FromPlace:"Surat",FromState:24,FromPincode:"395001",TransportMode:"1",ConsignmentStatus:"M",IdempotencyKey:key,Version:"0x0000000000000001",Gstin:"untrusted-value");
    private EWayBillResponse Bill(DateTime? validity=null)=>new(){Id=11,CompanyGstRegistrationId=7,EWayBillNumber=Number,Status="ACT",ValidUpTo=validity??prior,Distance=100,ConcurrencyVersion="0x0000000000000001"};
    private EWayBillService Setup(bool fresh=true,string state="InProgress")
    {
        repository.Setup(x=>x.GetRegistrationByIdAsync(7,It.IsAny<CancellationToken>())).ReturnsAsync(new CompanyGstRegistrationResponse{Id=7,Gstin="24AADCG4992P1ZZ",Status="Active",IsEWayBillEnabled=true});
        repository.Setup(x=>x.GetEWayBillByNumberAsync(Number,It.IsAny<CancellationToken>())).ReturnsAsync(Bill());
        provider.Setup(x=>x.GetEWayBillAsync(It.IsAny<GetEWayBillDetailsRequest>(),It.IsAny<CancellationToken>())).ReturnsAsync(Bill());
        repository.Setup(x=>x.ReserveEWayExtensionAsync(It.IsAny<ExtendEWayBillRequest>(),It.IsAny<byte[]>(),It.IsAny<DateTime?>(),It.IsAny<long?>(),It.IsAny<CancellationToken>())).ReturnsAsync(new GstEWayExtensionOperation(key,11,7,Number,state,fresh,prior));
        repository.Setup(x=>x.CompleteEWayExtensionAsync(key,It.IsAny<EWayBillResponse?>(),It.IsAny<bool>(),It.IsAny<long?>(),It.IsAny<CancellationToken>(),It.IsAny<bool>())).ReturnsAsync(Bill(prior.AddDays(1)));
        return new EWayBillService(repository.Object,provider.Object,Mock.Of<ICurrentUser>(),new GenerateEWayBillValidator(),new CancelEWayBillValidator(),new UpdateEWayBillVehicleValidator(),new ExtendEWayBillValidator(),new GetEWayBillDetailsValidator());
    }

    [Fact]
    public async Task ExtensionReservesIntentBeforeProviderAndPersistsAuthoritativeLaterValidity()
    {
        var service=Setup();
        provider.Setup(x=>x.ExtendEWayBillAsync(It.IsAny<ExtendEWayBillRequest>(),It.IsAny<CancellationToken>())).ReturnsAsync(Bill(prior.AddDays(1)));
        var result=await service.ExtendAsync(Request(),default);
        Assert.Equal(prior.AddDays(1),result.Data!.ValidUpTo);
        provider.Verify(x=>x.ExtendEWayBillAsync(It.Is<ExtendEWayBillRequest>(r=>r.Gstin=="24AADCG4992P1ZZ"&&r.RequestJson==null),It.IsAny<CancellationToken>()),Times.Once);
        repository.Verify(x=>x.CompleteEWayExtensionAsync(key,It.IsAny<EWayBillResponse>(),true,It.IsAny<long?>(),It.IsAny<CancellationToken>(),false),Times.Once);
    }

    [Theory]
    [InlineData("InProgress")]
    [InlineData("OutcomeUnknown")]
    public async Task ReplayedUncertainIntentNeverResubmitsProviderExtension(string state)
    {
        var service=Setup(false,state);
        await Assert.ThrowsAsync<ConflictException>(()=>service.ExtendAsync(Request(),default));
        provider.Verify(x=>x.ExtendEWayBillAsync(It.IsAny<ExtendEWayBillRequest>(),It.IsAny<CancellationToken>()),Times.Never);
    }

    [Fact]
    public async Task ProviderTransportFailureLeavesDurableUncertainCommandForReadback()
    {
        var service=Setup();
        provider.Setup(x=>x.ExtendEWayBillAsync(It.IsAny<ExtendEWayBillRequest>(),It.IsAny<CancellationToken>())).ThrowsAsync(new HttpRequestException("Unknown network result"));
        var error=await Assert.ThrowsAsync<ConflictException>(()=>service.ExtendAsync(Request(),default));
        Assert.Contains("reconciliation",error.Message);
        repository.Verify(x=>x.CompleteEWayExtensionAsync(key,null,false,It.IsAny<long?>(),CancellationToken.None,false),Times.Once);
    }

    [Fact]
    public async Task ExplicitProviderRejectionCanBeCorrectedWithoutBeingReportedAsUnknownSuccess()
    {
        var service=Setup();
        provider.Setup(x=>x.ExtendEWayBillAsync(It.IsAny<ExtendEWayBillRequest>(),It.IsAny<CancellationToken>())).ThrowsAsync(new CosmosException("Provider rejected the supplied reason.",502,data:new GstProviderRejection()));
        await Assert.ThrowsAsync<CosmosException>(()=>service.ExtendAsync(Request(),default));
        repository.Verify(x=>x.CompleteEWayExtensionAsync(key,null,false,It.IsAny<long?>(),CancellationToken.None,true),Times.Once);
        repository.Verify(x=>x.CompleteEWayExtensionAsync(key,It.IsAny<EWayBillResponse>(),true,It.IsAny<long?>(),It.IsAny<CancellationToken>(),false),Times.Never);
    }

    [Fact]
    public async Task CrossRegistrationReferenceIsRejectedBeforeAnyProviderCall()
    {
        var service=Setup();
        repository.Setup(x=>x.GetEWayBillByNumberAsync(Number,It.IsAny<CancellationToken>())).ReturnsAsync(new EWayBillResponse{Id=11,CompanyGstRegistrationId=99,EWayBillNumber=Number});
        await Assert.ThrowsAsync<ConflictException>(()=>service.ExtendAsync(Request(),default));
        provider.Verify(x=>x.GetEWayBillAsync(It.IsAny<GetEWayBillDetailsRequest>(),It.IsAny<CancellationToken>()),Times.Never);
        provider.Verify(x=>x.ExtendEWayBillAsync(It.IsAny<ExtendEWayBillRequest>(),It.IsAny<CancellationToken>()),Times.Never);
    }

    [Fact]
    public async Task ReconciliationUsesReadbackOnlyAndRequiresActualLaterValidity()
    {
        var service=Setup();
        repository.Setup(x=>x.GetEWayExtensionAsync(key,It.IsAny<CancellationToken>())).ReturnsAsync(new GstEWayExtensionOperation(key,11,7,Number,"OutcomeUnknown",false,prior));
        await Assert.ThrowsAsync<ConflictException>(()=>service.ReconcileExtensionAsync(key,default));
        provider.Setup(x=>x.GetEWayBillAsync(It.IsAny<GetEWayBillDetailsRequest>(),It.IsAny<CancellationToken>())).ReturnsAsync(Bill(prior.AddDays(1)));
        var result=await service.ReconcileExtensionAsync(key,default);
        Assert.Equal(prior.AddDays(1),result.Data!.ValidUpTo);
        provider.Verify(x=>x.ExtendEWayBillAsync(It.IsAny<ExtendEWayBillRequest>(),It.IsAny<CancellationToken>()),Times.Never);
    }
}
