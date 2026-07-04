#!/bin/bash
# =========================================================================
# AIRTEL MIKROTIK HOTSPOT BRIDGE - LINUX/MACOS STARTUP SCRIPT
# =========================================================================

echo "========================================================="
echo " Starting Airtel MikroTik Hotspot Bridge Setup..."
echo "========================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "ERROR: Node.js is not installed! Please install Node.js (version 18+) first."
    exit 1
fi

# Check if .env exists, if not copy from example
if [ ! -f .env ]; then
    echo "Creating .env from template..."
    cp .env.example .env
    echo "Please edit the newly created .env file with your specific credentials!"
    echo "Then re-run this script."
    exit 0
fi

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
    echo "Installing required npm dependencies..."
    npm install
fi

echo "Launching real-time bridge daemon..."
npm start
