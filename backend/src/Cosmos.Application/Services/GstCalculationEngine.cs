using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.GstCalculation;

namespace Cosmos.Application.Services;

public static class GstEffectiveClassificationSelector
{
    public static GstResolvedClassification? Select(IReadOnlyCollection<GstClassificationCandidate> candidates, DateOnly onDate)
    {
        var candidate = candidates
            .Where(value => value.IsActive && value.EffectiveFrom <= onDate && (!value.EffectiveTo.HasValue || value.EffectiveTo.Value >= onDate))
            .OrderBy(value => string.Equals(value.Source, "ProductOverride", StringComparison.Ordinal) ? 0 : 1)
            .ThenByDescending(value => value.EffectiveFrom)
            .ThenByDescending(value => value.MappingId)
            .FirstOrDefault();

        return candidate is null
            ? null
            : new GstResolvedClassification(candidate.MappingId, candidate.HsnSacId, candidate.Code, candidate.CodeType, candidate.Source, candidate.IsActive, candidate.EffectiveFrom, candidate.EffectiveTo);
    }
}

/// <summary>
/// Isolated Phase 2 calculation core. It accepts no client-provided tax rate and has no Sales/Purchase dependency.
/// </summary>
public sealed class GstCalculationEngine(IGstCalculationReferenceResolver referenceResolver) : IGstCalculationEngine
{
    private const int CurrencyScale = 2;
    private const MidpointRounding CurrencyRounding = MidpointRounding.AwayFromZero;

    public async Task<GstCalculationResult> CalculateAsync(GstCalculationRequest request, CancellationToken cancellationToken)
    {
        var diagnostics = ValidateRequest(request);
        if (diagnostics.Count > 0)
        {
            return Invalid(diagnostics);
        }

        var reference = await referenceResolver.ResolveAsync(request, cancellationToken);
        diagnostics.AddRange(reference.Diagnostics ?? []);
        var classification = reference.Classification;
        if (classification is null)
        {
            diagnostics.Add(new("CLASSIFICATION_MISSING", "No effective HSN/SAC classification was resolved."));
            return Invalid(diagnostics);
        }

        if (!classification.IsActive)
        {
            diagnostics.Add(new("CLASSIFICATION_INACTIVE", "The resolved HSN/SAC classification is inactive."));
        }
        if (!IsEffective(classification.EffectiveFrom, classification.EffectiveTo, request.TransactionDate))
        {
            diagnostics.Add(new("CLASSIFICATION_NOT_EFFECTIVE", "The resolved HSN/SAC classification is not effective on the transaction date."));
        }
        if (request.SelectedHsnSacId.HasValue && request.SelectedHsnSacId.Value != classification.HsnSacId)
        {
            diagnostics.Add(new("CLASSIFICATION_MISMATCH", "The selected HSN/SAC does not match the authoritative effective classification."));
        }
        if (diagnostics.Count > 0)
        {
            return Invalid(diagnostics, classification);
        }

        var classificationRules = reference.CandidateRules.Where(rule => rule.HsnSacId == classification.HsnSacId).ToArray();
        var matchingRules = classificationRules
            .Where(rule => rule.IsActive
                           && rule.ApprovalStatus == GstRuleApprovalStatus.Approved
                           && IsEffective(rule.EffectiveFrom, rule.EffectiveTo, request.TransactionDate))
            .ToArray();

        if (matchingRules.Length == 0)
        {
            var code = classificationRules.Length == 0
                ? "RULE_MISSING"
                : classificationRules.All(rule => !rule.IsActive)
                    ? "RULE_INACTIVE"
                    : classificationRules.All(rule => rule.ApprovalStatus != GstRuleApprovalStatus.Approved)
                        ? "RULE_UNAPPROVED"
                        : "RULE_NOT_EFFECTIVE";
            diagnostics.Add(new(code, "No active, approved GST rule is effective for the resolved classification and transaction date."));
            return Invalid(diagnostics, classification);
        }
        if (matchingRules.Length > 1)
        {
            diagnostics.Add(new("RULE_AMBIGUOUS", "More than one active, approved GST rule is effective for the resolved classification and transaction date."));
            return Invalid(diagnostics, classification);
        }

        var rule = matchingRules[0];
        var components = IsIntraState(request)
            ? rule.IntraStateComponents
            : rule.InterStateComponents;
        var componentDiagnostics = ValidateComponents(rule, components);
        if (componentDiagnostics.Count > 0)
        {
            return Invalid(componentDiagnostics, classification);
        }

        var consideration = Round(request.Quantity * request.UnitPrice - request.LineDiscountAmount + request.TaxableChargeAmount);
        var taxableValue = request.PriceBasis == GstTaxablePriceBasis.Exclusive
            ? consideration
            : Round(consideration * 100m / (100m + rule.TotalRate));
        var calculatedComponents = components
            .Select(component => new GstTaxComponentResult(component.Kind, component.Code, component.Rate, Round(taxableValue * component.Rate / 100m)))
            .ToArray();
        var totalTax = calculatedComponents.Sum(component => component.Amount);
        var total = request.PriceBasis == GstTaxablePriceBasis.Exclusive
            ? Round(taxableValue + totalTax)
            : consideration;
        var roundingAdjustment = Round(total - taxableValue - totalTax);

        return new GstCalculationResult(
            true,
            classification,
            rule,
            rule.RuleId,
            rule.VersionId,
            rule.RuleCode,
            taxableValue,
            rule.TotalRate,
            totalTax,
            Sum(calculatedComponents, GstTaxComponentKind.Cgst),
            Sum(calculatedComponents, GstTaxComponentKind.Sgst),
            Sum(calculatedComponents, GstTaxComponentKind.Igst),
            Sum(calculatedComponents, GstTaxComponentKind.Other),
            roundingAdjustment,
            total,
            calculatedComponents,
            []);
    }

    private static List<GstCalculationDiagnostic> ValidateRequest(GstCalculationRequest request)
    {
        var diagnostics = new List<GstCalculationDiagnostic>();
        if (request.ItemId <= 0) diagnostics.Add(new("ITEM_INVALID", "An item identifier is required."));
        if (request.TransactionType != GstTransactionType.TaxableSupply) diagnostics.Add(new("TRANSACTION_TYPE_UNSUPPORTED", "This isolated Phase 2 engine supports only approved taxable-supply rules."));
        if (!request.SellerRegistration.IsActive) diagnostics.Add(new("SELLER_REGISTRATION_INACTIVE", "The seller registration is inactive."));
        if (string.IsNullOrWhiteSpace(request.SellerRegistration.StateCode)) diagnostics.Add(new("SELLER_STATE_MISSING", "A seller registration state is required."));
        if (string.IsNullOrWhiteSpace(request.PlaceOfSupplyStateCode)) diagnostics.Add(new("PLACE_OF_SUPPLY_MISSING", "A place-of-supply state is required."));
        if (request.Quantity <= 0m) diagnostics.Add(new("QUANTITY_INVALID", "Quantity must be greater than zero."));
        if (request.UnitPrice < 0m) diagnostics.Add(new("UNIT_PRICE_INVALID", "Unit price cannot be negative."));
        if (request.LineDiscountAmount < 0m) diagnostics.Add(new("DISCOUNT_INVALID", "Line discount cannot be negative."));
        if (request.TaxableChargeAmount < 0m) diagnostics.Add(new("CHARGE_INVALID", "Taxable charges cannot be negative."));
        if (request.LineDiscountAmount > request.Quantity * request.UnitPrice) diagnostics.Add(new("DISCOUNT_EXCEEDS_GROSS", "Line discount cannot exceed gross line value."));
        return diagnostics;
    }

    private static List<GstCalculationDiagnostic> ValidateComponents(GstTaxRuleVersion rule, IReadOnlyCollection<GstTaxComponentDefinition> components)
    {
        var diagnostics = new List<GstCalculationDiagnostic>();
        if (components.Count == 0) diagnostics.Add(new("COMPONENTS_MISSING", "The selected jurisdiction has no approved tax components."));
        if (components.Any(component => component.Rate < 0m || string.IsNullOrWhiteSpace(component.Code))) diagnostics.Add(new("COMPONENT_INVALID", "Tax components require a non-negative rate and code."));
        if (Round(components.Sum(component => component.Rate)) != rule.TotalRate) diagnostics.Add(new("COMPONENT_RATE_MISMATCH", "Approved component rates do not reconcile to the approved total rate."));
        return diagnostics;
    }

    private static bool IsIntraState(GstCalculationRequest request) => string.Equals(request.SellerRegistration.StateCode.Trim(), request.PlaceOfSupplyStateCode.Trim(), StringComparison.OrdinalIgnoreCase);
    private static bool IsEffective(DateOnly from, DateOnly? to, DateOnly onDate) => from <= onDate && (!to.HasValue || to.Value >= onDate);
    private static decimal Round(decimal value) => decimal.Round(value, CurrencyScale, CurrencyRounding);
    private static decimal Sum(IEnumerable<GstTaxComponentResult> components, GstTaxComponentKind kind) => components.Where(component => component.Kind == kind).Sum(component => component.Amount);

    private static GstCalculationResult Invalid(IReadOnlyCollection<GstCalculationDiagnostic> diagnostics, GstResolvedClassification? classification = null) =>
        new(false, classification, null, null, null, null, 0m, 0m, 0m, 0m, 0m, 0m, 0m, 0m, 0m, [], diagnostics);
}
