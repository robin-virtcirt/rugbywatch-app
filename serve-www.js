#!/usr/bin/env node
/**
 * WatchRugby — static server for www/ (used by screenshot scripts).
 * Usage: node serve-www.js [port]
 * Default port: 3980
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const WWW = '/Users/joker/rugbywatch-app/www';
const PORT = parseInt(process.argv[2], 10) || 3980;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0].split('#')[0] || '/';
  if (urlPath === '/') urlPath = '/index.html';
  let file = path.join(WWW, urlPath.replace(/^\//, ''));
  const real = path.resolve(file);
  if (!real.startsWith(path.resolve(WWW))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('forbidden');
    return;
  }
  const ext = path.extname(real).toLowerCase();
  fs.readFile(real, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`WatchRugby static server running at http://127.0.0.1:${PORT}/`);
  console.log(`Serving ${WWW}`);
  console.log('Press Ctrl-C to stop.');
});

process.on('SIGINT', () => { server.kill('SIGTERM'); });
process.on('SIGTERM', () => { server.kill('SIGTERM'); });
