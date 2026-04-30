param([switch]$Build)

$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent $PSScriptRoot

# Build if image missing or -Build flag
$imageExists = docker image inspect finally 2>$null
if ($Build -or !$imageExists) {
    Write-Host "Building finally image..."
    docker build -t finally $ProjectDir
}

# If already running, just open browser
$running = docker ps --format '{{.Names}}' | Where-Object { $_ -eq 'finally' }
if ($running) {
    Write-Host "Container 'finally' is already running at http://localhost:8000"
    Start-Process "http://localhost:8000"
    exit 0
}

# Remove stopped container if present
$exists = docker ps -a --format '{{.Names}}' | Where-Object { $_ -eq 'finally' }
if ($exists) {
    docker rm finally
}

docker run -d --name finally `
    -v finally-data:/app/db `
    -p 8000:8000 `
    --env-file "$ProjectDir\.env" `
    finally

Write-Host "Waiting for service to be ready..."
for ($i = 1; $i -le 10; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) {
            Write-Host "Finally is ready at http://localhost:8000"
            Start-Process "http://localhost:8000"
            exit 0
        }
    } catch {}
    Start-Sleep 1
}

Write-Host "Warning: service did not respond within 10s — http://localhost:8000"
