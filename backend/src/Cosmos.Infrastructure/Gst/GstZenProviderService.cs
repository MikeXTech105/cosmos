using System.Diagnostics;
using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Gst;
using Cosmos.Contracts.Gst;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cosmos.Infrastructure.Gst;

public sealed class GstZenProviderService : IGstZenProviderService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _httpClient;
    private readonly GstZenOptions _options;
    private readonly IGstApiLogService _apiLogService;
    private readonly ILogger<GstZenProviderService> _logger;

    public GstZenProviderService(HttpClient httpClient, IOptions<GstZenOptions> options, IGstApiLogService apiLogService, ILogger<GstZenProviderService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _apiLogService = apiLogService;
        _logger = logger;
    }

    public GstConfigurationStatusResponse GetConfigurationStatus()
    {
        var configured = new List<string>();
        var missing = new List<string>();

        AddSetting(nameof(_options.Environment), _options.Environment, configured, missing);
        AddSetting(nameof(_options.SandboxBaseUrl), _options.SandboxBaseUrl, configured, missing);
        AddSetting(nameof(_options.ProductionBaseUrl), _options.ProductionBaseUrl, configured, missing);
        AddSecretStatus(nameof(_options.SandboxToken), _options.SandboxToken, configured, missing);
        AddSecretStatus(nameof(_options.ProductionToken), _options.ProductionToken, configured, missing);
        AddSecretStatus(nameof(_options.SandboxGstnAccessToken), _options.SandboxGstnAccessToken, configured, missing);
        AddSecretStatus(nameof(_options.ProductionGstnAccessToken), _options.ProductionGstnAccessToken, configured, missing);
        AddSetting(nameof(_options.TokenHeaderName), _options.TokenHeaderName, configured, missing);

        var features = new List<string>();
        if (!string.IsNullOrWhiteSpace(_options.GstinVerificationPath)) features.Add("GSTIN Verification");
        if (!string.IsNullOrWhiteSpace(_options.EWayBillGeneratePath)) features.Add("E-Way Bill");
        if (!string.IsNullOrWhiteSpace(_options.EInvoiceGeneratePath)) features.Add("E-Invoice");
        if (!string.IsNullOrWhiteSpace(_options.GstnGenerateOtpPath) && !string.IsNullOrWhiteSpace(_options.GstnAuthenticateOtpPath) && !string.IsNullOrWhiteSpace(_options.CurrentGstnAccessToken)) features.Add("GST Session/OTP");
        if (!string.IsNullOrWhiteSpace(_options.Gstr1Path) || !string.IsNullOrWhiteSpace(_options.Gstr3BPath)) features.Add("GST Returns");

        return new GstConfigurationStatusResponse(_options.Environment, _options.CurrentBaseUrl, configured, missing, features);
    }

    public async Task<GstinVerificationResponse> VerifyGstinAsync(VerifyGstinRequest request, long? companyGstRegistrationId, CancellationToken cancellationToken)
    {
        var response = await SendAsync("GSTIN Verification", companyGstRegistrationId, HttpMethod.Post, _options.GstinVerificationPath, new { gstin = request.Gstin }, cancellationToken);
        return new GstinVerificationResponse
        {
            Gstin = GetString(response.Json, "gstin") ?? request.Gstin,
            LegalName = GetString(response.Json, "legal_name", "legalName", "lgnm"),
            TradeName = GetString(response.Json, "trade_name", "tradeName", "tradeNam"),
            Status = GetString(response.Json, "company_status", "status", "sts"),
            TaxpayerType = GetString(response.Json, "gst_type", "taxpayer_type", "taxpayerType", "dty"),
            StateCode = GetString(response.Json, "code", "state_code", "stateCode"),
            RegistrationDate = GetDate(response.Json, "registration_date", "registrationDate", "rgdt"),
            AddressJson = GetRaw(response.Json, "pradr", "address"),
            NatureOfBusinessJson = GetRaw(response.Json, "nature_of_business", "natureOfBusiness", "nba"),
            RawResponseJson = response.RawJson,
            VerifiedAt = DateTime.UtcNow,
            CacheExpiresAt = DateTime.UtcNow.AddDays(1)
        };
    }

    public async Task<EWayBillResponse> GenerateEWayBillAsync(GenerateEWayBillRequest request, CancellationToken cancellationToken)
    {
        var payload = JsonPayloadOrObject(request.RequestJson, request);
        var response = await SendAsync("E-Way Bill Generate", request.CompanyGstRegistrationId, HttpMethod.Post, _options.EWayBillGeneratePath, payload, cancellationToken);
        return new EWayBillResponse
        {
            CompanyGstRegistrationId = request.CompanyGstRegistrationId,
            SalesInvoiceId = request.SalesInvoiceId,
            PurchaseInvoiceId = request.PurchaseInvoiceId,
            EWayBillNumber = GetString(response.Json, "ewayBillNumber", "ewbNo", "eWayBillNo"),
            Status = GetString(response.Json, "status") ?? "Generated",
            ValidUpTo = GetDate(response.Json, "validUpTo", "valid_upto"),
            GeneratedRequestJson = JsonSerializer.Serialize(payload, JsonOptions),
            GeneratedResponseJson = response.RawJson
        };
    }

    public async Task<EWayBillResponse> CancelEWayBillAsync(CancelEWayBillRequest request, CancellationToken cancellationToken)
    {
        var payload = JsonPayloadOrObject(
            request.RequestJson,
            new
            {
                ewbNo = NumberOrString(request.EWayBillNumber),
                cancelRsnCode = NumberOrString(request.CancelReasonCode),
                cancelRmrk = request.CancelRemark
            });
        var response = await SendAsync("E-Way Bill Cancel", request.CompanyGstRegistrationId, HttpMethod.Post, _options.EWayBillCancelPath, payload, cancellationToken);
        return new EWayBillResponse
        {
            CompanyGstRegistrationId = request.CompanyGstRegistrationId,
            EWayBillNumber = GetString(response.Json, "ewayBillNo", "ewbNo") ?? request.EWayBillNumber,
            Status = GetString(response.Json, "EwbStatus", "status") ?? "Cancelled",
            CancelledAt = GetDate(response.Json, "cancelDate") ?? DateTime.UtcNow,
            CancelReasonCode = request.CancelReasonCode,
            CancelReason = request.CancelRemark,
            GeneratedResponseJson = response.RawJson
        };
    }

    public async Task<EWayBillResponse> UpdateEWayBillVehicleAsync(UpdateEWayBillVehicleRequest request, CancellationToken cancellationToken)
    {
        var payload = JsonPayloadOrObject(request.RequestJson, request);
        var response = await SendAsync("E-Way Bill Update Vehicle", request.CompanyGstRegistrationId, HttpMethod.Post, _options.EWayBillUpdateVehiclePath, payload, cancellationToken);
        return new EWayBillResponse
        {
            CompanyGstRegistrationId = request.CompanyGstRegistrationId,
            EWayBillNumber = request.EWayBillNumber,
            Status = GetString(response.Json, "status") ?? "VehicleUpdated",
            VehicleNumber = request.VehicleNumber,
            GeneratedRequestJson = JsonSerializer.Serialize(payload, JsonOptions),
            GeneratedResponseJson = response.RawJson
        };
    }

    public async Task<EWayBillResponse> ExtendEWayBillAsync(ExtendEWayBillRequest request, CancellationToken cancellationToken)
    {
        // https://my.gstzen.in/docs/api/ewaybill-api/extend-eway-bill/
        if (string.IsNullOrWhiteSpace(request.Gstin)) throw new CosmosException("A saved registration GSTIN is required for extension.");
        var payload = new { ewbNo=NumberOrString(request.EWayBillNumber),vehicleNo=request.VehicleNumber??"",fromPlace=request.FromPlace,fromState=request.FromState,fromPincode=NumberOrString(request.FromPincode??""),remainingDistance=NumberOrString(request.RemainingDistance??""),transDocNo=request.TransportDocumentNumber??"",transDocDate=request.TransportDocumentDate?.ToString("dd/MM/yyyy",CultureInfo.InvariantCulture)??"",transMode=request.TransportMode,extnRsnCode=NumberOrString(request.ExtensionReasonCode??""),extnRemarks=request.ExtensionRemark,transitType=request.TransportMode=="5"?request.TransitType:"",consignmentStatus=request.ConsignmentStatus,addressLine1=request.AddressLine1??"",addressLine2=request.AddressLine2??"",addressLine3=request.AddressLine3??"" };
        var response = await SendAsync("E-Way Bill Extend", request.CompanyGstRegistrationId, HttpMethod.Post, _options.EWayBillExtendPath, payload, cancellationToken,gstin:request.Gstin);
        var returnedNumber=GetString(response.Json,"ewayBillNo","ewbNo");
        var validity=GetDate(response.Json,"validUpto","validUpTo","valid_upto");
        if(returnedNumber!=request.EWayBillNumber || validity is null) throw new CosmosException("GSTZen extension response did not confirm this E-Way Bill and validity. Reconcile before another submission.",502);
        return new EWayBillResponse
        {
            CompanyGstRegistrationId = request.CompanyGstRegistrationId,
            EWayBillNumber = request.EWayBillNumber,
            Status = "ACT",
            ValidUpTo = validity,
            VehicleNumber=request.VehicleNumber,
            TransportMode=request.TransportMode,
            GeneratedRequestJson = JsonSerializer.Serialize(payload, JsonOptions),
            GeneratedResponseJson = response.RawJson
        };
    }

    public async Task<EWayBillResponse> GetEWayBillAsync(GetEWayBillDetailsRequest request, CancellationToken cancellationToken)
    {
        var response = await SendAsync("E-Way Bill Details", request.CompanyGstRegistrationId, HttpMethod.Post, _options.EWayBillGetDetailsPath, new { ewbNo = NumberOrString(request.EWayBillNumber) }, cancellationToken,gstin:request.Gstin);
        return new EWayBillResponse
        {
            CompanyGstRegistrationId = request.CompanyGstRegistrationId,
            EWayBillNumber = GetString(response.Json, "ewayBillNumber", "ewbNo", "eWayBillNo"),
            Status = GetString(response.Json, "EwbStatus", "status") ?? "Fetched",
            DocumentType = GetString(response.Json, "docType"),
            DocumentNumber = GetString(response.Json, "docNo"),
            DocumentDate = GetDate(response.Json, "docDate"),
            SupplyType = GetString(response.Json, "supplyType"),
            SubSupplyType = GetString(response.Json, "subSupplyType"),
            FromGstin = GetString(response.Json, "fromGstin"),
            ToGstin = GetString(response.Json, "toGstin"),
            TransporterId = GetString(response.Json, "transporterId"),
            TransporterName = GetString(response.Json, "transporterName"),
            TransportMode = GetString(response.Json, "transMode"),
            VehicleNumber = GetString(response.Json, "vehicleNo"),
            VehicleType = GetString(response.Json, "vehicleType"),
            Distance = GetDecimal(response.Json, "actualDist", "Distance"),
            ValidUpTo = GetDate(response.Json, "validUpto", "validUpTo"),
            GeneratedResponseJson = response.RawJson
        };
    }

    public async Task<EInvoiceResponse> GenerateEInvoiceAsync(GenerateEInvoiceRequest request, CancellationToken cancellationToken)
    {
        // TODO: Update GSTZen payload mapping after final GSTZen API documentation/Postman collection is provided.
        var payload = JsonPayloadOrObject(request.RequestJson, request);
        var response = await SendAsync("E-Invoice Generate", request.CompanyGstRegistrationId, HttpMethod.Post, _options.EInvoiceGeneratePath, payload, cancellationToken);
        return new EInvoiceResponse
        {
            CompanyGstRegistrationId = request.CompanyGstRegistrationId,
            SalesInvoiceId = request.SalesInvoiceId,
            Irn = GetString(response.Json, "irn", "Irn"),
            AckNumber = GetString(response.Json, "AckNoStr", "ackNo", "ackNumber", "AckNo"),
            AckDate = GetDate(response.Json, "ackDate", "AckDt"),
            SignedQrCode = GetString(response.Json, "signedQRCode", "signedQrCode", "SignedQRCode"),
            SignedInvoice = GetString(response.Json, "signedInvoice", "SignedInvoice"),
            Status = GetString(response.Json, "IrnStatus", "Status") ?? "Generated",
            GeneratedRequestJson = JsonSerializer.Serialize(payload, JsonOptions),
            GeneratedResponseJson = response.RawJson
        };
    }

    public async Task<EInvoiceResponse> CancelEInvoiceAsync(CancelEInvoiceRequest request, CancellationToken cancellationToken)
    {
        var payload = JsonPayloadOrObject(
            request.RequestJson,
            new
            {
                Irn = request.Irn,
                CnlRsn = NumberOrString(request.CancelReasonCode),
                CnlRem = request.CancelRemark
            });
        var response = await SendAsync("E-Invoice Cancel", request.CompanyGstRegistrationId, HttpMethod.Post, _options.EInvoiceCancelPath, payload, cancellationToken);
        return new EInvoiceResponse
        {
            CompanyGstRegistrationId = request.CompanyGstRegistrationId,
            Irn = GetString(response.Json, "irn", "Irn") ?? request.Irn,
            AckNumber = GetString(response.Json, "AckNoStr", "ackNo", "AckNo"),
            AckDate = GetDate(response.Json, "ackDate", "AckDt"),
            SignedQrCode = GetString(response.Json, "signedQRCode", "SignedQRCode"),
            SignedInvoice = GetString(response.Json, "signedInvoice", "SignedInvoice"),
            Status = GetString(response.Json, "IrnStatus", "Status") ?? "Cancelled",
            CancelledAt = DateTime.UtcNow,
            CancelReasonCode = request.CancelReasonCode,
            CancelReason = request.CancelRemark,
            GeneratedResponseJson = response.RawJson
        };
    }

    public async Task<EInvoiceResponse> GetEInvoiceAsync(GetEInvoiceDetailsRequest request, CancellationToken cancellationToken)
    {
        var payload = new Dictionary<string, object?>
        {
            ["SellerDtls"] = new { Gstin = request.SellerGstin },
            ["Irn"] = request.Irn
        };

        if (!string.IsNullOrWhiteSpace(request.Irp))
        {
            payload["irp"] = request.Irp;
        }

        var response = await SendAsync("E-Invoice Details", request.CompanyGstRegistrationId, HttpMethod.Post, _options.EInvoiceGetDetailsPath, payload, cancellationToken);
        return new EInvoiceResponse
        {
            CompanyGstRegistrationId = request.CompanyGstRegistrationId,
            Irn = GetString(response.Json, "irn", "Irn") ?? request.Irn,
            AckNumber = GetString(response.Json, "AckNoStr", "ackNo", "AckNo"),
            AckDate = GetDate(response.Json, "ackDate", "AckDt"),
            SignedQrCode = GetString(response.Json, "signedQRCode", "SignedQRCode"),
            SignedInvoice = GetString(response.Json, "signedInvoice", "SignedInvoice"),
            Status = GetString(response.Json, "IrnStatus", "Status") ?? "Fetched",
            GeneratedResponseJson = response.RawJson
        };
    }

    public async Task<GstSessionResponse> GenerateOtpAsync(GenerateGstOtpRequest request, CancellationToken cancellationToken)
    {
        // https://my.gstzen.in/docs/api/gstn-generate-otp-api/ (reviewed 2026-10-28).
        if (string.IsNullOrWhiteSpace(request.Gstin) || string.IsNullOrWhiteSpace(request.GstPortalUsername)) throw new CosmosException("A saved GSTIN and GST portal username are required.");
        var response = await SendAsync("GSTN Generate OTP", request.CompanyGstRegistrationId, HttpMethod.Post, _options.GstnGenerateOtpPath, new { gstin=request.Gstin, username=request.GstPortalUsername }, cancellationToken, gstnSession:true);
        if (GetString(response.Json,"status") != "1" || GetString(response.Json,"api_call") != "OTPREQUEST") throw new CosmosException("GSTZen did not confirm OTP delivery. Inspect the session before requesting another OTP.",502);
        return new GstSessionResponse
        {
            CompanyGstRegistrationId = request.CompanyGstRegistrationId,
            SessionType = "OTP",
            Status = "OtpGenerated"
        };
    }

    public async Task<GstSessionResponse> AuthenticateOtpAsync(AuthenticateGstOtpRequest request, CancellationToken cancellationToken)
    {
        // https://my.gstzen.in/docs/api/gstn-establish-session-api/ (reviewed 2026-10-28).
        if (string.IsNullOrWhiteSpace(request.Gstin)) throw new CosmosException("Select a saved GST registration.");
        var response = await SendAsync("GSTN Authenticate OTP", request.CompanyGstRegistrationId, HttpMethod.Post, _options.GstnAuthenticateOtpPath, new { gstin=request.Gstin, otp=request.Otp }, cancellationToken, gstnSession:true);
        if (GetString(response.Json,"status") != "1" || GetString(response.Json,"api_call") != "AUTHTOKEN" || GetString(response.Json,"status_cd") != "1" || !long.TryParse(GetString(response.Json,"expiry_time"),out var expirySeconds)) throw new CosmosException("GSTZen did not confirm an authenticated session. The OTP has not been marked verified.",502);
        DateTime expiresAt;
        try { expiresAt=DateTimeOffset.FromUnixTimeSeconds(expirySeconds).UtcDateTime; } catch(ArgumentOutOfRangeException) { throw new CosmosException("GSTZen returned an invalid session expiry.",502); }
        if (expiresAt<=DateTime.UtcNow) throw new CosmosException("GSTZen returned an expired session. Authenticate again.",502);
        return new GstSessionResponse
        {
            CompanyGstRegistrationId = request.CompanyGstRegistrationId,
            SessionType = request.SessionType ?? "OTP",
            TokenExpiresAt = expiresAt,
            OtpVerifiedAt = DateTime.UtcNow,
            Status = "Active"
        };
    }

    private async Task<ProviderResponse> SendAsync(string apiType, long? companyGstRegistrationId, HttpMethod method, string? path, object? payload, CancellationToken cancellationToken, bool gstnSession=false, string? gstin=null)
    {
        if (string.IsNullOrWhiteSpace(_options.CurrentBaseUrl))
        {
            throw new CosmosException("GSTZen base URL is not configured.", 500);
        }

        if (string.IsNullOrWhiteSpace(gstnSession ? _options.CurrentGstnAccessToken : _options.CurrentToken))
        {
            throw new CosmosException(gstnSession ? "GSTZen GSTN REST access token is not configured on the server." : "GSTZen token is not configured.", 503);
        }

        if (string.IsNullOrWhiteSpace(path))
        {
            throw new CosmosException($"GSTZen endpoint path for {apiType} is not configured.", 500);
        }

        var requestUri = new Uri(new Uri(_options.CurrentBaseUrl.TrimEnd('/') + "/"), path.TrimStart('/'));
        using var request = new HttpRequestMessage(method, requestUri);
        if (gstnSession) request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _options.CurrentGstnAccessToken);
        else ConfigureHeaders(request);
        if (!string.IsNullOrWhiteSpace(gstin)) request.Headers.TryAddWithoutValidation("gstin",gstin);
        var requestJson = payload is null ? null : JsonSerializer.Serialize(payload, JsonOptions);
        if (requestJson is not null && method != HttpMethod.Get)
        {
            request.Content = new StringContent(requestJson, Encoding.UTF8, "application/json");
        }

        var stopwatch = Stopwatch.StartNew();
        string? responseBody = null;
        int? statusCode = null;
        try
        {
            using var response = await _httpClient.SendAsync(request, cancellationToken);
            statusCode = (int)response.StatusCode;
            responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            stopwatch.Stop();
            var parsed = ParseJson(responseBody);
            var providerSucceeded = IsProviderSuccess(parsed);
            await AddLogAsync(apiType, companyGstRegistrationId, requestUri, method, requestJson, responseBody, statusCode, response.IsSuccessStatusCode && providerSucceeded, null, stopwatch.ElapsedMilliseconds, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                throw new CosmosException($"GSTZen {apiType} failed with status code {statusCode}.", 502);
            }

            if (!providerSucceeded)
            {
                var message = Mask(GetString(parsed, "message", "error", "errors")) ?? "Provider returned an unsuccessful response.";
                throw new CosmosException($"GSTZen {apiType} failed: {message}", 502,data:new GstProviderRejection());
            }

            return new ProviderResponse(parsed, string.IsNullOrWhiteSpace(responseBody) ? "{}" : responseBody);
        }
        catch (CosmosException)
        {
            throw;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "GSTZen {ApiType} request failed.", apiType);
            await AddLogAsync(apiType, companyGstRegistrationId, requestUri, method, requestJson, responseBody, statusCode, false, ex.Message, stopwatch.ElapsedMilliseconds, cancellationToken);
            throw new CosmosException($"GSTZen {apiType} request failed.", 502);
        }
    }

    private void ConfigureHeaders(HttpRequestMessage request)
    {
        var tokenHeaderName = string.IsNullOrWhiteSpace(_options.TokenHeaderName) ? "Token" : _options.TokenHeaderName;
        request.Headers.TryAddWithoutValidation(tokenHeaderName, _options.CurrentToken);
    }

    private async Task AddLogAsync(string apiType, long? companyGstRegistrationId, Uri endpoint, HttpMethod method, string? requestPayload, string? responsePayload, int? statusCode, bool isSuccess, string? errorMessage, long durationMs, CancellationToken cancellationToken)
    {
        try
        {
            await _apiLogService.AddAsync(
                new AddGstApiLogRequest(
                    companyGstRegistrationId,
                    "GSTZen",
                    apiType,
                    endpoint.ToString(),
                    method.Method,
                    Mask(requestPayload),
                    Mask(responsePayload),
                    statusCode,
                    isSuccess,
                    Mask(errorMessage),
                    checked((int)Math.Min(durationMs, int.MaxValue)),
                    null,
                    null),
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to save GST API log for {ApiType}.", apiType);
        }
    }

    private string? Mask(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        var masked = value;
        foreach (var secret in new[] { _options.SandboxToken, _options.ProductionToken, _options.CurrentToken, _options.SandboxGstnAccessToken, _options.ProductionGstnAccessToken })
        {
            if (!string.IsNullOrWhiteSpace(secret))
            {
                masked = masked.Replace(secret, "***", StringComparison.OrdinalIgnoreCase);
            }
        }

        foreach (var key in new[] { "token", "sandboxToken", "productionToken", "otp", "password", "gstPortalUsername", "userName", "username", "AuthToken", "Sek" })
        {
            masked = MaskJsonProperty(masked, key);
        }

        return masked;
    }

    private static string MaskJsonProperty(string value, string propertyName)
    {
        try
        {
            var node = JsonNode.Parse(value);
            MaskJsonNode(node, propertyName);
            return node?.ToJsonString(JsonOptions) ?? value;
        }
        catch (JsonException)
        {
            return value;
        }
    }

    private static void MaskJsonNode(JsonNode? node, string propertyName)
    {
        if (node is JsonObject obj)
        {
            foreach (var key in obj.Select(x => x.Key).ToArray())
            {
                if (string.Equals(key, propertyName, StringComparison.OrdinalIgnoreCase))
                {
                    obj[key] = "***";
                }
                else
                {
                    MaskJsonNode(obj[key], propertyName);
                }
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array)
            {
                MaskJsonNode(child, propertyName);
            }
        }
    }

    private static object JsonPayloadOrObject(string? json, object fallback)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return fallback;
        }

        return JsonNode.Parse(json) ?? fallback;
    }

    private static JsonNode? ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new JsonObject();
        }

        try
        {
            return JsonNode.Parse(json);
        }
        catch (JsonException)
        {
            return new JsonObject { ["raw"] = json };
        }
    }

    private static bool IsProviderSuccess(JsonNode? node)
    {
        var status = Find(node, "status");
        if (status is null)
        {
            return true;
        }

        if (status.GetValueKind() == JsonValueKind.Number && status.GetValue<int>() == 0)
        {
            return false;
        }

        if (status.GetValueKind() == JsonValueKind.False)
        {
            return false;
        }

        if (status.GetValueKind() == JsonValueKind.String)
        {
            var value = status.GetValue<string>();
            return !string.Equals(value, "0", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(value, "false", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(value, "failed", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(value, "error", StringComparison.OrdinalIgnoreCase);
        }

        return true;
    }

    private static string? GetString(JsonNode? node, params string[] names)
    {
        foreach (var name in names)
        {
            var found = Find(node, name);
            if (found is null)
            {
                continue;
            }

            var value = found.GetValueKind() == JsonValueKind.String ? found.GetValue<string>() : found.ToJsonString(JsonOptions).Trim('"');
            if (!string.IsNullOrWhiteSpace(value) && value != "null")
            {
                return value;
            }
        }

        return null;
    }

    private static DateTime? GetDate(JsonNode? node, params string[] names)
    {
        var value = GetString(node, names);
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var formats = new[] { "dd/MM/yyyy hh:mm:ss tt", "dd/MM/yyyy HH:mm:ss", "dd/MM/yyyy", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-ddTHH:mm:ss", "yyyy-MM-dd" };
        return DateTime.TryParseExact(value, formats, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var exactDate)
            ? exactDate
            : DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var date)
                ? date
                : null;
    }

    private static decimal? GetDecimal(JsonNode? node, params string[] names)
    {
        var value = GetString(node, names);
        return decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var number) ? number : null;
    }

    private static string? GetRaw(JsonNode? node, params string[] names)
    {
        foreach (var name in names)
        {
            var found = Find(node, name);
            if (found is not null)
            {
                return found.ToJsonString(JsonOptions);
            }
        }

        return null;
    }

    private static JsonNode? Find(JsonNode? node, string name)
    {
        if (node is JsonObject obj)
        {
            foreach (var item in obj)
            {
                if (string.Equals(item.Key, name, StringComparison.OrdinalIgnoreCase))
                {
                    return item.Value;
                }

                var child = Find(item.Value, name);
                if (child is not null)
                {
                    return child;
                }
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array)
            {
                var found = Find(child, name);
                if (found is not null)
                {
                    return found;
                }
            }
        }

        return null;
    }

    private static object NumberOrString(string value)
    {
        if (long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var number))
        {
            return number;
        }

        return value;
    }

    private static void AddSetting(string name, string? value, ICollection<string> configured, ICollection<string> missing)
    {
        if (string.IsNullOrWhiteSpace(value)) missing.Add(name);
        else configured.Add(name);
    }

    private static void AddSecretStatus(string name, string? value, ICollection<string> configured, ICollection<string> missing)
    {
        if (string.IsNullOrWhiteSpace(value)) missing.Add(name);
        else configured.Add($"{name}: configured");
    }

    private sealed record ProviderResponse(JsonNode? Json, string RawJson);
}
