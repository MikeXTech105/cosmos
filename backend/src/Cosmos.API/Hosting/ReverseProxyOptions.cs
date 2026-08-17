using System.Net;
using Microsoft.AspNetCore.HttpOverrides;

namespace Cosmos.API.Hosting;

/// <summary>
/// Explicit trust boundary for a TLS-terminating reverse proxy. Leave both collections
/// empty for a direct Kestrel deployment; forwarded headers are then ignored.
/// </summary>
public sealed class ReverseProxyOptions
{
    public const string SectionName = "ReverseProxy";

    public string[] KnownProxies { get; set; } = [];
    public string[] KnownNetworks { get; set; } = [];
    public int ForwardLimit { get; set; } = 1;

    public bool IsEnabled => KnownProxies.Length > 0 || KnownNetworks.Length > 0;
}

public static class ReverseProxyForwarding
{
    public static void Validate(ReverseProxyOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        if (!options.IsEnabled)
        {
            return;
        }

        if (options.ForwardLimit < 1)
        {
            throw new InvalidOperationException($"{ReverseProxyOptions.SectionName}:ForwardLimit must be at least 1.");
        }

        foreach (var proxy in options.KnownProxies)
        {
            if (!IPAddress.TryParse(proxy, out _))
            {
                throw new InvalidOperationException($"{ReverseProxyOptions.SectionName}:KnownProxies contains invalid IP address '{proxy}'.");
            }
        }

        foreach (var network in options.KnownNetworks)
        {
            if (!System.Net.IPNetwork.TryParse(network, out _))
            {
                throw new InvalidOperationException($"{ReverseProxyOptions.SectionName}:KnownNetworks contains invalid CIDR '{network}'.");
            }
        }
    }

    public static void Configure(ForwardedHeadersOptions forwardedHeaders, ReverseProxyOptions options)
    {
        ArgumentNullException.ThrowIfNull(forwardedHeaders);
        Validate(options);

        forwardedHeaders.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        forwardedHeaders.ForwardLimit = options.ForwardLimit;
        forwardedHeaders.KnownProxies.Clear();
        forwardedHeaders.KnownIPNetworks.Clear();

        foreach (var proxy in options.KnownProxies)
        {
            forwardedHeaders.KnownProxies.Add(IPAddress.Parse(proxy));
        }

        foreach (var network in options.KnownNetworks)
        {
            forwardedHeaders.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(network));
        }
    }
}
