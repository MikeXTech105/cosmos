namespace Cosmos.Contracts.GstCalculation;

public enum GstBuyerTreatment
{
    Registered,
    Unregistered,
    Consumer,
    Other
}

public enum GstTransactionType
{
    TaxableSupply
}

public enum GstTaxablePriceBasis
{
    Exclusive,
    Inclusive
}

public enum GstTaxComponentKind
{
    Cgst,
    Sgst,
    Igst,
    Other
}

public enum GstRuleApprovalStatus
{
    Draft,
    Approved,
    Retired
}

public sealed record GstSellerRegistrationContext(long RegistrationId, string StateCode, bool IsActive);

public sealed record GstBuyerTaxContext(GstBuyerTreatment Treatment, string? StateCode, string? Gstin = null);

/// <summary>
/// A transaction intent. Rates and components are deliberately absent: they are supplied only by the server-side reference resolver.
/// </summary>
public sealed record GstCalculationRequest(
    long ItemId,
    long? SelectedHsnSacId,
    DateOnly TransactionDate,
    GstSellerRegistrationContext SellerRegistration,
    GstBuyerTaxContext Buyer,
    string PlaceOfSupplyStateCode,
    GstTransactionType TransactionType,
    GstTaxablePriceBasis PriceBasis,
    decimal Quantity,
    decimal UnitPrice,
    decimal LineDiscountAmount = 0m,
    decimal TaxableChargeAmount = 0m);

public sealed record GstResolvedClassification(
    long MappingId,
    long HsnSacId,
    string Code,
    string CodeType,
    string Source,
    bool IsActive,
    DateOnly EffectiveFrom,
    DateOnly? EffectiveTo);

public sealed record GstClassificationCandidate(
    long MappingId,
    long HsnSacId,
    string Code,
    string CodeType,
    string Description,
    string Source,
    bool IsActive,
    DateOnly EffectiveFrom,
    DateOnly? EffectiveTo);

public sealed record GstTaxComponentDefinition(GstTaxComponentKind Kind, string Code, decimal Rate);

/// <summary>
/// A server-resolved version. A version is usable only when approved, active, effective, and its applicable components reconcile to TotalRate.
/// </summary>
public sealed record GstTaxRuleVersion(
    long RuleId,
    long VersionId,
    long HsnSacId,
    string RuleCode,
    GstRuleApprovalStatus ApprovalStatus,
    bool IsActive,
    DateOnly EffectiveFrom,
    DateOnly? EffectiveTo,
    decimal TotalRate,
    IReadOnlyCollection<GstTaxComponentDefinition> IntraStateComponents,
    IReadOnlyCollection<GstTaxComponentDefinition> InterStateComponents);

public sealed record GstCalculationReference(
    GstResolvedClassification? Classification,
    IReadOnlyCollection<GstTaxRuleVersion> CandidateRules,
    IReadOnlyCollection<GstCalculationDiagnostic>? Diagnostics = null);

public sealed record GstTaxComponentResult(GstTaxComponentKind Kind, string Code, decimal Rate, decimal Amount);

public sealed record GstCalculationDiagnostic(string Code, string Message);

public sealed record GstCalculationResult(
    bool IsValid,
    GstResolvedClassification? Classification,
    GstTaxRuleVersion? AppliedRule,
    long? RuleId,
    long? RuleVersionId,
    string? RuleCode,
    decimal TaxableValue,
    decimal TotalRate,
    decimal TotalTaxAmount,
    decimal CgstAmount,
    decimal SgstAmount,
    decimal IgstAmount,
    decimal OtherTaxAmount,
    decimal RoundingAdjustment,
    decimal TotalAmount,
    IReadOnlyCollection<GstTaxComponentResult> Components,
    IReadOnlyCollection<GstCalculationDiagnostic> Diagnostics);
