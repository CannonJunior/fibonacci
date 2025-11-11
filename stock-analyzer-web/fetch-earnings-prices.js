#!/usr/bin/env node

/**
 * Fetch stock prices for AAPL earnings report dates
 * Fetches opening and closing prices for:
 * - Report date
 * - Next trading day after report
 */

const https = require('https');
const db = require('./database');
require('dotenv').config({ path: '../equity_analyzer/.env' });

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd1q08thr01qhcce48vvgd1q08thr01qhcce49000';
const SYMBOL = 'AAPL';

// Helper function to fetch data from Finnhub
function fetchFromFinnhub(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Helper to get next business day (skip weekends)
function getNextTradingDay(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() + 1);

    // Skip weekend
    while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
    }

    return date.toISOString().split('T')[0];
}

// Convert date to Unix timestamp
function dateToUnix(dateStr) {
    return Math.floor(new Date(dateStr + 'T00:00:00').getTime() / 1000);
}

// Fetch daily candle for a specific date
async function fetchDailyCandle(symbol, date) {
    const from = dateToUnix(date);
    const to = from + 86400; // +1 day

    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;

    console.log(`Fetching data for ${date}...`);
    const data = await fetchFromFinnhub(url);

    if (data.s === 'ok' && data.o && data.o.length > 0) {
        return {
            open: data.o[0],
            close: data.c[0],
            high: data.h[0],
            low: data.l[0]
        };
    }

    return null;
}

// Main function
async function fetchEarningsPrices() {
    console.log('Fetching stock prices for earnings report dates...\n');

    // Get earnings data
    const earnings = db.getEarnings(SYMBOL);
    console.log(`Found ${earnings.length} earnings records\n`);

    const updatedEarnings = [];

    for (const earning of earnings) {
        if (!earning.reportDate) {
            console.log(`⚠ No report date for ${earning.period}, skipping`);
            continue;
        }

        console.log(`\nProcessing Q${earning.quarter} ${earning.year} (${earning.period})`);
        console.log(`Report date: ${earning.reportDate}`);

        try {
            // Fetch report date prices
            const reportDayData = await fetchDailyCandle(SYMBOL, earning.reportDate);

            if (!reportDayData) {
                console.log(`  ⚠ No data for report date ${earning.reportDate}`);
                // Try next day if report was after market close
                const nextDay = getNextTradingDay(earning.reportDate);
                const nextDayAttempt = await fetchDailyCandle(SYMBOL, nextDay);

                if (nextDayAttempt) {
                    console.log(`  ✓ Using next day ${nextDay} as report day`);
                    earning.reportDate = nextDay;
                    earning.reportDayOpen = nextDayAttempt.open;
                    earning.reportDayClose = nextDayAttempt.close;
                } else {
                    console.log(`  ✗ Could not find data for ${earning.reportDate} or next day`);
                    await new Promise(resolve => setTimeout(resolve, 1100)); // Rate limit
                    continue;
                }
            } else {
                earning.reportDayOpen = reportDayData.open;
                earning.reportDayClose = reportDayData.close;
                console.log(`  Report day: Open $${reportDayData.open.toFixed(2)}, Close $${reportDayData.close.toFixed(2)}`);
            }

            // Wait to respect rate limit
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Fetch next trading day prices
            const nextTradingDay = getNextTradingDay(earning.reportDate);
            console.log(`  Next trading day: ${nextTradingDay}`);

            const nextDayData = await fetchDailyCandle(SYMBOL, nextTradingDay);

            if (nextDayData) {
                earning.nextDayOpen = nextDayData.open;
                earning.nextDayClose = nextDayData.close;
                console.log(`  Next day: Open $${nextDayData.open.toFixed(2)}, Close $${nextDayData.close.toFixed(2)}`);

                // Calculate price changes
                const reportChange = ((earning.reportDayClose - earning.reportDayOpen) / earning.reportDayOpen * 100).toFixed(2);
                const nextDayChange = ((earning.nextDayClose - earning.nextDayOpen) / earning.nextDayOpen * 100).toFixed(2);
                const overallChange = ((earning.nextDayClose - earning.reportDayOpen) / earning.reportDayOpen * 100).toFixed(2);

                console.log(`  📊 Report day change: ${reportChange}%`);
                console.log(`  📊 Next day change: ${nextDayChange}%`);
                console.log(`  📊 Overall change: ${overallChange}%`);
                console.log(`  ✓ Success`);
            } else {
                console.log(`  ⚠ No data for next trading day ${nextTradingDay}`);
            }

            updatedEarnings.push(earning);

            // Wait to respect rate limit
            await new Promise(resolve => setTimeout(resolve, 1100));

        } catch (error) {
            console.error(`  ✗ Error: ${error.message}`);
        }
    }

    // Save updated data
    console.log(`\n\nSaving ${updatedEarnings.length} updated records...`);
    db.saveEarnings(SYMBOL, updatedEarnings);
    console.log('✓ All data saved successfully!');

    // Summary
    const complete = updatedEarnings.filter(e => e.reportDayOpen && e.nextDayOpen).length;
    console.log(`\nSummary:`);
    console.log(`  Total records: ${earnings.length}`);
    console.log(`  Updated: ${updatedEarnings.length}`);
    console.log(`  Complete (with prices): ${complete}`);
}

// Run
fetchEarningsPrices()
    .then(() => {
        console.log('\n✓ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n✗ Fatal error:', error);
        process.exit(1);
    });
