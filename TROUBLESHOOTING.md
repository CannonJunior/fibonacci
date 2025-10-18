# Troubleshooting Guide

## 🐛 Common Issues and Solutions

### Error: "type 'String' is not a subtype of type 'Map<String, dynamic>'"

**Symptom:**
```
DartError: Exception: Failed to load config.yaml:
TypeError: "Equity Analyzer": type 'String' is not a subtype of type 'Map<String, dynamic>'
```

**Cause:**
The `config_loader.dart` file had a type mismatch in the `_convertYamlToMap` method.

**Solution:**
✅ **FIXED** - This has been corrected in the latest version. The method now returns `dynamic` instead of `Map<String, dynamic>` to properly handle scalar values.

If you still see this error:
```bash
cd equity_analyzer
flutter clean
flutter pub get
./start.sh
```

---

### Error: "Failed to load config.yaml"

**Symptom:**
Application fails to start with config loading error.

**Possible Causes:**
1. Invalid YAML syntax in `config.yaml`
2. Missing `config.yaml` file
3. Environment variables not properly formatted

**Solution:**
```bash
# Verify config.yaml exists
ls -la equity_analyzer/config.yaml

# Check YAML syntax
cat equity_analyzer/config.yaml | head -20

# Ensure environment variables use ${VAR_NAME} format
grep "api_key:" equity_analyzer/config.yaml
# Should show: api_key: "${ALPHA_VANTAGE_API_KEY}"
```

---

### Error: "Invalid API key" or "API Rate Limit exceeded"

**Symptom:**
- "API Error: Invalid API key"
- "API Rate Limit: Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute..."

**Solution:**

**For Invalid API Key:**
```bash
# 1. Verify .env file exists
ls -la equity_analyzer/.env

# 2. Check API key is set correctly (no extra spaces)
cat equity_analyzer/.env | grep ALPHA_VANTAGE

# 3. Get a new free API key
# Visit: https://www.alphavantage.co/support/#api-key

# 4. Update .env file
nano equity_analyzer/.env
# Change: ALPHA_VANTAGE_API_KEY=your_actual_key_here
```

**For Rate Limit:**
- Free tier: 5 calls/minute, 500 calls/day
- Wait 1 minute between refresh clicks
- Consider upgrading to paid plan for higher limits

---

### Error: "Port 7070 already in use"

**Symptom:**
```
Exception: Failed to bind to address
```

**Solution:**
```bash
# Find process using port 7070
lsof -i :7070

# Kill the process
kill -9 <PID>

# Or use a different port (not recommended)
# Edit config.yaml and change port value
```

---

### Error: "Flutter not found"

**Symptom:**
```bash
bash: flutter: command not found
```

**Solution:**
```bash
# Install Flutter
# Visit: https://docs.flutter.dev/get-started/install

# Or add Flutter to PATH
export PATH="$PATH:/path/to/flutter/bin"

# Verify installation
flutter --version
```

---

### Error: "CORS errors in browser console"

**Symptom:**
Browser console shows CORS (Cross-Origin Resource Sharing) errors when calling APIs.

**Solution:**
```bash
# Option 1: Use HTML renderer (less CORS restrictions)
flutter run -d chrome --web-renderer html --web-port=7070

# Option 2: Use Linux or Android build instead
flutter run -d linux
```

---

### Error: "GTK3 libraries not found" (Linux Desktop)

**Symptom:**
```
Error: Unable to find suitable GTK3 library
```

**Solution:**
```bash
# Install GTK3 development libraries
sudo apt-get update
sudo apt-get install libgtk-3-dev

# Also install other required libraries
sudo apt-get install clang cmake ninja-build pkg-config libgtk-3-dev
```

---

### Error: ".env file not found"

**Symptom:**
Application starts but uses demo API key.

**Solution:**
```bash
cd equity_analyzer

# Copy template
cp .env.example .env

# Edit and add your API key
nano .env

# Verify
cat .env | grep ALPHA_VANTAGE_API_KEY
```

---

### Error: "Packages out of date"

**Symptom:**
Warnings about outdated packages or dependency conflicts.

**Solution:**
```bash
cd equity_analyzer

# Clean build artifacts
flutter clean

# Get latest compatible versions
flutter pub get

# Check for updates
flutter pub outdated

# Upgrade (if needed)
flutter pub upgrade
```

---

### Error: "Hot reload not working"

**Symptom:**
Changes to code don't appear after pressing 'r'.

**Solution:**
1. **Save your files** - Hot reload only works with saved changes
2. **Press 'r'** in the terminal running Flutter
3. **Try 'R'** for hot restart (full restart)
4. **Stop and restart** if hot reload fails:
   ```bash
   # Press 'q' or Ctrl+C to stop
   ./start.sh  # Start again
   ```

---

### Error: "White screen / blank page"

**Symptom:**
Application loads but shows only white screen.

**Solution:**
```bash
# 1. Check browser console (F12) for errors

# 2. Clear browser cache
# Chrome: Ctrl+Shift+Delete → Clear cache

# 3. Hard reload
# Chrome: Ctrl+Shift+R

# 4. Rebuild application
flutter clean
flutter pub get
flutter run -d chrome --web-port=7070
```

---

### Error: "Configuration not loaded" exception

**Symptom:**
```
Exception: Configuration not loaded. Call ConfigLoader.load() first.
```

**Cause:**
ConfigLoader.load() is not being called before accessing configuration.

**Solution:**
This should not happen in normal use. If it does:

```bash
# Verify main.dart calls ConfigLoader.load()
grep -A 5 "ConfigLoader.load" equity_analyzer/lib/main.dart

# Should show:
# await ConfigLoader.load();
```

If missing, the main.dart file may be corrupted. Check the original file.

---

## 🔍 Debugging Tips

### Enable Verbose Logging

```bash
flutter run -d chrome --web-port=7070 --verbose
```

### Check Browser Console

1. Open Chrome DevTools: **F12** or **Ctrl+Shift+I**
2. Go to **Console** tab
3. Look for error messages in red
4. Check **Network** tab for API call failures

### Verify Configuration Loading

```dart
// Add to lib/main.dart after ConfigLoader.load()
print('Config loaded: ${ConfigLoader.isLoaded}');
print('API key: ${ConfigLoader.getString('api.alpha_vantage.api_key').substring(0, 5)}...');
```

### Test API Connection

```bash
# Test Alpha Vantage API directly
curl "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=YOUR_KEY"
```

---

## 📞 Getting Help

If you're still experiencing issues:

1. **Check the logs**: Look for error messages in the terminal
2. **Browser console**: Press F12 and check for JavaScript errors
3. **Verify files**: Ensure all required files exist:
   ```bash
   ls -la equity_analyzer/config.yaml
   ls -la equity_analyzer/.env
   ls -la equity_analyzer/lib/config/config_loader.dart
   ```

4. **Clean build**: Start fresh
   ```bash
   cd equity_analyzer
   flutter clean
   rm -rf .dart_tool
   flutter pub get
   ./start.sh
   ```

5. **Check Flutter doctor**:
   ```bash
   flutter doctor -v
   ```

---

## ✅ Verification Checklist

Before reporting an issue, verify:

- [ ] Flutter is installed and working: `flutter --version`
- [ ] .env file exists: `ls -la equity_analyzer/.env`
- [ ] API key is set in .env: `cat equity_analyzer/.env | grep ALPHA`
- [ ] config.yaml exists: `ls -la equity_analyzer/config.yaml`
- [ ] Dependencies installed: `cd equity_analyzer && flutter pub get`
- [ ] No syntax errors: `flutter analyze lib/`
- [ ] Port 7070 is free: `lsof -i :7070` (should show nothing)

---

**Last Updated:** 2025-10-18
