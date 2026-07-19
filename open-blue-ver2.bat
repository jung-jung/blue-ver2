@echo off
set "NODE=C:\Users\yuiop\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "APPDIR=%~dp0"
cd /d "%APPDIR%"
if not exist "%NODE%" (
  echo Node.js runtime was not found.
  echo Open index.html directly, or run this from Codex again.
  pause
  exit /b 1
)
start "Blue ver2 server" /min cmd /k ""%NODE%" "%APPDIR%server.mjs""
timeout /t 1 /nobreak >nul
start "" "http://localhost:4174"
