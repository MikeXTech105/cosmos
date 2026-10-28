# Builds a reference-only frontend handoff from explicitly whitelisted repository files.
# It never reads appsettings, environment files, credentials, a database or the network.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'

$packageDirectory = [System.IO.Path]::GetFullPath($PSScriptRoot)
$repositoryDirectory = [System.IO.Path]::GetFullPath((Join-Path $packageDirectory '..\..'))
if (-not (Test-Path -LiteralPath (Join-Path $repositoryDirectory 'frontend/package.json'))) {
    throw 'Run this script from its original handoff/frontend-production folder in the current Cosmos repository.'
}

$stageDirectory = [System.IO.Path]::GetFullPath((Join-Path ([System.IO.Path]::GetTempPath()) ('cosmos-frontend-handoff-' + [Guid]::NewGuid().ToString('N'))))
New-Item -ItemType Directory -Path $stageDirectory | Out-Null
$fileRecords = [System.Collections.Generic.List[object]]::new()

function Add-ReferenceFile {
    param([Parameter(Mandatory)][string]$RepositoryPath, [string]$ArchivePath = $RepositoryPath)
    $sourcePath = [System.IO.Path]::GetFullPath((Join-Path $repositoryDirectory $RepositoryPath))
    $destinationPath = [System.IO.Path]::GetFullPath((Join-Path $stageDirectory $ArchivePath))
    $comparison = [System.StringComparison]::OrdinalIgnoreCase
    if (-not $sourcePath.StartsWith($repositoryDirectory + [System.IO.Path]::DirectorySeparatorChar, $comparison)) { throw 'Source path escaped the repository.' }
    if (-not $destinationPath.StartsWith($stageDirectory + [System.IO.Path]::DirectorySeparatorChar, $comparison)) { throw 'Archive path escaped the new staging directory.' }
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) { throw "Required reference is missing: $RepositoryPath" }
    $parentDirectory = Split-Path -Parent $destinationPath
    New-Item -ItemType Directory -Path $parentDirectory -Force | Out-Null
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
    $fileRecords.Add([ordered]@{
        path = $ArchivePath.Replace('\','/')
        bytes = (Get-Item -LiteralPath $sourcePath).Length
        sha256 = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLowerInvariant()
    })
}

Add-ReferenceFile 'handoff/frontend-production/PROMPT_2_FRONTEND_IMPLEMENTATION.txt' 'PROMPT_2_FRONTEND_IMPLEMENTATION.txt'
Add-ReferenceFile 'handoff/frontend-production/START_HERE.txt' 'START_HERE.txt'
Add-ReferenceFile 'handoff/frontend-production/FRONTEND_ACCEPTANCE_CHECKLIST.md' 'FRONTEND_ACCEPTANCE_CHECKLIST.md'

$documentPaths = @(
    'backend/docs/PRODUCTION_API_CONTRACT.md',
    'backend/docs/PRODUCTION_WORKSPACE_HANDOFF.md',
    'backend/docs/PRODUCTION_COVERAGE_MATRIX.md',
    'backend/docs/PRODUCTION_SOURCE_AUDIT.json',
    'backend/docs/PRODUCTION_MIGRATION_CUTOVER.md',
    'backend/docs/PRODUCTION_VERIFICATION_RESULTS.json',
    'backend/docs/PRODUCTION_CHANGED_FILES.json'
)
foreach ($documentPath in $documentPaths) { Add-ReferenceFile $documentPath }

$contractDirectory = Join-Path $repositoryDirectory 'backend/docs/production-contracts'
$contractFiles = @(Get-ChildItem -LiteralPath $contractDirectory -File -Filter '*.json' | Sort-Object Name)
if ($contractFiles.Count -ne 7) { throw 'Expected six actual module OpenAPI documents and the implemented-route inventory; inspect the current contract directory.' }
foreach ($contractFile in $contractFiles) {
    Add-ReferenceFile ('backend/docs/production-contracts/' + $contractFile.Name)
    Get-Content -LiteralPath $contractFile.FullName -Raw | ConvertFrom-Json | Out-Null
}

$dtoDirectory = Join-Path $repositoryDirectory 'backend/src/Cosmos.Contracts/Manufacturing'
foreach ($dtoFile in (Get-ChildItem -LiteralPath $dtoDirectory -File -Filter '*.cs' | Sort-Object Name)) {
    Add-ReferenceFile ('backend/src/Cosmos.Contracts/Manufacturing/' + $dtoFile.Name)
}
foreach ($sourcePath in @(
    'backend/src/Cosmos.Contracts/ProcurementPlanning/ProcurementPlanningDtos.cs',
    'backend/src/Cosmos.Domain/Manufacturing/ManufacturingEnums.cs',
    'backend/src/Cosmos.Domain/Manufacturing/ProductionOrderStatus.cs',
    'backend/src/Cosmos.Domain/Security/ManufacturingPermissions.cs',
    'backend/src/Cosmos.Domain/Security/PermissionAction.cs',
    'frontend/package.json'
)) { Add-ReferenceFile $sourcePath }

$prompt = Get-Content -LiteralPath (Join-Path $stageDirectory 'PROMPT_2_FRONTEND_IMPLEMENTATION.txt') -Raw
$missingRequirements = [System.Collections.Generic.List[string]]::new()
foreach ($family in @(@{ Prefix='T'; Count=22 }, @{ Prefix='F'; Count=24 }, @{ Prefix='U'; Count=6 }, @{ Prefix='C'; Count=16 })) {
    for ($number=1; $number -le $family['Count']; $number++) {
        $id = $family['Prefix'] + $number.ToString('00')
        if (-not [regex]::IsMatch($prompt, ('\b' + $id + '(?:\.|\s)'))) { $missingRequirements.Add($id) }
    }
}
if ($missingRequirements.Count -gt 0) { throw ('Prompt is missing shared requirement IDs: ' + ($missingRequirements -join ', ')) }
if (-not $prompt.Contains('COSMOS COMPLETE PRODUCTION, MATERIAL PLANNING AND DISPATCH SPECIFICATION')) { throw 'The full shared specification is missing.' }

$sourceAudit = Get-Content -LiteralPath (Join-Path $repositoryDirectory 'backend/docs/PRODUCTION_SOURCE_AUDIT.json') -Raw | ConvertFrom-Json
$routes = @(Get-Content -LiteralPath (Join-Path $contractDirectory 'implemented-routes.json') -Raw | ConvertFrom-Json)
$recordedResults = Get-Content -LiteralPath (Join-Path $repositoryDirectory 'backend/docs/PRODUCTION_VERIFICATION_RESULTS.json') -Raw | ConvertFrom-Json
if (@($sourceAudit.sheets).Count -ne 22) { throw 'Source audit does not enumerate all22 tabs.' }
$sourceCommit = (& git -C $repositoryDirectory rev-parse HEAD).Trim()
$sourceBranch = (& git -C $repositoryDirectory rev-parse --abbrev-ref HEAD).Trim()
$manifest = [ordered]@{
    package = 'Cosmos frontend implementation prompt and reference handoff'
    createdAtUtc = [DateTime]::UtcNow.ToString('o')
    sourceRepositoryCommit = $sourceCommit
    sourceRepositoryBranch = $sourceBranch
    referenceOnly = $true
    applicationSourceAndRuntimeStillRequired = $true
    credentialsIncluded = $false
    promptCharacters = $prompt.Length
    embeddedSharedRequirementIds = 68
    sourceTabs = @($sourceAudit.sheets).Count
    implementedRouteOperations = $routes.Count
    moduleOpenApiFiles = @($contractFiles | Where-Object Name -Like '*.openapi.json').Count
    baselineResultsAreRecordedNotRerunByPackaging = $true
    recordedVerification = $recordedResults
    files = $fileRecords.ToArray()
}
$manifestText = $manifest | ConvertTo-Json -Depth 14
$utf8 = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText((Join-Path $stageDirectory 'PACKAGE_MANIFEST.json'), $manifestText, $utf8)
[System.IO.File]::WriteAllText((Join-Path $packageDirectory 'PACKAGE_MANIFEST.json'), $manifestText, $utf8)

$archivePath = Join-Path $packageDirectory 'COSMOS_FRONTEND_HANDOFF.zip'
Compress-Archive -Path (Join-Path $stageDirectory '*') -DestinationPath $archivePath -CompressionLevel Optimal -Force

# Verify exact file set and each archived byte hash without extracting or deleting anything.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
    $archiveFiles = @($archive.Entries | Where-Object { -not [string]::IsNullOrEmpty($_.Name) })
    if ($archiveFiles.Count -ne $fileRecords.Count + 1) { throw 'Archive file count differs from the whitelisted manifest.' }
    foreach ($record in $fileRecords) {
        $entry = $archive.GetEntry($record.path)
        if ($null -eq $entry) { throw ('Required archive entry is missing: ' + $record.path) }
        $stream = $entry.Open()
        $hasher = [System.Security.Cryptography.SHA256]::Create()
        try { $actualHash = [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-','').ToLowerInvariant() }
        finally { $hasher.Dispose(); $stream.Dispose() }
        if ($actualHash -ne $record.sha256) { throw ('Archive bytes failed SHA-256 verification: ' + $record.path) }
        if ($entry.Length -ne $record.bytes) { throw ('Archive byte length changed: ' + $record.path) }
    }
    if ($null -eq $archive.GetEntry('PACKAGE_MANIFEST.json')) { throw 'Archive content manifest is missing.' }
}
finally { $archive.Dispose() }

[ordered]@{
    archive = $archivePath
    bytes = (Get-Item -LiteralPath $archivePath).Length
    archiveSha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    verifiedFiles = $fileRecords.Count + 1
    promptCharacters = $prompt.Length
    requirementIds = 68
    sourceTabs = $manifest.sourceTabs
    moduleOpenApiFiles = $manifest.moduleOpenApiFiles
    implementedRouteOperations = $manifest.implementedRouteOperations
    contentHashesVerified = $true
} | ConvertTo-Json
