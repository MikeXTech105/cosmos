namespace Cosmos.API.Hosting;

/// <summary>
/// Explicit, default-deny exception for an approved environment that must accept HTTP image uploads.
/// HTTPS remains required unless this setting is deliberately enabled by that environment's configuration.
/// </summary>
public sealed class ImageUploadOptions
{
    public const string SectionName = "ImageUpload";

    public bool AllowHttp { get; set; }
}
 