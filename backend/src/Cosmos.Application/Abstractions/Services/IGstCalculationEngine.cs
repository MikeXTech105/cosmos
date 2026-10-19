using Cosmos.Contracts.GstCalculation;

namespace Cosmos.Application.Abstractions.Services;

/// <summary>
/// Resolves the classification and rule candidates from authoritative persistence.
/// Phase 2 deliberately supplies no production implementation until approval/rule-component schema is available.
/// </summary>
public interface IGstCalculationReferenceResolver
{
    Task<GstCalculationReference> ResolveAsync(GstCalculationRequest request, CancellationToken cancellationToken);
}

public interface IGstCalculationEngine
{
    Task<GstCalculationResult> CalculateAsync(GstCalculationRequest request, CancellationToken cancellationToken);
}
