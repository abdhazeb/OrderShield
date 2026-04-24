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

Write-Host "[3/3] Publishing .NET API..."
dotnet publish $apiProjectPath -c $Configuration -o $apiOutputDir

$apiUploadsDir = Join-Path $apiOutputDir "uploads"
New-Item -ItemType Directory -Path $apiUploadsDir -Force | Out-Null

Write-Host "Deployment output folders generated successfully:"
Write-Host "- Frontend folder: $frontendOutputDir"
Write-Host "- API folder: $apiOutputDir"
