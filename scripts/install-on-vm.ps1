# =============================================================================
# install-on-vm.ps1 - Primeira instalacao do Compras Now Executivo na VM
# =============================================================================
#
# Execute UMA VEZ apos clonar o repo. Depois use deploy.ps1 para atualizacoes.
#
# Pre-requisitos (instale antes manualmente):
#   - Node.js 20 LTS  (https://nodejs.org)
#   - Git for Windows (https://git-scm.com/download/win)
#   - NSSM em C:\Tools\nssm.exe (https://nssm.cc)
#
# O QUE ESTE SCRIPT FAZ:
#   1. Valida que voce esta em C:\apps\compras-now
#   2. Confere se o arquivo .env existe (se nao, avisa e para)
#   3. Instala dependencias
#   4. Builda frontend e servidor
#   5. Registra o servico Windows via NSSM
#   6. Configura logs em logs\
#   7. Libera porta 80 no Firewall do Windows
#   8. Inicia o servico
#
# COMO USAR:
#   Logado na VM como administrador, em PowerShell:
#     cd C:\apps\compras-now
#     .\scripts\install-on-vm.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

$AppDir = "C:\apps\compras-now"
$ServiceName = "ComprasNowExecutivo"
$NssmPath = "C:\Tools\nssm.exe"
$NodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
$LogsDir = Join-Path $AppDir "logs"

Write-Host ""
Write-Host "=============================================="  -ForegroundColor Cyan
Write-Host "  Instalacao Compras Now Executivo (VM)"        -ForegroundColor Cyan
Write-Host "=============================================="  -ForegroundColor Cyan
Write-Host ""

# ----- Validacoes -----
Set-Location $AppDir
if ((Get-Location).Path -ne $AppDir) {
    throw "Voce precisa estar em $AppDir. Faca: cd $AppDir"
}

if (-not $NodeExe) {
    throw "Node.js nao encontrado no PATH. Instale primeiro (https://nodejs.org)."
}
Write-Host "Node.js em: $NodeExe" -ForegroundColor Gray

if (-not (Test-Path $NssmPath)) {
    throw "NSSM nao encontrado em $NssmPath. Baixe em https://nssm.cc e copie nssm.exe para C:\Tools\."
}
Write-Host "NSSM em: $NssmPath" -ForegroundColor Gray

if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "ERRO: arquivo .env nao encontrado em $AppDir" -ForegroundColor Red
    Write-Host ""
    Write-Host "Crie o arquivo $AppDir\.env com este conteudo:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    GITHUB_TOKEN=github_pat_..." -ForegroundColor Gray
    Write-Host "    GITHUB_REPO=LeviCury/compras-now" -ForegroundColor Gray
    Write-Host "    GITHUB_BRANCH=main" -ForegroundColor Gray
    Write-Host "    GITHUB_DATA_PATH=data" -ForegroundColor Gray
    Write-Host "    PORT=80" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Depois rode este script novamente." -ForegroundColor Yellow
    exit 1
}

# ----- Build -----
Write-Host ""
Write-Host "[1/4] npm install..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install falhou" }

Write-Host ""
Write-Host "[2/4] Build do frontend (vite)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "vite build falhou" }

Write-Host ""
Write-Host "[3/4] Build do servidor (tsc)..." -ForegroundColor Yellow
npm run build:server
if ($LASTEXITCODE -ne 0) { throw "build:server falhou" }

# ----- Logs -----
if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir | Out-Null
    Write-Host "Pasta de logs criada: $LogsDir" -ForegroundColor Gray
}

# ----- Servico via NSSM -----
Write-Host ""
Write-Host "[4/4] Registrando servico Windows $ServiceName via NSSM..." -ForegroundColor Yellow

$serviceExists = (& $NssmPath status $ServiceName 2>&1) -notmatch "Can't open service"
if ($serviceExists) {
    Write-Host "Servico ja existia, parando para reconfigurar..." -ForegroundColor Gray
    & $NssmPath stop $ServiceName | Out-Null
    Start-Sleep -Seconds 2
    & $NssmPath remove $ServiceName confirm | Out-Null
    Start-Sleep -Seconds 1
}

$entryScript = Join-Path $AppDir "dist-server\index.js"
& $NssmPath install $ServiceName $NodeExe $entryScript
& $NssmPath set $ServiceName AppDirectory $AppDir
& $NssmPath set $ServiceName Start SERVICE_AUTO_START
& $NssmPath set $ServiceName AppStdout (Join-Path $LogsDir "stdout.log")
& $NssmPath set $ServiceName AppStderr (Join-Path $LogsDir "stderr.log")
& $NssmPath set $ServiceName AppRotateFiles 1
& $NssmPath set $ServiceName AppRotateBytes 5242880   # 5 MB por arquivo de log
& $NssmPath set $ServiceName Description "Compras Now Executivo - painel de compras de gado servindo dist/ e /api/* a partir da VM interna Minerva."

Write-Host "Servico registrado." -ForegroundColor Gray

# ----- Firewall -----
$ruleName = "Compras Now Executivo - HTTP 80"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $existingRule) {
    Write-Host "Liberando porta 80 no Firewall do Windows..." -ForegroundColor Gray
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow -Profile Domain,Private | Out-Null
} else {
    Write-Host "Regra de firewall ja existia." -ForegroundColor Gray
}

# ----- Inicia -----
Write-Host ""
Write-Host "Iniciando servico..." -ForegroundColor Yellow
& $NssmPath start $ServiceName | Out-Null
Start-Sleep -Seconds 3

$status = & $NssmPath status $ServiceName
Write-Host "Status: $status" -ForegroundColor Gray

Write-Host ""
Write-Host "=============================================="  -ForegroundColor Green
Write-Host "  Instalacao concluida"                         -ForegroundColor Green
Write-Host "=============================================="  -ForegroundColor Green
Write-Host ""
Write-Host "Acesse:    http://localhost"                    -ForegroundColor Cyan
Write-Host "Logs:      $LogsDir\stdout.log"                 -ForegroundColor Cyan
Write-Host "Erros:     $LogsDir\stderr.log"                 -ForegroundColor Cyan
Write-Host ""
Write-Host "Para atualizar no futuro:"                      -ForegroundColor White
Write-Host "    cd $AppDir"                                 -ForegroundColor Gray
Write-Host "    .\scripts\deploy.ps1"                       -ForegroundColor Gray
Write-Host ""
