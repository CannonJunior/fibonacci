#!/bin/bash

# Fibonacci Equity Analyzer - Start Script
# This script sets up and launches the equity analysis application

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}"
echo "================================================================"
echo "  📈 Fibonacci Equity Analyzer - Quick Start"
echo "================================================================"
echo -e "${NC}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="${SCRIPT_DIR}/equity_analyzer"

echo -e "${BLUE}[1/6]${NC} Checking directory structure..."

# Check if equity_analyzer directory exists
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}ERROR: equity_analyzer directory not found!${NC}"
    echo "Expected location: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"
echo -e "${GREEN}✓${NC} Found equity_analyzer directory"

echo ""
echo -e "${BLUE}[2/6]${NC} Checking Flutter installation..."

# Check if Flutter is installed
if ! command -v flutter &> /dev/null; then
    echo -e "${RED}ERROR: Flutter is not installed!${NC}"
    echo ""
    echo "Please install Flutter first:"
    echo "  https://docs.flutter.dev/get-started/install"
    echo ""
    exit 1
fi

FLUTTER_VERSION=$(flutter --version | head -n 1)
echo -e "${GREEN}✓${NC} $FLUTTER_VERSION"

echo ""
echo -e "${BLUE}[3/6]${NC} Setting up environment variables..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠${NC}  .env file not found. Creating from template..."

    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓${NC} Created .env from .env.example"
    else
        echo -e "${RED}ERROR: .env.example not found!${NC}"
        exit 1
    fi
fi

# Check if shell environment variable $ALPHA_VANTAGE_API_KEY is set
# If so, update the .env file to use it instead of "demo"
if [ ! -z "$ALPHA_VANTAGE_API_KEY" ]; then
    echo -e "${GREEN}✓${NC} Found \$ALPHA_VANTAGE_API_KEY in shell environment"
    echo -e "${BLUE}  → Updating .env file with environment variable...${NC}"

    # Update .env file with the shell environment variable
    # Reason: Use sed to replace the API key line in .env file
    if grep -q "ALPHA_VANTAGE_API_KEY=" .env; then
        # Replace existing line
        sed -i "s|ALPHA_VANTAGE_API_KEY=.*|ALPHA_VANTAGE_API_KEY=$ALPHA_VANTAGE_API_KEY|g" .env
    else
        # Add new line if not exists
        echo "ALPHA_VANTAGE_API_KEY=$ALPHA_VANTAGE_API_KEY" >> .env
    fi

    echo -e "${GREEN}✓${NC} API key updated from shell environment variable"
else
    # No shell environment variable - check .env file
    if grep -q "ALPHA_VANTAGE_API_KEY=demo" .env; then
        echo -e "${YELLOW}⚠${NC}  Using demo API key (limited functionality)"
        echo ""
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}  ⚠ IMPORTANT: Configure your API key${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "Option 1: Set environment variable (recommended)"
        echo "   ${GREEN}export ALPHA_VANTAGE_API_KEY=your_actual_key_here${NC}"
        echo "   ${GREEN}./start.sh${NC}"
        echo ""
        echo "Option 2: Edit .env file manually"
        echo "   1. Get FREE API key: ${CYAN}https://www.alphavantage.co/support/#api-key${NC}"
        echo "   2. Edit: ${CYAN}nano .env${NC}"
        echo "   3. Replace 'demo' with your actual key"
        echo ""
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        read -p "Press Enter to continue with demo key (limited) or Ctrl+C to exit and configure..."
    else
        echo -e "${GREEN}✓${NC} API key configured in .env file"
    fi
fi

echo ""
echo -e "${BLUE}[4/6]${NC} Checking Flutter dependencies..."

# Check if pubspec.yaml exists
if [ ! -f "pubspec.yaml" ]; then
    echo -e "${RED}ERROR: pubspec.yaml not found!${NC}"
    exit 1
fi

# Check if packages are installed
if [ ! -d ".dart_tool" ] || [ ! -f "pubspec.lock" ]; then
    echo -e "${YELLOW}⚠${NC}  Dependencies not installed. Installing now..."
    flutter pub get
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${GREEN}✓${NC} Dependencies already installed"
    echo "   (Run 'flutter pub get' manually if you've updated packages)"
fi

echo ""
echo -e "${BLUE}[5/6]${NC} Checking configuration..."

# Verify config.yaml exists
if [ ! -f "config.yaml" ]; then
    echo -e "${RED}ERROR: config.yaml not found!${NC}"
    exit 1
fi

# Get port from config
PORT=$(grep "port:" config.yaml | head -n 1 | awk '{print $2}')
echo -e "${GREEN}✓${NC} Configuration loaded (Port: $PORT)"

# Reason: Check if port is already in use and kill the process
echo ""
echo -e "${BLUE}[5.5/6]${NC} Checking port availability..."
# Temporarily disable exit on error for lsof command
set +e
PID=$(lsof -ti:$PORT 2>/dev/null)
LSOF_EXIT_CODE=$?
set -e

if [ $LSOF_EXIT_CODE -eq 0 ] && [ ! -z "$PID" ]; then
    echo -e "${YELLOW}⚠${NC}  Port $PORT is in use (PID: $PID). Killing process..."
    kill -9 $PID 2>/dev/null
    sleep 2
    echo -e "${GREEN}✓${NC} Port $PORT is now free"
else
    echo -e "${GREEN}✓${NC} Port $PORT is available"
fi

echo ""
echo -e "${BLUE}[6/6]${NC} Launching application..."
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  🚀 Starting Equity Analyzer${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Platform: Web (Chrome)"
echo "Port: $PORT"
echo "URL: ${GREEN}http://localhost:$PORT${NC}"
echo ""
echo "Features:"
echo "  • Real-time AAPL stock data"
echo "  • Interactive candlestick charts"
echo "  • Fibonacci retracement levels"
echo "  • TradingView-inspired UI"
echo ""
echo -e "${YELLOW}💡 Hot Reload: Press 'r' in the terminal to reload changes${NC}"
echo -e "${YELLOW}🛑 Stop App: Press 'q' or Ctrl+C to stop the application${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Launch the application
if flutter run -d chrome --web-port="$PORT"; then
    # This will only execute if flutter exits cleanly
    echo ""
    echo -e "${GREEN}✓${NC} Application stopped successfully"
else
    # Error occurred
    EXIT_CODE=$?
    echo ""
    echo -e "${RED}✗${NC} Application failed to start (exit code: $EXIT_CODE)"
    echo ""
    echo -e "${YELLOW}Common issues:${NC}"
    echo "  1. Check .env file exists and has valid API key"
    echo "  2. Run: flutter clean && flutter pub get"
    echo "  3. Check browser console (F12) for errors"
    echo "  4. Verify config.yaml syntax is correct"
    echo ""
    echo "For detailed logs, run manually:"
    echo "  ${CYAN}flutter run -d chrome --web-port=$PORT${NC}"
    exit $EXIT_CODE
fi
