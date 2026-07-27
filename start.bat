@echo off
REM Double-click this to start MOP Careers.
REM Wrapper around start.ps1 so no PowerShell execution-policy change is needed.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
