#!/usr/bin/env node

/**
 * Add stock prices to earnings data using Alpha Vantage
 * Fetches all historical daily data and matches to report dates
 */

const https = require('https');
const db = require('./database');
require('dotenv').config({ path: '../equity_analyzer/.env' });

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '2JEMDO5WDU215FP1';
const SYMBOL = 'AAPL';

// Fetch full daily time series from Alpha Vantage
function fetchDailyTimeSeries() {
    return new Promise((resolve, reject) => {
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${SYMBOL}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;

        console.log('Fetching full daily time series from Alpha Vantage...');

        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json['Time Series (Daily)']) {
                        resolve(json['Time Series (Daily)']);
                    } else {
                        reject(new Error('No time series data found'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Get next business day (skip weekends)
function getNextTradingDay(dateStr, timeSeries) {
    const date = new Date(dateStr);

    for (let i = 1; i <= 7; i++) {  // Look ahead up to 7 days
        date.setDate(date.getDate() + 1);
        const nextDateStr = date.toISOString().split('T')[0];

        if (timeSeries[nextDateStr]) {
            return nextDateStr;
        }
    }

    return null;
}

// Main function
async function addEarningsStockPrices() {
    try {
        // Fetch full time series
        const timeSeries = await fetchDailyTimeSeries();
        console.log(`✓ Fetched ${Object.keys(timeSeries).length} days of historical data\n`);

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

            // Get report date data
            let reportData = timeSeries[earning.reportDate];

            // If report was after market close, earnings impact shows next day
            if (!reportData) {
                console.log(`  ⚠ No data for ${earning.reportDate}, trying next trading day...`);
                const nextDay = getNextTradingDay(earning.reportDate, timeSeries);

                if (nextDay && timeSeries[nextDay]) {
                    earning.reportDate = nextDay;
                    reportData = timeSeries[nextDay];
                    console.log(`  ✓ Using ${nextDay} as report date`);
                }
            }

            if (reportData) {
                earning.reportDayOpen = parseFloat(reportData['1. open']);
                earning.reportDayClose = parseFloat(reportData['4. close']);

                console.log(`  Report day: Open $${earning.reportDayOpen.toFixed(2)}, Close $${earning.reportDayClose.toFixed(2)}`);

                // Get next trading day
                const nextDay = getNextTradingDay(earning.reportDate, timeSeries);

                if (nextDay && timeSeries[nextDay]) {
                    const nextData = timeSeries[nextDay];
                    earning.nextDayOpen = parseFloat(nextData['1. open']);
                    earning.nextDayClose = parseFloat(nextData['4. close']);

                    console.log(`  Next day (${nextDay}): Open $${earning.nextDayOpen.toFixed(2)}, Close $${earning.nextDayClose.toFixed(2)}`);

                    // Calculate price changes
                    const reportChange = ((earning.reportDayClose - earning.reportDayOpen) / earning.reportDayOpen * 100);
                    const nextDayChange = ((earning.nextDayClose - earning.nextDayOpen) / earning.nextDayOpen * 100);
                    const overallChange = ((earning.nextDayClose - earning.reportDayOpen) / earning.reportDayOpen * 100);

                    console.log(`  📊 Report day change: ${reportChange >= 0 ? '+' : ''}${reportChange.toFixed(2)}%`);
                    console.log(`  📊 Next day change: ${nextDayChange >= 0 ? '+' : ''}${nextDayChange.toFixed(2)}%`);
                    console.log(`  📊 Overall (2-day): ${overallChange >= 0 ? '+' : ''}${overallChange.toFixed(2)}%`);
                    console.log(`  ✓ Success`);

                    updatedEarnings.push(earning);
                } else {
                    console.log(`  ⚠ Could not find next trading day`);
                }
            } else {
                console.log(`  ✗ No data found for ${earning.reportDate}`);
            }
        }

        // Save all updated data
        if (updatedEarnings.length > 0) {
            console.log(`\n\nSaving ${updatedEarnings.length} updated records...`);
            db.saveEarnings(SYMBOL, updatedEarnings);
            console.log('✓ All data saved successfully!');
        }

        // Summary
        const complete = updatedEarnings.filter(e => e.reportDayOpen && e.nextDayOpen).length;
        console.log(`\nSummary:`);
        console.log(`  Total earnings: ${earnings.length}`);
        console.log(`  Updated with prices: ${complete}`);

        // Show average price reaction
        if (complete > 0) {
            const avgReportDayChange = updatedEarnings.reduce((sum, e) => {
                if (e.reportDayOpen && e.reportDayClose) {
                    return sum + ((e.reportDayClose - e.reportDayOpen) / e.reportDayOpen * 100);
                }
                return sum;
            }, 0) / complete;

            const avgNextDayChange = updatedEarnings.reduce((sum, e) => {
                if (e.nextDayOpen && e.nextDayClose) {
                    return sum + ((e.nextDayClose - e.nextDayOpen) / e.nextDayOpen * 100);
                }
                return sum;
            }, 0) / complete;

            console.log(`\nAverage Price Reactions:`);
            console.log(`  Report day: ${avgReportDayChange >= 0 ? '+' : ''}${avgReportDayChange.toFixed(2)}%`);
            console.log(`  Next day: ${avgNextDayChange >= 0 ? '+' : ''}${avgNextDayChange.toFixed(2)}%`);
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run
addEarningsStockPrices()
    .then(() => {
        console.log('\n✓ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n✗ Fatal error:', error);
        process.exit(1);
    });
