namespace Cosmos.Tests.Database;

public sealed class RojmelMyWalletSqlContractTests
{
    [Fact]
    public void Verification_script_checks_the_normal_user_permission_and_wallet_invariants()
    {
        var script = ReadBackendFile("database", "verify_rojmel_my_wallet_403.sql");

        Assert.Contains("DECLARE @UserId INT = 2", script, StringComparison.Ordinal);
        Assert.Contains("Rojmel.MyWallet", script, StringComparison.Ordinal);
        Assert.Contains("Rojmel.Transactions", script, StringComparison.Ordinal);
        Assert.Contains("UX_Wallets_OnePrimaryUserWallet", script, StringComparison.Ordinal);
        Assert.Contains("usp_Wallet_GetMyWallet", script, StringComparison.Ordinal);
        Assert.Contains("WalletType = 2", script, StringComparison.Ordinal);
        Assert.Contains("HAVING COUNT_BIG(*) > 1", script, StringComparison.Ordinal);
    }

    private static string ReadBackendFile(params string[] segments)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            var candidate = Path.Combine([directory.FullName, .. segments]);
            if (File.Exists(candidate)) return File.ReadAllText(candidate);
            directory = directory.Parent;
        }

        throw new FileNotFoundException($"Could not locate backend file: {string.Join('/', segments)}");
    }
}
