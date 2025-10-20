#!/bin/bash
# Start script for Stock Analyzer web application

cd "$(dirname "$0")"

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Start the Node.js server
node server.js
