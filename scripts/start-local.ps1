param(
    [ValidateRange(1024, 65535)][int] $WebPort = 3000,
    [ValidateRange(1024, 65535)][int] $ApiPort = 8000,
    [switch] $DemoCheckout
)

$ErrorActionPreference = 'Stop'
if ($WebPort -eq $ApiPort) { throw 'Choose different web and API ports.' }
$webUrl = "http://localhost:$WebPort"
$apiUrl = "http://127.0.0.1:$ApiPort"
$env:APP_ORIGIN = $webUrl
$env:API_URL = $apiUrl
$env:DESKLY_LOCAL_LAUNCHER = '1'
if ($DemoCheckout) { $env:DEMO_CHECKOUT = 'true' }

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$python = Join-Path $root '.venv/Scripts/python.exe'
$next = 'node_modules/next/dist/bin/next'
$node = (Get-Command node.exe).Source
$logs = Join-Path $root '.local/logs'
$postgresHelper = Join-Path $root '.local/postgres.mjs'

if (-not (Test-Path -LiteralPath $python) -or -not (Test-Path -LiteralPath (Join-Path $frontend $next))) {
    throw 'Install the backend and frontend dependencies first. See Run without Docker in README.md.'
}

New-Item -ItemType Directory -Path $logs -Force | Out-Null

function Test-LocalListener([int] $Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Start-LocalProcess([string] $Name, [string] $Executable, [string] $Directory, [string[]] $Arguments) {
    Start-Process -FilePath $Executable -ArgumentList $Arguments -WorkingDirectory $Directory -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $logs "$Name-$WebPort-$ApiPort.log") -RedirectStandardError (Join-Path $logs "$Name-$WebPort-$ApiPort.error.log")
}

function Wait-ForLocalService([string] $Name, [scriptblock] $Probe, $Process) {
    $deadline = (Get-Date).AddSeconds(45)
    do {
        if (& $Probe) { return }
        if ($Process -and $Process.HasExited) { break }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    throw "$Name did not become ready. Check $logs and confirm that the expected port is available."
}

if (Test-LocalListener $WebPort) {
    try { $existingPage = (Invoke-WebRequest "$webUrl/" -UseBasicParsing -TimeoutSec 6).Content }
    catch { $existingPage = '' }
    if ($existingPage -notmatch '<title>DESKLY') { throw "Another service uses web port $WebPort. Choose a different -WebPort." }
}

if ((Test-Path -LiteralPath $postgresHelper) -and -not (Test-LocalListener 5432)) {
    $postgres = Start-LocalProcess 'postgres' $node $root @('.local/postgres.mjs')
    Wait-ForLocalService 'PostgreSQL' {
        Select-String -LiteralPath (Join-Path $logs "postgres-$WebPort-$ApiPort.log") -Pattern 'DESKLY_POSTGRES_READY' -Quiet
    } $postgres
}

if (-not (Test-LocalListener $ApiPort)) {
    Push-Location $backend
    try {
        & $python -m alembic upgrade head
        if ($LASTEXITCODE -ne 0) { throw 'Database migration failed. Check DATABASE_URL and PostgreSQL.' }
    } finally {
        Pop-Location
    }
    $api = Start-LocalProcess 'api' $python $backend @('-m', 'uvicorn', 'deskly.main:app', '--port', "$ApiPort", '--no-access-log')
}

Wait-ForLocalService 'FastAPI' {
    try {
        (Invoke-RestMethod "$apiUrl/health" -TimeoutSec 3).status -eq 'ok' -and
        (Invoke-RestMethod "$apiUrl/api/v1/store" -TimeoutSec 3).PSObject.Properties.Name -contains 'demo_checkout'
    }
    catch { $false }
} $api
if ($DemoCheckout -and -not (Invoke-RestMethod "$apiUrl/api/v1/store" -TimeoutSec 3).demo_checkout) {
    throw "The running API on port $ApiPort does not have demo checkout enabled. Restart it or choose a different -ApiPort."
}

$worker = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Where-Object {
    $_.CommandLine -like "*$python*" -and $_.CommandLine -match '\s-m\s+deskly\.worker(?:\s|$)'
} | Select-Object -First 1
if (-not $worker) {
    Start-LocalProcess 'worker' $python $backend @('-m', 'deskly.worker') | Out-Null
}

if (-not (Test-LocalListener $WebPort)) {
    $web = Start-LocalProcess 'storefront' $node $frontend @($next, 'dev', '--webpack', '--hostname', 'localhost', '--port', "$WebPort")
}

Wait-ForLocalService 'Storefront' {
    try {
        $store = Invoke-RestMethod "$webUrl/api/v1/store" -TimeoutSec 5
        (Invoke-WebRequest "$webUrl/" -UseBasicParsing -TimeoutSec 15).Content -match '<title>DESKLY' -and
        ($store.PSObject.Properties.Name -contains 'demo_checkout') -and
        (-not $DemoCheckout -or $store.demo_checkout)
    }
    catch { $false }
} $web

Write-Output "DESKLY is ready at $webUrl/"
