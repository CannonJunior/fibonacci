/**
 * Multi-provider API system with automatic fallback
 * Supports Finnhub (primary), Alpha Vantage (backup), and extensible architecture
 */

class APIProviderManager {
    constructor() {
        // Rate limit tracking
        this.rateLimits = {
            finnhub: { calls: 0, resetTime: Date.now() + 60000, limit: 60 },
            alphaVantage: { calls: 0, resetTime: Date.now() + 60000, limit: 5 }
        };

        // Provider priority (1 = highest)
        this.providers = [
            { name: 'finnhub', priority: 1, enabled: true },
            { name: 'alphaVantage', priority: 2, enabled: true }
        ];
    }

    /**
     * Check if a provider can be used (not rate limited)
     */
    canUseProvider(providerName) {
        const tracker = this.rateLimits[providerName];
        if (!tracker) return false;

        // Reset counter if time window has passed
        if (Date.now() >= tracker.resetTime) {
            tracker.calls = 0;
            tracker.resetTime = Date.now() + 60000;
        }

        return tracker.calls < tracker.limit;
    }

    /**
     * Record an API call for rate limiting
     */
    recordCall(providerName) {
        const tracker = this.rateLimits[providerName];
        if (tracker) {
            tracker.calls++;
        }
    }

    /**
     * Get sorted providers by priority (highest first)
     */
    getSortedProviders() {
        return this.providers
            .filter(p => p.enabled)
            .sort((a, b) => a.priority - b.priority);
    }

    /**
     * Fetch daily data with automatic fallback
     */
    async fetchDailyData(symbol) {
        const providers = this.getSortedProviders();
        let lastError = null;

        for (const provider of providers) {
            if (!this.canUseProvider(provider.name)) {
                console.log(`Skipping ${provider.name}: rate limit reached`);
                continue;
            }

            try {
                console.log(`Attempting to fetch ${symbol} from ${provider.name}...`);
                this.recordCall(provider.name);

                let data;
                if (provider.name === 'finnhub') {
                    data = await this.fetchFromFinnhub(symbol);
                } else if (provider.name === 'alphaVantage') {
                    data = await this.fetchFromAlphaVantage(symbol);
                }

                if (data && data.length > 0) {
                    console.log(`Successfully fetched ${data.length} candles from ${provider.name}`);
                    return data;
                }
            } catch (error) {
                console.error(`${provider.name} failed:`, error.message);
                lastError = error;

                // If rate limit error, mark as such
                if (error.message.includes('rate limit') || error.message.includes('429')) {
                    this.rateLimits[provider.name].calls = this.rateLimits[provider.name].limit;
                }
            }
        }

        throw new Error(`All providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    /**
     * Fetch data from Finnhub API
     */
    async fetchFromFinnhub(symbol) {
        const apiKey = CONFIG.api.finnhubKey;
        if (!apiKey || apiKey === 'demo') {
            throw new Error('Finnhub API key not configured');
        }

        // Get candles for past 5 years
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = Math.floor((Date.now() - (5 * 365 * 24 * 60 * 60 * 1000)) / 1000);

        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${startDate}&to=${endDate}&token=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        // Reason: Check for access denied error (free tier doesn't include candle data)
        if (data.error) {
            throw new Error(`Finnhub access denied: ${data.error} (Historical candle data requires paid plan)`);
        }

        if (data.s === 'no_data') {
            throw new Error('No data available from Finnhub');
        }

        if (data.s !== 'ok') {
            throw new Error(`Finnhub API error: ${data.s}`);
        }

        // Convert Finnhub format to our format
        const candles = [];
        for (let i = 0; i < data.t.length; i++) {
            candles.push({
                date: new Date(data.t[i] * 1000),
                open: data.o[i],
                high: data.h[i],
                low: data.l[i],
                close: data.c[i],
                volume: data.v[i]
            });
        }

        return candles;
    }

    /**
     * Fetch data from Alpha Vantage API
     */
    async fetchFromAlphaVantage(symbol) {
        const apiKey = CONFIG.api.key;
        if (!apiKey || apiKey === 'demo') {
            throw new Error('Alpha Vantage API key not configured');
        }

        const url = `${CONFIG.api.baseUrl}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data['Error Message']) {
            throw new Error(`API Error: ${data['Error Message']}`);
        }

        if (data['Note']) {
            throw new Error(`API Rate Limit: ${data['Note']}`);
        }

        const timeSeries = data['Time Series (Daily)'];
        if (!timeSeries) {
            throw new Error('Invalid API response: Missing time series data');
        }

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
        return candles.filter(c => c.date > fiveYearsAgo);
    }

    /**
     * Fetch company overview with fallback
     */
    async fetchCompanyOverview(symbol) {
        const providers = this.getSortedProviders();
        let lastError = null;

        for (const provider of providers) {
            if (!this.canUseProvider(provider.name)) continue;

            try {
                this.recordCall(provider.name);

                if (provider.name === 'finnhub') {
                    return await this.fetchFinnhubProfile(symbol);
                } else if (provider.name === 'alphaVantage') {
                    return await this.fetchAlphaVantageOverview(symbol);
                }
            } catch (error) {
                console.error(`❌ ${provider.name} overview failed:`, error.message);
                lastError = error;
            }
        }

        throw new Error(`All providers failed. Last error: ${lastError?.message || 'Unknown'}`);
    }

    /**
     * Fetch company profile from Finnhub
     */
    async fetchFinnhubProfile(symbol) {
        const apiKey = CONFIG.api.finnhubKey;
        const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        // Reason: Check for API errors
        if (data.error) {
            throw new Error(`Finnhub API error: ${data.error}`);
        }

        if (!data || Object.keys(data).length === 0) {
            throw new Error('No profile data from Finnhub');
        }

        // Reason: Normalize Finnhub data to our expected format
        return {
            symbol: data.ticker || symbol,
            name: data.name || symbol,
            marketCap: (data.marketCapitalization || 0) * 1000000, // Finnhub returns in millions
            peRatio: data.peNTM || 0,
            dividendYield: (data.dividendYield || 0) * 100, // Finnhub returns as decimal (0.02), we want percentage (2)
            dividendPerShare: 0, // Not available in basic Finnhub profile
            week52High: data.week52High || 0,
            week52Low: data.week52Low || 0,
            beta: data.beta || 0,
            eps: data.eps || 0,
            bookValue: 0, // Not available in basic Finnhub profile
            profitMargin: 0, // Not available in basic Finnhub profile
            operatingMarginTTM: 0 // Not available in basic Finnhub profile
        };
    }

    /**
     * Fetch company overview from Alpha Vantage
     */
    async fetchAlphaVantageOverview(symbol) {
        const apiKey = CONFIG.api.key;
        const url = `${CONFIG.api.baseUrl}?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data || !data.Symbol) {
            throw new Error('No overview data from Alpha Vantage');
        }

        return {
            symbol: data.Symbol,
            name: data.Name || symbol,
            marketCap: parseFloat(data.MarketCapitalization) || 0,
            peRatio: parseFloat(data.PERatio) || 0,
            dividendYield: parseFloat(data.DividendYield) || 0,
            dividendPerShare: parseFloat(data.DividendPerShare) || 0,
            week52High: parseFloat(data['52WeekHigh']) || 0,
            week52Low: parseFloat(data['52WeekLow']) || 0,
            beta: parseFloat(data.Beta) || 0,
            eps: parseFloat(data.EPS) || 0,
            bookValue: parseFloat(data.BookValue) || 0,
            profitMargin: parseFloat(data.ProfitMargin) || 0,
            operatingMarginTTM: parseFloat(data.OperatingMarginTTM) || 0
        };
    }

    /**
     * Fetch income statements with fallback
     */
    async fetchIncomeStatements(symbol) {
        const providers = this.getSortedProviders();
        let lastError = null;

        for (const provider of providers) {
            if (!this.canUseProvider(provider.name)) continue;

            try {
                this.recordCall(provider.name);

                if (provider.name === 'finnhub') {
                    return await this.fetchFinnhubFinancials(symbol);
                } else if (provider.name === 'alphaVantage') {
                    return await this.fetchAlphaVantageIncomeStatements(symbol);
                }
            } catch (error) {
                console.error(`❌ ${provider.name} income statements failed:`, error.message);
                lastError = error;
            }
        }

        throw new Error(`All providers failed. Last error: ${lastError?.message || 'Unknown'}`);
    }

    /**
     * Fetch financial statements from Finnhub
     * Reason: Finnhub returns GAAP concepts in an array format, not simple fields
     */
    async fetchFinnhubFinancials(symbol) {
        const apiKey = CONFIG.api.finnhubKey;
        const url = `https://finnhub.io/api/v1/stock/financials-reported?symbol=${symbol}&token=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        // Reason: Check for API errors
        if (data.error) {
            throw new Error(`Finnhub API error: ${data.error}`);
        }

        if (!data || !data.data || data.data.length === 0) {
            throw new Error('No financial data from Finnhub');
        }

        // Reason: Extract income statements from reported financials (last 8 quarters/years)
        const statements = [];
        for (let i = 0; i < Math.min(8, data.data.length); i++) {
            const report = data.data[i];
            const ic = report.report?.ic || []; // Income statement is an array

            // Reason: Only process quarterly reports (quarter > 0) or annual reports (quarter = 0)
            // Skip if no income statement data
            if (!ic || ic.length === 0) {
                console.warn(`No income statement data for ${symbol} period ${report.endDate}`);
                continue;
            }

            statements.push({
                fiscalDateEnding: report.endDate?.split(' ')[0] || report.endDate,
                totalRevenue: this.findFinancialValueByGAAP(ic, [
                    'us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax',
                    'us-gaap_Revenues',
                    'us-gaap_SalesRevenueNet'
                ]) || 0,
                operatingExpenses: this.findFinancialValueByGAAP(ic, [
                    'us-gaap_OperatingExpenses',
                    'us-gaap_CostsAndExpenses'
                ]) || 0,
                netIncome: this.findFinancialValueByGAAP(ic, [
                    'us-gaap_NetIncomeLoss',
                    'us-gaap_ProfitLoss'
                ]) || 0,
                ebitda: 0, // Reason: EBITDA not directly in GAAP, would need calculation
                eps: this.findFinancialValueByGAAP(ic, [
                    'us-gaap_EarningsPerShareDiluted',
                    'us-gaap_EarningsPerShareBasic'
                ]) || 0,
                grossProfit: this.findFinancialValueByGAAP(ic, [
                    'us-gaap_GrossProfit'
                ]) || 0
            });
        }

        if (statements.length === 0) {
            throw new Error('No valid quarterly/annual reports found in Finnhub data');
        }

        return statements;
    }

    /**
     * Helper to find financial values in Finnhub GAAP concept array
     * Reason: Finnhub returns data as array of {concept, value, label} objects
     */
    findFinancialValueByGAAP(incomeStatementArray, gaapConcepts) {
        if (!Array.isArray(incomeStatementArray)) {
            return 0;
        }

        for (const concept of gaapConcepts) {
            const item = incomeStatementArray.find(entry => entry.concept === concept);
            if (item && item.value !== undefined && item.value !== null) {
                return parseFloat(item.value) || 0;
            }
        }
        return 0;
    }

    /**
     * Fetch income statements from Alpha Vantage
     */
    async fetchAlphaVantageIncomeStatements(symbol) {
        const apiKey = CONFIG.api.key;
        const url = `${CONFIG.api.baseUrl}?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.quarterlyReports || data.quarterlyReports.length === 0) {
            throw new Error('No income statement data from Alpha Vantage');
        }

        return data.quarterlyReports.slice(0, 8).map(report => ({
            fiscalDateEnding: report.fiscalDateEnding,
            totalRevenue: parseFloat(report.totalRevenue) || 0,
            operatingExpenses: parseFloat(report.operatingExpenses) || 0,
            netIncome: parseFloat(report.netIncome) || 0,
            ebitda: parseFloat(report.ebitda) || 0,
            eps: 0, // Alpha Vantage doesn't include EPS in income statement
            grossProfit: parseFloat(report.grossProfit) || 0
        }));
    }

    /**
     * Get current rate limit status for display
     */
    getRateLimitStatus() {
        const status = {};
        for (const [provider, tracker] of Object.entries(this.rateLimits)) {
            const remaining = Math.max(0, tracker.limit - tracker.calls);
            const resetIn = Math.max(0, Math.ceil((tracker.resetTime - Date.now()) / 1000));
            status[provider] = {
                remaining,
                limit: tracker.limit,
                resetIn
            };
        }
        return status;
    }
}

// Export for use in api.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIProviderManager;
}
