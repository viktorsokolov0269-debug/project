@echo off
cd /d "%~dp0"
echo Установка зависимостей...
call npm install
echo Сборка...
call npm run build
echo.
echo ==========================================
echo   Приложение: http://localhost:4173
echo   Откройте эту ссылку в браузере
echo ==========================================
echo.
start "" http://localhost:4173
npx --yes serve docs -l 4173
