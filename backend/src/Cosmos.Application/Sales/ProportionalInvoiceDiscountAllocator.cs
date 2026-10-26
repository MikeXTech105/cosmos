using Cosmos.Shared.Exceptions;

namespace Cosmos.Application.Sales;

/// <summary>
/// Deterministic proposed allocation policy for GST preview work. It is not used by the
/// authoritative Sales save procedures until finance/GST approval is recorded.
/// </summary>
public static class ProportionalInvoiceDiscountAllocator
{
    public static IReadOnlyList<decimal> Allocate(decimal invoiceDiscount, IReadOnlyList<decimal> eligibleBases)
    {
        if (invoiceDiscount < 0m) throw new CosmosException("Invoice discount cannot be negative.");
        if (eligibleBases.Any(value => value < 0m)) throw new CosmosException("Eligible bases cannot be negative.");
        var total = eligibleBases.Sum();
        if (invoiceDiscount == 0m) return eligibleBases.Select(_ => 0m).ToArray();
        if (total <= 0m || invoiceDiscount > total) throw new CosmosException("Invoice discount requires a sufficient eligible taxable base.");

        var allocations = eligibleBases.Select(value => decimal.Round(invoiceDiscount * value / total, 2, MidpointRounding.AwayFromZero)).ToArray();
        var remainder = invoiceDiscount - allocations.Sum();
        // Stable last-line allocation makes the reconciliation reproducible across callers.
        allocations[^1] += remainder;
        return allocations;
    }
}
