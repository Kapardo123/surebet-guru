@echo off
cd /d C:\Users\Sprzetowo\Desktop\Projekty\surebet-guru
set PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%
node node_modules\vite\bin\vite.js --host > C:\Users\Sprzetowo\Desktop\Projekty\surebet-guru\scripts\dev-log.txt 2>&1