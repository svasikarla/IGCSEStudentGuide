@echo off
echo Cleaning TypeScript cache...
del /s /q node_modules\.cache 2>nul
rmdir /s /q node_modules\.cache 2>nul
del /s /q .cache 2>nul
rmdir /s /q .cache 2>nul
echo Cache cleaned!
echo.
echo Please run: npm start
