#!/usr/bin/env node

/**
 * Populate earnings data for AAPL from 2020-2025
 * Historical data source: AlphaQuery earnings history
 */

const db = require('./database');

// Historical AAPL earnings data (2020-2025) with report dates
const aaplEarnings = [
    // 2020
    { period: '2019-12-31', quarter: 1, year: 2020, actual: 1.25, estimate: 1.13, surprise: 0.12, surprisePercent: 10.6, reportDate: '2020-01-28' },
    { period: '2020-03-31', quarter: 2, year: 2020, actual: 0.64, estimate: 0.52, surprise: 0.12, surprisePercent: 23.1, reportDate: '2020-04-30' },
    { period: '2020-06-30', quarter: 3, year: 2020, actual: 0.64, estimate: 0.51, surprise: 0.13, surprisePercent: 25.5, reportDate: '2020-07-30' },
    { period: '2020-09-30', quarter: 4, year: 2020, actual: 0.73, estimate: 0.69, surprise: 0.04, surprisePercent: 5.8, reportDate: '2020-10-29' },

    // 2021
    { period: '2020-12-31', quarter: 1, year: 2021, actual: 1.68, estimate: 1.41, surprise: 0.27, surprisePercent: 19.1, reportDate: '2021-01-27' },
    { period: '2021-03-31', quarter: 2, year: 2021, actual: 1.40, estimate: 1.00, surprise: 0.40, surprisePercent: 40.0, reportDate: '2021-04-28' },
    { period: '2021-06-30', quarter: 3, year: 2021, actual: 1.30, estimate: 1.00, surprise: 0.30, surprisePercent: 30.0, reportDate: '2021-07-27' },
    { period: '2021-09-30', quarter: 4, year: 2021, actual: 1.24, estimate: 1.24, surprise: 0.00, surprisePercent: 0.0, reportDate: '2021-10-28' },

    // 2022
    { period: '2021-12-31', quarter: 1, year: 2022, actual: 2.10, estimate: 1.89, surprise: 0.21, surprisePercent: 11.1, reportDate: '2022-01-27' },
    { period: '2022-03-31', quarter: 2, year: 2022, actual: 1.52, estimate: 1.43, surprise: 0.09, surprisePercent: 6.3, reportDate: '2022-04-28' },
    { period: '2022-06-30', quarter: 3, year: 2022, actual: 1.20, estimate: 1.14, surprise: 0.06, surprisePercent: 5.3, reportDate: '2022-07-28' },
    { period: '2022-09-30', quarter: 4, year: 2022, actual: 1.29, estimate: 1.26, surprise: 0.03, surprisePercent: 2.4, reportDate: '2022-10-27' },

    // 2023
    { period: '2022-12-31', quarter: 1, year: 2023, actual: 1.88, estimate: 1.93, surprise: -0.05, surprisePercent: -2.6, reportDate: '2023-02-02' },
    { period: '2023-03-31', quarter: 2, year: 2023, actual: 1.52, estimate: 1.44, surprise: 0.08, surprisePercent: 5.6, reportDate: '2023-05-04' },
    { period: '2023-06-30', quarter: 3, year: 2023, actual: 1.26, estimate: 1.19, surprise: 0.07, surprisePercent: 5.9, reportDate: '2023-08-03' },
    { period: '2023-09-30', quarter: 4, year: 2023, actual: 1.46, estimate: 1.39, surprise: 0.07, surprisePercent: 5.0, reportDate: '2023-11-02' },

    // 2024
    { period: '2023-12-31', quarter: 1, year: 2024, actual: 2.18, estimate: 2.09, surprise: 0.09, surprisePercent: 4.3, reportDate: '2024-02-01' },
    { period: '2024-03-31', quarter: 2, year: 2024, actual: 1.53, estimate: 1.51, surprise: 0.02, surprisePercent: 1.3, reportDate: '2024-05-02' },
    { period: '2024-06-30', quarter: 3, year: 2024, actual: 1.40, estimate: 1.34, surprise: 0.06, surprisePercent: 4.5, reportDate: '2024-08-01' },
    { period: '2024-09-30', quarter: 4, year: 2024, actual: 1.64, estimate: 1.49, surprise: 0.15, surprisePercent: 10.1, reportDate: '2024-10-31' },

    // 2025
    { period: '2024-12-31', quarter: 1, year: 2025, actual: 2.40, estimate: 2.36, surprise: 0.04, surprisePercent: 1.7, reportDate: '2025-01-30' },
    { period: '2025-03-31', quarter: 2, year: 2025, actual: 1.65, estimate: 1.61, surprise: 0.04, surprisePercent: 2.5, reportDate: '2025-05-01' },
    { period: '2025-06-30', quarter: 3, year: 2025, actual: 1.57, estimate: 1.42, surprise: 0.15, surprisePercent: 10.6, reportDate: '2025-07-31' },
    { period: '2025-09-30', quarter: 4, year: 2025, actual: 1.85, estimate: 1.73, surprise: 0.12, surprisePercent: 6.9, reportDate: '2025-10-30' }
];

console.log('Populating AAPL earnings data...');
console.log(`Total records: ${aaplEarnings.length}`);

try {
    db.saveEarnings('AAPL', aaplEarnings);
    console.log('✓ Successfully populated AAPL earnings data');

    // Verify the data
    const savedData = db.getEarnings('AAPL');
    console.log(`✓ Verified: ${savedData.length} earnings records saved`);

    // Show summary
    const beats = savedData.filter(e => e.surprise > 0).length;
    const misses = savedData.filter(e => e.surprise < 0).length;
    const meets = savedData.filter(e => e.surprise === 0).length;

    console.log('\nSummary:');
    console.log(`  Beats: ${beats}`);
    console.log(`  Misses: ${misses}`);
    console.log(`  Meets: ${meets}`);
    console.log(`  Average Surprise: ${(savedData.reduce((sum, e) => sum + e.surprisePercent, 0) / savedData.length).toFixed(2)}%`);

} catch (error) {
    console.error('Error populating earnings data:', error);
    process.exit(1);
}

process.exit(0);
