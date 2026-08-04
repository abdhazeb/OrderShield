param(
    [string]$Configuration = "Release",
    [string]$ApiProxyUrl = "http://127.0.0.1:5017",
    [string]$OutputRoot
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $PSCommandPath
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $repoRoot "artifacts/deploy"
}

$frontendProjectDir = Join-Path $repoRoot "ordershieldpro-web"
$apiProjectPath = Join-Path $repoRoot "src/OrderShieldPro.API/OrderShieldPro.API.csproj"

$frontendOutputDir = Join-Path $OutputRoot "frontend"
$apiOutputDir = Join-Path $OutputRoot "api"

if (Test-Path $OutputRoot) {
    Remove-Item $OutputRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $frontendOutputDir, $apiOutputDir | Out-Null

Write-Host "[1/3] Building Angular production bundle..."
Push-Location $frontendProjectDir
try {
    npx ng build --configuration production
}
finally {
    Pop-Location
}

$angularDistRoot = Join-Path $frontendProjectDir "dist/ordershieldpro-web"
$angularBrowserDistRoot = Join-Path $angularDistRoot "browser"

if (Test-Path $angularBrowserDistRoot) {
    $frontendDistDir = $angularBrowserDistRoot
}
elseif (Test-Path $angularDistRoot) {
    $frontendDistDir = $angularDistRoot
}
else {
    throw "Angular build output not found. Expected '$angularBrowserDistRoot' or '$angularDistRoot'."
}

Write-Host "[2/3] Preparing IIS frontend folder..."
Copy-Item -Path (Join-Path $frontendDistDir "*") -Destination $frontendOutputDir -Recurse -Force

$frontendWebConfigPath = Join-Path $frontendOutputDir "web.config"
if (Test-Path $frontendWebConfigPath) {
    $webConfig = Get-Content -Path $frontendWebConfigPath -Raw
    $webConfig = $webConfig.Replace("http://127.0.0.1:5017", $ApiProxyUrl)
    Set-Content -Path $frontendWebConfigPath -Value $webConfig -Encoding UTF8
}
else {
    Write-Warning "web.config was not found in frontend output. Ensure ordershieldpro-web/public/web.config exists."
}

Write-Host "[3/4] Publishing .NET API..."
dotnet publish $apiProjectPath -c $Configuration -o $apiOutputDir

$apiUploadsDir = Join-Path $apiOutputDir "uploads"
New-Item -ItemType Directory -Path $apiUploadsDir -Force | Out-Null

# The API applies migrations itself on non-Development startup, but that only happens if the
# app pool actually recycles onto the new binaries. Ship an idempotent script as well so the
# database can be brought up to date independently of a restart.
Write-Host "[4/4] Generating idempotent migrations script..."
$migrationsScriptPath = Join-Path $apiOutputDir "migrations.sql"
Push-Location (Join-Path $repoRoot "src")
try {
    dotnet ef migrations script `
        --idempotent `
        --project OrderShieldPro.Infrastructure `
        --startup-project OrderShieldPro.API `
        --configuration $Configuration `
        --no-build `
        --output $migrationsScriptPath
}
finally {
    Pop-Location
}

if (-not (Test-Path $migrationsScriptPath)) {
    throw "Migrations script was not generated at '$migrationsScriptPath'."
}

Write-Host "Deployment output folders generated successfully:"
Write-Host "- Frontend folder: $frontendOutputDir"
Write-Host "- API folder: $apiOutputDir"
Write-Host "- Migrations script: $migrationsScriptPath"

Write-Host ""
Write-Host "=== Ready to copy to the server ===" -ForegroundColor Green
Write-Host "API      -> $apiOutputDir       (copy to the internal API IIS site; includes migrations.sql)"
Write-Host "Frontend -> $frontendOutputDir  (copy to the public web IIS site)"
Write-Host ""
Write-Host "Remember: appsettings.Production.json ships from this repo and overwrites server settings on every deploy - see deploy/README-IIS.md before copying." -ForegroundColor Yellow
