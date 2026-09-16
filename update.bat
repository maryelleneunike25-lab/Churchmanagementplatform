@echo off
setlocal
echo =========================================
echo  Pushing Updates to GBI Jeltim GitHub Repo
echo =========================================

echo Building GBI Jeltim Website...
call npm run build

REM Add git safe directory exception in case of ownership mismatched environment
git config --global --add safe.directory D:/Home/Projects/Users/Acelbyte/Categories/Programmings/projects/websites/Churchmanagementplatform >nul 2>&1

set /p COMMIT_MSG="Enter commit message (default: Update website): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=Update website

echo.
echo Staging all changes...
git add -A

echo Committing with message: "%COMMIT_MSG%"
git commit -m "%COMMIT_MSG%"

echo.
echo Pushing to GitHub (origin main)...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Project successfully updated on GitHub!
) else (
    echo.
    echo [ERROR] Failed to push to GitHub.
)

echo.
pause
