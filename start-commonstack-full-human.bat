@echo off
cd /d "%~dp0"
node mafia.mjs --commonstack --tier full --human %*
pause
