using Cosmos.Application.Sales;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Tests.Sales;

public sealed class ProportionalInvoiceDiscountAllocatorTests
{
    [Fact]
    public void Allocate_Reconciles_a_currency_rounding_remainder_deterministically()
    {
        var result = ProportionalInvoiceDiscountAllocator.Allocate(1m, [1m, 1m, 1m]);
        Assert.Equal([0.33m, 0.33m, 0.34m], result);
        Assert.Equal(1m, result.Sum());
    }

    [Fact]
    public void Allocate_Rejects_zero_or_insufficient_eligible_base()
    {
        Assert.Throws<CosmosException>(() => ProportionalInvoiceDiscountAllocator.Allocate(1m, [0m, 0m]));
        Assert.Throws<CosmosException>(() => ProportionalInvoiceDiscountAllocator.Allocate(11m, [10m]));
    }
}
