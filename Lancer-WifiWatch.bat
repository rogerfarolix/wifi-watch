@echo off
title Wifi-Watch - Cyber Sentinel
setlocal

set "ROOT=%~dp0"
set "PORTABLE_EXE=%ROOT%desktop-app\dist\Wifi-Watch-Portable.exe"
set "UNPACKED_EXE=%ROOT%desktop-app\dist\win-unpacked\Wifi-Watch.exe"

echo =======================================================
echo     WIFI-WATCH // CYBER SENTINEL v2.0
echo     Lancement du Logiciel Desktop Autonome...
echo =======================================================
echo.

if exist "%UNPACKED_EXE%" (
    echo [OK] Demarrage rapide via binaire optimise...
    start "" "%UNPACKED_EXE%"
    exit /b 0
)

if exist "%PORTABLE_EXE%" (
    echo [OK] Demarrage du package portable autonome...
    start "" "%PORTABLE_EXE%"
    exit /b 0
)

echo [DEV] Mode developpement Electron...
cd /d "%ROOT%desktop-app"
npm start
