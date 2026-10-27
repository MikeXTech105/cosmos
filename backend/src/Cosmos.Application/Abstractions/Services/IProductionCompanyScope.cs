namespace Cosmos.Application.Abstractions.Services;

/// <summary>Trusted catalog scope; never supplied in request JSON or imported provenance.</summary>
public interface IProductionCompanyScope
{
    string CompanyKey { get; }
    DateOnly CurrentBusinessDate { get; }
    string BusinessTimeZone { get; }
    void EnsureOpenDate(DateOnly date);
}
