using Cosmos.Application.Organization;
using Cosmos.Application.Validators;

namespace Cosmos.Tests.Organization;

public sealed class CompanyBranchMasterValidationTests
{
    [Theory]
    [InlineData(null, "Name")]
    [InlineData(" ", "Name")]
    [InlineData("Code", " ")]
    public void Company_rejects_missing_or_whitespace_fields(string? code, string? name)
    {
        var result = new SaveCompanyRequestValidator().Validate(new SaveCompanyRequest(code!, name!));
        Assert.False(result.IsValid);
    }

    [Fact]
    public void Company_rejects_sql_column_overflow()
    {
        var result = new SaveCompanyRequestValidator().Validate(new SaveCompanyRequest(new string('C', 51), new string('N', 251)));
        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Branch_rejects_invalid_company_identifier(long companyId)
    {
        var result = new SaveBranchRequestValidator().Validate(new SaveBranchRequest(companyId, "BR", "Branch"));
        Assert.False(result.IsValid);
    }

    [Fact]
    public void Branch_accepts_schema_bounded_request()
    {
        var result = new SaveBranchRequestValidator().Validate(new SaveBranchRequest(1, new string('C', 50), new string('N', 250)));
        Assert.True(result.IsValid);
    }
}
