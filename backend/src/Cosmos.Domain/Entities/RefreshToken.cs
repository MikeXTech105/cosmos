namespace Cosmos.Domain.Entities;

public sealed class RefreshToken
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiryDate { get; set; }
    public bool IsRevoked { get; set; }
    public DateTime CreatedOn { get; set; }
}
