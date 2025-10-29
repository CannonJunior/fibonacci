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

    // Reason: Table for tracking update status and API quota usage
    db.exec(`
        CREATE TABLE IF NOT EXISTS update_tracking (
            symbol TEXT PRIMARY KEY,
            last_daily_update DATETIME,
            last_overview_update DATETIME,
            last_financials_update DATETIME,
            update_priority INTEGER DEFAULT 3,
            failed_attempts INTEGER DEFAULT 0,
            last_error TEXT,
            is_active INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Reason: Table for API quota tracking
    db.exec(`
        CREATE TABLE IF NOT EXISTS api_quota (
            provider TEXT PRIMARY KEY,
            calls_today INTEGER DEFAULT 0,
            calls_this_minute INTEGER DEFAULT 0,
            last_call_time DATETIME,
            quota_reset_time DATETIME,
            minute_reset_time DATETIME,
            daily_limit INTEGER NOT NULL,
            minute_limit INTEGER NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Reason: Initialize quota tracking for providers
    db.exec(`
        INSERT OR IGNORE INTO api_quota (provider, daily_limit, minute_limit, quota_reset_time, minute_reset_time)
        VALUES
            ('alphaVantage', 25, 5, datetime('now', '+1 day'), datetime('now', '+1 minute')),
            ('finnhub', 10000, 60, datetime('now', '+1 day'), datetime('now', '+1 minute'))
    `);

    // Create indices for faster lookups
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_daily_symbol_date ON daily_prices(symbol, date);
        CREATE INDEX IF NOT EXISTS idx_intraday_symbol_timestamp ON intraday_prices(symbol, timestamp);
        CREATE INDEX IF NOT EXISTS idx_income_symbol_date ON income_statements(symbol, fiscal_date_ending);
        CREATE INDEX IF NOT EXISTS idx_subsector_key_date ON subsector_performance(subsector_key, date);
        CREATE INDEX IF NOT EXISTS idx_sector_date ON sector_performance(sector, date);
        CREATE INDEX IF NOT EXISTS idx_update_priority ON update_tracking(update_priority, last_daily_update);
        CREATE INDEX IF NOT EXISTS idx_update_active ON update_tracking(is_active);
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

/**
 * Update tracking for a symbol
 * @param {string} symbol - Stock symbol
 * @param {string} updateType - Type of update: 'daily', 'overview', or 'financials'
 * @param {number} priority - Update priority (1-4)
 */
function updateTrackingRecord(symbol, updateType, priority = 3) {
    const fieldMap = {
        daily: 'last_daily_update',
        overview: 'last_overview_update',
        financials: 'last_financials_update'
    };

    const field = fieldMap[updateType];
    if (!field) {
        throw new Error(`Invalid update type: ${updateType}`);
    }

    const stmt = db.prepare(`
        INSERT INTO update_tracking (symbol, ${field}, update_priority, updated_at)
        VALUES (?, datetime('now'), ?, datetime('now'))
        ON CONFLICT(symbol) DO UPDATE SET
            ${field} = datetime('now'),
            update_priority = ?,
            failed_attempts = 0,
            last_error = NULL,
            updated_at = datetime('now')
    `);

    stmt.run(symbol, priority, priority);
}

/**
 * Record failed update attempt
 * @param {string} symbol - Stock symbol
 * @param {string} errorMessage - Error message
 */
function recordUpdateFailure(symbol, errorMessage) {
    const stmt = db.prepare(`
        INSERT INTO update_tracking (symbol, failed_attempts, last_error, updated_at)
        VALUES (?, 1, ?, datetime('now'))
        ON CONFLICT(symbol) DO UPDATE SET
            failed_attempts = failed_attempts + 1,
            last_error = ?,
            updated_at = datetime('now')
    `);

    stmt.run(symbol, errorMessage, errorMessage);
}

/**
 * Get update tracking info for a symbol
 * @param {string} symbol - Stock symbol
 * @returns {Object|null} Update tracking info or null
 */
function getUpdateTracking(symbol) {
    const stmt = db.prepare(`
        SELECT * FROM update_tracking WHERE symbol = ?
    `);

    return stmt.get(symbol);
}

/**
 * Get all symbols that need updating
 * @param {string} updateType - Type of update: 'daily', 'overview', or 'financials'
 * @param {number} maxAge - Maximum age in hours before update needed
 * @param {number} limit - Maximum number of symbols to return
 * @returns {Array} Array of symbols
 */
function getSymbolsNeedingUpdate(updateType, maxAge = 24, limit = 10) {
    const fieldMap = {
        daily: 'last_daily_update',
        overview: 'last_overview_update',
        financials: 'last_financials_update'
    };

    const field = fieldMap[updateType];
    if (!field) {
        throw new Error(`Invalid update type: ${updateType}`);
    }

    const stmt = db.prepare(`
        SELECT ut.symbol, ut.update_priority, ut.${field}
        FROM update_tracking ut
        WHERE ut.is_active = 1
          AND (ut.${field} IS NULL OR datetime(ut.${field}) < datetime('now', '-${maxAge} hours'))
          AND ut.failed_attempts < 3
        ORDER BY ut.update_priority ASC, ut.${field} ASC
        LIMIT ?
    `);

    return stmt.all(limit);
}

/**
 * Set symbol as active (being tracked)
 * @param {string} symbol - Stock symbol
 * @param {number} priority - Update priority (1-4)
 */
function setSymbolActive(symbol, priority = 3) {
    const stmt = db.prepare(`
        INSERT INTO update_tracking (symbol, is_active, update_priority, created_at, updated_at)
        VALUES (?, 1, ?, datetime('now'), datetime('now'))
        ON CONFLICT(symbol) DO UPDATE SET
            is_active = 1,
            update_priority = ?,
            updated_at = datetime('now')
    `);

    stmt.run(symbol, priority, priority);
}

/**
 * Get API quota status for a provider
 * @param {string} provider - Provider name
 * @returns {Object|null} Quota status or null
 */
function getAPIQuota(provider) {
    const stmt = db.prepare(`SELECT * FROM api_quota WHERE provider = ?`);
    return stmt.get(provider);
}

/**
 * Check if API call is allowed within quota
 * @param {string} provider - Provider name
 * @returns {boolean} True if call is allowed
 */
function canMakeAPICall(provider) {
    const quota = getAPIQuota(provider);
    if (!quota) return false;

    const now = new Date();

    // Check if daily quota needs reset
    if (new Date(quota.quota_reset_time) <= now) {
        resetDailyQuota(provider);
        return true;
    }

    // Check if minute quota needs reset
    if (new Date(quota.minute_reset_time) <= now) {
        resetMinuteQuota(provider);
    }

    // Refetch after potential resets
    const current = getAPIQuota(provider);
    return current.calls_today < current.daily_limit && current.calls_this_minute < current.minute_limit;
}

/**
 * Record an API call
 * @param {string} provider - Provider name
 */
function recordAPICall(provider) {
    const stmt = db.prepare(`
        UPDATE api_quota
        SET calls_today = calls_today + 1,
            calls_this_minute = calls_this_minute + 1,
            last_call_time = datetime('now'),
            updated_at = datetime('now')
        WHERE provider = ?
    `);

    stmt.run(provider);
}

/**
 * Reset daily quota for a provider
 * @param {string} provider - Provider name
 */
function resetDailyQuota(provider) {
    const stmt = db.prepare(`
        UPDATE api_quota
        SET calls_today = 0,
            quota_reset_time = datetime('now', '+1 day'),
            updated_at = datetime('now')
        WHERE provider = ?
    `);

    stmt.run(provider);
}

/**
 * Reset minute quota for a provider
 * @param {string} provider - Provider name
 */
function resetMinuteQuota(provider) {
    const stmt = db.prepare(`
        UPDATE api_quota
        SET calls_this_minute = 0,
            minute_reset_time = datetime('now', '+1 minute'),
            updated_at = datetime('now')
        WHERE provider = ?
    `);

    stmt.run(provider);
}

/**
 * Get last date in daily prices for a symbol
 * @param {string} symbol - Stock symbol
 * @returns {string|null} Last date or null
 */
function getLastDailyDate(symbol) {
    const stmt = db.prepare(`
        SELECT date
        FROM daily_prices
        WHERE symbol = ?
        ORDER BY date DESC
        LIMIT 1
    `);

    const result = stmt.get(symbol);
    return result ? result.date : null;
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
    hasSectorPerformance,
    updateTrackingRecord,
    recordUpdateFailure,
    getUpdateTracking,
    getSymbolsNeedingUpdate,
    setSymbolActive,
    getAPIQuota,
    canMakeAPICall,
    recordAPICall,
    resetDailyQuota,
    resetMinuteQuota,
    getLastDailyDate
};
