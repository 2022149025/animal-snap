@echo off
setlocal
cd /d "%~dp0"
title Before It's Gone - local dev

echo ==================================================
echo    Before It's Gone - local dev server
echo ==================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Install Node.js LTS first:  https://nodejs.org
  echo Then double-click this file again.
  echo.
  pause
  exit /b 1
)

REM Copy the selected main character into public so the dev server can serve it.
REM To use a different character, change the file name below (options: main_character\FBX).
if exist "..\main_character\FBX\Doctor_Male_Young.fbx" copy /Y "..\main_character\FBX\Doctor_Male_Young.fbx" "public\assets\player\MainCharacter.fbx" >nul

if not exist "node_modules" (
  echo First run - installing packages. This may take 1-3 minutes...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed. See the message above,
    echo or delete the node_modules folder and try again.
    pause
    exit /b 1
  )
  echo.
)

echo Starting dev server - your browser will open automatically.
echo To stop: press Ctrl + C in this window, then Y.
echo.
call npm run dev

echo.
echo Server stopped.
pause
endlocal
