@echo off
echo ==========================================
echo  GBI Android Sync Script
echo ==========================================
echo.

echo [1/2] Building web assets...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed! Aborting.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Syncing to Android project...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [ERROR] Sync failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo  Done! Open Android Studio to build APK:
echo  npx cap open android
echo ==========================================
pause
