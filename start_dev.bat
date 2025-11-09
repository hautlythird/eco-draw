@echo off
title EcoDraw - Development Server
color 0A

echo.
echo ============================================================
echo    ECODRAW - DEVELOPMENT SERVER
echo ============================================================
echo.

REM Check if database exists
if not exist "src\components\Library\botanical_library.db" (
    echo [1/2] Database not found. Creating database...
    echo.
    
    REM Check if Python is available
    python --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python is not installed or not in PATH
        echo.
        echo The Botanical Library requires a database file.
        echo.
        echo Options:
        echo   1. Install Python and run: python src\components\Library\convert_to_sqlite.py
        echo   2. Download botanical_library.db from GitHub releases
        echo   3. Continue without Botanical Library (other features will work)
        echo.
        choice /C 123 /M "Choose an option"
        
        if errorlevel 3 (
            echo.
            echo Continuing without database...
            echo The Botanical Library will show an error until database is created.
            echo.
            goto start_server
        )
        if errorlevel 2 (
            echo.
            echo Please download botanical_library.db and place it in:
            echo   src\components\Library\botanical_library.db
            echo.
            pause
            exit /b 1
        )
        if errorlevel 1 (
            echo.
            echo Please install Python from https://www.python.org/
            echo Then run this script again.
            echo.
            pause
            exit /b 1
        )
    )
    
    python src\components\Library\convert_to_sqlite.py
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to create database
        echo.
        echo The Botanical Library will not work, but you can continue.
        echo Other features of EcoDraw will work normally.
        echo.
        choice /C YN /M "Continue anyway"
        if errorlevel 2 exit /b 1
    ) else (
        echo.
        echo     ✓ Database created successfully
    )
) else (
    echo [1/2] Database found
    echo     ✓ botanical_library.db exists
)

:start_server
echo.
echo [2/2] Starting development server...
echo.
echo ============================================================
echo.
echo The development server will start shortly.
echo.
echo Botanical Library will use:
echo   • Flask API if running on http://localhost:5000
echo   • Browser SQLite otherwise (no server needed)
echo.
echo To use Flask API for faster development:
echo   1. Open another terminal
echo   2. Run: python src\components\Library\api_server.py
echo.
echo ============================================================
echo.

pnpm run dev

pause
