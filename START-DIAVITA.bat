@echo off
REM Starts DiaVita on this laptop: local database, API and website, then opens the browser.
cd /d %~dp0
start "DiaVita Database" cmd /k "cd backend && npm run db:local"
timeout /t 6 >nul
start "DiaVita API" cmd /k "cd backend && npm run db:migrate && npm start"
timeout /t 6 >nul
REM Builds the website first so the latest design is always served (takes about a minute)
start "DiaVita Website" cmd /k "cd frontend && npm run build && npm start"
timeout /t 75 >nul
start http://localhost:3000
