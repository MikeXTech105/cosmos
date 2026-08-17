using System.Net;
using System.Text.Json;
using Cosmos.API.Controllers;
using Cosmos.API.Hosting;
using Cosmos.API.Middleware;
using Cosmos.Shared.Exceptions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Cosmos.Tests.ImageUploads;

public sealed class ImageUploadSecurityTests
{
    [Fact]
    public async Task Development_http_website_upload_is_allowed()
    {
        var root = CreateTemporaryRoot();
        try
        {
            var context = CreateContext("http");
            var controller = CreateController("Development", root, context);

            var result = await controller.UploadWebsiteImage(ValidImageRequest(), CancellationToken.None);

            var response = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status201Created, response.StatusCode);
            var payload = Assert.IsType<Cosmos.Shared.Responses.ApiResponse<ImageUploadDto>>(response.Value);
            Assert.True(payload.Succeeded);
            Assert.StartsWith("http://api.test/uploads/website/", payload.Data!.Url, StringComparison.Ordinal);
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    [Fact]
    public async Task Production_direct_http_website_upload_is_rejected_as_a_security_error()
    {
        var root = CreateTemporaryRoot();
        try
        {
            var context = CreateContext("http");
            var controller = CreateController("Production", root, context);

            var exception = await Assert.ThrowsAsync<CosmosException>(() => controller.UploadWebsiteImage(ValidImageRequest(), CancellationToken.None));

            Assert.Equal(StatusCodes.Status403Forbidden, exception.StatusCode);
            Assert.Equal("Image uploads require HTTPS outside development.", exception.Message);
            Assert.Null(exception.FieldErrors);
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    [Fact]
    public async Task Production_upload_accepts_https_forwarded_by_a_known_proxy()
    {
        var root = CreateTemporaryRoot();
        try
        {
            var context = CreateContext("http");
            context.Connection.RemoteIpAddress = IPAddress.Parse("10.20.30.40");
            context.Request.Headers["X-Forwarded-Proto"] = "https";
            context.Request.Headers["X-Forwarded-For"] = "198.51.100.10";
            await ApplyForwardedHeadersAsync(context, ["10.20.30.40"]);
            Assert.True(context.Request.IsHttps);

            var controller = CreateController("Production", root, context);
            var result = await controller.UploadWebsiteImage(ValidImageRequest(), CancellationToken.None);

            var response = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status201Created, response.StatusCode);
            var payload = Assert.IsType<Cosmos.Shared.Responses.ApiResponse<ImageUploadDto>>(response.Value);
            Assert.StartsWith("https://api.test/uploads/website/", payload.Data!.Url, StringComparison.Ordinal);
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    [Fact]
    public async Task Untrusted_forwarded_proto_cannot_bypass_production_https_requirement()
    {
        var root = CreateTemporaryRoot();
        try
        {
            var context = CreateContext("http");
            context.Connection.RemoteIpAddress = IPAddress.Parse("10.20.30.41");
            context.Request.Headers["X-Forwarded-Proto"] = "https";
            await ApplyForwardedHeadersAsync(context, ["10.20.30.40"]);
            Assert.False(context.Request.IsHttps);

            var controller = CreateController("Production", root, context);
            var exception = await Assert.ThrowsAsync<CosmosException>(() => controller.UploadWebsiteImage(ValidImageRequest(), CancellationToken.None));

            Assert.Equal(StatusCodes.Status403Forbidden, exception.StatusCode);
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    [Fact]
    public async Task Invalid_image_is_still_rejected_as_a_file_validation_error()
    {
        var root = CreateTemporaryRoot();
        try
        {
            var controller = CreateController("Production", root, CreateContext("https"));

            var exception = await Assert.ThrowsAsync<CosmosException>(() => controller.UploadWebsiteImage(InvalidImageRequest(), CancellationToken.None));

            Assert.Equal(StatusCodes.Status400BadRequest, exception.StatusCode);
            Assert.Equal("The file signature is not a supported image.", exception.Message);
            Assert.Contains("file", exception.FieldErrors!.Keys);
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    [Fact]
    public async Task Https_rejection_is_returned_as_standard_api_error_not_500()
    {
        var root = CreateTemporaryRoot();
        try
        {
            var context = CreateContext("http");
            context.Response.Body = new MemoryStream();
            var controller = CreateController("Production", root, context);
            var middleware = new GlobalExceptionMiddleware(async _ => await controller.UploadWebsiteImage(ValidImageRequest(), CancellationToken.None));

            await middleware.InvokeAsync(context, NullLogger<GlobalExceptionMiddleware>.Instance);

            Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
            context.Response.Body.Position = 0;
            using var body = await JsonDocument.ParseAsync(context.Response.Body);
            Assert.False(body.RootElement.GetProperty("succeeded").GetBoolean());
            Assert.Equal("Image uploads require HTTPS outside development.", body.RootElement.GetProperty("message").GetString());
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    [Fact]
    public async Task Existing_item_upload_remains_available_over_https()
    {
        var root = CreateTemporaryRoot();
        try
        {
            var controller = CreateController("Production", root, CreateContext("https"));

            var result = await controller.UploadImage(ValidImageRequest(), CancellationToken.None);

            var response = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status201Created, response.StatusCode);
            var payload = Assert.IsType<Cosmos.Shared.Responses.ApiResponse<ImageUploadDto>>(response.Value);
            Assert.StartsWith("https://api.test/uploads/items/", payload.Data!.Url, StringComparison.Ordinal);
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    [Fact]
    public void Reverse_proxy_configuration_rejects_invalid_untrusted_boundary_values()
    {
        var options = new ReverseProxyOptions { KnownNetworks = ["not-a-cidr"] };

        var exception = Assert.Throws<InvalidOperationException>(() => ReverseProxyForwarding.Validate(options));

        Assert.Contains("KnownNetworks", exception.Message, StringComparison.Ordinal);
    }

    private static DefaultHttpContext CreateContext(string scheme)
    {
        var context = new DefaultHttpContext();
        context.Request.Scheme = scheme;
        context.Request.Host = new HostString("api.test");
        return context;
    }

    private static ImageUploadsController CreateController(string environmentName, string root, HttpContext context) => new(TestEnvironment(environmentName, root))
    {
        ControllerContext = new ControllerContext { HttpContext = context }
    };

    private static TestWebHostEnvironment TestEnvironment(string environmentName, string root) => new()
    {
        EnvironmentName = environmentName,
        ApplicationName = "Cosmos.Tests",
        ContentRootPath = root,
        ContentRootFileProvider = new PhysicalFileProvider(root),
        WebRootPath = Path.Combine(root, "wwwroot"),
        WebRootFileProvider = new NullFileProvider()
    };

    private static async Task ApplyForwardedHeadersAsync(DefaultHttpContext context, string[] knownProxies)
    {
        var options = new ForwardedHeadersOptions();
        ReverseProxyForwarding.Configure(options, new ReverseProxyOptions { KnownProxies = knownProxies });
        var middleware = new ForwardedHeadersMiddleware(_ => Task.CompletedTask, NullLoggerFactory.Instance, Options.Create(options));
        await middleware.Invoke(context);
    }

    private static ImageUploadRequest ValidImageRequest() => new(CreateFile("image.jpg", "image/jpeg", [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x00]), null);
    private static ImageUploadRequest InvalidImageRequest() => new(CreateFile("invalid.jpg", "image/jpeg", [0x00, 0x01, 0x02]), null);

    private static IFormFile CreateFile(string fileName, string contentType, byte[] content)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, stream.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    private static string CreateTemporaryRoot() => Directory.CreateTempSubdirectory("cosmos-upload-tests-").FullName;

    private sealed class TestWebHostEnvironment : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = string.Empty;
        public string ApplicationName { get; set; } = string.Empty;
        public string WebRootPath { get; set; } = string.Empty;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
