using System.Text.Json;
using Cosmos.Contracts.Users;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Cosmos.Tests.Security;

public sealed class UserRoleSwaggerSchemaTests
{
    [Fact]
    public void UserDtoSwaggerSchemaIncludesRoleDetails()
    {
        var generator = new SchemaGenerator(
            new SchemaGeneratorOptions(),
            new JsonSerializerDataContractResolver(new JsonSerializerOptions(JsonSerializerDefaults.Web)));

        var repository = new SchemaRepository();
        generator.GenerateSchema(typeof(UserDto), repository);

        var userSchema = Assert.Single(repository.Schemas, pair => pair.Key == nameof(UserDto)).Value;
        Assert.NotNull(userSchema.Properties);
        Assert.Contains("roles", userSchema.Properties!.Keys, StringComparer.Ordinal);
    }
}
