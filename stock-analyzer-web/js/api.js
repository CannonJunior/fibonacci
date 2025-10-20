// API module for fetching stock data
const API = {
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

            // Filter to past year
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const filteredCandles = candles.filter(c => c.date > oneYearAgo);

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
        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    }
};
