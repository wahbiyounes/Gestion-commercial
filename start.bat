@echo off
setlocal
title MonERP Launcher
cd /d "%~dp0"

echo ==========================================
echo   MonERP - Gestion d'entreprise
echo   Backend : port 3001
echo   Frontend : port 5173
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 goto :nonode

echo [1/4] Verification des dependances backend...
if exist "backend\node_modules" goto :depsfront
echo       Installation des dependances backend (premiere fois)...
pushd backend
call npm install
popd

:depsfront
echo [2/4] Verification des dependances frontend...
if exist "frontend\node_modules" goto :seed
echo       Installation des dependances frontend (premiere fois)...
pushd frontend
call npm install
popd

:seed
echo [3/4] Initialisation des donnees de demonstration...
pushd backend
call npm run seed
popd

echo [4/4] Demarrage des serveurs...
start "MonERP Backend" cmd /k "cd /d ""%~dp0backend"" && npm start"
start "MonERP Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo Ouverture du navigateur dans quelques secondes...
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo ==========================================
echo   L'application demarre dans votre navigateur.
echo   Comptes de demonstration :
echo     - admin / admin123  (administrateur)
echo     - user  / user123   (utilisateur)
echo.
echo   Pour ARRETER l'application :
echo     Fermez les deux fenetres noires
echo     (MonERP Backend et MonERP Frontend).
echo ==========================================
echo.
pause
exit /b 0

:nonode
echo.
echo [ERREUR] Node.js n'est pas installe ou n'est pas
echo dans le PATH de Windows.
echo.
echo  1. Telechargez-le sur https://nodejs.org
echo  2. Installez-le (cochez "Add to PATH")
echo  3. Fermez et re-ouvrez l'explorateur, puis
echo     re-double-cliquez sur start.bat
echo.
pause
exit /b 1
