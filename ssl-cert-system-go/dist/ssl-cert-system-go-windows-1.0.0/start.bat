@echo off
echo Starting SSL Certificate Management System...

if not exist .env (
    echo Configuration file not found, copying from example...
    copy .env.example .env
    echo Please edit .env file to configure database and ACME settings
    pause
    exit /b 1
)

mkdir storage\certs 2>nul
mkdir logs 2>nul

echo Starting application...
ssl-cert-system.exe
pause
