using System.Net;
using System.Text;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Gst;
using Cosmos.Contracts.Gst;
using Cosmos.Infrastructure.Gst;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Options;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Cosmos.Tests.Gst;

public sealed class GstZenProviderServiceTests
{
    [Fact]
    public async Task ExtendEWayBill_UsesReviewedProviderFieldsAndGstinHeaderAndRequiresReturnedIdentity()
    {
        var handler=new StubHttpMessageHandler(_=>JsonResponse("""{"ewayBillNo":"141010282840","validUpto":"29/10/2026 11:59:00 PM"}"""));
        var request=new ExtendEWayBillRequest(7,"141010282840","GJ01AB1234","50","1","Flood delay",null,FromPlace:"Surat",FromState:24,FromPincode:"395001",TransportMode:"1",ConsignmentStatus:"M",Gstin:"24AADCG4992P1ZZ");
        var response=await CreateService(handler).ExtendEWayBillAsync(request,default);
        Assert.Equal("141010282840",response.EWayBillNumber);
        Assert.Equal("ACT",response.Status);
        Assert.Equal(new DateTime(2026,10,29,23,59,0),response.ValidUpTo);
        Assert.Contains("24AADCG4992P1ZZ",handler.LastRequest!.Headers.GetValues("gstin"));
        Assert.Contains("\"ewbNo\":141010282840",handler.LastRequestBody);
        Assert.Contains("\"fromPlace\":\"Surat\"",handler.LastRequestBody);
        Assert.DoesNotContain("companyGstRegistrationId",handler.LastRequestBody);
        Assert.DoesNotContain("idempotencyKey",handler.LastRequestBody);
    }
    [Fact]
    public async Task GenerateOtp_UsesDocumentedGstinUsernamePayloadAndSeparateBearerCredential()
    {
        var handler = new StubHttpMessageHandler(_=>JsonResponse("""{"status":1,"api_call":"OTPREQUEST","message":"OTP sent successfully."}"""));
        var result=await CreateService(handler).GenerateOtpAsync(new GenerateGstOtpRequest(7,"portal-user","24AADCG4992P1ZZ"),default);
        Assert.Equal("OtpGenerated",result.Status);
        Assert.Equal("https://my.gstzen.in/api/gstn-generate-otp/",handler.LastRequest!.RequestUri!.ToString());
        Assert.Equal("Bearer",handler.LastRequest.Headers.Authorization!.Scheme);
        Assert.Equal("session-test-token",handler.LastRequest.Headers.Authorization.Parameter);
        Assert.False(handler.LastRequest.Headers.Contains("Token"));
        Assert.Equal("""{"gstin":"24AADCG4992P1ZZ","username":"portal-user"}""",handler.LastRequestBody);
    }

    [Fact]
    public async Task AuthenticateOtp_RequiresExplicitConfirmedSuccessAndUnixExpiry()
    {
        var handler = new StubHttpMessageHandler(_=>JsonResponse("""{"status":1,"api_call":"AUTHTOKEN","message":{"status_cd":"1","expiry_time":4102444800}}"""));
        var result=await CreateService(handler).AuthenticateOtpAsync(new AuthenticateGstOtpRequest(7,"123456",RequestJson:"{\"ignored\":true}",Gstin:"24AADCG4992P1ZZ"),default);
        Assert.Equal("Active",result.Status);
        Assert.Equal(new DateTime(2100,1,1,0,0,0,DateTimeKind.Utc),result.TokenExpiresAt);
        Assert.Equal("""{"gstin":"24AADCG4992P1ZZ","otp":"123456"}""",handler.LastRequestBody);
        Assert.NotNull(result.OtpVerifiedAt);
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("{\"status\":1}")]
    [InlineData("{\"status\":1,\"api_call\":\"AUTHTOKEN\",\"message\":{\"status_cd\":\"0\",\"expiry_time\":4102444800}}")]
    [InlineData("{\"status\":1,\"api_call\":\"AUTHTOKEN\",\"message\":{\"status_cd\":\"1\",\"expiry_time\":1}}")]
    public async Task AuthenticateOtp_NeverTreatsMissingFailedOrExpiredProviderStatusAsAuthenticated(string response)
    {
        var handler = new StubHttpMessageHandler(_=>JsonResponse(response));
        await Assert.ThrowsAsync<CosmosException>(()=>CreateService(handler).AuthenticateOtpAsync(new AuthenticateGstOtpRequest(7,"123456",Gstin:"24AADCG4992P1ZZ"),default));
    }

    [Fact]
    public async Task OtpAndSessionSecretsRemainRedactedEvenWhenDetailedLoggingIsEnabled()
    {
        AddGstApiLogRequest? log = null;
        var logService=new Mock<IGstApiLogService>();
        logService.Setup(x=>x.AddAsync(It.IsAny<AddGstApiLogRequest>(),It.IsAny<CancellationToken>())).Callback<AddGstApiLogRequest,CancellationToken>((request,_)=>log=request).Returns(Task.CompletedTask);
        var handler=new StubHttpMessageHandler(_=>JsonResponse("""{"status":1,"api_call":"AUTHTOKEN","message":{"status_cd":"1","expiry_time":4102444800}}"""));
        var options=Options.Create(new GstZenOptions { SandboxBaseUrl="https://my.gstzen.in", SandboxGstnAccessToken="private-session-token", MaskSensitiveLogs=false });
        var service=new GstZenProviderService(new HttpClient(handler),options,logService.Object,NullLogger<GstZenProviderService>.Instance);
        await service.AuthenticateOtpAsync(new AuthenticateGstOtpRequest(7,"654321",Gstin:"24AADCG4992P1ZZ"),default);
        Assert.NotNull(log);
        Assert.DoesNotContain("654321",log.RequestPayload);
        Assert.DoesNotContain("private-session-token",log.RequestPayload);
        Assert.Contains("***",log.RequestPayload);
    }
    [Fact]
    public async Task VerifyGstinAsync_SendsConfiguredTokenHeaderAndMapsResponse()
    {
        var handler = new StubHttpMessageHandler(_ => JsonResponse("""
        {
          "status": 1,
          "gstin": "01AAFQQ9980MZQR",
          "valid": true,
          "company_details": {
            "legal_name": "GSTZEN PRIVATE LIMITED",
            "trade_name": "GSTZEN",
            "company_status": "Active",
            "registration_date": "2017-07-01",
            "gst_type": "Regular",
            "state_info": { "code": "29", "name": "Karnataka" },
            "pradr": { "addr": "Manyata Tech Park" }
          }
        }
        """));
        var service = CreateService(handler);

        var result = await service.VerifyGstinAsync(new VerifyGstinRequest("01AAFQQ9980MZQR", true), null, CancellationToken.None);

        Assert.Equal("GSTZEN PRIVATE LIMITED", result.LegalName);
        Assert.Equal("GSTZEN", result.TradeName);
        Assert.Equal("Active", result.Status);
        Assert.Equal("Regular", result.TaxpayerType);
        Assert.Equal("29", result.StateCode);
        Assert.Contains("Manyata Tech Park", result.AddressJson);
        Assert.Equal(HttpMethod.Post, handler.LastRequest?.Method);
        Assert.Equal("https://my.gstzen.in/api/gstin-validator/", handler.LastRequest?.RequestUri?.ToString());
        Assert.NotNull(handler.LastRequest);
        Assert.True(handler.LastRequest.Headers.TryGetValues("Token", out var values));
        Assert.Contains("test-token", values);
    }

    [Fact]
    public async Task CancelEWayBillAsync_MapsWrapperToGstZenCancelPayload()
    {
        var handler = new StubHttpMessageHandler(_ => JsonResponse("""
        {
          "status": 1,
          "message": "EWB Cancelled",
          "cancelDate": "12/12/2023 04:25:00 PM",
          "ewayBillNo": 141010282832
        }
        """));
        var service = CreateService(handler);

        var result = await service.CancelEWayBillAsync(
            new CancelEWayBillRequest(1, "141010282832", "2", "Cancelled the order"),
            CancellationToken.None);

        Assert.Equal("141010282832", result.EWayBillNumber);
        Assert.NotNull(result.CancelledAt);
        Assert.Equal("""{"ewbNo":141010282832,"cancelRsnCode":2,"cancelRmrk":"Cancelled the order"}""", handler.LastRequestBody);
    }

    [Fact]
    public async Task GenerateEInvoiceAsync_ThrowsWhenGstZenReturnsStatusZero()
    {
        var handler = new StubHttpMessageHandler(_ => JsonResponse("""
        {
          "status": 0,
          "message": "The requested GSTIN is not present in your GSTZen account."
        }
        """));
        var service = CreateService(handler);

        var exception = await Assert.ThrowsAsync<CosmosException>(() =>
            service.GenerateEInvoiceAsync(
                new GenerateEInvoiceRequest(1, 10, "INV", "23-24/DEM/54", new DateTime(2023, 3, 22), "29AADCG4992P1ZP", "06AAMCS8709B1ZA", SampleEInvoiceJson),
                CancellationToken.None));

        Assert.Contains("GSTZen E-Invoice Generate failed", exception.Message);
    }

    private static GstZenProviderService CreateService(HttpMessageHandler handler)
    {
        var client = new HttpClient(handler);
        var logService = new Mock<IGstApiLogService>();
        logService
            .Setup(x => x.AddAsync(It.IsAny<AddGstApiLogRequest>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        return new GstZenProviderService(
            client,
            Options.Create(new GstZenOptions
            {
                Environment = "Sandbox",
                SandboxBaseUrl = "https://my.gstzen.in",
                SandboxToken = "test-token",
                SandboxGstnAccessToken = "session-test-token",
                TokenHeaderName = "Token",
                GstinVerificationPath = "/api/gstin-validator/",
                EInvoiceGeneratePath = "/~gstzen/a/post-einvoice-data/einvoice-json/",
                EWayBillCancelPath = "/~gstzen/a/ewbapi/cancel/"
            }),
            logService.Object,
            NullLogger<GstZenProviderService>.Instance);
    }

    private static HttpResponseMessage JsonResponse(string json) =>
        new(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

    private const string SampleEInvoiceJson = """
    {
      "Version": "1.1",
      "TranDtls": { "TaxSch": "GST", "SupTyp": "B2B", "RegRev": "N", "IgstOnIntra": "N" },
      "DocDtls": { "Typ": "INV", "No": "23-24/DEM/54", "Dt": "22/03/2023" },
      "SellerDtls": { "Gstin": "29AADCG4992P1ZP", "LglNm": "GSTZEN DEMO PRIVATE LIMITED", "Addr1": "Manyata Tech Park", "Loc": "BANGALORE", "Pin": 560077, "Stcd": "29" },
      "BuyerDtls": { "Gstin": "06AAMCS8709B1ZA", "LglNm": "Quality Products Private Limited", "Pos": "06", "Addr1": "133, Mahatma Gandhi Road", "Loc": "HARYANA", "Pin": 121009, "Stcd": "06" },
      "ItemList": [{ "SlNo": "1", "IsServc": "N", "HsnCd": "3205", "Qty": 25, "Unit": "PCS", "AssAmt": 5000, "GstRt": 18, "IgstAmt": 900, "TotItemVal": 5900 }],
      "ValDtls": { "AssVal": 5000, "CgstVal": 0, "SgstVal": 0, "IgstVal": 900, "TotInvVal": 5900 }
    }
    """;

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responseFactory;

        public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responseFactory) => _responseFactory = responseFactory;

        public HttpRequestMessage? LastRequest { get; private set; }
        public string? LastRequestBody { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            LastRequestBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return _responseFactory(request);
        }
    }
}
