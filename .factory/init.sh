# DGDH Mission Init Script
# Idempotent setup for mission execution on Windows PowerShell

Write-Host "=== DGDH Mission Init ===" -ForegroundColor Cyan

# Check Node version
try {
    $nodeVersion = node --version
    $majorVersion = [int]($nodeVersion -replace 'v', '').Split('.')[0]
    if ($majorVersion -lt 20) {
        Write-Host "ERROR: Node.js >=20 required, found $nodeVersion" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js not found" -ForegroundColor Red
    exit 1
}

# Check pnpm
try {
    $pnpmVersion = pnpm --version
    Write-Host "✓ pnpm $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: pnpm not found" -ForegroundColor Red
    exit 1
}

# Install dependencies if node_modules missing
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pnpm install
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Check for .env file
if (Test-Path ".env") {
    Write-Host "✓ .env file present" -ForegroundColor Green
} else {
    Write-Host "ℹ No .env file (API/CLI preferred anyway)" -ForegroundColor Yellow
}

Write-Host "=== Init Complete ===" -ForegroundColor Cyan
