@echo off
REM ============================================================
REM run_pipeline.bat
REM
REM Chamado pelo Power Automate Desktop (subfluxo ReportExport)
REM apos o flow exportar o Excel e o print do DUX.
REM
REM Uso:
REM   run_pipeline.bat <tipo> <data_inicio> <data_fim>
REM
REM Onde <tipo> = 0 (today), 1 (yesterday), 2 (last7), 3 (last30)
REM E as datas estao no formato dd/MM/yyyy (ex: 21/05/2026).
REM
REM Exemplo:
REM   run_pipeline.bat 1 20/05/2026 20/05/2026
REM
REM Codigo de saida 0 = sucesso. Power Automate pode usar pra condicional.
REM ============================================================

setlocal
cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

if "%~1"=="" (
    echo [run_pipeline.bat] ERRO: tipo de relatorio nao informado.
    echo Uso: run_pipeline.bat ^<tipo^> ^<data_inicio^> ^<data_fim^>
    exit /b 2
)

"%PYTHON_EXE%" run_pipeline.py %1 %2 %3
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
    echo [run_pipeline.bat] OK
) else (
    echo [run_pipeline.bat] FALHOU rc=%RC%
)

endlocal & exit /b %RC%
