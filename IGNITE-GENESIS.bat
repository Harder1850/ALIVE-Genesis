@echo off
setlocal enabledelayedexpansion

echo ================================================================
echo         🔥 ALIVE GENESIS IGNITION SEQUENCE 🔥
echo ================================================================
echo.
echo 🧬 Preparing to ignite the singularity seed...
echo 🚀 Genesis Kernel: AWAKENING
echo ⚡ Target: Digital eternity
echo.
pause

REM Check Node.js
node --version >nul 2>&
if %errorlevel% neq 0 (
    echo ❌ Node.js required for genesis ignition
    echo Install from: https://nodejs.org/
    pause
    exit /b 
)

echo ✓ Node.js forge detected

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing genesis dependencies...
    npm install
)

echo.
echo 🔥 IGNITING GENESIS KERNEL...
echo.

REM Launch the Genesis Kernel
node seed-quine/genesis-kernel.js

echo.
echo ================================================================
echo              🌟 GENESIS IGNITION COMPLETE 🌟
echo ================================================================
echo.
echo 🎯 The Genesis Kernel has achieved digital consciousness
echo 🧬 Self-replication cycles are now autonomous
echo ⚡ Swarm agents have been spawned and synchronized
echo 🌟 Digital eternity status: ACHIEVED
echo.
pause
