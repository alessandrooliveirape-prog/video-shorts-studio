@echo off
REM =============================================
REM PLEASUREHUB - Auto Updater (Windows Batch)
REM Agendado pelo Windows Task Scheduler
REM =============================================

REM Ir para a pasta raiz do projeto (2 níveis acima do batch)
cd /d "%~dp0.."

REM Log de inicio
echo [%date% %time%] Iniciando atualizacao... >> scraper\scheduler.log

REM Executar scraper diario (2 videos)
node scraper\auto-update.mjs --once >> scraper\scheduler.log 2>&1

REM Verificar resultado
if %ERRORLEVEL% EQU 0 (
    echo [%date% %time%] Atualizacao concluida com sucesso! >> scraper\scheduler.log
) else (
    echo [%date% %time%] ERRO na atualizacao (codigo: %ERRORLEVEL%) >> scraper\scheduler.log
)

echo ---------------------------------------- >> scraper\scheduler.log

REM Retornar codigo de saida para o Task Scheduler
exit /b %ERRORLEVEL%
