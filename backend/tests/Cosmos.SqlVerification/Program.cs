using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;

// Never reads appsettings, starts the API, resets a database, or opens a company catalog.
var suite = Argument("--suite") ?? "Production";
var mode = Argument("--mode") ?? "Fresh";
var suites = new Dictionary<string, (string Variable, string Prefix)>(StringComparer.OrdinalIgnoreCase)
{
    ["Production"] = ("COSMOS_PRODUCTION_INTEGRATION_CONNECTION_STRING", "CosmosProductionIntegrationTests_"),
    ["SalesGst"] = ("COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING", "CosmosSalesGstIntegrationTests_"),
    ["Dispatch"] = ("COSMOS_DISPATCH_INTEGRATION_CONNECTION_STRING", "CosmosDispatchIntegrationTests_"),
    ["Hr"] = ("COSMOS_HR_INTEGRATION_CONNECTION_STRING", "CosmosHrIntegrationTests_")
};
if (!suites.TryGetValue(suite, out var settings) || (mode != "Fresh" && mode != "Upgrade"))
    throw new ArgumentException("Use --suite Production|SalesGst|Dispatch|Hr and --mode Fresh|Upgrade.");
var configured = Environment.GetEnvironmentVariable(settings.Variable);
if (string.IsNullOrWhiteSpace(configured))
{
    Console.Error.WriteLine($"SQL verification not run: privately configure {settings.Variable} for {settings.Prefix}*.");
    return 2;
}
var target = new SqlConnectionStringBuilder(configured);
if (!Regex.IsMatch(target.InitialCatalog, @"\A" + Regex.Escape(settings.Prefix) + @"[A-Za-z0-9_]+\z", RegexOptions.CultureInvariant))
    throw new InvalidOperationException("Refusing a catalog outside the selected integration-test guard.");
var directory = new DirectoryInfo(AppContext.BaseDirectory);
while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "backend", "Cosmos.slnx"))) directory = directory.Parent;
var root = directory?.FullName ?? throw new InvalidOperationException("Repository root was not found.");
var database = target.InitialCatalog;
var master = new SqlConnectionStringBuilder(configured) { InitialCatalog = "master" };
await using (var connection = new SqlConnection(master.ConnectionString))
{
    await connection.OpenAsync();
    await using var check = connection.CreateCommand();
    check.CommandText = "SELECT COUNT(*) FROM sys.databases WHERE name=@name";
    check.Parameters.AddWithValue("@name", database);
    var exists = Convert.ToInt32(await check.ExecuteScalarAsync()) != 0;
    if (exists && !args.Contains("--reuse-test-catalog"))
        throw new InvalidOperationException("Test catalog already exists. Inspect it first; deliberate reuse requires --reuse-test-catalog.");
    if (!exists)
    {
        await using var create = connection.CreateCommand();
        create.CommandText = $"CREATE DATABASE [{database}]";
        await create.ExecuteNonQueryAsync();
    }
}
var scripts = new[] { Path.Combine(root, "backend", "database", "001_Full_Database_Setup.sql"), Path.Combine(root, "backend", "database", "003_gst_integration_module.sql") }
    .Concat(Directory.GetFiles(Path.Combine(root, "backend", "database", "migrations"), "*.sql")
        .Where(path => Path.GetFileName(path).StartsWith("20261027_", StringComparison.Ordinal) || !Regex.IsMatch(Path.GetFileName(path), "smoke|verification|rollback|cleanup|test", RegexOptions.IgnoreCase))
        .OrderBy(Path.GetFileName, StringComparer.Ordinal)).ToArray();
var newMigrations = scripts.Where(IsNewMigration).ToArray();
if (newMigrations.Length == 0) throw new InvalidOperationException("No implementation migrations were found; refusing a vacuous upgrade gate.");
await using var testConnection = new SqlConnection(target.ConnectionString);
await testConnection.OpenAsync();
foreach (var script in scripts.Where(path => mode != "Upgrade" || !IsNewMigration(path))) await Apply(script);

string? sentinel = null;
if (mode == "Upgrade")
{
    // A populated predecessor fixture, not a full company backup or client acceptance.
    sentinel = "UPG_" + Guid.NewGuid().ToString("N")[..16];
    await Guard();
    await using var seed = testConnection.CreateCommand();
    seed.CommandText = """
        SET XACT_ABORT ON;BEGIN TRAN;
        INSERT dbo.Units(Name,ShortName) VALUES(@tag,@tag);DECLARE @unit BIGINT=SCOPE_IDENTITY();
        INSERT dbo.Categories(Name) VALUES(@tag);DECLARE @category BIGINT=SCOPE_IDENTITY();
        INSERT dbo.Items(Name,ItemCode,CategoryId,UnitId,ItemType,CurrentStock,OpeningStock,TrackInventory)
        VALUES(@tag,@tag,@category,@unit,1,12.345678,12.345678,1);DECLARE @item BIGINT=SCOPE_IDENTITY();
        INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity)
        VALUES(@item,N'IntegrationUpgrade',@item,1,12.345678);
        COMMIT;
        """;
    seed.Parameters.AddWithValue("@tag", sentinel);
    await seed.ExecuteNonQueryAsync();
    foreach (var script in newMigrations) await Apply(script);
    await VerifySentinel();
}
// Repeat NEW migrations as well as the 20261027 baseline migrations.
foreach (var script in scripts.Where(path => IsNewMigration(path) || Path.GetFileName(path).StartsWith("20261027_", StringComparison.Ordinal))) await Apply(script);
if (sentinel is not null) await VerifySentinel();
if (suite.Equals("Dispatch", StringComparison.OrdinalIgnoreCase))
{
    await Apply(Path.Combine(root, "backend", "database", "dispatch_existing_policy_integration_tests.sql"));
    Console.WriteLine("Guarded Dispatch policy fixtures and SQL assertions executed.");
}
Console.WriteLine($"{suite} {mode} bootstrap/upgrade and migration repeatability passed. Catalog retained; run Category=SqlIntegration separately. No company catalog was used.");
return 0;

string? Argument(string name) { var index = Array.IndexOf(args, name); return index >= 0 && index + 1 < args.Length ? args[index + 1] : null; }
bool IsNewMigration(string path) => Path.GetFileName(path).StartsWith("20261028_", StringComparison.Ordinal);
async Task Apply(string script)
{
    var source = await File.ReadAllTextAsync(script);
    if (Regex.IsMatch(source, @"(?im)^\s*(USE\s+|(?:CREATE|ALTER|DROP)\s+DATABASE\s+)|\b(?:OPENROWSET|OPENDATASOURCE|xp_cmdshell)\b"))
        throw new InvalidOperationException($"Manual review required for database/server control in {Path.GetFileName(script)}.");
    var batches = Regex.Split(source, @"(?im)^\s*GO\s*(?:--[^\r\n]*)?\r?$");
    for (var index = 0; index < batches.Length; index++)
    {
        if (string.IsNullOrWhiteSpace(batches[index])) continue;
        await Guard();
        await using var command = testConnection.CreateCommand(); command.CommandTimeout = 180; command.CommandText = batches[index];
        try { await command.ExecuteNonQueryAsync(); }
        catch (SqlException failure) { throw new InvalidOperationException($"{Path.GetFileName(script)} batch {index + 1} failed with SQL {failure.Number}: {failure.Message}", failure); }
        await Guard();
    }
    Console.WriteLine($"Applied {Path.GetFileName(script)} to guarded {suite} test catalog.");
}
async Task Guard()
{
    await using var command = testConnection.CreateCommand(); command.CommandText = "SELECT DB_NAME()";
    if (!string.Equals(Convert.ToString(await command.ExecuteScalarAsync()), database, StringComparison.OrdinalIgnoreCase))
        throw new InvalidOperationException("Catalog context changed; verification stopped.");
}
async Task VerifySentinel()
{
    await Guard();
    await using var command = testConnection.CreateCommand();
    command.CommandText = """
        SELECT COUNT(*) FROM dbo.Items i JOIN dbo.Units u ON u.Id=i.UnitId JOIN dbo.Categories c ON c.Id=i.CategoryId
        JOIN dbo.StockMovements m ON m.ItemId=i.Id AND m.SourceType=N'IntegrationUpgrade' AND m.SourceId=i.Id
        WHERE i.ItemCode=@tag AND i.Name=@tag AND u.Name=@tag AND c.Name=@tag
          AND i.CurrentStock=12.345678 AND i.OpeningStock=12.345678 AND m.Quantity=12.345678;
        """;
    command.Parameters.AddWithValue("@tag", sentinel!);
    if (Convert.ToInt32(await command.ExecuteScalarAsync()) != 1) throw new InvalidOperationException("Upgrade changed the linked exact-quantity master/history sentinel.");
    Console.WriteLine("Populated predecessor fixture: linked masters, exact quantities and stock history retained.");
}
