using Cosmos.Contracts.Common;
using Cosmos.Contracts.HsnGst;

namespace Cosmos.Application.Abstractions.Persistence;
public interface IHsnGstRepository
{
    Task<PagedResult<HsnSacDto>> GetHsnSacsAsync(HsnSacListQuery query, CancellationToken ct);
    Task<HsnSacDto?> GetHsnSacAsync(long id, CancellationToken ct);
    Task<HsnSacDto> SaveHsnSacAsync(long? id, SaveHsnSacRequest request, long? userId, CancellationToken ct);
    Task<PagedResult<GstRateRuleVersionDto>> GetRateVersionsAsync(GstRateRuleVersionListQuery query, CancellationToken ct);
    Task<GstRateRuleVersionDto> SaveRateVersionAsync(SaveGstRateRuleVersionRequest request, long? userId, CancellationToken ct);
    Task SaveCategoryDefaultAsync(long categoryId, SaveCategoryHsnDefaultRequest request, long? userId, CancellationToken ct);
    Task SaveItemOverrideAsync(long itemId, SaveItemHsnOverrideRequest request, long? userId, CancellationToken ct);
    Task<EffectiveHsnMappingDto?> GetEffectiveCategoryDefaultAsync(long categoryId, DateOnly onDate, CancellationToken ct);
    Task<EffectiveHsnMappingDto> RetireCategoryDefaultAsync(long categoryId, long mappingId, RetireHsnMappingRequest request, long? userId, CancellationToken ct);
    Task<EffectiveHsnMappingDto> RetireItemOverrideAsync(long itemId, long mappingId, RetireHsnMappingRequest request, long? userId, CancellationToken ct);
    Task<EffectiveProductClassificationDto> GetEffectiveClassificationAsync(long itemId, DateOnly onDate, CancellationToken ct);
}
