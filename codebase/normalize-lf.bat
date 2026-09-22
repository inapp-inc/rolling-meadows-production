@echo off
REM Fix CRLF in deploy shell scripts before git commit or create-archive (Windows).
cd /d "%~dp0"
where py >nul 2>&1 && py -3 deploy\normalize-lf.py "%CD%" && exit /b 0
where python >nul 2>&1 && python deploy\normalize-lf.py "%CD%" && exit /b 0
echo ERROR: install Python 3 to run deploy\normalize-lf.py
exit /b 1
