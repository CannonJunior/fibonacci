# Quick Start Guide

## Get Your API Key (Required)

1. Visit https://www.alphavantage.co/support/#api-key
2. Enter your email to get a **FREE** API key
3. Copy the API key you receive

## Configure API Key

### Option 1: Update config.yaml (Recommended for development)

```bash
nano config.yaml
```

Find this line and replace `YOUR_API_KEY_HERE` with your actual key:
```yaml
api_key: "YOUR_API_KEY_HERE"
```

### Option 2: Use Environment Variable

```bash
echo "ALPHA_VANTAGE_API_KEY=your_actual_key_here" > .env
```

## Run the Application

### Web (Chrome) - Runs on Port 8888

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

## What You'll See

1. **Loading Screen**: App fetches latest AAPL stock data
2. **Chart Display**: Interactive candlestick chart with price data
3. **Fibonacci Levels**: Automatically calculated and overlaid on chart
4. **Stock Info**: Current price, change, and trend at the top

## Controls

- **Chart Icon** (top right): Toggle Fibonacci levels on/off
- **Refresh Icon**: Reload latest stock data
- **Chart**: Zoom and pan to explore data

## Fibonacci Levels Explained

- **0%** & **100%**: Swing low and swing high
- **23.6%**: Minor retracement
- **38.2%**: Shallow retracement
- **50%**: Psychological midpoint
- **61.8%**: 🌟 **GOLDEN RATIO** - Most important level
- **78.6%**: Deep retracement

## Troubleshooting

### "API Rate Limit exceeded"
- **Free tier**: 5 calls/minute, 500 calls/day
- **Solution**: Wait 1 minute between refreshes

### "Invalid API key"
- Check that you updated `config.yaml` with your actual key
- Ensure no extra spaces or quotes

### Chart not loading
- Check internet connection
- Verify API key is valid
- Check browser console (F12) for errors

## Demo Mode

If you don't have an API key yet, the app uses `demo` mode which provides sample data.

## Next Steps

- Explore the Fibonacci levels by toggling them on/off
- Try different timeframes (coming soon)
- Check out README.md for full documentation
- Add more stocks to analyze (coming soon)

---

**Enjoy analyzing Apple stock with Fibonacci retracement! 📈**
