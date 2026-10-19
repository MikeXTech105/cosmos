using Cosmos.Application;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Services;
using Cosmos.Contracts.GstCalculation;
using Cosmos.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cosmos.Tests.Gst;

public sealed class GstCalculationEngineTests
{
    [Fact]
    public void Dependency_injection_resolves_the_engine_and_sql_reference_resolver()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:CosmosDb"] = "Server=(localdb)\\MSSQLLocalDB;Database=CosmosGstPhase2DiOnly;Integrated Security=true;"
            })
            .Build();
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddApplication();
        services.AddPersistence();

        using var provider = services.BuildServiceProvider(validateScopes: true);
        using var scope = provider.CreateScope();

        Assert.IsType<GstCalculationEngine>(scope.ServiceProvider.GetRequiredService<IGstCalculationEngine>());
        Assert.IsType<Cosmos.Persistence.Repositories.GstCalculationReferenceResolver>(scope.ServiceProvider.GetRequiredService<IGstCalculationReferenceResolver>());
    }

    [Fact]
    public async Task CalculateAsync_Uses_product_override_and_intrastate_components()
    {
        var engine = Engine(Reference(rule: Rule()));

        var result = await engine.CalculateAsync(Request(), CancellationToken.None);

        Assert.True(result.IsValid);
        Assert.Equal(2, result.Classification!.MappingId);
        Assert.NotNull(result.AppliedRule);
        Assert.Equal(GstRuleApprovalStatus.Approved, result.AppliedRule!.ApprovalStatus);
        Assert.Equal(new DateOnly(2026, 1, 1), result.AppliedRule.EffectiveFrom);
        Assert.Equal("ProductOverride", result.Classification!.Source);
        Assert.Equal(100m, result.TaxableValue);
        Assert.Equal(9m, result.CgstAmount);
        Assert.Equal(9m, result.SgstAmount);
        Assert.Equal(0m, result.IgstAmount);
        Assert.Equal(118m, result.TotalAmount);
        Assert.Equal(0m, result.RoundingAdjustment);
    }

    [Fact]
    public void Effective_classification_selector_prioritises_product_override_over_category_default()
    {
        var selected = GstEffectiveClassificationSelector.Select(
        [
            new GstClassificationCandidate(1, 5, "CATEGORY", "HSN", "Category", "CategoryDefault", true, new DateOnly(2026, 1, 1), null),
            new GstClassificationCandidate(2, 6, "PRODUCT", "HSN", "Product", "ProductOverride", true, new DateOnly(2026, 1, 1), null)
        ], new DateOnly(2026, 2, 1));

        Assert.NotNull(selected);
        Assert.Equal(6, selected.HsnSacId);
        Assert.Equal("ProductOverride", selected.Source);
    }

    [Fact]
    public async Task CalculateAsync_uses_interstate_igst_when_place_of_supply_differs()
    {
        var result = await Engine(Reference(rule: Rule())).CalculateAsync(Request(placeOfSupply: "MH"), CancellationToken.None);

        Assert.True(result.IsValid);
        Assert.Equal(18m, result.IgstAmount);
        Assert.Equal(0m, result.CgstAmount);
        Assert.Equal(0m, result.SgstAmount);
    }

    [Fact]
    public async Task CalculateAsync_supports_approved_inclusive_price_arithmetic_and_reconciliation()
    {
        var result = await Engine(Reference(rule: Rule())).CalculateAsync(Request(priceBasis: GstTaxablePriceBasis.Inclusive, unitPrice: 100m), CancellationToken.None);

        Assert.True(result.IsValid);
        Assert.Equal(84.75m, result.TaxableValue);
        Assert.Equal(15.26m, result.TotalTaxAmount);
        Assert.Equal(-0.01m, result.RoundingAdjustment);
        Assert.Equal(100m, result.TotalAmount);
        Assert.Equal(result.TotalAmount, result.TaxableValue + result.TotalTaxAmount + result.RoundingAdjustment);
    }

    [Fact]
    public async Task CalculateAsync_applies_discount_and_taxable_charge_before_exclusive_tax()
    {
        var result = await Engine(Reference(rule: Rule())).CalculateAsync(Request(unitPrice: 100m, discount: 10m, charge: 5m), CancellationToken.None);

        Assert.True(result.IsValid);
        Assert.Equal(95m, result.TaxableValue);
        Assert.Equal(17.10m, result.TotalTaxAmount);
        Assert.Equal(112.10m, result.TotalAmount);
    }

    [Fact]
    public async Task CalculateAsync_rejects_missing_inactive_expired_and_ambiguous_rules()
    {
        var missing = await Engine(Reference(rules: [])).CalculateAsync(Request(), CancellationToken.None);
        var inactive = await Engine(Reference(rule: Rule(active: false))).CalculateAsync(Request(), CancellationToken.None);
        var expired = await Engine(Reference(rule: Rule(to: new DateOnly(2026, 1, 31)))).CalculateAsync(Request(), CancellationToken.None);
        var ambiguous = await Engine(Reference(rules: [Rule(), Rule(versionId: 12)])).CalculateAsync(Request(), CancellationToken.None);

        Assert.Contains(missing.Diagnostics, diagnostic => diagnostic.Code == "RULE_MISSING");
        Assert.Contains(inactive.Diagnostics, diagnostic => diagnostic.Code == "RULE_INACTIVE");
        Assert.Contains(expired.Diagnostics, diagnostic => diagnostic.Code == "RULE_NOT_EFFECTIVE");
        Assert.Contains(ambiguous.Diagnostics, diagnostic => diagnostic.Code == "RULE_AMBIGUOUS");
    }

    [Fact]
    public async Task CalculateAsync_selects_rule_at_effective_date_boundaries()
    {
        var oldRule = Rule(versionId: 10, from: new DateOnly(2026, 1, 1), to: new DateOnly(2026, 6, 30));
        var newRule = Rule(versionId: 11, from: new DateOnly(2026, 7, 1));
        var engine = Engine(Reference(rules: [oldRule, newRule]));

        var lastOldDay = await engine.CalculateAsync(Request(on: new DateOnly(2026, 6, 30)), CancellationToken.None);
        var firstNewDay = await engine.CalculateAsync(Request(on: new DateOnly(2026, 7, 1)), CancellationToken.None);

        Assert.Equal(10, lastOldDay.RuleVersionId);
        Assert.Equal(11, firstNewDay.RuleVersionId);
    }

    [Fact]
    public async Task CalculateAsync_rejects_mismatched_or_inactive_classification()
    {
        var mismatch = await Engine(Reference(rule: Rule())).CalculateAsync(Request(selectedHsnSacId: 999), CancellationToken.None);
        var inactive = await Engine(new GstCalculationReference(Classification(active: false), [Rule()])).CalculateAsync(Request(), CancellationToken.None);

        Assert.Contains(mismatch.Diagnostics, diagnostic => diagnostic.Code == "CLASSIFICATION_MISMATCH");
        Assert.Contains(inactive.Diagnostics, diagnostic => diagnostic.Code == "CLASSIFICATION_INACTIVE");
    }

    [Fact]
    public async Task CalculateAsync_rejects_component_rate_mismatch_and_invalid_context()
    {
        var invalidComponents = Rule(intra: [new(GstTaxComponentKind.Cgst, "CGST", 8m), new(GstTaxComponentKind.Sgst, "SGST", 8m)]);
        var componentResult = await Engine(Reference(rule: invalidComponents)).CalculateAsync(Request(), CancellationToken.None);
        var invalidContext = await Engine(Reference(rule: Rule())).CalculateAsync(Request(quantity: 0m, discount: 101m), CancellationToken.None);

        Assert.Contains(componentResult.Diagnostics, diagnostic => diagnostic.Code == "COMPONENT_RATE_MISMATCH");
        Assert.Contains(invalidContext.Diagnostics, diagnostic => diagnostic.Code == "QUANTITY_INVALID");
        Assert.Contains(invalidContext.Diagnostics, diagnostic => diagnostic.Code == "DISCOUNT_EXCEEDS_GROSS");
    }

    [Fact]
    public async Task CalculateAsync_is_reproducible_when_given_the_saved_reference_snapshot()
    {
        var savedReference = Reference(rule: Rule(versionId: 10));
        var original = await Engine(savedReference).CalculateAsync(Request(), CancellationToken.None);
        var masterChangedReference = Reference(rule: Rule(versionId: 11, totalRate: 12m));
        var recalculatedFromSnapshot = await Engine(savedReference).CalculateAsync(Request(), CancellationToken.None);
        var recalculatedFromChangedMaster = await Engine(masterChangedReference).CalculateAsync(Request(), CancellationToken.None);

        Assert.Equal(original.RuleVersionId, recalculatedFromSnapshot.RuleVersionId);
        Assert.Equal(original.TaxableValue, recalculatedFromSnapshot.TaxableValue);
        Assert.Equal(original.TotalTaxAmount, recalculatedFromSnapshot.TotalTaxAmount);
        Assert.Equal(original.TotalAmount, recalculatedFromSnapshot.TotalAmount);
        Assert.Equal(original.Components, recalculatedFromSnapshot.Components);
        Assert.NotEqual(original.TotalTaxAmount, recalculatedFromChangedMaster.TotalTaxAmount);
        Assert.Equal(10, original.RuleVersionId);
    }

    private static GstCalculationEngine Engine(GstCalculationReference reference) => new(new StaticReferenceResolver(reference));
    private static GstCalculationReference Reference(GstTaxRuleVersion? rule = null, IReadOnlyCollection<GstTaxRuleVersion>? rules = null) => new(Classification(), rules ?? (rule is null ? [] : [rule]));
    private static GstResolvedClassification Classification(bool active = true) => new(2, 5, "SYNTHETIC", "HSN", "ProductOverride", active, new DateOnly(2026, 1, 1), null);
    private static GstTaxRuleVersion Rule(long versionId = 10, DateOnly? from = null, DateOnly? to = null, bool active = true, decimal totalRate = 18m, IReadOnlyCollection<GstTaxComponentDefinition>? intra = null) => new(
        7, versionId, 5, "SYNTHETIC-RULE", GstRuleApprovalStatus.Approved, active, from ?? new DateOnly(2026, 1, 1), to, totalRate,
        intra ?? [new(GstTaxComponentKind.Cgst, "CGST", totalRate / 2m), new(GstTaxComponentKind.Sgst, "SGST", totalRate / 2m)],
        [new(GstTaxComponentKind.Igst, "IGST", totalRate)]);
    private static GstCalculationRequest Request(DateOnly? on = null, string placeOfSupply = "GJ", GstTaxablePriceBasis priceBasis = GstTaxablePriceBasis.Exclusive, decimal unitPrice = 100m, decimal quantity = 1m, decimal discount = 0m, decimal charge = 0m, long? selectedHsnSacId = 5) => new(
        42, selectedHsnSacId, on ?? new DateOnly(2026, 2, 1), new GstSellerRegistrationContext(1, "GJ", true), new GstBuyerTaxContext(GstBuyerTreatment.Registered, "GJ"), placeOfSupply, GstTransactionType.TaxableSupply, priceBasis, quantity, unitPrice, discount, charge);

    private sealed class StaticReferenceResolver(GstCalculationReference reference) : IGstCalculationReferenceResolver
    {
        public Task<GstCalculationReference> ResolveAsync(GstCalculationRequest request, CancellationToken cancellationToken) => Task.FromResult(reference);
    }
}
