#!/usr/bin/env node

/**
 * Reset earnings table with new schema
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'stock-data.db');
const db = new Database(DB_PATH);

console.log('Dropping existing earnings table...');
db.exec('DROP TABLE IF EXISTS earnings');

console.log('Creating new earnings table with updated schema...');
db.exec(`
    CREATE TABLE earnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        period TEXT NOT NULL,
        quarter INTEGER NOT NULL,
        year INTEGER NOT NULL,
        actual REAL,
        estimate REAL,
        surprise REAL,
        surprise_percent REAL,
        report_date TEXT,
        report_day_open REAL,
        report_day_close REAL,
        next_day_open REAL,
        next_day_close REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol, period)
    )
`);

console.log('✓ Earnings table recreated successfully!');
db.close();
process.exit(0);
