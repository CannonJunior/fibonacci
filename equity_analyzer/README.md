# Equity Analyzer

A professional equity analysis application built with Flutter and Dart, featuring a TradingView-style interface with advanced Fibonacci retracement tools for technical stock analysis.

## Overview

Equity Analyzer is a multi-platform (Web, Linux Desktop, Android) application designed for analyzing Apple Inc. (AAPL) stock using real-time market data and technical analysis tools, specifically focusing on Fibonacci retracement levels.

### Key Features

- **Real-Time Stock Data**: Integration with Alpha Vantage API for live AAPL stock prices
- **Interactive Candlestick Charts**: Professional candlestick chart visualization with OHLC data
- **Fibonacci Retracement Tools**: Automatic calculation and visualization of key Fibonacci levels:
  - 0% (Swing Low/High)
  - 23.6% (Minor retracement)
  - 38.2% (Shallow retracement)
  - 50% (Midpoint)
  - 61.8% (Golden Ratio - most important level)
  - 78.6% (Deep retracement)
  - 100% (Swing High/Low)
- **TradingView-Inspired UI**: Dark theme with professional trading interface design
- **Multi-Platform Support**: Run on web (Chrome), Linux desktop, or Android devices
- **Configuration-Driven**: All settings loaded from `config.yaml` (no hardcoded values)

## Architecture

### Project Structure

```
lib/
├── main.dart                          # Application entry point
├── config/
│   └── config_loader.dart             # YAML configuration loader
├── models/
│   ├── stock_data.dart                # Stock data model
│   ├── candle_data.dart               # Candlestick OHLC model
│   └── fibonacci_level.dart           # Fibonacci level models
├── services/
│   └── stock_data_service.dart        # Alpha Vantage API integration
├── utils/
│   └── fibonacci_calculator.dart      # Fibonacci calculation logic
├── widgets/
│   ├── chart_widget.dart              # Candlestick chart widget
│   ├── fibonacci_overlay.dart         # Fibonacci levels display
│   └── toolbar.dart                   # Chart controls toolbar
├── screens/
│   └── chart_screen.dart              # Main chart screen
└── constants/
    └── theme_constants.dart           # Theme colors and styles
```

### Technology Stack

- **Framework**: Flutter 3.35.5
- **Language**: Dart 3.9.2
- **Chart Library**: candlesticks 2.1.0, fl_chart 0.68.0
- **HTTP Client**: http 1.5.0
- **Configuration**: YAML 3.1.3
- **State Management**: Provider 6.1.5
- **API**: Alpha Vantage (free tier)

## Installation & Setup

### Prerequisites

- Flutter SDK 3.35.5 or higher
- Dart 3.9.2 or higher
- For Web: Chrome browser
- For Linux: GTK3 development libraries
- For Android: Android SDK (API level 21+)

### Installation Steps

1. **Clone the repository**
   ```bash
   cd /home/junior/src/fibonacci/equity_analyzer
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Configure API Key**

   Get a free API key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key) and update `config.yaml`:

   ```yaml
   api:
     alpha_vantage:
       api_key: "YOUR_API_KEY_HERE"
   ```

   Or use the `.env` file:
   ```bash
   echo "ALPHA_VANTAGE_API_KEY=your_key_here" > .env
   ```

4. **Verify configuration**

   Check `config.yaml` for:
   - Port configuration (default: 8888)
   - Stock symbol (default: AAPL)
   - Fibonacci levels and colors
   - Chart theme settings

## Running the Application

### Web (Chrome) - Default Port 8888

```bash
flutter run -d chrome --web-port=8888
```

### Linux Desktop

```bash
flutter run -d linux
```

### Android (with device/emulator connected)

```bash
flutter run -d android
```

### Build for Production

**Web Build:**
```bash
flutter build web --release
```

**Linux Build:**
```bash
flutter build linux --release
```

**Android Build:**
```bash
flutter build apk --release
```

## Configuration

All application settings are stored in `config.yaml`. **Never hardcode values** - always use configuration.

### Key Configuration Sections

#### App Settings
```yaml
app:
  name: "Equity Analyzer"
  version: "1.0.0"
  port: 8888  # CRITICAL: Always use port 8888
```

#### Stock Data
```yaml
stock:
  default_symbol: "AAPL"
  refresh_interval_seconds: 60
```

#### Fibonacci Levels
```yaml
fibonacci:
  levels: [0.0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0]
  colors:
    level_618: "#00FFFF"  # Golden ratio color
```

#### Chart Theme
```yaml
chart:
  candlestick:
    bull_color: "#26A69A"  # Green
    bear_color: "#EF5350"  # Red
  background_color: "#131722"  # TradingView dark theme
```

## Usage

### Viewing Stock Data

1. Launch the application
2. Wait for AAPL data to load from Alpha Vantage
3. View candlestick chart with current price, change, and trend

### Fibonacci Retracement Analysis

The application automatically:
- Identifies swing high and swing low points
- Calculates Fibonacci retracement levels
- Overlays levels on the chart
- Displays level prices and percentages

**Key Fibonacci Level Meanings:**
- **61.8% (Golden Ratio)**: Most important support/resistance level
- **50%**: Psychological midpoint
- **38.2%**: Shallow retracement, strong trend
- **23.6%**: Minor pullback

### Controls

- **Fibonacci Toggle**: Click chart icon in toolbar to show/hide levels
- **Refresh**: Click refresh icon to reload latest data
- **Interactive Chart**: Pan and zoom on the candlestick chart

## API Usage & Limits

### Alpha Vantage Free Tier
- **Rate Limit**: 5 API calls per minute
- **Daily Limit**: 500 API calls per day
- **Function Used**: `TIME_SERIES_DAILY`

### Handling Rate Limits

The application implements:
- Error handling for API limits
- User-friendly error messages
- Manual refresh to conserve API calls

## Testing

Run unit tests for Fibonacci calculations:

```bash
flutter test test/utils/fibonacci_calculator_test.dart
```

Test coverage includes:
- Uptrend/downtrend retracement calculations
- Swing point detection
- Fibonacci extension levels
- Edge cases and error handling

## Fibonacci Retracement Technical Details

### Calculation Method

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
- Identify potential support and resistance zones
- Set take-profit targets
- Place stop-loss orders
- Confirm trend strength

The **61.8% level** (golden ratio) is considered the most reliable for reversals.

## Troubleshooting

### API Errors

**Error: "API Rate Limit exceeded"**
- Solution: Wait 1 minute between requests or upgrade to paid plan

**Error: "Invalid API key"**
- Solution: Check `config.yaml` and verify your Alpha Vantage API key

### Build Errors

**Linux build fails**
- Solution: Install GTK3 dependencies
  ```bash
  sudo apt-get install libgtk-3-dev
  ```

**Web build CORS errors**
- Solution: API calls may be blocked. Use Linux/Android builds instead.

## Development

### Adding New Features

1. Update `TASK.md` with task description
2. Follow modular architecture (max 500 lines per file)
3. Store all configuration in `config.yaml`
4. Write unit tests for new calculations
5. Update this README

### Code Style

- Use Flutter/Dart conventions
- Maximum 500 lines per file
- Comment complex logic with `// Reason:` prefix
- No hardcoded values (use `ConfigLoader`)

## Port Configuration - CRITICAL

**This application MUST run on port 8888.** Never change the port without explicit user permission.

To verify port:
```bash
grep "port:" config.yaml
```

## License

This project is for educational and analysis purposes.

## Resources

- [Alpha Vantage API Documentation](https://www.alphavantage.co/documentation/)
- [Fibonacci Retracement Guide](https://www.investopedia.com/terms/f/fibonacciretracement.asp)
- [Flutter Documentation](https://docs.flutter.dev/)
- [TradingView Platform](https://www.tradingview.com/)

## Contributing

When contributing:
1. Never hardcode values
2. Follow the 500-line file limit
3. Add unit tests
4. Update TASK.md
5. Maintain configuration-driven design

---

**Built with Flutter | Powered by Alpha Vantage | Inspired by TradingView**
