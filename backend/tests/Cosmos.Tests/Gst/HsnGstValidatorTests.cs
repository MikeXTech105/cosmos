using Cosmos.Application.Validators;
using Cosmos.Contracts.HsnGst;
namespace Cosmos.Tests.Gst;
public sealed class HsnGstValidatorTests
{
    [Fact] public async Task Hsn_validator_accepts_synthetic_alphanumeric_code() => Assert.True((await new SaveHsnSacRequestValidator().ValidateAsync(new SaveHsnSacRequest("TEST100","HSN","Synthetic test only"))).IsValid);
    [Fact] public async Task Hsn_validator_rejects_unsupported_characters() => Assert.False((await new SaveHsnSacRequestValidator().ValidateAsync(new SaveHsnSacRequest("12-34","HSN","x"))).IsValid);
    [Fact] public async Task Rate_validator_rejects_invalid_period() => Assert.False((await new SaveGstRateRuleVersionRequestValidator().ValidateAsync(new SaveGstRateRuleVersionRequest("TEST",18,new DateOnly(2026,2,1),new DateOnly(2026,1,1)))).IsValid);
    [Fact]
    public async Task Retire_validator_requires_an_effective_to_date()
    {
        var validator = new RetireHsnMappingRequestValidator();

        Assert.False((await validator.ValidateAsync(new RetireHsnMappingRequest(default))).IsValid);
        Assert.True((await validator.ValidateAsync(new RetireHsnMappingRequest(new DateOnly(2026, 10, 15)))).IsValid);
    }
}
