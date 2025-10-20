# Stock Analyzer v2.0

A pure web application for analyzing AAPL stock data with interactive Fibonacci retracement levels.

## Features

✅ **Year of Real AAPL Data** - Fetches past year of daily stock data from Alpha Vantage API
✅ **Interactive D3.js Chart** - Beautiful candlestick chart with smooth animations
✅ **Mouseover Tooltip** - Hover over any candle to see OHLC data
✅ **Click-to-Recalculate Fibonacci** - Click any candle to recalculate Fibonacci levels from that point
✅ **Clean X-Axis** - Only ~6 date labels to avoid overcrowding
✅ **Fibonacci Levels Panel** - Shows all 7 standard Fibonacci retracement levels
✅ **Responsive Design** - Works on desktop and mobile browsers

## Technology Stack

- **HTML5** - Structure
- **CSS3** - Modern styling with dark theme
- **JavaScript (ES6+)** - Application logic
- **D3.js v7** - Data visualization and interactions
- **Alpha Vantage API** - Real-time stock data

## Quick Start

**IMPORTANT:** You MUST add your Alpha Vantage API key first!

1. **Get a FREE API key:**
   - Visit https://www.alphavantage.co/support/#api-key
   - Sign up for a free API key (takes 30 seconds)

2. **Add your API key:**
   - Edit `js/config.js`
   - Replace `'demo'` with your actual API key:
   ```javascript
   api: {
       key: 'YOUR_ACTUAL_API_KEY_HERE'
   }
   ```

3. **Start the server:**
   ```bash
   ./start.sh
   ```

4. **Open your browser:**
   ```
   http://localhost:7070
   ```

The application will automatically load AAPL data and display the interactive chart.

## Project Structure

```
stock-analyzer-web/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # All styling
├── js/
│   ├── config.js       # Configuration (API keys, settings)
│   ├── api.js          # API calls to Alpha Vantage
│   ├── fibonacci.js    # Fibonacci calculation logic
│   ├── chart.js        # D3.js chart rendering
│   └── app.js          # Main application controller
├── start.sh            # Start script
└── README.md           # This file
```

## How to Use

### View Stock Data
- The chart automatically loads with one year of AAPL data
- Hover over any candlestick to see detailed OHLC information
- Current price and change are displayed at the top

### Interactive Fibonacci
- Fibonacci levels are calculated automatically from swing high/low
- **Click any candle** to recalculate Fibonacci levels:
  - Click above midpoint → sets new swing high
  - Click below midpoint → sets new swing low
- Toggle Fibonacci display with the button in the header

### Refresh Data
- Click the **Refresh** button to reload latest data from API

## Configuration

Edit `js/config.js` to customize:

- **API Key**: Replace `'demo'` with your Alpha Vantage API key
- **Stock Symbol**: Change from AAPL to any symbol
- **Fibonacci Levels**: Customize ratios and colors
- **Chart Settings**: Adjust margins, candle width, axis ticks

## API Setup (REQUIRED)

**This application uses ONLY real data from Alpha Vantage - NO sample data!**

1. Get a free API key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. Edit `js/config.js`:
   ```javascript
   api: {
       key: 'YOUR_API_KEY_HERE'  // Replace with your actual key
   }
   ```

**Note:** The demo key will NOT work - you must use your own API key.

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Any modern browser with ES6+ support

## Port Configuration

The application runs on **port 7070** by default. To change:

1. Edit `start.sh`:
   ```bash
   python3 -m http.server YOUR_PORT
   ```

## No Dependencies to Install

This is a pure web application - no npm, no build process, no compilation. Just open in a browser and it works!

## Version History

**v2.0** - Complete rewrite using HTML/CSS/JavaScript with D3.js
- Removed Flutter/Dart dependencies
- Added smooth D3.js animations and transitions
- Improved interactivity and responsiveness
- Cleaner, more maintainable code

## License

MIT License - Feel free to use and modify as needed.
