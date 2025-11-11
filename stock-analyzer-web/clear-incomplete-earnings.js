#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'stock-data.db');
const db = new Database(DB_PATH);

const symbols = ['NVDA', 'TSLA', 'MSFT', 'GOOGL'];

console.log('Clearing incomplete earnings data...');

for (const symbol of symbols) {
    const stmt = db.prepare('DELETE FROM earnings WHERE symbol = ?');
    const result = stmt.run(symbol);
    console.log(`  ${symbol}: deleted ${result.changes} records`);
}

console.log('✓ Done');
db.close();
