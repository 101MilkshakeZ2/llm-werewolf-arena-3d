@echo off
cd /d "%~dp0"
node mafia.mjs --commonstack --web %*
pause
