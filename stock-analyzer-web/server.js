#!/usr/bin/env node

/**
 * Simple Node.js server for Stock Analyzer
 * Serves static files and provides API key from environment
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
require('dotenv').config({ path: '../equity_analyzer/.env' });

const db = require('./database');
const PORT = 7070;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.json': 'application/json'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // API endpoint to get config
    if (pathname === '/api/config') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            apiKey: process.env.ALPHA_VANTAGE_API_KEY || 'demo',
            alphaVantageKey: process.env.ALPHA_VANTAGE_API_KEY || 'demo',
            finnhubKey: process.env.FINNHUB_API_KEY || 'demo'
        }));
        return;
    }

    // API endpoint to get S&P 500 stocks list
    if (pathname === '/api/stocks') {
        fs.readFile('./data/sp500-stocks.json', 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to load stocks data' }));
                return;
            }
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(data);
        });
        return;
    }

    // API endpoint to save daily stock data
    if (pathname === '/api/save-daily' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { symbol, candles } = JSON.parse(body);
                db.saveDailyData(symbol, candles);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // API endpoint to get daily stock data from database
    if (pathname === '/api/get-daily') {
        const symbol = parsedUrl.query.symbol;
        if (!symbol) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Symbol parameter required' }));
            return;
        }

        const data = db.getDailyData(symbol);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data }));
        return;
    }

    // API endpoint to check if daily data exists
    if (pathname === '/api/has-daily') {
        const symbol = parsedUrl.query.symbol;
        if (!symbol) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Symbol parameter required' }));
            return;
        }

        const exists = db.hasDailyData(symbol);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ exists }));
        return;
    }

    // API endpoint to save intraday stock data
    if (pathname === '/api/save-intraday' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { symbol, candles } = JSON.parse(body);
                db.saveIntradayData(symbol, candles);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // API endpoint to get intraday stock data from database
    if (pathname === '/api/get-intraday') {
        const symbol = parsedUrl.query.symbol;
        const date = parsedUrl.query.date;
        if (!symbol || !date) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Symbol and date parameters required' }));
            return;
        }

        const data = db.getIntradayData(symbol, date);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data }));
        return;
    }

    // API endpoint to get all symbols from database
    if (pathname === '/api/get-all-symbols') {
        const symbols = db.getAllSymbols();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ symbols }));
        return;
    }

    // API endpoint to save company overview
    if (pathname === '/api/save-company-overview' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { overview } = JSON.parse(body);
                db.saveCompanyOverview(overview);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // API endpoint to get company overview
    if (pathname === '/api/get-company-overview') {
        const symbol = parsedUrl.query.symbol;
        if (!symbol) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Symbol parameter required' }));
            return;
        }

        const overview = db.getCompanyOverview(symbol);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ overview }));
        return;
    }

    // API endpoint to save income statements
    if (pathname === '/api/save-income-statements' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { symbol, statements } = JSON.parse(body);
                db.saveIncomeStatements(symbol, statements);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // API endpoint to get income statements
    if (pathname === '/api/get-income-statements') {
        const symbol = parsedUrl.query.symbol;
        if (!symbol) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Symbol parameter required' }));
            return;
        }

        const statements = db.getIncomeStatements(symbol);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ statements }));
        return;
    }

    // API endpoint to save subsector performance data
    if (pathname === '/api/save-subsector-performance' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { subsectorKey, sector, subsector, performanceData } = JSON.parse(body);
                db.saveSubsectorPerformance(subsectorKey, sector, subsector, performanceData);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // API endpoint to get subsector performance data
    if (pathname === '/api/get-subsector-performance') {
        const subsectorKey = parsedUrl.query.subsectorKey;
        if (!subsectorKey) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'subsectorKey parameter required' }));
            return;
        }

        const performanceData = db.getSubsectorPerformance(subsectorKey);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ performanceData }));
        return;
    }

    // API endpoint to save sector performance data
    if (pathname === '/api/save-sector-performance' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { sector, performanceData } = JSON.parse(body);
                db.saveSectorPerformance(sector, performanceData);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // API endpoint to get sector performance data
    if (pathname === '/api/get-sector-performance') {
        const sector = parsedUrl.query.sector;
        if (!sector) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'sector parameter required' }));
            return;
        }

        const performanceData = db.getSectorPerformance(sector);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ performanceData }));
        return;
    }

    // API endpoint to register symbol for updates
    if (pathname === '/api/update/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { symbol, priority } = JSON.parse(body);
                db.setSymbolActive(symbol, priority || 3);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // API endpoint to get update status for a symbol
    if (pathname === '/api/update/status') {
        const symbol = parsedUrl.query.symbol;
        if (!symbol) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Symbol parameter required' }));
            return;
        }

        const tracking = db.getUpdateTracking(symbol);
        const lastDate = db.getLastDailyDate(symbol);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            symbol,
            tracking,
            lastDate
        }));
        return;
    }

    // API endpoint to get quota status
    if (pathname === '/api/update/quota') {
        const alphaVantage = db.getAPIQuota('alphaVantage');
        const finnhub = db.getAPIQuota('finnhub');

        const canUpdate = db.canMakeAPICall('alphaVantage') || db.canMakeAPICall('finnhub');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            canUpdate,
            alphaVantage: {
                callsToday: alphaVantage.calls_today,
                dailyLimit: alphaVantage.daily_limit,
                callsThisMinute: alphaVantage.calls_this_minute,
                minuteLimit: alphaVantage.minute_limit,
                remaining: alphaVantage.daily_limit - alphaVantage.calls_today
            },
            finnhub: {
                callsToday: finnhub.calls_today,
                dailyLimit: finnhub.daily_limit,
                callsThisMinute: finnhub.calls_this_minute,
                minuteLimit: finnhub.minute_limit,
                remaining: finnhub.daily_limit - finnhub.calls_today
            }
        }));
        return;
    }

    // API endpoint to execute an update
    if (pathname === '/api/update/execute' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { symbol, updateType } = JSON.parse(body);

                // Check quota
                if (!db.canMakeAPICall('alphaVantage')) {
                    res.writeHead(429, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'API quota exceeded' }));
                    return;
                }

                // Record the API call
                db.recordAPICall('alphaVantage');

                // For now, just update tracking - actual update logic will be in client
                // This endpoint serves as a quota gate
                db.updateTrackingRecord(symbol, updateType);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    symbol,
                    updateType,
                    timestamp: new Date().toISOString()
                }));
            } catch (error) {
                db.recordUpdateFailure(symbol, error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // Serve static files
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 - File Not Found');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log('Stock Analyzer v2.0');
    console.log('===================');
    console.log('');
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('');
    console.log('Press Ctrl+C to stop');
});
