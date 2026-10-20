@echo off
chcp 65001 >nul
title Ridoux Couverture - serveur local
cd /d "%~dp0"
if not exist node_modules (
  echo Installation des dependances, une seule fois...
  call npm install
)
echo Ouverture du site sur http://localhost:5173 ...
start "" http://localhost:5173
call npx vite --port 5173 --strictPort
pause
