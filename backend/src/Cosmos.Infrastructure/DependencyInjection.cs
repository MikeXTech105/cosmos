using System.Text;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Infrastructure.Gst;
using Cosmos.Infrastructure.Security;
using Cosmos.Shared.Options;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Primitives;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Cosmos.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services
            .AddOptions<GstZenOptions>()
            .Bind(configuration.GetSection(GstZenOptions.SectionName))
            .ValidateOnStart();
        services.AddSingleton<IValidateOptions<GstZenOptions>, GstZenOptionsValidator>();
        var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();

        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddHttpClient<IGstZenProviderService, GstZenProviderService>((provider, client) =>
        {
            var gstZenOptions = provider.GetRequiredService<IOptions<GstZenOptions>>().Value;
            client.Timeout = TimeSpan.FromSeconds(Math.Max(gstZenOptions.TimeoutSeconds, 1));
        });

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = true;
                options.SaveToken = false;
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var authorization = context.Request.Headers.Authorization;
                        if (authorization != StringValues.Empty)
                        {
                            context.Token = ExtractBearerToken(authorization.ToString());
                        }

                        return Task.CompletedTask;
                    }
                };
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwtOptions.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = "Username"
                };
            });

        services.AddAuthorization();
        return services;
    }

    private static string? ExtractBearerToken(string authorizationHeader)
    {
        const string bearerPrefix = "Bearer ";

        if (!authorizationHeader.StartsWith(bearerPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var token = authorizationHeader[bearerPrefix.Length..].Trim();
        return token.StartsWith(bearerPrefix, StringComparison.OrdinalIgnoreCase)
            ? token[bearerPrefix.Length..].Trim()
            : token;
    }
}
