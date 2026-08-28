param(
    [ValidateRange(1, 65535)]
    [int]$Port = 4174,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$prototype = Get-ChildItem -LiteralPath $PSScriptRoot -Directory |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'prototype\index.html') } |
    Select-Object -First 1 |
    ForEach-Object { Join-Path $_.FullName 'prototype' }

if (-not $prototype) {
    throw "Could not locate the prototype directory under: $PSScriptRoot"
}

$index = Join-Path $prototype 'index.html'

if (-not (Test-Path -LiteralPath $index -PathType Leaf)) {
    throw "Web entry file not found: $index"
}

$url = "http://127.0.0.1:$Port/"
$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    Write-Host "Port $Port is already in use. Opening: $url" -ForegroundColor Yellow
    if (-not $NoBrowser) {
        Start-Process $url
    }
    exit 0
}

$python = Get-Command py -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command python -ErrorAction SilentlyContinue
}
if (-not $python) {
    $python = Get-Command python3 -ErrorAction SilentlyContinue
}
if (-not $python) {
    throw 'Python 3 was not found. Install Python and add it to PATH.'
}

Write-Host "Web directory: $prototype" -ForegroundColor Cyan
Write-Host "Open in browser: $url" -ForegroundColor Green
Write-Host 'The server runs in this window. Press Ctrl+C to stop it.' -ForegroundColor Cyan

if (-not $NoBrowser) {
    Start-Process $url
}

Push-Location $prototype
try {
    & $python.Source -m http.server $Port --bind 127.0.0.1
}
finally {
    Pop-Location
}
