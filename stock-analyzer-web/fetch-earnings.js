#!/usr/bin/env node

/**
 * Multi-provider earnings data fetching system
 * Supports: API Ninjas, EODHD, Financial Modeling Prep with automatic fallback
 */

const db = require('./database');

// Reason: Load API keys from environment
require('dotenv').config();
const API_NINJAS_KEY = process.env.API_NINJAS_KEY;
const EODHD_API_KEY = process.env.EODHD_API_KEY;
const FMP_API_KEY = process.env.FMP_API_KEY;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

/**
 * Fetch earnings data using AlphaVantage (Best - returns 20+ quarters)
 * Returns: fiscalDateEnding, reportedDate, reportedEPS, estimatedEPS, surprise, surprisePercentage
 */
async function fetchFromAlphaVantage(symbol) {
    if (!ALPHA_VANTAGE_API_KEY) {
        throw new Error('ALPHA_VANTAGE_API_KEY not configured');
    }

    console.log(`  Trying AlphaVantage for ${symbol}...`);
    const url = `https://www.alphavantage.co/query?function=EARNINGS&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`AlphaVantage request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data['Note']) {
        throw new Error('AlphaVantage API limit reached');
    }

    if (!data.quarterlyEarnings || data.quarterlyEarnings.length === 0) {
        return [];
    }

    // Reason: Transform AlphaVantage format to our schema
    return data.quarterlyEarnings.map(earning => {
        const actual = parseFloat(earning.reportedEPS) || 0;
        const estimate = parseFloat(earning.estimatedEPS) || actual;
        const surprise = parseFloat(earning.surprise) || (actual - estimate);
        const surprisePercent = parseFloat(earning.surprisePercentage) ||
            (estimate !== 0 ? (surprise / estimate) * 100 : 0);

        return {
            period: earning.fiscalDateEnding,
            quarter: extractQuarter(earning.fiscalDateEnding),
            year: extractYear(earning.fiscalDateEnding),
            actual: actual,
            estimate: estimate,
            surprise: surprise,
            surprisePercent: parseFloat(surprisePercent.toFixed(2)),
            reportDate: earning.reportedDate
        };
    }).sort((a, b) => new Date(a.period) - new Date(b.period)); // Sort chronologically
}

/**
 * Fetch earnings data using API Ninjas
 * Returns: date, actual_eps, estimated_eps, actual_revenue, estimated_revenue
 * Note: API Ninjas only returns recent earnings, need to fetch historical separately
 */
async function fetchFromApiNinjas(symbol) {
    if (!API_NINJAS_KEY) {
        throw new Error('API_NINJAS_KEY not configured');
    }

    console.log(`  Trying API Ninjas for ${symbol}...`);

    // Reason: API Ninjas doesn't support historical ranges, fetch most recent
    const url = `https://api.api-ninjas.com/v1/earningscalendar?ticker=${symbol}`;
    const response = await fetch(url, {
        headers: { 'X-Api-Key': API_NINJAS_KEY }
    });

    if (!response.ok) {
        throw new Error(`API Ninjas request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }

    // Reason: Transform API Ninjas format to our schema
    return data.map(earning => {
        const actual = earning.actual_eps || 0;
        const estimate = earning.estimated_eps || actual;
        const surprise = actual - estimate;
        const surprisePercent = estimate !== 0 ? (surprise / estimate) * 100 : 0;

        return {
            period: earning.date, // Use report date as period for now
            quarter: extractQuarter(earning.date),
            year: extractYear(earning.date),
            actual: actual,
            estimate: estimate,
            surprise: surprise,
            surprisePercent: parseFloat(surprisePercent.toFixed(2)),
            reportDate: earning.date
        };
    });
}

/**
 * Fetch earnings data using EODHD
 * Returns: report_date, date (period), actual, estimate, difference, percent
 */
async function fetchFromEODHD(symbol) {
    if (!EODHD_API_KEY) {
        throw new Error('EODHD_API_KEY not configured');
    }

    console.log(`  Trying EODHD for ${symbol}...`);
    // Reason: EODHD uses format like AAPL.US
    const eodhdSymbol = `${symbol}.US`;

    // Reason: Fetch last 5 years of earnings data
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 5);
    const fromStr = fromDate.toISOString().split('T')[0];

    const url = `https://eodhd.com/api/calendar/earnings?symbols=${eodhdSymbol}&from=${fromStr}&api_token=${EODHD_API_KEY}&fmt=json`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`EODHD request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || !data.earnings || data.earnings.length === 0) {
        return [];
    }

    // Reason: Transform EODHD format to our schema
    return data.earnings.map(earning => {
        const actual = parseFloat(earning.actual) || 0;
        const estimate = parseFloat(earning.estimate) || actual;
        const surprise = actual - estimate;
        const surprisePercent = estimate !== 0 ? (surprise / estimate) * 100 : 0;

        return {
            period: earning.date, // Fiscal period end date
            quarter: extractQuarter(earning.date),
            year: extractYear(earning.date),
            actual: actual,
            estimate: estimate,
            surprise: surprise,
            surprisePercent: parseFloat(surprisePercent.toFixed(2)),
            reportDate: earning.report_date
        };
    }).sort((a, b) => new Date(a.period) - new Date(b.period)); // Sort by period
}

/**
 * Fetch earnings data using Financial Modeling Prep
 * Returns: date, eps, epsEstimated, and other fields
 */
async function fetchFromFMP(symbol) {
    if (!FMP_API_KEY) {
        throw new Error('FMP_API_KEY not configured');
    }

    console.log(`  Trying Financial Modeling Prep for ${symbol}...`);
    // Reason: Request 80 records to cover ~20 quarters (4 per year * 5 years)
    const url = `https://financialmodelingprep.com/api/v3/historical/earning_calendar/${symbol}?limit=80&apikey=${FMP_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`FMP request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }

    // Reason: Transform FMP format to our schema
    return data.map(earning => {
        const actual = parseFloat(earning.eps) || 0;
        const estimate = parseFloat(earning.epsEstimated) || actual;
        const surprise = actual - estimate;
        const surprisePercent = estimate !== 0 ? (surprise / estimate) * 100 : 0;

        return {
            period: earning.fiscalDateEnding || earning.date,
            quarter: earning.quarter || extractQuarter(earning.fiscalDateEnding || earning.date),
            year: earning.year || extractYear(earning.fiscalDateEnding || earning.date),
            actual: actual,
            estimate: estimate,
            surprise: surprise,
            surprisePercent: parseFloat(surprisePercent.toFixed(2)),
            reportDate: earning.date
        };
    }).sort((a, b) => new Date(a.period) - new Date(b.period));
}

/**
 * Fetch earnings data with automatic fallback across multiple providers
 * @param {string} symbol - Stock symbol (e.g., 'AAPL', 'NVDA')
 * @param {boolean} saveToDb - Whether to save to database (default: true)
 * @returns {Promise<Array>} Array of earnings records
 */
async function fetchEarningsData(symbol, saveToDb = true) {
    console.log(`\nFetching earnings data for ${symbol}...`);

    // Reason: Try providers in order of reliability and data quality
    // AlphaVantage is best: returns 20+ quarters with all fields we need
    const providers = [
        { name: 'AlphaVantage', fn: fetchFromAlphaVantage, enabled: !!ALPHA_VANTAGE_API_KEY },
        { name: 'EODHD', fn: fetchFromEODHD, enabled: !!EODHD_API_KEY },
        { name: 'API Ninjas', fn: fetchFromApiNinjas, enabled: !!API_NINJAS_KEY },
        { name: 'Financial Modeling Prep', fn: fetchFromFMP, enabled: !!FMP_API_KEY }
    ];

    let lastError = null;

    for (const provider of providers) {
        if (!provider.enabled) {
            console.log(`  Skipping ${provider.name}: API key not configured`);
            continue;
        }

        try {
            const earnings = await provider.fn(symbol);

            if (earnings && earnings.length > 0) {
                console.log(`✓ Successfully fetched ${earnings.length} earnings records from ${provider.name}`);

                // Save to database if requested
                if (saveToDb) {
                    db.saveEarnings(symbol, earnings);
                    console.log(`✓ Saved earnings data to database for ${symbol}`);
                }

                return earnings;
            } else {
                console.log(`  ${provider.name} returned no data for ${symbol}`);
            }
        } catch (error) {
            console.log(`  ${provider.name} failed: ${error.message}`);
            lastError = error;
        }
    }

    // Reason: All providers failed
    if (lastError) {
        throw new Error(`All providers failed. Last error: ${lastError.message}`);
    } else {
        throw new Error('No earnings data available from any provider');
    }
}

/**
 * Extract quarter from period string (e.g., '2023-03-31' -> 1)
 */
function extractQuarter(period) {
    const month = parseInt(period.split('-')[1]);
    return Math.ceil(month / 3);
}

/**
 * Extract year from period string (e.g., '2023-03-31' -> 2023)
 */
function extractYear(period) {
    return parseInt(period.split('-')[0]);
}

/**
 * Fetch daily time series from Alpha Vantage
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Time series data keyed by date
 */
async function fetchDailyTimeSeries(symbol) {
    const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
    if (!ALPHA_VANTAGE_API_KEY) {
        throw new Error('ALPHA_VANTAGE_API_KEY not configured');
    }

    console.log(`Fetching full daily time series from Alpha Vantage for ${symbol}...`);
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Alpha Vantage request failed: ${response.status}`);
    }

    const json = await response.json();
    if (json['Time Series (Daily)']) {
        const count = Object.keys(json['Time Series (Daily)']).length;
        console.log(`✓ Fetched ${count} days of historical data`);
        return json['Time Series (Daily)'];
    } else if (json['Note']) {
        throw new Error('Alpha Vantage API limit reached');
    } else {
        throw new Error('No time series data found');
    }
}

/**
 * Get next trading day (skip weekends/holidays)
 * @param {string} dateStr - Starting date
 * @param {Object} timeSeries - Time series data
 * @returns {string|null} Next trading day date string
 */
function getNextTradingDay(dateStr, timeSeries) {
    const date = new Date(dateStr);

    for (let i = 1; i <= 7; i++) {
        date.setDate(date.getDate() + 1);
        const nextDateStr = date.toISOString().split('T')[0];

        if (timeSeries[nextDateStr]) {
            return nextDateStr;
        }
    }

    return null;
}

/**
 * Add stock prices to earnings records
 * @param {string} symbol - Stock symbol
 * @param {Array} earnings - Earnings records
 * @returns {Promise<Array>} Earnings with stock prices added
 */
async function addStockPrices(symbol, earnings) {
    if (earnings.length === 0) {
        return earnings;
    }

    console.log(`\nAdding stock prices for ${earnings.length} earnings records...`);

    try {
        const timeSeries = await fetchDailyTimeSeries(symbol);
        const updatedEarnings = [];

        for (const earning of earnings) {
            if (!earning.reportDate) {
                console.log(`⚠ No report date for ${earning.period}, skipping prices`);
                updatedEarnings.push(earning);
                continue;
            }

            // Get report date data
            let reportData = timeSeries[earning.reportDate];

            // If report was after market close, use next trading day
            if (!reportData) {
                const nextDay = getNextTradingDay(earning.reportDate, timeSeries);
                if (nextDay && timeSeries[nextDay]) {
                    earning.reportDate = nextDay;
                    reportData = timeSeries[nextDay];
                }
            }

            if (reportData) {
                earning.reportDayOpen = parseFloat(reportData['1. open']);
                earning.reportDayClose = parseFloat(reportData['4. close']);

                // Get next trading day
                const nextDay = getNextTradingDay(earning.reportDate, timeSeries);
                if (nextDay && timeSeries[nextDay]) {
                    const nextData = timeSeries[nextDay];
                    earning.nextDayOpen = parseFloat(nextData['1. open']);
                    earning.nextDayClose = parseFloat(nextData['4. close']);

                    // Calculate changes
                    const reportChange = ((earning.reportDayClose - earning.reportDayOpen) / earning.reportDayOpen * 100);
                    const nextDayChange = ((earning.nextDayClose - earning.nextDayOpen) / earning.nextDayOpen * 100);

                    console.log(`  ${earning.period}: Report ${reportChange >= 0 ? '+' : ''}${reportChange.toFixed(2)}%, Next ${nextDayChange >= 0 ? '+' : ''}${nextDayChange.toFixed(2)}%`);
                }
            }

            updatedEarnings.push(earning);
        }

        const withPrices = updatedEarnings.filter(e => e.reportDayOpen && e.nextDayOpen).length;
        console.log(`✓ Added stock prices to ${withPrices}/${earnings.length} records`);

        return updatedEarnings;

    } catch (error) {
        console.log(`⚠ Could not fetch stock prices: ${error.message}`);
        console.log(`  Continuing without stock prices...`);
        return earnings;
    }
}

/**
 * Fetch earnings with stock prices for report dates
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Array>} Earnings with stock price data
 */
async function fetchEarningsWithPrices(symbol) {
    // First fetch earnings data (don't save yet)
    const earnings = await fetchEarningsData(symbol, false);

    if (earnings.length === 0) {
        return [];
    }

    // Add stock prices
    const earningsWithPrices = await addStockPrices(symbol, earnings);

    // Save to database
    db.saveEarnings(symbol, earningsWithPrices);
    console.log(`✓ Saved complete earnings data for ${symbol}`);

    return earningsWithPrices;
}

// Reason: Allow running as standalone script or importing as module
if (require.main === module) {
    const symbol = process.argv[2] || 'AAPL';

    // Use fetchEarningsWithPrices to get complete data
    fetchEarningsWithPrices(symbol)
        .then(earnings => {
            console.log('\n=== Summary ===');
            if (earnings.length > 0) {
                const beats = earnings.filter(e => e.surprise > 0).length;
                const misses = earnings.filter(e => e.surprise < 0).length;
                const meets = earnings.filter(e => e.surprise === 0).length;

                console.log(`  Total: ${earnings.length}`);
                console.log(`  Beats: ${beats}`);
                console.log(`  Misses: ${misses}`);
                console.log(`  Meets: ${meets}`);

                if (earnings.length > 0) {
                    const avgSurprise = earnings.reduce((sum, e) => sum + e.surprisePercent, 0) / earnings.length;
                    console.log(`  Avg Surprise: ${avgSurprise.toFixed(2)}%`);
                }

                // Show first and last earnings
                console.log(`\n  First: ${earnings[0].period} (Q${earnings[0].quarter} ${earnings[0].year})`);
                console.log(`  Last: ${earnings[earnings.length - 1].period} (Q${earnings[earnings.length - 1].quarter} ${earnings[earnings.length - 1].year})`);

                // Show stock price data status
                const withPrices = earnings.filter(e => e.reportDayOpen && e.nextDayOpen).length;
                console.log(`\n  With stock prices: ${withPrices}/${earnings.length}`);
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    fetchEarningsData,
    fetchEarningsWithPrices
};
