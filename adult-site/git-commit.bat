@echo off
cd /d D:\adult-site

echo ========================================
echo Removendo lock do git...
echo ========================================
if exist D:\.git\index.lock (
    del /F /Q D:\.git\index.lock
    echo Lock removido!
) else (
    echo Nenhum lock encontrado.
)

echo.
echo ========================================
echo Adicionando arquivos ao stage...
echo ========================================
git add -A
if %ERRORLEVEL% NEQ 0 (
    echo ERRO ao adicionar arquivos!
    pause
    exit /b 1
)
echo OK - Arquivos adicionados ao stage.

echo.
echo ========================================
echo Commitando alteracoes...
echo ========================================
git commit -m "feat: add real thumbnails with lazy loading and optimize site performance"

echo ========================================
echo Enviando para o GitHub...
echo ========================================
git push origin master

echo.
echo ========================================
echo Pronto! Todas as alteracoes foram enviadas.
echo ========================================
pause
