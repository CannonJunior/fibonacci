#!/usr/bin/env node

/**
 * Simple Node.js server for Stock Analyzer
 * Serves static files and provides API key from environment
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../equity_analyzer/.env' });

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
    // API endpoint to get config
    if (req.url === '/api/config') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            apiKey: process.env.ALPHA_VANTAGE_API_KEY || 'demo'
        }));
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
