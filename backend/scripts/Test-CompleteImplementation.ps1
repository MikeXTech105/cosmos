param(
    [switch]$UseLocalDb,
    [switch]$SkipFrontend,
    [string]$DotnetPath,
    [ValidateSet('Fresh','Upgrade','Both')][string]$Mode = 'Both'
)

# Explicitly disposable catalogs only. No appsettings, reset, or API startup.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$taskOutput = Join-Path $taskRoot ('output/implementation-verification/operator-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $taskOutput -Force | Out-Null
$taskResults = [System.Collections.Generic.List[object]]::new()
$taskCatalogs = [System.Collections.Generic.List[object]]::new()
$taskOriginal = @{}
$taskOwnedInstance = $null
$taskSuites = @(
    @{ Name='Production'; Variable='COSMOS_PRODUCTION_INTEGRATION_CONNECTION_STRING'; Prefix='CosmosProductionIntegrationTests_' },
    @{ Name='SalesGst'; Variable='COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING'; Prefix='CosmosSalesGstIntegrationTests_' },
    @{ Name='Dispatch'; Variable='COSMOS_DISPATCH_INTEGRATION_CONNECTION_STRING'; Prefix='CosmosDispatchIntegrationTests_' },
    @{ Name='Hr'; Variable='COSMOS_HR_INTEGRATION_CONNECTION_STRING'; Prefix='CosmosHrIntegrationTests_' }
)
$taskExit = 0
function Invoke-Recorded([string]$Name, [string]$Executable, [string[]]$Arguments, [string]$WorkingDirectory = $taskRoot) {
    $taskLog = Join-Path $taskOutput ($Name + '.log')
    $taskStarted = [DateTimeOffset]::UtcNow
    Push-Location -LiteralPath $WorkingDirectory
    try { & $Executable @Arguments *> $taskLog; $taskCode = $LASTEXITCODE } finally { Pop-Location }
    $taskResults.Add([ordered]@{name=$Name;executable=$Executable;arguments=$Arguments;startedAt=$taskStarted;finishedAt=[DateTimeOffset]::UtcNow;exitCode=$taskCode;log=$taskLog})
    if ($taskCode -ne 0) { throw "$Name failed (exit $taskCode). Review $taskLog" }
    Write-Output "$Name passed. Log: $taskLog"
}
try {
    if (-not $DotnetPath) {
        $taskSdkCandidates = @((Join-Path $env:TEMP 'cosmos-dotnet/dotnet.exe'))
        $taskDotnet = Get-Command dotnet -ErrorAction SilentlyContinue
        if ($taskDotnet) { $taskSdkCandidates += $taskDotnet.Source }
        foreach ($taskCandidate in $taskSdkCandidates) {
            if ((Test-Path -LiteralPath $taskCandidate) -and ((& $taskCandidate --list-sdks) -match '^10\.')) { $DotnetPath=$taskCandidate; break }
        }
    }
    if (-not $DotnetPath -or -not ((& $DotnetPath --list-sdks) -match '^10\.')) { throw 'Install .NET 10 SDK or pass -DotnetPath to its executable.' }
    Invoke-Recorded 'restore' $DotnetPath @('restore','backend/Cosmos.slnx')
    Invoke-Recorded 'build' $DotnetPath @('build','backend/Cosmos.slnx','--no-restore')
    Invoke-Recorded 'sql-runner-build' $DotnetPath @('build','backend/tests/Cosmos.SqlVerification/Cosmos.SqlVerification.csproj')
    Invoke-Recorded 'backend-unit' $DotnetPath @('test','backend/tests/Cosmos.Tests/Cosmos.Tests.csproj','--no-build','--filter','Category!=SqlIntegration','--logger','trx;LogFileName=unit.trx','--results-directory',$taskOutput)
    if (-not $SkipFrontend) {
        $taskNpm = (Get-Command npm.cmd -ErrorAction Stop).Source
        Invoke-Recorded 'frontend-test' $taskNpm @('test') (Join-Path $taskRoot 'frontend')
        Invoke-Recorded 'frontend-lint' $taskNpm @('run','lint') (Join-Path $taskRoot 'frontend')
        Invoke-Recorded 'frontend-build' $taskNpm @('run','build') (Join-Path $taskRoot 'frontend')
    }
    foreach ($taskSuite in $taskSuites) { $taskOriginal[$taskSuite.Variable] = [Environment]::GetEnvironmentVariable($taskSuite.Variable, 'Process') }
    if ($UseLocalDb) {
        $taskLocalDb = Get-Command SqlLocalDB.exe -ErrorAction SilentlyContinue
        if (-not $taskLocalDb) {
            foreach ($taskVersion in @('170','160','150')) {
                $taskCandidate = Join-Path $env:ProgramFiles "Microsoft SQL Server/$taskVersion/Tools/Binn/SqlLocalDB.exe"
                if (Test-Path -LiteralPath $taskCandidate) { $taskLocalDb = Get-Item -LiteralPath $taskCandidate; break }
            }
        }
        if (-not $taskLocalDb) { $taskExit=2; throw 'SQL not run: install Microsoft SQL Server LocalDB, then rerun -UseLocalDb.' }
        $taskLocalDbPath = if ($taskLocalDb -is [System.IO.FileInfo]) { $taskLocalDb.FullName } else { $taskLocalDb.Source }
        $taskSuffix = (Get-Date -Format 'yyyyMMddHHmmss') + '_' + [Guid]::NewGuid().ToString('N').Substring(0,8)
        $taskOwnedInstance = "CosmosCompleteVerify_$taskSuffix"
        & $taskLocalDbPath create $taskOwnedInstance | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Private LocalDB creation failed.' }
        & $taskLocalDbPath start $taskOwnedInstance | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Private LocalDB start failed.' }
    } elseif ($Mode -eq 'Both') {
        $taskExit=2
        throw 'Use -UseLocalDb for automatic fresh+upgrade catalogs, or run -Mode Fresh and -Mode Upgrade separately with distinct private test connections.'
    }
    $taskModes = if ($Mode -eq 'Both') { @('Fresh','Upgrade') } else { @($Mode) }
    foreach ($taskMode in $taskModes) {
        foreach ($taskSuite in $taskSuites) {
            if ($UseLocalDb) {
                $taskCatalog = $taskSuite.Prefix + $taskMode + '_' + $taskSuffix
                $taskCatalogs.Add(@{suite=$taskSuite.Name;mode=$taskMode;catalog=$taskCatalog})
                [Environment]::SetEnvironmentVariable($taskSuite.Variable,"Server=(localdb)\$taskOwnedInstance;Database=$taskCatalog;Integrated Security=true;Encrypt=true;TrustServerCertificate=true;Connect Timeout=30",'Process')
            } elseif ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($taskSuite.Variable,'Process'))) {
                $taskExit=2; throw "SQL not run: privately configure $($taskSuite.Variable) for $($taskSuite.Prefix)*. Do not paste credentials into chat."
            }
            Invoke-Recorded ($taskSuite.Name + '-' + $taskMode + '-schema') $DotnetPath @('run','--no-build','--project','backend/tests/Cosmos.SqlVerification/Cosmos.SqlVerification.csproj','--','--suite',$taskSuite.Name,'--mode',$taskMode)
        }
        Invoke-Recorded ('sql-' + $taskMode) $DotnetPath @('test','backend/tests/Cosmos.Tests/Cosmos.Tests.csproj','--no-build','--filter','Category=SqlIntegration','--logger',"trx;LogFileName=sql-$taskMode.trx",'--results-directory',$taskOutput)
        [xml]$taskTrx = Get-Content -Raw -LiteralPath (Join-Path $taskOutput "sql-$taskMode.trx")
        $taskCounters = $taskTrx.SelectSingleNode("//*[local-name()='ResultSummary']/*[local-name()='Counters']")
        if (-not $taskCounters -or [int]$taskCounters.executed -eq 0 -or [int]$taskCounters.notExecuted -gt 0) { throw 'Required SQL gate executed no tests or skipped tests. Review TRX; this is not a pass.' }
    }
} catch {
    if ($taskExit -eq 0) { $taskExit=1 }
    Write-Output $_.Exception.Message
} finally {
    foreach ($taskVariable in $taskOriginal.Keys) { [Environment]::SetEnvironmentVariable($taskVariable,$taskOriginal[$taskVariable],'Process') }
    if ($taskOwnedInstance) {
        & $taskLocalDbPath stop $taskOwnedInstance | Out-Null
        Write-Output "Private LocalDB instance retained for inspection: $taskOwnedInstance. No catalog was deleted."
    }
    [ordered]@{preparedAt=[DateTimeOffset]::UtcNow;commit=(& git -C $taskRoot rev-parse HEAD);mode=$Mode;exitCode=$taskExit;privateLocalDbInstance=$taskOwnedInstance;testCatalogs=$taskCatalogs;results=$taskResults;sqlProvider='No GST provider documents are issued by this script'} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $taskOutput 'results.json') -Encoding utf8
    Write-Output "Verification results: $taskOutput"
}
exit $taskExit
