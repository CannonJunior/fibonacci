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
            apiKey: process.env.ALPHA_VANTAGE_API_KEY || 'demo'
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
