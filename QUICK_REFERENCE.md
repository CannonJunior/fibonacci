# Quick Reference Card

## 🚀 One-Line Start

```bash
./start.sh
```

That's it! The script handles everything automatically.

---

## 📋 Manual Commands

### First-Time Setup
```bash
cd equity_analyzer
cp .env.example .env
nano .env  # Add your API key
flutter pub get
```

### Running the App
```bash
# Web (Chrome) - Port 7070
flutter run -d chrome --web-port=7070

# Linux Desktop
flutter run -d linux

# Android
flutter run -d android
```

### Building for Production
```bash
flutter build web --release        # Web
flutter build linux --release      # Linux
flutter build apk --release        # Android
```

---

## 🔑 Get Your Free API Key

1. Visit: https://www.alphavantage.co/support/#api-key
2. Enter your email
3. Receive instant API key
4. Add to `.env`: `ALPHA_VANTAGE_API_KEY=your_key_here`

---

## 📁 Project Files

- **README.md** - Full project documentation
- **start.sh** - Quick start script
- **equity_analyzer/** - Main application
  - **README.md** - Detailed app documentation
  - **QUICKSTART.md** - Quick setup guide
  - **config.yaml** - Configuration (no secrets)
  - **.env** - Your API keys (gitignored)
  - **.env.example** - Template

---

## 🎯 What You Get

✓ Real-time AAPL stock data
✓ Interactive candlestick charts
✓ Fibonacci retracement levels (0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%)
✓ TradingView-style dark theme
✓ Multi-platform support (Web, Linux, Android)

---

## 🔧 Common Issues

**Port already in use:**
```bash
lsof -i :7070
kill -9 <PID>
```

**Missing dependencies:**
```bash
flutter pub get
```

**API key issues:**
```bash
# Check .env exists
ls -la equity_analyzer/.env

# Verify API key (no extra spaces!)
cat equity_analyzer/.env | grep ALPHA_VANTAGE
```

---

## 📊 Understanding Fibonacci Levels

- **61.8% (Golden Ratio)**: Most important - strong support/resistance
- **50%**: Psychological midpoint
- **38.2%**: Shallow retracement - strong trend
- **23.6%**: Minor pullback

---

## 💡 Pro Tips

1. **Refresh sparingly**: Free tier = 5 calls/min, 500/day
2. **Toggle Fibonacci**: Click chart icon to show/hide levels
3. **Golden ratio matters**: 61.8% is the most reliable level
4. **Watch for reversals**: Price bouncing at Fibonacci levels

---

**For full documentation, see README.md**
