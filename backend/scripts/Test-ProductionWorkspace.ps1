param([switch]$ReuseTestCatalog)

# Uses only an explicit disposable connection or a private, newly-created LocalDB
# instance. Never reads appsettings, starts the application, or opens a company DB.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$originalConnection = $env:COSMOS_PRODUCTION_INTEGRATION_CONNECTION_STRING
$ownedInstance = $null
$localDbExecutable = $null
try {
    if ([string]::IsNullOrWhiteSpace($originalConnection)) {
        $localDbCommand = Get-Command SqlLocalDB.exe -ErrorAction SilentlyContinue
        if ($localDbCommand) { $localDbExecutable = $localDbCommand.Source }
        foreach ($version in @('170', '160', '150')) {
            $candidate = Join-Path $env:ProgramFiles "Microsoft SQL Server/$version/Tools/Binn/SqlLocalDB.exe"
            if (-not $localDbExecutable -and (Test-Path -LiteralPath $candidate)) { $localDbExecutable = $candidate }
        }
        if (-not $localDbExecutable) {
            Write-Output 'SQL tests were not run: install Microsoft SQL Server LocalDB with the administrator, or privately configure COSMOS_PRODUCTION_INTEGRATION_CONNECTION_STRING for a CosmosProductionIntegrationTests_* catalog.'
            Write-Output 'No application connection was read and no database was opened.'
            exit 2
        }
    }
    $sdkCandidates = @((Join-Path $env:TEMP 'cosmos-dotnet/dotnet.exe'))
    $dotnetCommand = Get-Command dotnet -ErrorAction SilentlyContinue
    if ($dotnetCommand) { $sdkCandidates += $dotnetCommand.Source }
    $sdkExecutable = $null
    foreach ($candidate in $sdkCandidates) {
        if ((Test-Path -LiteralPath $candidate) -and ((& $candidate --list-sdks) -match '^10\.')) { $sdkExecutable = $candidate; break }
    }
    if (-not $sdkExecutable) { throw 'A .NET 10 SDK is required to run the existing SQL verification projects.' }
    if ($localDbExecutable) {
        $suffix = (Get-Date -Format 'yyyyMMdd_HHmmss') + '_' + [Guid]::NewGuid().ToString('N').Substring(0, 8)
        $ownedInstance = "CosmosProductionVerify_$suffix"
        & $localDbExecutable create $ownedInstance
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the private LocalDB verification instance.' }
        & $localDbExecutable start $ownedInstance
        if ($LASTEXITCODE -ne 0) { throw 'Could not start the private LocalDB verification instance.' }
        $env:COSMOS_PRODUCTION_INTEGRATION_CONNECTION_STRING = "Server=(localdb)\$ownedInstance;Database=CosmosProductionIntegrationTests_$suffix;Integrated Security=true;Encrypt=true;TrustServerCertificate=true;Connect Timeout=30"
    }
    $runnerArguments = @('run', '--project', (Join-Path $repositoryRoot 'backend/tests/Cosmos.SqlVerification/Cosmos.SqlVerification.csproj'))
    if ($ReuseTestCatalog) { $runnerArguments += @('--', '--reuse-test-catalog') }
    & $sdkExecutable @runnerArguments
    if ($LASTEXITCODE -ne 0) { throw 'Guarded migration/bootstrap verification failed. Review the retained test catalog before retrying.' }
    & $sdkExecutable test (Join-Path $repositoryRoot 'backend/tests/Cosmos.Tests/Cosmos.Tests.csproj') --filter 'FullyQualifiedName~ProductionSqlIntegrationTests'
    if ($LASTEXITCODE -ne 0) { throw 'Real production SQL integration tests failed.' }
} finally {
    $env:COSMOS_PRODUCTION_INTEGRATION_CONNECTION_STRING = $originalConnection
    if ($ownedInstance) {
        & $localDbExecutable stop $ownedInstance
        Write-Output "Private test instance retained for inspection: $ownedInstance. No database was dropped."
    }
}
