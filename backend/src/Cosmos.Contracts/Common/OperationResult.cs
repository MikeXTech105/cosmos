namespace Cosmos.Contracts.Common;

public sealed record OperationResult(int StatusCode, string Message)
{
    public bool Succeeded => StatusCode is >= 200 and <= 299;
}
