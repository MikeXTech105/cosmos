using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;

// This executable deliberately never reads appsettings, production secrets, or a company catalog.
var configured = Environment.GetEnvironmentVariable("COSMOS_PRODUCTION_INTEGRATION_CONNECTION_STRING");
if (string.IsNullOrWhiteSpace(configured))
{
    Console.Error.WriteLine("SQL verification not run: configure COSMOS_PRODUCTION_INTEGRATION_CONNECTION_STRING with an explicitly disposable CosmosProductionIntegrationTests_* catalog.");
    return 2;
}
var target = new SqlConnectionStringBuilder(configured);
if (!Regex.IsMatch(target.InitialCatalog, @"\ACosmosProductionIntegrationTests_[A-Za-z0-9_]+\z", RegexOptions.CultureInvariant))
    throw new InvalidOperationException("Refusing a catalog outside the production integration-test guard.");
var directory = new DirectoryInfo(AppContext.BaseDirectory);
while (directory is not null && !File.Exists(Path.Combine(directory.FullName,"backend","Cosmos.slnx"))) directory=directory.Parent;
var root = directory?.FullName ?? throw new InvalidOperationException("Repository root was not found.");
var database = target.InitialCatalog;
var master = new SqlConnectionStringBuilder(configured) { InitialCatalog="master" };
await using (var connection=new SqlConnection(master.ConnectionString))
{
    await connection.OpenAsync();
    await using var check=connection.CreateCommand();check.CommandText="SELECT COUNT(*) FROM sys.databases WHERE name=@name";check.Parameters.AddWithValue("@name",database);
    if (Convert.ToInt32(await check.ExecuteScalarAsync())!=0 && !args.Contains("--reuse-test-catalog"))
        throw new InvalidOperationException("Test catalog already exists. Inspect it first; use --reuse-test-catalog deliberately to reuse it.");
    if (Convert.ToInt32(await check.ExecuteScalarAsync())==0)
    {
        await using var create=connection.CreateCommand();create.CommandText=$"CREATE DATABASE [{database}]";await create.ExecuteNonQueryAsync();
    }
}
var scripts=new[] {Path.Combine(root,"backend","database","001_Full_Database_Setup.sql")}
    .Concat(Directory.GetFiles(Path.Combine(root,"backend","database","migrations"),"*.sql")
        .Where(path=>Path.GetFileName(path).StartsWith("20261027_",StringComparison.Ordinal) || !Regex.IsMatch(Path.GetFileName(path),"smoke|verification|rollback|cleanup|test",RegexOptions.IgnoreCase)).OrderBy(Path.GetFileName,StringComparer.Ordinal)).ToArray();
await using var testConnection=new SqlConnection(target.ConnectionString);
await testConnection.OpenAsync();
foreach(var script in scripts)
{
    var source=await File.ReadAllTextAsync(script);
    if(Regex.IsMatch(source,@"(?im)^\s*(USE\s+|(?:CREATE|ALTER|DROP)\s+DATABASE\s+)|\b(?:OPENROWSET|OPENDATASOURCE|xp_cmdshell)\b"))
        throw new InvalidOperationException($"Manual review required for database/server control in {Path.GetFileName(script)}.");
    var batches=Regex.Split(source,@"(?im)^\s*GO\s*(?:--[^\r\n]*)?\r?$");
    for(var index=0;index<batches.Length;index++)
    {
        if(string.IsNullOrWhiteSpace(batches[index]))continue;
        await Guard();
        await using var command=testConnection.CreateCommand();command.CommandTimeout=180;command.CommandText=batches[index];
        try { await command.ExecuteNonQueryAsync(); }
        catch(SqlException e) {throw new InvalidOperationException($"{Path.GetFileName(script)} batch {index+1} failed with SQL {e.Number}: {e.Message}",e);}
        await Guard();
    }
    Console.WriteLine($"Applied {Path.GetFileName(script)} to guarded test catalog.");
}
// Exercise repeatability separately from the initial schema bootstrap.
foreach(var script in scripts.Where(x=>Path.GetFileName(x).StartsWith("20261027_",StringComparison.Ordinal)))
foreach(var batch in Regex.Split(await File.ReadAllTextAsync(script),@"(?im)^\s*GO\s*(?:--[^\r\n]*)?\r?$"))
{
    if(string.IsNullOrWhiteSpace(batch))continue;await Guard();
    await using var command=testConnection.CreateCommand();command.CommandTimeout=180;command.CommandText=batch;await command.ExecuteNonQueryAsync();await Guard();
}
Console.WriteLine("Migration bootstrap and repeatability passed. Run Cosmos.Tests with Category=SqlIntegration and this explicit test connection. No company catalog was used.");
return 0;

async Task Guard()
{
    await using var command=testConnection.CreateCommand();command.CommandText="SELECT DB_NAME()";
    if(!string.Equals(Convert.ToString(await command.ExecuteScalarAsync()),database,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Catalog context changed; verification stopped.");
}
