@echo off
cd /d "%~dp0"
node mafia.mjs --commonstack --tier full --web --think low %*
pause
