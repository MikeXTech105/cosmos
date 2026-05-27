using Cosmos.Application.Abstractions.Repositories;
using Cosmos.Domain.Entities;
using Cosmos.Infrastructure.Database;
using Cosmos.Shared.Models;
using Dapper;
using Field = Cosmos.Domain.Entities.Field;

namespace Cosmos.Infrastructure.Repositories;

public sealed class PageRepository(IDbConnectionFactory connectionFactory) : BaseRepository(connectionFactory), IPageRepository
{
    public async Task<PagedResult<Page>> GetPagedAsync(QueryParameters query, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = (await connection.QueryAsync<PageRow>(Command(
            "select * from cosmos.fn_pages_get_all(@SearchTerm, @SortBy, @SortDirection, @PageNumber, @PageSize, @IsActive);",
            query,
            cancellationToken))).ToArray();
        return new PagedResult<Page> { Items = rows.Select(x => x.ToEntity()).ToArray(), PageNumber = query.PageNumber, PageSize = query.PageSize, TotalCount = rows.FirstOrDefault()?.TotalCount ?? 0 };
    }

    public async Task<Page?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<Page>(Command("select * from cosmos.fn_pages_get_by_id(@Id);", new { Id = id }, cancellationToken));
    }

    public async Task<Guid> CreateAsync(Page page, Guid? createdBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<Guid>(Command(
            "select cosmos.fn_pages_create(@PageName, @RoutePath, @Icon, @MenuGroup, @DisplayOrder, @ShowInMenu, @IsActive, @CreatedBy);",
            new { page.PageName, page.RoutePath, page.Icon, page.MenuGroup, page.DisplayOrder, page.ShowInMenu, page.IsActive, CreatedBy = createdBy },
            cancellationToken));
    }

    public async Task UpdateAsync(Page page, Guid? updatedBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(Command(
            "select cosmos.fn_pages_update(@Id, @PageName, @RoutePath, @Icon, @MenuGroup, @DisplayOrder, @ShowInMenu, @IsActive, @UpdatedBy);",
            new { page.Id, page.PageName, page.RoutePath, page.Icon, page.MenuGroup, page.DisplayOrder, page.ShowInMenu, page.IsActive, UpdatedBy = updatedBy },
            cancellationToken));
    }

    public async Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(Command("select cosmos.fn_pages_delete(@Id, @DeletedBy);", new { Id = id, DeletedBy = deletedBy }, cancellationToken));
    }

    private sealed class PageRow : Page
    {
        public long TotalCount { get; init; }
        public Page ToEntity() => new()
        {
            Id = Id, PageName = PageName, RoutePath = RoutePath, Icon = Icon, MenuGroup = MenuGroup,
            DisplayOrder = DisplayOrder, ShowInMenu = ShowInMenu, IsActive = IsActive, IsDeleted = IsDeleted,
            CreatedAt = CreatedAt, CreatedBy = CreatedBy, UpdatedAt = UpdatedAt, UpdatedBy = UpdatedBy
        };
    }
}

public sealed class SectionRepository(IDbConnectionFactory connectionFactory) : BaseRepository(connectionFactory), ISectionRepository
{
    public async Task<PagedResult<Section>> GetPagedAsync(QueryParameters query, Guid? pageId, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = (await connection.QueryAsync<SectionRow>(Command(
            "select * from cosmos.fn_sections_get_all(@SearchTerm, @SortBy, @SortDirection, @PageNumber, @PageSize, @IsActive, @PageId);",
            new { query.SearchTerm, query.SortBy, query.SortDirection, query.PageNumber, query.PageSize, query.IsActive, PageId = pageId },
            cancellationToken))).ToArray();
        return new PagedResult<Section> { Items = rows.Select(x => x.ToEntity()).ToArray(), PageNumber = query.PageNumber, PageSize = query.PageSize, TotalCount = rows.FirstOrDefault()?.TotalCount ?? 0 };
    }

    public async Task<Section?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<Section>(Command("select * from cosmos.fn_sections_get_by_id(@Id);", new { Id = id }, cancellationToken));
    }

    public async Task<Guid> CreateAsync(Section section, Guid? createdBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<Guid>(Command(
            "select cosmos.fn_sections_create(@PageId, @SectionName, @SectionKey, @IsActive, @CreatedBy);",
            new { section.PageId, section.SectionName, section.SectionKey, section.IsActive, CreatedBy = createdBy },
            cancellationToken));
    }

    public async Task UpdateAsync(Section section, Guid? updatedBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(Command(
            "select cosmos.fn_sections_update(@Id, @PageId, @SectionName, @SectionKey, @IsActive, @UpdatedBy);",
            new { section.Id, section.PageId, section.SectionName, section.SectionKey, section.IsActive, UpdatedBy = updatedBy },
            cancellationToken));
    }

    public async Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(Command("select cosmos.fn_sections_delete(@Id, @DeletedBy);", new { Id = id, DeletedBy = deletedBy }, cancellationToken));
    }

    private sealed class SectionRow : Section
    {
        public long TotalCount { get; init; }
        public Section ToEntity() => new()
        {
            Id = Id, PageId = PageId, PageName = PageName, SectionName = SectionName, SectionKey = SectionKey,
            IsActive = IsActive, IsDeleted = IsDeleted, CreatedAt = CreatedAt, CreatedBy = CreatedBy, UpdatedAt = UpdatedAt, UpdatedBy = UpdatedBy
        };
    }
}

public sealed class FieldRepository(IDbConnectionFactory connectionFactory) : BaseRepository(connectionFactory), IFieldRepository
{
    public async Task<PagedResult<Field>> GetPagedAsync(QueryParameters query, Guid? sectionId, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = (await connection.QueryAsync<FieldRow>(Command(
            "select * from cosmos.fn_fields_get_all(@SearchTerm, @SortBy, @SortDirection, @PageNumber, @PageSize, @IsActive, @SectionId);",
            new { query.SearchTerm, query.SortBy, query.SortDirection, query.PageNumber, query.PageSize, query.IsActive, SectionId = sectionId },
            cancellationToken))).ToArray();
        return new PagedResult<Field> { Items = rows.Select(x => x.ToEntity()).ToArray(), PageNumber = query.PageNumber, PageSize = query.PageSize, TotalCount = rows.FirstOrDefault()?.TotalCount ?? 0 };
    }

    public async Task<Field?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<Field>(Command("select * from cosmos.fn_fields_get_by_id(@Id);", new { Id = id }, cancellationToken));
    }

    public async Task<Guid> CreateAsync(Field field, Guid? createdBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<Guid>(Command(
            "select cosmos.fn_fields_create(@SectionId, @FieldName, @FieldKey, @FieldType, @IsActive, @CreatedBy);",
            new { field.SectionId, field.FieldName, field.FieldKey, field.FieldType, field.IsActive, CreatedBy = createdBy },
            cancellationToken));
    }

    public async Task UpdateAsync(Field field, Guid? updatedBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(Command(
            "select cosmos.fn_fields_update(@Id, @SectionId, @FieldName, @FieldKey, @FieldType, @IsActive, @UpdatedBy);",
            new { field.Id, field.SectionId, field.FieldName, field.FieldKey, field.FieldType, field.IsActive, UpdatedBy = updatedBy },
            cancellationToken));
    }

    public async Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(Command("select cosmos.fn_fields_delete(@Id, @DeletedBy);", new { Id = id, DeletedBy = deletedBy }, cancellationToken));
    }

    private sealed class FieldRow : Field
    {
        public long TotalCount { get; init; }
        public Field ToEntity() => new()
        {
            Id = Id, SectionId = SectionId, SectionName = SectionName, FieldName = FieldName, FieldKey = FieldKey,
            FieldType = FieldType, IsActive = IsActive, IsDeleted = IsDeleted, CreatedAt = CreatedAt, CreatedBy = CreatedBy,
            UpdatedAt = UpdatedAt, UpdatedBy = UpdatedBy
        };
    }
}
