# =============================================================================
# deploy.ps1 - Atualizacao do Compras Now Executivo na VM Windows interna
# =============================================================================
#
# O QUE FAZ:
#   1. Puxa o codigo mais recente do GitHub (git pull)
#   2. Instala/atualiza dependencias (npm install)
#   3. Builda o frontend (vite build -> dist/)
#   4. Builda o servidor Express (tsc -> dist-server/)
#   5. Reinicia o servico Windows (NSSM)
#
# COMO USAR:
#   Logado na VM, abra PowerShell e rode:
#     cd C:\apps\compras-now
#     .\scripts\deploy.ps1
#
# Aproximadamente 1-3 minutos de downtime durante o restart do servico.
# =============================================================================

$ErrorActionPreference = "Stop"

$AppDir = "C:\apps\compras-now"
$ServiceName = "ComprasNowExecutivo"
$NssmPath = "C:\Tools\nssm.exe"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Deploy Compras Now Executivo" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $AppDir)) {
    Write-Host "ERRO: $AppDir nao encontrado" -ForegroundColor Red
    exit 1
}

Set-Location $AppDir

Write-Host "[1/5] git pull..." -ForegroundColor Yellow
git pull origin main
if ($LASTEXITCODE -ne 0) { throw "git pull falhou" }

Write-Host ""
Write-Host "[2/5] npm install (somente se package.json mudou)..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install falhou" }

Write-Host ""
Write-Host "[3/5] vite build (frontend)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "vite build falhou" }

Write-Host ""
Write-Host "[4/5] tsc build (servidor Express)..." -ForegroundColor Yellow
npm run build:server
if ($LASTEXITCODE -ne 0) { throw "build:server falhou" }

Write-Host ""
Write-Host "[5/5] Reiniciando servico $ServiceName via NSSM..." -ForegroundColor Yellow
if (Test-Path $NssmPath) {
    & $NssmPath restart $ServiceName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "AVISO: NSSM restart retornou codigo $LASTEXITCODE" -ForegroundColor Yellow
    }
} else {
    Write-Host "AVISO: $NssmPath nao encontrado - servico nao foi reiniciado" -ForegroundColor Yellow
    Write-Host "       Reinicie manualmente quando estiver disponivel" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Deploy concluido com sucesso" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Verifique em: http://localhost" -ForegroundColor Cyan
Write-Host "Logs: $AppDir\logs\stdout.log" -ForegroundColor Cyan
Write-Host ""
