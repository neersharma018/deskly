$ErrorActionPreference = 'Stop'

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
        -RedirectStandardOutput (Join-Path $logs "$Name.log") -RedirectStandardError (Join-Path $logs "$Name.error.log")
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

if ((Test-Path -LiteralPath $postgresHelper) -and -not (Test-LocalListener 5432)) {
    $postgres = Start-LocalProcess 'postgres' $node $root @('.local/postgres.mjs')
    Wait-ForLocalService 'PostgreSQL' {
        Select-String -LiteralPath (Join-Path $logs 'postgres.log') -Pattern 'DESKLY_POSTGRES_READY' -Quiet
    } $postgres
}

if (-not (Test-LocalListener 8000)) {
    Push-Location $backend
    try {
        & $python -m alembic upgrade head
        if ($LASTEXITCODE -ne 0) { throw 'Database migration failed. Check DATABASE_URL and PostgreSQL.' }
    } finally {
        Pop-Location
    }
    $api = Start-LocalProcess 'api' $python $backend @('-m', 'uvicorn', 'deskly.main:app', '--port', '8000', '--no-access-log')
}

Wait-ForLocalService 'FastAPI' {
    try { (Invoke-RestMethod 'http://127.0.0.1:8000/health' -TimeoutSec 3).status -eq 'ok' }
    catch { $false }
} $api

$worker = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Where-Object {
    $_.CommandLine -like "*$python*" -and $_.CommandLine -match '\s-m\s+deskly\.worker(?:\s|$)'
} | Select-Object -First 1
if (-not $worker) {
    Start-LocalProcess 'worker' $python $backend @('-m', 'deskly.worker') | Out-Null
}

if (-not (Test-LocalListener 3000)) {
    $web = Start-LocalProcess 'storefront' $node $frontend @($next, 'dev', '--webpack', '--hostname', 'localhost', '--port', '3000')
}

Wait-ForLocalService 'Storefront' {
    try { (Invoke-WebRequest 'http://localhost:3000/' -UseBasicParsing -TimeoutSec 15).StatusCode -eq 200 }
    catch { $false }
} $web

Write-Output 'DESKLY is ready at http://localhost:3000/'
