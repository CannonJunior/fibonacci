#!/bin/bash
# Start script for Stock Analyzer web application

cd "$(dirname "$0")"

# Reason: Try to load environment variables from keys.sh, .env file, or system environment
if [ -f "$HOME/keys.sh" ]; then
    echo "Loading environment variables from ~/keys.sh..."
    source "$HOME/keys.sh"
    echo "Environment variables loaded."
elif [ -f "../equity_analyzer/.env" ]; then
    echo "Loading environment variables from .env file..."
    export $(grep -v '^#' ../equity_analyzer/.env | xargs)
    echo "Environment variables loaded."
elif [ -f ".env" ]; then
    echo "Loading environment variables from local .env file..."
    export $(grep -v '^#' .env | xargs)
    echo "Environment variables loaded."
else
    echo "No .env file found. Continuing with system environment variables..."
fi

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Reason: Check if port 7070 is already in use and kill the process
echo "Checking for processes on port 7070..."
PID=$(lsof -ti:7070)
if [ ! -z "$PID" ]; then
    echo "Found process(es) on port 7070 (PID: $PID). Killing..."
    kill -9 $PID 2>/dev/null
    sleep 1
    echo "Port 7070 is now free."
else
    echo "Port 7070 is available."
fi

# Start the Node.js server
echo "Starting Stock Analyzer server on port 7070..."
node server.js
