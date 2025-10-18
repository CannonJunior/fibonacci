# Fibonacci Equity Analysis Platform

A professional, multi-platform equity analysis application built with Flutter and Dart, featuring TradingView-style interface with advanced Fibonacci retracement tools for technical stock analysis.

## 🎯 Project Overview

This project provides a comprehensive equity analysis platform focused on **Apple Inc. (AAPL)** stock with real-time market data and sophisticated Fibonacci retracement analysis tools.

### Key Features

- 📊 **Real-Time Stock Data**: Integration with Alpha Vantage API for live AAPL stock prices
- 📈 **Interactive Candlestick Charts**: Professional OHLC (Open, High, Low, Close) visualization
- 🔢 **Fibonacci Retracement Tools**: Automatic calculation and visualization of key Fibonacci levels:
  - 0% / 100% (Swing points)
  - 23.6% (Minor retracement)
  - 38.2% (Shallow retracement)
  - 50% (Psychological midpoint)
  - **61.8% (Golden Ratio)** - Most important level
  - 78.6% (Deep retracement)
- 🎨 **TradingView-Inspired UI**: Professional dark theme (#131722) with bull/bear color scheme
- 💻 **Multi-Platform Support**: Web (Chrome), Linux Desktop, Android
- 🔒 **Secure Configuration**: Environment variable-based API key management
- ⚙️ **Zero Hardcoded Values**: All settings configurable via YAML

## 📁 Project Structure

```
fibonacci/
├── README.md                                    # This file
├── start.sh                                     # Quick start script
├── CLAUDE.md                                    # AI assistant instructions
├── FIBONACCI-CONTEXT-ENGINEERING-PROMPT.md      # Architecture context
├── TASK.md                                      # Task tracker
└── equity_analyzer/                             # Main application
    ├── config.yaml                              # App configuration (no secrets)
    ├── .env.example                             # Environment variable template
    ├── .env                                     # Your API keys (gitignored)
    ├── lib/
    │   ├── main.dart                            # Application entry point
    │   ├── config/
    │   │   └── config_loader.dart               # YAML + env var loader
    │   ├── models/
    │   │   ├── stock_data.dart                  # Stock data model
    │   │   ├── candle_data.dart                 # Candlestick OHLC model
    │   │   └── fibonacci_level.dart             # Fibonacci level models
    │   ├── services/
    │   │   └── stock_data_service.dart          # Alpha Vantage API client
    │   ├── utils/
    │   │   └── fibonacci_calculator.dart        # Fibonacci calculations
    │   ├── widgets/
    │   │   ├── chart_widget.dart                # Candlestick chart
    │   │   ├── fibonacci_overlay.dart           # Fibonacci display panel
    │   │   └── toolbar.dart                     # Chart controls
    │   ├── screens/
    │   │   └── chart_screen.dart                # Main chart screen
    │   └── constants/
    │       └── theme_constants.dart             # TradingView theme
    ├── test/
    │   └── utils/
    │       └── fibonacci_calculator_test.dart   # Unit tests
    ├── README.md                                # Detailed app documentation
    ├── QUICKSTART.md                            # Quick setup guide
    └── CLAUDE.md                                # App-specific instructions
```

## 🚀 Quick Start

### Prerequisites

- **Flutter SDK**: 3.35.5 or higher ([Install Flutter](https://docs.flutter.dev/get-started/install))
- **Dart**: 3.9.2 or higher (comes with Flutter)
- **Chrome**: For web deployment
- **GTK3**: For Linux desktop (optional)
- **Android SDK**: For Android deployment (optional)

### One-Command Start

```bash
# Clone or navigate to the project
cd /home/junior/src/fibonacci

# Run the start script
./start.sh
```

The script will:
1. Check for required dependencies
2. Set up your `.env` file if needed
3. Install Flutter packages
4. Launch the application on port 7070

### Manual Setup

If you prefer manual setup:

```bash
# Navigate to the application directory
cd equity_analyzer

# Copy environment template
cp .env.example .env

# Edit .env and add your Alpha Vantage API key
nano .env
# Change: ALPHA_VANTAGE_API_KEY=demo
# To: ALPHA_VANTAGE_API_KEY=your_actual_key_here

# Install dependencies
flutter pub get

# Run the application
flutter run -d chrome --web-port=7070
```

## 🔑 Getting Your Free API Key

1. Visit [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. Enter your email address
3. Receive your **FREE** API key instantly
4. Add it to your `.env` file

**Note**: Free tier includes:
- 5 API calls per minute
- 500 API calls per day
- Perfect for analysis and development

## 💻 Running the Application

### Web (Chrome) - Port 7070
```bash
flutter run -d chrome --web-port=7070
```

### Linux Desktop
```bash
flutter run -d linux
```

### Android (with device/emulator connected)
```bash
flutter run -d android
```

### Production Builds

**Web:**
```bash
flutter build web --release
```

**Linux:**
```bash
flutter build linux --release
```

**Android:**
```bash
flutter build apk --release
```

## 📊 How to Use

### 1. Viewing Stock Data

- Launch the application
- Wait for AAPL data to load from Alpha Vantage
- View the interactive candlestick chart
- Check current price, daily change, and trend in the header

### 2. Fibonacci Retracement Analysis

The application automatically:
- Identifies swing high and swing low points in the price data
- Calculates all 7 Fibonacci retracement levels
- Overlays colored horizontal lines on the chart
- Displays price values for each level
- Highlights the 61.8% Golden Ratio level

**Understanding Fibonacci Levels**:
- **61.8% (Golden Ratio)**: Most important support/resistance level
- **50%**: Psychological midpoint, common reversal zone
- **38.2%**: Shallow retracement, indicates strong trend
- **23.6%**: Minor pullback, very strong trend

### 3. Interactive Controls

- **Chart Icon** (top right): Toggle Fibonacci levels on/off
- **Refresh Icon**: Reload latest stock data
- **Chart**: Pan and zoom to explore historical data

## 🏗️ Architecture & Design

### Configuration-Driven Design

All settings are externalized in `config.yaml`:
- Application settings (name, version, port)
- Stock symbols and refresh intervals
- Fibonacci levels and colors
- Chart theme and colors
- Feature toggles

**No hardcoded values** - everything is configurable!

### Security Best Practices

- ✅ API keys stored in `.env` (gitignored)
- ✅ Environment variables referenced in config as `${VAR_NAME}`
- ✅ ConfigLoader auto-expands variables at runtime
- ✅ Secrets never committed to version control
- ✅ Template file (`.env.example`) provided for setup

### Modular Architecture

- **Models**: Data structures (StockData, CandleData, FibonacciLevel)
- **Services**: API integration (StockDataService)
- **Utils**: Business logic (FibonacciCalculator)
- **Widgets**: Reusable UI components (ChartWidget, FibonacciOverlay)
- **Screens**: Application screens (ChartScreen)
- **Constants**: Theme and styling (ThemeConstants)

### Code Quality

- **500-line file limit**: No file exceeds 500 lines of code
- **Comprehensive testing**: Unit tests for calculations and models
- **Inline documentation**: `// Reason:` comments for complex logic
- **Error handling**: Comprehensive API error management
- **Type safety**: Strong typing throughout

## 📐 Fibonacci Retracement Explained

### What is Fibonacci Retracement?

Fibonacci retracement is a technical analysis method used to identify potential support and resistance levels based on the Fibonacci sequence (0, 1, 1, 2, 3, 5, 8, 13, 21...).

### How It's Calculated

**For Uptrend** (price moving from low to high):
```
Retracement Level = Swing High - (Range × Fibonacci Ratio)
```

**For Downtrend** (price moving from high to low):
```
Retracement Level = Swing Low + (Range × Fibonacci Ratio)
```

Where:
- **Range** = Swing High - Swing Low
- **Fibonacci Ratios** = 0.236, 0.382, 0.5, 0.618, 0.786

### Trading Application

Traders use Fibonacci levels to:
1. **Identify entry points**: Buy near support levels in uptrends
2. **Set profit targets**: Sell near resistance levels
3. **Place stop-losses**: Below key support levels
4. **Confirm trends**: Price respecting levels indicates trend strength
5. **Spot reversals**: Rejection at golden ratio (61.8%) often signals reversal

The **61.8% level** is derived from the golden ratio (φ ≈ 1.618) and is considered the most reliable for price reversals.

## 🛠️ Development

### Adding New Features

1. Update `TASK.md` with task description and date
2. Follow modular architecture (max 500 lines per file)
3. Store configuration in `config.yaml` (never hardcode)
4. Write unit tests for new calculations
5. Update documentation (README, CLAUDE.md)

### Running Tests

```bash
# Run all tests
flutter test

# Run specific test file
flutter test test/utils/fibonacci_calculator_test.dart

# Run with coverage
flutter test --coverage
```

### Code Style

- Use Flutter/Dart conventions
- Maximum 500 lines per file
- Comment complex logic with `// Reason:` prefix
- No hardcoded values (use ConfigLoader)
- Comprehensive error handling

## 🔧 Troubleshooting

### API Errors

**"API Rate Limit exceeded"**
- **Cause**: Exceeded 5 calls/minute or 500 calls/day
- **Solution**: Wait 1 minute, then retry. Consider upgrading to paid plan for higher limits.

**"Invalid API key"**
- **Cause**: Incorrect API key in `.env` file
- **Solution**:
  1. Check `.env` file exists: `ls -la equity_analyzer/.env`
  2. Verify API key is correct (no extra spaces)
  3. Get new key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)

**"Failed to load data"**
- **Cause**: Network issue or API unavailable
- **Solution**: Check internet connection, try again

### Build Errors

**Linux build fails**
- **Solution**: Install GTK3 dependencies
  ```bash
  sudo apt-get install libgtk-3-dev
  ```

**Web build CORS errors**
- **Cause**: Browser security restrictions
- **Solution**: Use Linux or Android builds, or run with --web-renderer html
  ```bash
  flutter run -d chrome --web-renderer html --web-port=7070
  ```

**Flutter not found**
- **Solution**: Install Flutter SDK
  ```bash
  # Follow: https://docs.flutter.dev/get-started/install
  ```

### Configuration Issues

**.env file not found**
- **Solution**:
  ```bash
  cd equity_analyzer
  cp .env.example .env
  nano .env
  ```

**Port 7070 already in use**
- **Solution**:
  1. Find process using port: `lsof -i :7070`
  2. Kill process: `kill -9 <PID>`
  3. Or change port in `config.yaml` (update everywhere)

## 📚 Resources

### Official Documentation
- [Alpha Vantage API Documentation](https://www.alphavantage.co/documentation/)
- [Flutter Documentation](https://docs.flutter.dev/)
- [Dart Language Tour](https://dart.dev/guides/language/language-tour)

### Technical Analysis Resources
- [Fibonacci Retracement Guide](https://www.investopedia.com/terms/f/fibonacciretracement.asp)
- [Technical Analysis Basics](https://www.investopedia.com/terms/t/technicalanalysis.asp)
- [Candlestick Patterns](https://www.investopedia.com/trading/candlestick-charting-what-is-it/)

### Inspiration
- [TradingView Platform](https://www.tradingview.com/)

## 🤝 Contributing

This project follows strict coding standards:

1. **No hardcoded values**: Everything in configuration files
2. **500-line file limit**: Refactor if files get too large
3. **Unit tests required**: For all calculations and business logic
4. **Documentation**: Update README and CLAUDE.md for changes
5. **Environment variables**: All secrets in `.env` (gitignored)
6. **Port 7070**: Web application must run on port 7070

## 📝 License

This project is for educational and analysis purposes.

## 🎯 Project Goals

### Completed ✅
- Multi-platform Flutter application (Web, Linux, Android)
- Real-time AAPL stock data from Alpha Vantage
- Automatic Fibonacci retracement calculation and visualization
- TradingView-inspired professional UI
- Configuration-driven architecture
- Secure environment variable management
- Comprehensive documentation
- Unit test coverage

### Future Enhancements 🔮
- Support for multiple stock symbols (watchlist)
- More technical indicators (RSI, MACD, Bollinger Bands)
- Multiple timeframe support (1m, 5m, 15m, 1H, 4H, 1D, 1W, 1M)
- Drawing tools (trendlines, horizontal lines, annotations)
- Chart export functionality (PNG/SVG)
- Price alerts at Fibonacci levels
- Historical data caching to reduce API calls
- Mobile-responsive design improvements
- Paper trading simulator
- News integration

## 🌟 Highlights

- **Zero-cost operation**: Free Alpha Vantage API tier
- **Production-ready**: Environment variable configuration
- **Industry best practices**: 12-factor app methodology
- **Comprehensive testing**: Unit tests with edge case coverage
- **Professional UI**: TradingView-inspired design
- **Modular architecture**: Clean separation of concerns
- **Multi-platform**: Single codebase for web, desktop, mobile

---

**Built with Flutter | Powered by Alpha Vantage | Inspired by TradingView**

For detailed application documentation, see [`equity_analyzer/README.md`](equity_analyzer/README.md)

For quick setup, see [`equity_analyzer/QUICKSTART.md`](equity_analyzer/QUICKSTART.md)
