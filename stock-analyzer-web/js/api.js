// API module for fetching stock data
const API = {
    // Cache for intraday data to prevent repeat fetches
    intradayCache: new Map(),

    // Multi-provider manager
    providerManager: null,

    /**
     * Initialize the multi-provider system
     */
    initProviders() {
        if (!this.providerManager) {
            this.providerManager = new APIProviderManager();
        }
    },

    /**
     * Fetch daily stock data from database first, then use multi-provider system
     * @param {string} symbol - Stock symbol (e.g., 'AAPL')
     * @param {string} outputSize - 'compact' (100 days) or 'full' (20+ years)
     * @returns {Promise<Array>} Array of candle data
     */
    async fetchDailyData(symbol = CONFIG.stock.symbol, outputSize = 'full') {
        // Initialize provider manager if not already done
        this.initProviders();

        // Reason: Check database first to avoid unnecessary API calls
        try {
            const dbResponse = await fetch(`/api/get-daily?symbol=${symbol}`);
            const dbResult = await dbResponse.json();

            if (dbResult.data && dbResult.data.length > 0) {
                console.log(`✓ Loaded ${dbResult.data.length} candles for ${symbol} from database`);
                // Convert date strings back to Date objects
                return dbResult.data.map(candle => ({
                    ...candle,
                    date: new Date(candle.date)
                }));
            }
        } catch (error) {
            console.log('Database lookup failed, fetching from API:', error.message);
        }

        // Fetch from multi-provider system with automatic fallback
        try {
            console.log(`🔄 Fetching ${symbol} data using multi-provider system...`);
            const candles = await this.providerManager.fetchDailyData(symbol);

            if (candles && candles.length > 0) {
                // Reason: Save to database for future use
                this.saveDailyDataToDatabase(symbol, candles);
                return candles;
            }

            throw new Error('No data returned from providers');
        } catch (error) {
            console.error('❌ Error fetching stock data from all providers:', error);
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

            // Reason: Save to database for persistence
            this.saveIntradayDataToDatabase(symbol, candles);

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
    },

    /**
     * Save daily data to database
     * @param {string} symbol - Stock symbol
     * @param {Array} candles - Candle data
     */
    async saveDailyDataToDatabase(symbol, candles) {
        try {
            // Convert candles to database format
            const dbCandles = candles.map(c => ({
                date: c.date.toISOString().split('T')[0],
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume
            }));

            const response = await fetch('/api/save-daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, candles: dbCandles })
            });

            if (response.ok) {
                console.log(`Saved ${candles.length} candles for ${symbol} to database`);
            }
        } catch (error) {
            console.error('Failed to save to database:', error);
        }
    },

    /**
     * Fetch company overview data (market cap, P/E, etc.)
     * @param {string} symbol - Stock symbol
     * @returns {Promise<Object>} Company overview data
     */
    async fetchCompanyOverview(symbol) {
        // Initialize provider manager if not already done
        this.initProviders();

        try {
            console.log(`🔄 Fetching company overview for ${symbol} using multi-provider system...`);
            return await this.providerManager.fetchCompanyOverview(symbol);
        } catch (error) {
            console.error('❌ Error fetching company overview from all providers:', error);
            throw error;
        }
    },

    /**
     * Fetch quarterly income statements
     * @param {string} symbol - Stock symbol
     * @returns {Promise<Array>} Array of quarterly income statements
     */
    async fetchIncomeStatement(symbol) {
        // Initialize provider manager if not already done
        this.initProviders();

        try {
            console.log(`🔄 Fetching income statements for ${symbol} using multi-provider system...`);
            return await this.providerManager.fetchIncomeStatements(symbol);
        } catch (error) {
            console.error('❌ Error fetching income statements from all providers:', error);
            throw error;
        }
    },

    /**
     * Calculate year-over-year changes from quarterly reports
     * @param {Array} quarterlyReports - Array of quarterly reports
     * @returns {Object} YoY changes
     */
    calculateYoYChanges(quarterlyReports) {
        if (quarterlyReports.length < 5) {
            return null;
        }

        // Compare most recent quarter (Q0) with same quarter last year (Q4)
        const current = quarterlyReports[0];
        const yearAgo = quarterlyReports[4];

        const calculateChange = (current, previous) => {
            if (!previous || previous === 0) return null;
            return ((current - previous) / Math.abs(previous)) * 100;
        };

        const calculateMargin = (netIncome, revenue) => {
            if (!revenue || revenue === 0) return null;
            return (netIncome / revenue) * 100;
        };

        return {
            revenueChange: calculateChange(current.totalRevenue, yearAgo.totalRevenue),
            operatingExpensesChange: calculateChange(current.operatingExpenses, yearAgo.operatingExpenses),
            netIncomeChange: calculateChange(current.netIncome, yearAgo.netIncome),
            netProfitMargin: calculateMargin(current.netIncome, current.totalRevenue),
            netProfitMarginChange: calculateChange(
                calculateMargin(current.netIncome, current.totalRevenue),
                calculateMargin(yearAgo.netIncome, yearAgo.totalRevenue)
            ),
            epsChange: calculateChange(current.eps, yearAgo.eps),
            ebitdaChange: calculateChange(current.ebitda, yearAgo.ebitda)
        };
    },

    /**
     * Save intraday data to database
     * @param {string} symbol - Stock symbol
     * @param {Array} candles - Intraday candle data
     */
    async saveIntradayDataToDatabase(symbol, candles) {
        try {
            // Convert candles to database format
            const dbCandles = candles.map(c => ({
                timestamp: c.date.toISOString(),
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume
            }));

            const response = await fetch('/api/save-intraday', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, candles: dbCandles })
            });

            if (response.ok) {
                console.log(`Saved ${candles.length} intraday candles for ${symbol} to database`);
            }
        } catch (error) {
            console.error('Failed to save intraday data to database:', error);
        }
    }
};
