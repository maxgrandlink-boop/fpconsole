@echo off
cd /d %~dp0
if not exist node_modules (
  echo [fpconsole] installing electron (first run only)...
  set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
  call npm install --registry=https://registry.npmmirror.com
)
call npx electron .
