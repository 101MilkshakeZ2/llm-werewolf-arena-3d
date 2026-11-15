@echo off
cd /d "%~dp0"
node mafia.mjs --openrouter --human %*
pause
