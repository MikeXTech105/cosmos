using Cosmos.Application.Abstractions.Repositories;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.DTOs.Navigation;
using Cosmos.Domain.Entities;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Models;
using Field = Cosmos.Domain.Entities.Field;

namespace Cosmos.Infrastructure.Services;

public sealed class PageService(IPageRepository repository) : IPageService
{
    public async Task<PagedResult<PageResponse>> GetPagedAsync(QueryParameters query, CancellationToken cancellationToken)
    {
        var result = await repository.GetPagedAsync(query, cancellationToken);
        return new PagedResult<PageResponse> { Items = result.Items.Select(ToResponse).ToArray(), PageNumber = result.PageNumber, PageSize = result.PageSize, TotalCount = result.TotalCount };
    }

    public async Task<PageResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        ToResponse(await repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Page", id));

    public Task<Guid> CreateAsync(CreatePageRequest request, Guid? createdBy, CancellationToken cancellationToken) =>
        repository.CreateAsync(new Page { PageName = request.PageName.Trim(), RoutePath = request.RoutePath.Trim(), Icon = request.Icon, MenuGroup = request.MenuGroup, DisplayOrder = request.DisplayOrder, ShowInMenu = request.ShowInMenu, IsActive = request.IsActive }, createdBy, cancellationToken);

    public async Task UpdateAsync(Guid id, UpdatePageRequest request, Guid? updatedBy, CancellationToken cancellationToken)
    {
        _ = await repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Page", id);
        await repository.UpdateAsync(new Page { Id = id, PageName = request.PageName.Trim(), RoutePath = request.RoutePath.Trim(), Icon = request.Icon, MenuGroup = request.MenuGroup, DisplayOrder = request.DisplayOrder, ShowInMenu = request.ShowInMenu, IsActive = request.IsActive }, updatedBy, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken)
    {
        _ = await repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Page", id);
        await repository.DeleteAsync(id, deletedBy, cancellationToken);
    }

    private static PageResponse ToResponse(Page page) => new(page.Id, page.PageName, page.RoutePath, page.Icon, page.MenuGroup, page.DisplayOrder, page.ShowInMenu, page.IsActive, page.CreatedAt);
}

public sealed class SectionService(ISectionRepository repository) : ISectionService
{
    public async Task<PagedResult<SectionResponse>> GetPagedAsync(SectionQueryParameters query, CancellationToken cancellationToken)
    {
        var result = await repository.GetPagedAsync(query, query.PageId, cancellationToken);
        return new PagedResult<SectionResponse> { Items = result.Items.Select(ToResponse).ToArray(), PageNumber = result.PageNumber, PageSize = result.PageSize, TotalCount = result.TotalCount };
    }

    public async Task<SectionResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        ToResponse(await repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Section", id));

    public Task<Guid> CreateAsync(CreateSectionRequest request, Guid? createdBy, CancellationToken cancellationToken) =>
        repository.CreateAsync(new Section { PageId = request.PageId, SectionName = request.SectionName.Trim(), SectionKey = request.SectionKey.Trim().ToUpperInvariant(), IsActive = request.IsActive }, createdBy, cancellationToken);

    public async Task UpdateAsync(Guid id, UpdateSectionRequest request, Guid? updatedBy, CancellationToken cancellationToken)
    {
        _ = await repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Section", id);
        await repository.UpdateAsync(new Section { Id = id, PageId = request.PageId, SectionName = request.SectionName.Trim(), SectionKey = request.SectionKey.Trim().ToUpperInvariant(), IsActive = request.IsActive }, updatedBy, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken)
    {
        _ = await repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Section", id);
        await repository.DeleteAsync(id, deletedBy, cancellationToken);
    }

    private static SectionResponse ToResponse(Section section) => new(section.Id, section.PageId, section.PageName, section.SectionName, section.SectionKey, section.IsActive, section.CreatedAt);
}

public sealed class FieldService(IFieldRepository repository) : IFieldService
{
    public async Task<PagedResult<FieldResponse>> GetPagedAsync(FieldQueryParameters query, CancellationToken cancellationToken)
    {
        var result = await repository.GetPagedAsync(query, query.SectionId, cancellationToken);
        return new PagedResult<FieldResponse> { Items = result.Items.Select(ToResponse).ToArray(), PageNumber = result.PageNumber, PageSize = result.PageSize, TotalCount = result.TotalCount };
    }

    public async Task<FieldResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        ToResponse(await repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Field", id));

    public Task<Guid> CreateAsync(CreateFieldRequest request, Guid? createdBy, CancellationToken cancellationToken) =>
        repository.CreateAsync(new Field { SectionId = request.SectionId, FieldName = request.FieldName.Trim(), FieldKey = request.FieldKey.Trim().ToUpperInvariant(), FieldType = request.FieldType.Trim(), IsActive = request.IsActive }, createdBy, cancellationToken);

    public async Task UpdateAsync(Guid id, UpdateFieldRequest request, Guid? updatedBy, CancellationToken cancellationToken)
    {
        _ = await repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Field", id);
        await repository.UpdateAsync(new Field { Id = id, SectionId = request.SectionId, FieldName = request.FieldName.Trim(), FieldKey = request.FieldKey.Trim().ToUpperInvariant(), FieldType = request.FieldType.Trim(), IsActive = request.IsActive }, updatedBy, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken)
    {
        _ = await repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Field", id);
        await repository.DeleteAsync(id, deletedBy, cancellationToken);
    }

    private static FieldResponse ToResponse(Field field) => new(field.Id, field.SectionId, field.SectionName, field.FieldName, field.FieldKey, field.FieldType, field.IsActive, field.CreatedAt);
}
