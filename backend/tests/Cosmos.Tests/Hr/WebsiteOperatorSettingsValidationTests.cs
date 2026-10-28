using Cosmos.Application.Validators;
using Cosmos.Contracts.WebsiteManagement;

namespace Cosmos.Tests.Hr;

public sealed class WebsiteOperatorSettingsValidationTests
{
    [Theory]
    [InlineData("SupportEmail", "invalid", false)]
    [InlineData("SupportEmail", "support@example.test", true)]
    [InlineData("PublicCountersEnabled", "true", true)]
    [InlineData("PublicCountersEnabled", "yes", false)]
    [InlineData("SocialInstagramUrl", "javascript:alert(1)", false)]
    [InlineData("SocialInstagramUrl", "https://example.test/brand", true)]
    [InlineData("UnsupportedSecretKey", "value", false)]
    public void Website_operator_settings_validate_typed_values_and_keep_the_key_allowlist(string key, string value, bool valid)
    {
        var result = new UpdateWebsiteSettingsRequestValidator().Validate(new UpdateWebsiteSettingsRequest([new WebsiteSettingValueRequest(key, value, false)]));
        Assert.Equal(valid, result.IsValid);
    }
}
