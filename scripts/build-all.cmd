@echo off
REM ============================================================
REM  NEXUS HQ - Build Windows EXE and Android APK (one click)
REM  Usage:  scripts\build-all.cmd [win^|android^|all]
REM ============================================================
setlocal
cd /d "%~dp0\.."
set TARGET=%1
if "%TARGET%"=="" set TARGET=all

echo ==^> Installing dependencies
call npm install --no-audit --no-fund
if errorlevel 1 goto :err

echo ==^> Building web bundle
call npm run build
if errorlevel 1 goto :err

if not exist dist-bin mkdir dist-bin

if /I "%TARGET%"=="win"     goto :win
if /I "%TARGET%"=="android" goto :android
if /I "%TARGET%"=="all"     goto :all
echo Unknown target: %TARGET% (use win, android, or all)
exit /b 1

:all
echo ==^> Packaging Windows EXE
call npx electron-builder --win nsis portable --x64 --publish never
if exist release\*.exe copy /Y release\*.exe dist-bin\ >nul

echo ==^> Building Android APK
call npx cap sync android
pushd android
call gradlew.bat assembleRelease -x lint -x lintVitalRelease --no-daemon
popd
for /f "delims=" %%f in ('dir /b android\app\build\outputs\apk\release\*.apk 2^>nul') do copy /Y "android\app\build\outputs\apk\release\%%f" dist-bin\ >nul
goto :done

:win
echo ==^> Packaging Windows EXE
call npx electron-builder --win nsis portable --x64 --publish never
if exist release\*.exe copy /Y release\*.exe dist-bin\ >nul
goto :done

:android
echo ==^> Building Android APK
call npx cap sync android
pushd android
call gradlew.bat assembleRelease -x lint -x lintVitalRelease --no-daemon
popd
for /f "delims=" %%f in ('dir /b android\app\build\outputs\apk\release\*.apk 2^>nul') do copy /Y "android\app\build\outputs\apk\release\%%f" dist-bin\ >nul
goto :done

:err
echo Build failed.
exit /b 1

:done
echo.
echo ============================================================
echo  Done. Artifacts are in: %cd%\dist-bin
dir /b dist-bin
echo ============================================================
endlocal
