// API module for fetching stock data
const API = {
    // Cache for intraday data to prevent repeat fetches
    intradayCache: new Map(),

    /**
     * Fetch daily stock data from Alpha Vantage
     * @param {string} symbol - Stock symbol (e.g., 'AAPL')
     * @param {string} outputSize - 'compact' (100 days) or 'full' (20+ years)
     * @returns {Promise<Array>} Array of candle data
     */
    async fetchDailyData(symbol = CONFIG.stock.symbol, outputSize = 'full') {
        const url = `${CONFIG.api.baseUrl}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputSize}&apikey=${CONFIG.api.key}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            // Check for API errors
            if (data['Error Message']) {
                throw new Error(`API Error: ${data['Error Message']}`);
            }

            if (data['Note']) {
                throw new Error(`API Rate Limit: ${data['Note']}. Please add your own API key in js/config.js`);
            }

            const timeSeries = data['Time Series (Daily)'];
            if (!timeSeries) {
                throw new Error('Invalid API response: Missing time series data. Please check your API key.');
            }

            // Convert to array format
            const candles = [];
            for (const [dateStr, values] of Object.entries(timeSeries)) {
                candles.push({
                    date: new Date(dateStr),
                    open: parseFloat(values['1. open']),
                    high: parseFloat(values['2. high']),
                    low: parseFloat(values['3. low']),
                    close: parseFloat(values['4. close']),
                    volume: parseInt(values['5. volume'])
                });
            }

            // Sort by date (oldest first)
            candles.sort((a, b) => a.date - b.date);

            // Filter to past 5 years
            const fiveYearsAgo = new Date();
            fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
            const filteredCandles = candles.filter(c => c.date > fiveYearsAgo);

            return filteredCandles;
        } catch (error) {
            console.error('Error fetching stock data:', error);
            throw error;
        }
    },

    /**
     * Format date for display
     * @param {Date} date
     * @returns {string}
     */
    formatDate(date) {
        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    },

    /**
     * Format short date for axis
     * @param {Date} date
     * @returns {string}
     */
    formatShortDate(date) {
        // Reason: Check if time is midnight (00:00:00), if so, it's daily data
        const hours = date.getHours();
        const minutes = date.getMinutes();

        if (hours === 0 && minutes === 0) {
            // Daily data - show date only
            return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
        } else {
            // Intraday data - show time only
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
    },

    /**
     * Fetch intraday stock data (15-minute intervals)
     * @param {string} symbol - Stock symbol (e.g., 'AAPL')
     * @param {Date} targetDate - The date for which to fetch intraday data
     * @returns {Promise<Array>} Array of candle data for that day
     */
    async fetchIntradayData(symbol = CONFIG.stock.symbol, targetDate) {
        // Reason: Create cache key based on symbol and date to prevent repeat fetches
        const dateStr = targetDate.toISOString().split('T')[0];
        const cacheKey = `${symbol}_${dateStr}`;

        // Check if data is already cached
        if (this.intradayCache.has(cacheKey)) {
            console.log(`Using cached intraday data for ${symbol} on ${dateStr}`);
            return this.intradayCache.get(cacheKey);
        }

        const url = `${CONFIG.api.baseUrl}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=15min&outputsize=full&apikey=${CONFIG.api.key}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            // Check for API errors
            if (data['Error Message']) {
                throw new Error(`API Error: ${data['Error Message']}`);
            }

            if (data['Note']) {
                throw new Error(`API Rate Limit: ${data['Note']}. Please add your own API key in js/config.js`);
            }

            const timeSeries = data['Time Series (15min)'];
            if (!timeSeries) {
                throw new Error('Invalid API response: Missing intraday time series data.');
            }

            // Convert to array format and filter for target date
            const candles = [];
            for (const [timestampStr, values] of Object.entries(timeSeries)) {
                const timestamp = new Date(timestampStr);
                const candleDateStr = timestamp.toISOString().split('T')[0];

                // Only include candles from the target date
                if (candleDateStr === dateStr) {
                    candles.push({
                        date: timestamp,
                        open: parseFloat(values['1. open']),
                        high: parseFloat(values['2. high']),
                        low: parseFloat(values['3. low']),
                        close: parseFloat(values['4. close']),
                        volume: parseInt(values['5. volume'])
                    });
                }
            }

            // Sort by time (earliest first)
            candles.sort((a, b) => a.date - b.date);

            // Reason: Cache the data to prevent repeat API calls
            this.intradayCache.set(cacheKey, candles);

            return candles;
        } catch (error) {
            console.error('Error fetching intraday data:', error);
            throw error;
        }
    },

    /**
     * Check if intraday data exists for a given date
     * @param {string} symbol - Stock symbol
     * @param {Date} targetDate - The date to check
     * @returns {boolean} True if cached data exists
     */
    hasIntradayData(symbol, targetDate) {
        const dateStr = targetDate.toISOString().split('T')[0];
        const cacheKey = `${symbol}_${dateStr}`;
        return this.intradayCache.has(cacheKey);
    }
};
