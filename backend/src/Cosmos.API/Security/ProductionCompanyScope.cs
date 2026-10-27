using Cosmos.Application.Abstractions.Services;
using Cosmos.Shared.Exceptions;

namespace Cosmos.API.Security;

public sealed class ProductionCompanyScope(IConfiguration configuration, IHttpContextAccessor accessor) : IProductionCompanyScope
{
    public string BusinessTimeZone => configuration["Manufacturing:BusinessTimeZone"]
        ?? throw new ForbiddenCosmosException("Manufacturing business timezone is not configured.");
    public DateOnly CurrentBusinessDate
    {
        get
        {
            var name = BusinessTimeZone;
            if (string.IsNullOrWhiteSpace(name)) throw new ForbiddenCosmosException("Manufacturing business timezone is not configured.");
            return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(name)));
        }
    }
    public void EnsureOpenDate(DateOnly date)
    {
        var configured = configuration["Manufacturing:ClosedThroughDate"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            if (!DateOnly.TryParseExact(configured, "yyyy-MM-dd", out var closed)) throw new ForbiddenCosmosException("Manufacturing period control is invalid.");
            if (date <= closed) throw new ConflictException("The business date is in a closed manufacturing period.", data: new { conflictCode = "CLOSED_PERIOD", closedThroughDate = closed });
        }
    }
    public string CompanyKey
    {
        get
        {
            // Existing Cosmos Items are catalog scoped. A shared multi-company catalog is unsupported
            // until those masters are scoped as well; accepting a client CompanyId would leak them.
            var key = configuration["Manufacturing:CatalogCompanyKey"];
            if (string.IsNullOrWhiteSpace(key) || key.Length > 64)
                throw new ForbiddenCosmosException("Manufacturing catalog company scope is not configured.");
            var claim = accessor.HttpContext?.User.FindFirst("CompanyKey")?.Value;
            if (!string.Equals(key, claim, StringComparison.Ordinal))
                throw new ForbiddenCosmosException("The authenticated company does not match this catalog.");
            return key;
        }
    }
}
