namespace Cosmos.API.Hosting;

/// <summary>Provides one physical uploads root for both writes and public static-file serving.</summary>
public static class ImageUploadPaths
{
    public static string GetUploadsRoot(IWebHostEnvironment environment)
    {
        var webRootPath = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
        return Path.GetFullPath(Path.Combine(webRootPath, "uploads"));
    }
}
