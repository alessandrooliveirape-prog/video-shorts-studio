@echo off
setlocal enabledelayedexpansion

title Shorts Studio - Iniciando...
cd /d "%~dp0"

echo ╔══════════════════════════════════════════════╗
echo ║       Shorts Studio - Inicializador          ║
echo ║   Backend + Frontend com 1 clique!              ║
echo ╚══════════════════════════════════════════════╝
echo.

:: ══════════════════════════════════════════════════
:: 1. VERIFICAR PRÉ-REQUISITOS
:: ══════════════════════════════════════════════════
echo [1/4] Verificando dependencias...

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo   [FALHA] npm nao encontrado!
    echo   [DICA] Instale Node.js em: https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%i in ('node -v') do set "NODE_VER=%%i"
echo   [OK] Node.js %NODE_VER%

where ffmpeg >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo   [AVISO] FFmpeg nao encontrado no PATH
    echo   [DICA] Baixe de: https://ffmpeg.org/download.html
) else (
    for /f "delims=" %%i in ('ffmpeg -version 2^>^&1 ^| findstr /i "ffmpeg version"') do set "FF_VER=%%i"
    echo   [OK] %FF_VER%
)

if not exist "backend\venv" (
    echo   [FALHA] Ambiente virtual Python nao encontrado!
    echo   [DICA] Execute os comandos:
    echo          cd backend
    echo          python -m venv venv
    echo          venv\Scripts\activate ^&^& pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)
echo   [OK] Ambiente virtual Python (backend\venv)

if not exist "backend\.env" (
    echo   [AVISO] Arquivo backend\.env nao encontrado!
    echo   [DICA] Crie o arquivo com suas chaves de API:
    echo          GEMINI_API_KEY=sua_chave
) else (
    echo   [OK] Arquivo de configuracao (.env)
)
echo.

:: ══════════════════════════════════════════════════
:: 2. LIBERAR PORTAS
:: ══════════════════════════════════════════════════
echo [2/4] Liberando portas (8000 e 3000)...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr /c:":8000 " /c:":3000 "  2^>nul') do (
    taskkill /f /pid %%a >nul 2>nul
)
timeout /t 1 /nobreak >nul
echo   [OK] Portas 8000 (backend) e 3000 (frontend) liberadas
echo.

:: ══════════════════════════════════════════════════
:: 3. INICIAR BACKEND (PORTA 8000)
:: ══════════════════════════════════════════════════
echo [3/4] Iniciando Backend FastAPI (porta 8000)...

start "Shorts Studio - Backend" /MIN cmd /c "cd /d "%~dp0backend" && "%~dp0backend\venv\Scripts\activate" && uvicorn fastapi_backend:app --reload --port 8000 --host 127.0.0.1"

:: Aguardar ate 45s pelo backend
set "BACKEND_READY="
echo   [~] Aguardando backend iniciar (ate 45s)...
for /l %%i in (1,1,45) do (
    >nul 2>nul curl -s http://127.0.0.1:8000/api/health && set "BACKEND_READY=1" && goto BACKEND_OK
    timeout /t 1 /nobreak >nul
)
:BACKEND_OK
if defined BACKEND_READY (
    echo   [OK] Backend pronto em http://127.0.0.1:8000
    echo   [OK] Documentacao: http://127.0.0.1:8000/docs
) else (
    echo   [AVISO] Backend pode nao ter iniciado a tempo
    echo   [DICA] Verifique o arquivo backend\backend.log para erros
)
echo.

:: ══════════════════════════════════════════════════
:: 4. INICIAR FRONTEND (PORTA 3000)
:: ══════════════════════════════════════════════════
echo [4/4] Iniciando Frontend Vite (porta 3000)...

start "Shorts Studio - Frontend" /MIN cmd /c "cd /d "%~dp0" && npm run dev"

:: Aguardar ate 45s pelo frontend
set "FRONTEND_READY="
echo   [~] Aguardando frontend iniciar (ate 45s)...
for /l %%i in (1,1,45) do (
    for /f "delims=" %%c in ('curl -s -o nul -w "%%{http_code}" http://127.0.0.1:3000 2^>nul') do (
        if %%c geq 200 if %%c leq 399 set "FRONTEND_READY=1"
    )
    if defined FRONTEND_READY goto FRONTEND_OK
    timeout /t 1 /nobreak >nul
)
:FRONTEND_OK
if defined FRONTEND_READY (
    echo   [OK] Frontend pronto em http://localhost:3000
) else (
    echo   [AVISO] Frontend pode nao ter iniciado a tempo
)
echo.

:: ══════════════════════════════════════════════════
:: FINALIZAR
:: ══════════════════════════════════════════════════
echo ╔══════════════════════════════════════════════╗
echo ║    Shorts Studio esta rodando! 🚀            ║
echo ╚══════════════════════════════════════════════╝
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://127.0.0.1:8000
echo   API Docs: http://127.0.0.1:8000/docs
echo.
echo   [DICA] Minimize as 2 janelas CMD abertas
echo   [DICA] Para parar, feche as janelas CMD
echo.

:: Abrir navegador
start http://localhost:3000

echo Pressione qualquer tecla para abrir o navegador novamente...
pause >nul
start http://localhost:3000
