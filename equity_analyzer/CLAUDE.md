# Equity Analyzer - Claude Instructions

## Project Overview
Flutter-based equity analysis application with TradingView-style interface, focused on Apple (AAPL) stock analysis with Fibonacci retracement tools.

## Port Management - CRITICAL
- **ALWAYS run this web application on port 7070 ONLY.** Never change the port without explicit user permission.
- Port configuration is stored in `config.yaml` - never hardcode the port value
- Default server port is 7070 - maintain this consistency across all sessions

## Technology Stack
- **Frontend Framework**: Flutter 3.35.5 / Dart 3.9.2
- **Platforms**: Web (Chrome), Linux Desktop, Android
- **Chart Library**: fl_chart / candlesticks (open-source)
- **Stock Data API**: Alpha Vantage (free tier) / Finnhub
- **State Management**: Provider / Riverpod
- **Configuration**: YAML-based (config.yaml)

## Architecture Patterns
- **No Hardcoded Values**: All configuration in config.yaml
- **Environment Variable Security**: API keys stored in `.env` (gitignored), referenced in config.yaml as `${VAR_NAME}`
- **Modular Structure**:
  - `lib/models/` - Data models (StockData, FibonacciLevel, CandleData)
  - `lib/services/` - API services (StockDataService)
  - `lib/widgets/` - Reusable UI components (ChartWidget, FibonacciOverlay)
  - `lib/screens/` - Main screens (ChartScreen)
  - `lib/utils/` - Helper functions (FibonacciCalculator, ConfigLoader)
  - `lib/constants/` - Theme colors and constants from config

## API Keys & Secrets Management - CRITICAL
- **NEVER commit API keys to git**: All secrets go in `.env` file
- **config.yaml uses environment variable references**: `${ALPHA_VANTAGE_API_KEY}`
- **ConfigLoader expands variables**: Automatically replaces `${VAR}` with actual values from `.env`
- **.env is gitignored**: Secrets are never committed to version control
- **.env.example provided**: Template file showing required environment variables
- **Setup process**:
  1. Copy `.env.example` to `.env`
  2. Add actual API keys to `.env`
  3. ConfigLoader reads `.env` and expands variables in config.yaml at runtime

## Code Quality Standards
- **Maximum file length**: 500 lines
- **Testing**: Unit tests for all calculations and services
- **Documentation**: Inline comments for complex logic with `// Reason:` prefix
- **Error Handling**: Comprehensive error handling for API failures

## Development Workflow
1. Always load configuration from `config.yaml` using `yaml` package
2. Never hardcode API keys, colors, or thresholds
3. Use async/await for all API calls with proper error handling
4. Implement responsive design for all platforms (web, desktop, mobile)
5. Test on Chrome web first, then Linux desktop, then Android

## Fibonacci Retracement Rules
- Standard levels: 0%, 23.6%, 38.2%, 50%, 61.8% (golden), 78.6%, 100%
- Draw from swing low to swing high in uptrend
- Draw from swing high to swing low in downtrend
- 61.8% level is the most critical "golden retracement"
- All levels and colors configured in config.yaml

## Real Data Only
- **NEVER USE FICTIONAL DATA**: All stock data must come from real APIs
- Use Apple (AAPL) as the default stock symbol
- Implement proper error messages when API limits are reached
- Cache data appropriately to minimize API calls

## Testing Requirements
- Unit tests for Fibonacci calculations in `test/utils/fibonacci_calculator_test.dart`
- Widget tests for chart components
- Integration tests for API service
- Test edge cases: market closed, API failures, invalid data

## Dependencies to Add
```yaml
dependencies:
  fl_chart: ^0.68.0  # Chart library
  http: ^1.2.0  # HTTP client for API calls
  yaml: ^3.1.2  # YAML config parser
  provider: ^6.1.1  # State management
  intl: ^0.19.0  # Date/number formatting
```

## Platform-Specific Notes
- **Web**: Run with `flutter run -d chrome --web-port=7070`
- **Linux**: Ensure GTK3 dependencies are installed
- **Android**: Configure minimum SDK version 21+

## File Structure
```
lib/
├── main.dart
├── config/
│   └── config_loader.dart
├── models/
│   ├── stock_data.dart
│   ├── candle_data.dart
│   └── fibonacci_level.dart
├── services/
│   └── stock_data_service.dart
├── utils/
│   └── fibonacci_calculator.dart
├── widgets/
│   ├── chart_widget.dart
│   ├── fibonacci_overlay.dart
│   └── toolbar.dart
├── screens/
│   └── chart_screen.dart
└── constants/
    └── theme_constants.dart
```

## API Usage Notes
- Alpha Vantage free tier: 5 API requests per minute, 500 per day
- Implement rate limiting and caching to stay within limits
- Provide clear user feedback when API quota is reached
- Fallback to demo mode if API is unavailable (with clear warning)
