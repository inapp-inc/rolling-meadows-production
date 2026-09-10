@echo off
setlocal EnableExtensions

cd /d "%~dp0"

set OUT=dist\rolling-meadows-deploy
set ZIP=dist\rolling-meadows-deploy.zip
set IMAGE=rolling-meadows-app:latest

echo.
echo === Rolling Meadows production package ===
echo Public URL: https://foundry.inapp.com/rolling-meadows
echo Port: 4510
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker is required. Install Docker Desktop and try again.
  exit /b 1
)

echo [1/5] Building production Docker image...
docker compose -f docker-compose.prod.yml build
if errorlevel 1 (
  echo ERROR: Docker build failed.
  exit /b 1
)

echo [2/5] Preparing output folder...
if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%"

echo [3/5] Saving Docker image to tarball...
docker save %IMAGE% -o "%OUT%\rolling-meadows-app.tar"
if errorlevel 1 (
  echo ERROR: docker save failed.
  exit /b 1
)

echo [4/5] Copying deployment files...
copy /Y docker-compose.prod.yml "%OUT%\" >nul
copy /Y deploy.sh "%OUT%\" >nul
copy /Y .env.production.example "%OUT%\.env.example" >nul

(
echo Rolling Meadows — server deploy package
echo.
echo 1. unzip rolling-meadows-deploy.zip
echo 2. cd rolling-meadows-deploy
echo 3. cp .env.example .env   ^(set JWT_SECRET and POSTGRES_PASSWORD^)
echo 4. chmod +x deploy.sh
echo 5. ./deploy.sh
echo.
echo Public URL: https://foundry.inapp.com/rolling-meadows
echo App port: 4510
echo Nginx: proxy /rolling-meadows -^> http://127.0.0.1:4510
) > "%OUT%\DEPLOY.txt"

echo [5/5] Creating zip archive...
if not exist "dist" mkdir "dist"
if exist "%ZIP%" del /f /q "%ZIP%"

tar -a -cf "%ZIP%" -C dist rolling-meadows-deploy
if errorlevel 1 (
  echo ERROR: Failed to create zip. Ensure tar is available ^(Windows 10+^).
  exit /b 1
)

echo.
echo Package ready:
echo   Folder: %OUT%
echo   Zip:    %ZIP%
echo.
echo Copy %ZIP% to your Linux server, then:
echo   unzip rolling-meadows-deploy.zip
echo   cd rolling-meadows-deploy
echo   cp .env.example .env
echo   chmod +x deploy.sh
echo   ./deploy.sh
echo.

endlocal
