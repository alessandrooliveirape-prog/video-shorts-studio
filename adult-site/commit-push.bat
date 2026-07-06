@echo off
cd /d D:\adult-site
echo ========== COMMIT ==========
git commit -m "feat: add real thumbnails with lazy loading and optimize site performance"
if %ERRORLEVEL% NEQ 0 (
    echo Commit failed
    pause
    exit /b 1
)
echo ========== COMMIT OK ==========
echo ========== PUSH ==========
git push origin master
if %ERRORLEVEL% NEQ 0 (
    echo Push failed
    pause
    exit /b 1
)
echo ========== PUSH OK ==========
echo.
echo ========== TUDO PRONTO! ==========
pause
