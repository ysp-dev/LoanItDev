@echo off
setlocal EnableExtensions

cd /d "%~dp0"
if errorlevel 1 (
    echo Cannot open CreditDev folder.
    pause
    exit /b 1
)

set "PORT=5002"
set "APP_URL=http://localhost:5002"
set "PYTHON_EXE="
set "BASE_PYTHON="
set "FOUND="

echo Hostname:
hostname
echo.
echo CreditDev folder:
echo %CD%
echo.

if exist "%CD%\venv\Scripts\python.exe" set "PYTHON_EXE=%CD%\venv\Scripts\python.exe"
if not defined PYTHON_EXE if exist "%CD%\.venv\Scripts\python.exe" set "PYTHON_EXE=%CD%\.venv\Scripts\python.exe"

if not defined PYTHON_EXE (
    where py >nul 2>nul
    if not errorlevel 1 set "BASE_PYTHON=py"
)

if not defined BASE_PYTHON (
    where python >nul 2>nul
    if not errorlevel 1 set "BASE_PYTHON=python"
)

if not defined BASE_PYTHON if exist "%LocalAppData%\Programs\Python" (
    for /d %%D in ("%LocalAppData%\Programs\Python\Python*") do (
        if exist "%%D\python.exe" set "BASE_PYTHON=%%D\python.exe"
    )
)

if not defined PYTHON_EXE if defined BASE_PYTHON (
    echo Virtual environment was not found.
    echo Creating venv...
    "%BASE_PYTHON%" -m venv venv
    if errorlevel 1 (
        echo Failed to create venv.
        pause
        exit /b 1
    )
    set "PYTHON_EXE=%CD%\venv\Scripts\python.exe"
    echo Installing required packages...
    "%PYTHON_EXE%" -m pip install flask flask-socketio eventlet
    if errorlevel 1 (
        echo Failed to install required packages.
        pause
        exit /b 1
    )
)

if not defined PYTHON_EXE (
    echo Python was not found.
    echo Install Python from https://www.python.org/downloads/windows/
    echo Check "Add python.exe to PATH" during installation.
    echo Then run start.bat again.
    pause
    exit /b 1
)

if not exist "%CD%\server.py" (
    echo server.py was not found in this folder.
    pause
    exit /b 1
)

echo Checking port %PORT% before start...
netstat -ano -p tcp | findstr /C:":%PORT%"
echo.

for /f "tokens=5" %%P in ('netstat -ano -p tcp ^| findstr /C:":%PORT%" ^| findstr /I "LISTENING"') do (
    set "FOUND=1"
    echo Server already appears to be running. PID %%P
)

if defined FOUND goto OPEN_BROWSER

echo Starting CreditDev server...
echo URL: %APP_URL%
echo.

start "CreditDev Server" /min "%PYTHON_EXE%" "%CD%\server.py"

timeout /t 3 /nobreak >nul

echo Checking port %PORT% after start...
netstat -ano -p tcp | findstr /C:":%PORT%"
echo.

netstat -ano -p tcp | findstr /C:":%PORT%" | findstr /I "LISTENING" >nul
if errorlevel 1 (
    echo Server did not start on port %PORT%.
    echo Try this command manually:
    echo "%PYTHON_EXE%" "%CD%\server.py"
    echo.
    echo Press any key to close this window.
    pause >nul
    exit /b 1
)

:OPEN_BROWSER
echo Opening %APP_URL%

where msedge >nul 2>nul
if not errorlevel 1 (
    start "" msedge "%APP_URL%"
) else (
    start "" "%APP_URL%"
)

echo.
echo Done. Press any key to close this window.
pause >nul

endlocal
