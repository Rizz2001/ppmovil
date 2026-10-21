@echo off
chcp 65001 > nul
title Verificador Mercantil P2C - Catador Empresas
color 0B

echo ========================================================
echo    BANCO MERCANTIL P2C - CATADOR EMPRESAS
echo    Iniciando Verificador Local de Pagos Moviles...
echo ========================================================
echo.

:: Detectar node en PATH o en carpetas locales habituales
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
    ) else if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else (
        echo [ERROR] No se encontro Node.js instalado en el sistema.
        echo Por favor instale Node.js desde https://nodejs.org/
        pause
        exit /b 1
    )
)

echo [OK] Node.js detectado correctamente.
echo [1/2] Abriendo interfaz en el navegador...
timeout /t 2 /nobreak > nul
start http://localhost:3000

echo [2/2] Levantando servidor modular en el puerto 3000...
echo.
echo Presiona Ctrl + C en esta ventana cuando desees apagar el servidor.
echo.
node src/server.js

pause
