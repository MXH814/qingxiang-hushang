param(
    [ValidateRange(1, 65535)]
    [int]$Port = 4174,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$prototype = Join-Path $PSScriptRoot '07_AI导办原型\prototype'
$index = Join-Path $prototype 'index.html'

if (-not (Test-Path -LiteralPath $index -PathType Leaf)) {
    throw "找不到网页入口：$index"
}

$url = "http://127.0.0.1:$Port/"
$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    Write-Host "端口$Port已有服务监听。请确认是否为本项目：$url" -ForegroundColor Yellow
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
    throw '未找到Python 3。请安装Python并加入PATH，或按docs/网页启动与验收指南.md手动启动。'
}

Write-Host "网页目录：$prototype" -ForegroundColor Cyan
Write-Host "访问地址：$url" -ForegroundColor Green
Write-Host '服务器将在当前窗口运行；按Ctrl+C停止。' -ForegroundColor Cyan

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
