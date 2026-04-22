@echo off
chcp 65001 >nul
title AI Assistant

echo.
echo   =================================
echo      AI Assistant - Quick Start
echo   =================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] Node.js not found! Please install:
    echo           https://nodejs.org/
    echo           Download LTS version, check "Add to PATH" during install
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo   [OK] Node.js %%NODE_VER%%

:: Check if this is first run (no node_modules)
if not exist "node_modules" (
    echo.
    echo   [INFO] First run, installing dependencies...
    call npm install --production=false
    if %errorlevel% neq 0 (
        echo.
        echo   [ERROR] npm install failed!
        echo           Try running as Administrator.
        pause
        exit /b 1
    )
    echo   [OK] Dependencies installed.
)

:: Build if dist is missing or source is newer
if not exist "dist" (
    echo.
    echo   [INFO] Building project...
    call npm run build
    if %errorlevel% neq 0 (
        echo.
        echo   [ERROR] Build failed!
        pause
        exit /b 1
    )
    echo   [OK] Build complete.
) else (
    :: Check if we need to rebuild (any src file newer than dist)
    setlocal enabledelayedexpansion
    set NEED_BUILD=0
    for /r "src" %%f in (*.ts *.tsx *.css) do (
        for /f "tokens=*" %%d in ('dir /b "dist\index.html" 2^>nul') do (
            if "%%~tf" GTR "%%~td$dist\index.html" set NEED_BUILD=1
        )
    )
    if "!NEED_BUILD!"=="1" (
        echo.
        echo   [INFO] Source changed, rebuilding...
        call npm run build
        if %errorlevel% neq 0 (
            echo.
            echo   [ERROR] Build failed!
            pause
            exit /b 1
        )
        echo   [OK] Rebuild complete.
    )
    endlocal
)

:: Start server
echo.
echo   ================================
echo   Starting server...
echo   ================================
echo.

node server.js

if %errorlevel% neq 0 (
    echo.
    echo   [ERROR] Server crashed!
    pause
)
