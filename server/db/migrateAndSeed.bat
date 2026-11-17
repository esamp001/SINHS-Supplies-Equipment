@echo off
setlocal

REM ---------------------------------------------------------------------------
REM SINHS - Migrate to latest and seed the database.
REM Runs: knex migrate:latest, then knex seed:run (seeds are safe to re-run).
REM Usage: double-click this file, or run  server\db\migrateAndSeed.bat
REM ---------------------------------------------------------------------------

REM Run from the server folder (one level up from this db folder)
cd /d "%~dp0.."

echo.
echo === SINHS database: migrate + seed ===
echo Folder: %CD%
echo.

if not exist ".env" (
  echo [ERROR] server\.env not found.
  echo         Copy .env.example to .env and set DB_PASSWORD and JWT_SECRET first.
  goto :failed
)

if not exist "node_modules" (
  echo [INFO] node_modules not found. Running npm install...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    goto :failed
  )
)

echo [1/2] Running migrations (knex migrate:latest)...
call npx knex migrate:latest
if errorlevel 1 (
  echo [ERROR] Migration failed. Check that PostgreSQL is running and the DB_* values in .env.
  goto :failed
)

echo.
echo [2/2] Running seeds (knex seed:run)...
call npx knex seed:run
if errorlevel 1 (
  echo [ERROR] Seeding failed.
  goto :failed
)

echo.
echo [DONE] Database is migrated and seeded.
goto :end

:failed
echo.
echo [FAILED] See the message above.
endlocal
pause
exit /b 1

:end
endlocal
pause
exit /b 0
