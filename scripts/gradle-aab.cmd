@echo off
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
cd /d C:\Users\Sprzetowo\Desktop\Projekty\surebet-guru\android
call gradlew.bat bundleRelease --no-daemon > C:\Users\Sprzetowo\Desktop\Projekty\surebet-guru\scripts\gradle-log.txt 2>&1
echo GRADLE_EXIT_CODE:%ERRORLEVEL% >> C:\Users\Sprzetowo\Desktop\Projekty\surebet-guru\scripts\gradle-log.txt