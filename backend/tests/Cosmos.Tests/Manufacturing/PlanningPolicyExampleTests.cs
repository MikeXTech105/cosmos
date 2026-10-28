using Cosmos.Application.Manufacturing;
using Cosmos.Application.Services;
using Cosmos.Contracts.Manufacturing;
using Microsoft.SqlServer.TransactSql.ScriptDom;

namespace Cosmos.Tests.Manufacturing;
public sealed class PlanningPolicyExampleTests
{
    [Fact]
    public void Routing_example_preserves_quantity_basis_setup_and_verified_Item_shot_output()
    {
        var request = new RoutingPolicyExampleRequest(120, 2, 1, 3, 10, null);
        Assert.Equal(30m, PlanningPolicyExamples.Routing(request).RequiredMinutes);
        Assert.Equal(12m, PlanningPolicyExamples.Routing(request with { RateBasis = 2, Rate = 3 }).RequiredMinutes);
        Assert.Null(PlanningPolicyExamples.Routing(request with { RateBasis = 3 }).RequiredMinutes);
        Assert.Equal(25m, PlanningPolicyExamples.Routing(request with { RateBasis = 3, VerifiedOutputPerShot = 4 }).RequiredMinutes);
        Assert.Equal(0m, PlanningPolicyExamples.Routing(request with { OutputQuantity = 0 }).RequiredMinutes);
    }
    [Fact]
    public void Dispatch_example_uses_actual_box_rounding_loose_and_minimum_dispatch_contracts()
    {
        var request = new DispatchPolicyExampleRequest(5, 0, 0, 4, 0, 1, 0, 3, false);
        var rounded = PlanningPolicyExamples.Dispatch(request, new DispatchCalculationService());
        Assert.Equal(8m, rounded.RecommendedQuantity);
        Assert.Equal(5m, PlanningPolicyExamples.Dispatch(request with { AllowLooseQuantity = true }, new()).RecommendedQuantity);
        Assert.Equal(12m, PlanningPolicyExamples.Dispatch(request with { CurrentStock = 100, MinimumDispatchQuantity = 12 }, new()).RecommendedQuantity);
        Assert.Contains("no settings, masters, plan, purchase or stock are saved", rounded.Scope);
    }
    [Fact]
    public void Procurement_example_preserves_zero_shortage_moq_multiples_and_effective_lead_precedence()
    {
        var request = new ProcurementPolicyExampleRequest(100, 30, 100, 0, 0, null, null, 1, 50, 20, true, false);
        Assert.Equal(0m, PlanningPolicyExamples.Procurement(request, new ProcurementCalculationService()).RecommendedQuantity);
        Assert.Equal(60m, PlanningPolicyExamples.Procurement(request with { CurrentStock = 99 }, new ProcurementCalculationService()).RecommendedQuantity);
        var lead = PlanningPolicyExamples.Procurement(request with { ConfiguredLeadTimeDays = 14, HistoryAverageLeadTimeDays = 7, LeadTimeOverrideDays = 3 }, new ProcurementCalculationService());
        Assert.Contains("Effective lead: 3 days", lead.Explanation);
        var manual = PlanningPolicyExamples.Procurement(request with { CurrentStock = 0, ManualPlanning = true, AutomaticCalculationEnabled = false }, new ProcurementCalculationService());
        Assert.Equal(0m, manual.RecommendedQuantity);
    }
    [Fact]
    public void Labels_and_packaging_readiness_migrations_parse_as_SQL_Server()
    {
        foreach (var file in new[] { "20261028_03_production_order_labels.sql", "20261028_04_packaging_readiness.sql" })
        {
            var source = File.ReadAllText(Path.Combine(ProductionMigrationSyntaxTests.FindRoot(), "backend", "database", "migrations", file));
            new TSql160Parser(true).Parse(new StringReader(source), out var errors);
            Assert.True(errors.Count == 0, $"{file}: {string.Join("; ", errors.Select(x => $"line {x.Line}: {x.Message}"))}");
        }
    }
}
