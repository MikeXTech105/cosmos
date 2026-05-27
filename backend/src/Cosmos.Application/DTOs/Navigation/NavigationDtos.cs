using Cosmos.Shared.Models;

namespace Cosmos.Application.DTOs.Navigation;

public sealed class SectionQueryParameters : QueryParameters
{
    public Guid? PageId { get; init; }
}

public sealed class FieldQueryParameters : QueryParameters
{
    public Guid? SectionId { get; init; }
}

public sealed record CreatePageRequest(string PageName, string RoutePath, string? Icon, string? MenuGroup, int DisplayOrder, bool ShowInMenu, bool IsActive = true);
public sealed record UpdatePageRequest(string PageName, string RoutePath, string? Icon, string? MenuGroup, int DisplayOrder, bool ShowInMenu, bool IsActive);
public sealed record PageResponse(Guid Id, string PageName, string RoutePath, string? Icon, string? MenuGroup, int DisplayOrder, bool ShowInMenu, bool IsActive, DateTime CreatedAt);

public sealed record CreateSectionRequest(Guid PageId, string SectionName, string SectionKey, bool IsActive = true);
public sealed record UpdateSectionRequest(Guid PageId, string SectionName, string SectionKey, bool IsActive);
public sealed record SectionResponse(Guid Id, Guid PageId, string PageName, string SectionName, string SectionKey, bool IsActive, DateTime CreatedAt);

public sealed record CreateFieldRequest(Guid SectionId, string FieldName, string FieldKey, string FieldType, bool IsActive = true);
public sealed record UpdateFieldRequest(Guid SectionId, string FieldName, string FieldKey, string FieldType, bool IsActive);
public sealed record FieldResponse(Guid Id, Guid SectionId, string SectionName, string FieldName, string FieldKey, string FieldType, bool IsActive, DateTime CreatedAt);
