using Cosmos.Domain.Entities;
using Cosmos.Shared.Models;
using Field = Cosmos.Domain.Entities.Field;

namespace Cosmos.Application.Abstractions.Repositories;

public interface IPageRepository
{
    Task<PagedResult<Page>> GetPagedAsync(QueryParameters query, CancellationToken cancellationToken);
    Task<Page?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Guid> CreateAsync(Page page, Guid? createdBy, CancellationToken cancellationToken);
    Task UpdateAsync(Page page, Guid? updatedBy, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken);
}

public interface ISectionRepository
{
    Task<PagedResult<Section>> GetPagedAsync(QueryParameters query, Guid? pageId, CancellationToken cancellationToken);
    Task<Section?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Guid> CreateAsync(Section section, Guid? createdBy, CancellationToken cancellationToken);
    Task UpdateAsync(Section section, Guid? updatedBy, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken);
}

public interface IFieldRepository
{
    Task<PagedResult<Field>> GetPagedAsync(QueryParameters query, Guid? sectionId, CancellationToken cancellationToken);
    Task<Field?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Guid> CreateAsync(Field field, Guid? createdBy, CancellationToken cancellationToken);
    Task UpdateAsync(Field field, Guid? updatedBy, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken);
}
