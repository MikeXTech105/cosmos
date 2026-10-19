using Cosmos.Contracts.Common;
using Cosmos.Contracts.HsnGst;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;
public interface IHsnGstService
{
    Task<ApiResponse<PagedResult<HsnSacDto>>> GetHsnSacsAsync(HsnSacListQuery query, CancellationToken ct);
    Task<ApiResponse<HsnSacDto>> GetHsnSacAsync(long id, CancellationToken ct);
    Task<ApiResponse<HsnSacDto>> SaveHsnSacAsync(long? id, SaveHsnSacRequest request, CancellationToken ct);
    Task<ApiResponse<PagedResult<GstRateRuleVersionDto>>> GetRateVersionsAsync(GstRateRuleVersionListQuery query, CancellationToken ct);
    Task<ApiResponse<GstRateRuleVersionDto>> SaveRateVersionAsync(SaveGstRateRuleVersionRequest request, CancellationToken ct);
    Task<ApiResponse> SaveCategoryDefaultAsync(long categoryId, SaveCategoryHsnDefaultRequest request, CancellationToken ct);
    Task<ApiResponse> SaveItemOverrideAsync(long itemId, SaveItemHsnOverrideRequest request, CancellationToken ct);
    Task<ApiResponse<EffectiveHsnMappingDto?>> GetEffectiveCategoryDefaultAsync(long categoryId, DateOnly onDate, CancellationToken ct);
    Task<ApiResponse<EffectiveHsnMappingDto>> RetireCategoryDefaultAsync(long categoryId, long mappingId, RetireHsnMappingRequest request, CancellationToken ct);
    Task<ApiResponse<EffectiveHsnMappingDto>> RetireItemOverrideAsync(long itemId, long mappingId, RetireHsnMappingRequest request, CancellationToken ct);
    Task<ApiResponse<EffectiveProductClassificationDto>> GetEffectiveClassificationAsync(long itemId, DateOnly onDate, CancellationToken ct);
}
