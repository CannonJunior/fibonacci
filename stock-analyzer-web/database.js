/**
 * Database module for persisting stock data
 * Uses SQLite for local persistent storage
 */

const Database = require('better-sqlite3');
const path = require('path');

// Reason: Create database file in a persistent location
const DB_PATH = path.join(__dirname, 'stock-data.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
function initializeDatabase() {
    // Table for daily stock price data
    db.exec(`
        CREATE TABLE IF NOT EXISTS daily_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            open REAL NOT NULL,
            high REAL NOT NULL,
            low REAL NOT NULL,
            close REAL NOT NULL,
            volume INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(symbol, date)
        )
    `);

    // Table for intraday price data
    db.exec(`
        CREATE TABLE IF NOT EXISTS intraday_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            open REAL NOT NULL,
            high REAL NOT NULL,
            low REAL NOT NULL,
            close REAL NOT NULL,
            volume INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(symbol, timestamp)
        )
    `);

    // Table for company overview data
    db.exec(`
        CREATE TABLE IF NOT EXISTS company_overview (
            symbol TEXT PRIMARY KEY,
            market_cap REAL,
            pe_ratio REAL,
            dividend_yield REAL,
            dividend_per_share REAL,
            week_52_high REAL,
            week_52_low REAL,
            beta REAL,
            eps REAL,
            book_value REAL,
            profit_margin REAL,
            operating_margin_ttm REAL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Table for income statements
    db.exec(`
        CREATE TABLE IF NOT EXISTS income_statements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            fiscal_date_ending TEXT NOT NULL,
            total_revenue REAL,
            operating_expenses REAL,
            net_income REAL,
            ebitda REAL,
            eps REAL,
            gross_profit REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(symbol, fiscal_date_ending)
        )
    `);

    // Reason: Table for subsector aggregated performance data (percentage-based)
    db.exec(`
        CREATE TABLE IF NOT EXISTS subsector_performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subsector_key TEXT NOT NULL,
            sector TEXT NOT NULL,
            subsector TEXT NOT NULL,
            date TEXT NOT NULL,
            percent_change REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(subsector_key, date)
        )
    `);

    // Reason: Table for sector aggregated performance data (percentage-based)
    db.exec(`
        CREATE TABLE IF NOT EXISTS sector_performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sector TEXT NOT NULL,
            date TEXT NOT NULL,
            percent_change REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(sector, date)
        )
    `);

    // Create indices for faster lookups
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_daily_symbol_date ON daily_prices(symbol, date);
        CREATE INDEX IF NOT EXISTS idx_intraday_symbol_timestamp ON intraday_prices(symbol, timestamp);
        CREATE INDEX IF NOT EXISTS idx_income_symbol_date ON income_statements(symbol, fiscal_date_ending);
        CREATE INDEX IF NOT EXISTS idx_subsector_key_date ON subsector_performance(subsector_key, date);
        CREATE INDEX IF NOT EXISTS idx_sector_date ON sector_performance(sector, date);
    `);

    console.log('Database initialized at:', DB_PATH);
}

/**
 * Save daily stock data
 * @param {string} symbol - Stock symbol
 * @param {Array} candles - Array of candle data
 */
function saveDailyData(symbol, candles) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO daily_prices (symbol, date, open, high, low, close, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((candles) => {
        for (const candle of candles) {
            stmt.run(
                symbol,
                candle.date,
                candle.open,
                candle.high,
                candle.low,
                candle.close,
                candle.volume
            );
        }
    });

    insertMany(candles);
    console.log(`Saved ${candles.length} daily candles for ${symbol}`);
}

/**
 * Retrieve daily stock data
 * @param {string} symbol - Stock symbol
 * @returns {Array|null} Array of candle data or null if not found
 */
function getDailyData(symbol) {
    const stmt = db.prepare(`
        SELECT date, open, high, low, close, volume
        FROM daily_prices
        WHERE symbol = ?
        ORDER BY date ASC
    `);

    const rows = stmt.all(symbol);
    return rows.length > 0 ? rows : null;
}

/**
 * Save intraday stock data
 * @param {string} symbol - Stock symbol
 * @param {Array} candles - Array of intraday candle data
 */
function saveIntradayData(symbol, candles) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO intraday_prices (symbol, timestamp, open, high, low, close, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((candles) => {
        for (const candle of candles) {
            stmt.run(
                symbol,
                candle.timestamp,
                candle.open,
                candle.high,
                candle.low,
                candle.close,
                candle.volume
            );
        }
    });

    insertMany(candles);
    console.log(`Saved ${candles.length} intraday candles for ${symbol}`);
}

/**
 * Retrieve intraday stock data for a specific date
 * @param {string} symbol - Stock symbol
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Array|null} Array of intraday candle data or null if not found
 */
function getIntradayData(symbol, date) {
    const stmt = db.prepare(`
        SELECT timestamp, open, high, low, close, volume
        FROM intraday_prices
        WHERE symbol = ? AND date(timestamp) = date(?)
        ORDER BY timestamp ASC
    `);

    const rows = stmt.all(symbol, date);
    return rows.length > 0 ? rows : null;
}

/**
 * Check if daily data exists for a symbol
 * @param {string} symbol - Stock symbol
 * @returns {boolean} True if data exists
 */
function hasDailyData(symbol) {
    const stmt = db.prepare(`
        SELECT COUNT(*) as count FROM daily_prices WHERE symbol = ?
    `);
    const result = stmt.get(symbol);
    return result.count > 0;
}

/**
 * Get all unique symbols from database
 * @returns {Array<string>} Array of stock symbols
 */
function getAllSymbols() {
    const stmt = db.prepare(`
        SELECT DISTINCT symbol FROM daily_prices ORDER BY symbol
    `);
    const rows = stmt.all();
    return rows.map(row => row.symbol);
}

/**
 * Save company overview data
 * @param {Object} overview - Company overview data
 */
function saveCompanyOverview(overview) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO company_overview (
            symbol, market_cap, pe_ratio, dividend_yield, dividend_per_share,
            week_52_high, week_52_low, beta, eps, book_value,
            profit_margin, operating_margin_ttm, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
        overview.symbol,
        overview.marketCap,
        overview.peRatio,
        overview.dividendYield,
        overview.dividendPerShare,
        overview.week52High,
        overview.week52Low,
        overview.beta,
        overview.eps,
        overview.bookValue,
        overview.profitMargin,
        overview.operatingMarginTTM
    );

    console.log(`Saved company overview for ${overview.symbol}`);
}

/**
 * Get company overview data
 * @param {string} symbol - Stock symbol
 * @returns {Object|null} Company overview data or null
 */
function getCompanyOverview(symbol) {
    const stmt = db.prepare(`
        SELECT * FROM company_overview WHERE symbol = ?
    `);
    return stmt.get(symbol);
}

/**
 * Save income statements
 * @param {string} symbol - Stock symbol
 * @param {Array} statements - Array of income statement data
 */
function saveIncomeStatements(symbol, statements) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO income_statements (
            symbol, fiscal_date_ending, total_revenue, operating_expenses,
            net_income, ebitda, eps, gross_profit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((statements) => {
        for (const statement of statements) {
            stmt.run(
                symbol,
                statement.fiscalDateEnding,
                statement.totalRevenue,
                statement.operatingExpenses,
                statement.netIncome,
                statement.ebitda,
                statement.eps,
                statement.grossProfit
            );
        }
    });

    insertMany(statements);
    console.log(`Saved ${statements.length} income statements for ${symbol}`);
}

/**
 * Get income statements
 * @param {string} symbol - Stock symbol
 * @returns {Array} Array of income statements
 */
function getIncomeStatements(symbol) {
    const stmt = db.prepare(`
        SELECT * FROM income_statements
        WHERE symbol = ?
        ORDER BY fiscal_date_ending DESC
        LIMIT 8
    `);
    return stmt.all(symbol);
}

/**
 * Check if intraday data exists for a symbol and date
 * @param {string} symbol - Stock symbol
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {boolean} True if data exists
 */
function hasIntradayData(symbol, date) {
    const stmt = db.prepare(`
        SELECT COUNT(*) as count FROM intraday_prices
        WHERE symbol = ? AND date(timestamp) = date(?)
    `);
    const result = stmt.get(symbol, date);
    return result.count > 0;
}

/**
 * Save subsector performance data
 * @param {string} subsectorKey - Unique subsector key (sector|subsector)
 * @param {string} sector - Sector name
 * @param {string} subsector - Subsector name
 * @param {Array} performanceData - Array of {date, percentChange}
 */
function saveSubsectorPerformance(subsectorKey, sector, subsector, performanceData) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO subsector_performance (
            subsector_key, sector, subsector, date, percent_change
        ) VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((data) => {
        for (const point of data) {
            stmt.run(
                subsectorKey,
                sector,
                subsector,
                point.date,
                point.percentChange
            );
        }
    });

    insertMany(performanceData);
    console.log(`Saved ${performanceData.length} performance data points for ${subsectorKey}`);
}

/**
 * Get subsector performance data
 * @param {string} subsectorKey - Unique subsector key (sector|subsector)
 * @returns {Array|null} Array of performance data or null
 */
function getSubsectorPerformance(subsectorKey) {
    const stmt = db.prepare(`
        SELECT sector, subsector, date, percent_change as percentChange
        FROM subsector_performance
        WHERE subsector_key = ?
        ORDER BY date ASC
    `);

    const rows = stmt.all(subsectorKey);
    return rows.length > 0 ? rows : null;
}

/**
 * Check if subsector performance data exists
 * @param {string} subsectorKey - Unique subsector key (sector|subsector)
 * @returns {boolean} True if data exists
 */
function hasSubsectorPerformance(subsectorKey) {
    const stmt = db.prepare(`
        SELECT COUNT(*) as count FROM subsector_performance WHERE subsector_key = ?
    `);
    const result = stmt.get(subsectorKey);
    return result.count > 0;
}

/**
 * Save sector performance data
 * @param {string} sector - Sector name
 * @param {Array} performanceData - Array of {date, percentChange}
 */
function saveSectorPerformance(sector, performanceData) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO sector_performance (
            sector, date, percent_change
        ) VALUES (?, ?, ?)
    `);

    const insertMany = db.transaction((data) => {
        for (const point of data) {
            stmt.run(
                sector,
                point.date,
                point.percentChange
            );
        }
    });

    insertMany(performanceData);
    console.log(`Saved ${performanceData.length} performance data points for sector ${sector}`);
}

/**
 * Get sector performance data
 * @param {string} sector - Sector name
 * @returns {Array|null} Array of performance data or null
 */
function getSectorPerformance(sector) {
    const stmt = db.prepare(`
        SELECT sector, date, percent_change as percentChange
        FROM sector_performance
        WHERE sector = ?
        ORDER BY date ASC
    `);

    const rows = stmt.all(sector);
    return rows.length > 0 ? rows : null;
}

/**
 * Check if sector performance data exists
 * @param {string} sector - Sector name
 * @returns {boolean} True if data exists
 */
function hasSectorPerformance(sector) {
    const stmt = db.prepare(`
        SELECT COUNT(*) as count FROM sector_performance WHERE sector = ?
    `);
    const result = stmt.get(sector);
    return result.count > 0;
}

// Initialize database on module load
initializeDatabase();

module.exports = {
    saveDailyData,
    getDailyData,
    saveIntradayData,
    getIntradayData,
    hasDailyData,
    hasIntradayData,
    getAllSymbols,
    saveCompanyOverview,
    getCompanyOverview,
    saveIncomeStatements,
    getIncomeStatements,
    saveSubsectorPerformance,
    getSubsectorPerformance,
    hasSubsectorPerformance,
    saveSectorPerformance,
    getSectorPerformance,
    hasSectorPerformance
};
