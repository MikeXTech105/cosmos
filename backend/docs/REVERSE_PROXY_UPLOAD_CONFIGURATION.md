# HTTPS Upload Deployment Configuration

The production image listens only on internal HTTP port 8080. Uploads intentionally reject direct HTTP outside Development.

For a TLS-terminating Nginx deployment, use `deploy/nginx/cosmos-api.conf.example`, keep port 8080 private, and configure exactly the Nginx container IP or private CIDR as a trusted forwarding source. For example, for an isolated Docker bridge network:

```text
ReverseProxy__KnownNetworks__0=172.20.0.0/16
ReverseProxy__ForwardLimit=1
```

Use the actual private network assigned to the deployment; do not copy the example CIDR if it does not match. A single proxy address can instead be configured with `ReverseProxy__KnownProxies__0`.

The API processes `X-Forwarded-For` and `X-Forwarded-Proto` only when at least one trusted proxy or network is configured. It does not trust arbitrary client-supplied forwarded headers. `UseForwardedHeaders()` runs before exception handling, HSTS, HTTPS redirection, authentication, and controllers, so `Request.IsHttps` and generated upload URLs reflect the public HTTPS request.

After deployment, verify that `https://api.example.com/health` succeeds, direct public access to port 8080 is blocked, and an authorized multipart upload to `/api/uploads/website/images` returns HTTP 201. A direct HTTP upload in Production must return HTTP 403 with the standard COSMOS API envelope.
