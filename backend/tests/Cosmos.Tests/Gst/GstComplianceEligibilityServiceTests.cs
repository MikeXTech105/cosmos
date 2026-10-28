using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Services;
using Cosmos.Contracts.Sales;
using Cosmos.Shared.Exceptions;
using Moq;

namespace Cosmos.Tests.Gst;

public sealed class GstComplianceEligibilityServiceTests
{
    [Fact]
    public async Task AssessSalesInvoiceAsync_UsesPersistedInvoiceOnly()
    {
        var repository = new Mock<ISalesRepository>();
        var scopes = new Mock<ISalesInvoiceScopeAuthorizer>();
        repository.Setup(x => x.GetByIdAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SalesInvoiceDetailDto
            {
                Id = 7,
                Status = 2,
                Items = [new SalesInvoiceItemDto { HsnSacCodeSnapshot = "8471", Quantity = 1, LineTotal = 118m }]
            });

        var result = await new GstComplianceEligibilityService(repository.Object, scopes.Object)
            .AssessSalesInvoiceAsync(7, CancellationToken.None);

        Assert.False(result.Data!.CanCreateSnapshot);
        Assert.Contains(result.Data.Issues, x => x.Code == "GST_SNAPSHOT_SELLER_REGISTRATION_UNRESOLVED");
        Assert.Contains(result.Data.Issues, x => x.Code == "GST_SNAPSHOT_INVOICE_SCOPE_UNRESOLVED");
        Assert.Contains(result.Data.Issues, x => x.Code == "GST_PROVIDER_CONTRACT_UNVERIFIED");
        repository.Verify(x => x.GetByIdAsync(7, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AssessSalesInvoiceAsync_RejectsUnknownInvoice()
    {
        var repository = new Mock<ISalesRepository>();
        var scopes = new Mock<ISalesInvoiceScopeAuthorizer>();
        repository.Setup(x => x.GetByIdAsync(404, It.IsAny<CancellationToken>())).ReturnsAsync((SalesInvoiceDetailDto?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => new GstComplianceEligibilityService(repository.Object, scopes.Object)
            .AssessSalesInvoiceAsync(404, CancellationToken.None));
    }
}
