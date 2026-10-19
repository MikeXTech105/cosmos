namespace Cosmos.Contracts.HsnGst;

public sealed record HsnSacDto(long Id, string Code, string CodeType, string Description, bool IsActive, DateTime CreatedAtUtc, DateTime? UpdatedAtUtc, int TotalCount = 0);
public sealed record HsnSacListQuery(string? Search = null, string? CodeType = null, bool? IsActive = null, int PageNumber = 1, int PageSize = 20);
public sealed record SaveHsnSacRequest(string Code, string CodeType, string Description, bool IsActive = true);
public sealed record GstRateRuleVersionDto(long Id, string RuleCode, int VersionNumber, decimal TotalRate, DateOnly EffectiveFrom, DateOnly? EffectiveTo, bool IsActive, string? Notes, DateTime CreatedAtUtc, int TotalCount = 0);
public sealed record GstRateRuleVersionListQuery(string? RuleCode = null, DateOnly? ApplicableOn = null, bool? IsActive = null, int PageNumber = 1, int PageSize = 20);
public sealed record SaveGstRateRuleVersionRequest(string RuleCode, decimal TotalRate, DateOnly EffectiveFrom, DateOnly? EffectiveTo, bool IsActive = true, string? Notes = null);
public sealed record SaveCategoryHsnDefaultRequest(long HsnSacId, DateOnly EffectiveFrom, DateOnly? EffectiveTo = null);
public sealed record SaveItemHsnOverrideRequest(long HsnSacId, DateOnly EffectiveFrom, DateOnly? EffectiveTo = null);
public sealed record EffectiveHsnMappingDto(long Id, long HsnSacId, string Code, string CodeType, string Description, DateOnly EffectiveFrom, DateOnly? EffectiveTo);
public sealed record RetireHsnMappingRequest(DateOnly EffectiveTo);
public sealed record EffectiveProductClassificationDto(long ItemId, long? MappingId, long? HsnSacId, string? Code, string? CodeType, string? Description, string Source, DateOnly? EffectiveFrom, DateOnly? EffectiveTo, string? LegacyHsnCode);
public sealed record FutureGstCalculationResult(long? HsnSacId, string? HsnSacCode, long? GstRateRuleVersionId, decimal TaxableValue, decimal TotalRate, decimal CgstRate, decimal SgstRate, decimal IgstRate, decimal CgstAmount, decimal SgstAmount, decimal IgstAmount, decimal RoundingAdjustment, IReadOnlyCollection<string> Diagnostics);
