using System.Data;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.GstCalculation;
using Cosmos.Persistence.Connection;
using Dapper;

namespace Cosmos.Persistence.Repositories;

/// <summary>
/// Reads one serializable SQL Server view of classification, approved rule candidates, and components.
/// It is registered only after the Phase 2 schema migration is deployed.
/// </summary>
public sealed class GstCalculationReferenceResolver(ISqlConnectionFactory factory) : IGstCalculationReferenceResolver
{
    public async Task<GstCalculationReference> ResolveAsync(GstCalculationRequest request, CancellationToken cancellationToken)
    {
        using var connection = await factory.CreateOpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition(
            "usp_GstTaxCalculation_ResolveReference",
            new { request.ItemId, OnDate = request.TransactionDate },
            commandType: CommandType.StoredProcedure,
            cancellationToken: cancellationToken);
        using var results = await connection.QueryMultipleAsync(command);
        var classificationRow = await results.ReadSingleOrDefaultAsync<ClassificationRow>();
        var ruleRows = (await results.ReadAsync<RuleRow>()).AsList();
        var componentRows = (await results.ReadAsync<ComponentRow>()).AsList();
        var diagnosticRows = (await results.ReadAsync<DiagnosticRow>()).AsList();

        var classification = classificationRow is null
            ? null
            : new GstResolvedClassification(
                classificationRow.MappingId,
                classificationRow.HsnSacId,
                classificationRow.Code,
                classificationRow.CodeType,
                classificationRow.Source,
                classificationRow.IsActive,
                classificationRow.EffectiveFrom,
                classificationRow.EffectiveTo);
        var componentsByVersion = componentRows.GroupBy(row => row.VersionId).ToDictionary(group => group.Key, group => group.ToArray());
        var rules = ruleRows.Select(rule => new GstTaxRuleVersion(
            rule.RuleId,
            rule.VersionId,
            rule.HsnSacId,
            rule.RuleCode,
            (GstRuleApprovalStatus)rule.ApprovalStatus,
            rule.IsActive,
            rule.EffectiveFrom,
            rule.EffectiveTo,
            rule.TotalRate,
            Components(componentsByVersion, rule.VersionId, 1),
            Components(componentsByVersion, rule.VersionId, 2))).ToArray();
        var diagnostics = diagnosticRows
            .Where(row => !string.IsNullOrWhiteSpace(row.DiagnosticCode))
            .Select(row => new GstCalculationDiagnostic(row.DiagnosticCode!, DiagnosticMessage(row.DiagnosticCode!)))
            .ToArray();

        return new GstCalculationReference(classification, rules, diagnostics);
    }

    private static IReadOnlyCollection<GstTaxComponentDefinition> Components(IReadOnlyDictionary<long, ComponentRow[]> rows, long versionId, byte scope) =>
        rows.TryGetValue(versionId, out var values)
            ? values.Where(value => value.JurisdictionScope == scope)
                .Select(value => new GstTaxComponentDefinition((GstTaxComponentKind)value.ComponentKind, value.ComponentCode, value.Rate)).ToArray()
            : [];

    private static string DiagnosticMessage(string code) => code switch
    {
        "CLASSIFICATION_MISSING" => "No effective HSN/SAC classification was found for the item and transaction date.",
        "RULE_MISSING" => "No GST rule is applicable to the resolved HSN/SAC classification.",
        "RULE_UNAPPROVED_OR_INACTIVE" => "Applicable GST rules are not both approved and active.",
        "RULE_NOT_EFFECTIVE" => "No approved GST rule is effective on the transaction date.",
        _ => "GST reference resolution failed."
    };

    private sealed record ClassificationRow(long MappingId, long HsnSacId, string Code, string CodeType, string Source, bool IsActive, DateOnly EffectiveFrom, DateOnly? EffectiveTo);
    private sealed record RuleRow(long RuleId, long VersionId, long HsnSacId, string RuleCode, byte ApprovalStatus, bool IsActive, DateOnly EffectiveFrom, DateOnly? EffectiveTo, decimal TotalRate, int Priority);
    private sealed record ComponentRow(long VersionId, byte JurisdictionScope, byte ComponentKind, string ComponentCode, decimal Rate);
    private sealed record DiagnosticRow(string? DiagnosticCode);
}
