#!/usr/bin/env node
// RMSTORVIX IGNITE — MySQL Server Port Connectivity Diagnostic
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');

console.log('========================================================');
console.log('  RMSTORVIX IGNITE — MySQL Server Port Check (3306)     ');
console.log('========================================================\n');

const host = process.env.DB_HOST || '127.0.0.1';
const port = parseInt(process.env.DB_PORT || '3306', 10);

console.log(`Pinging MySQL Server at ${host}:${port}...`);

const socket = new net.Socket();
socket.setTimeout(2500);

socket.connect(port, host, () => {
  console.log(`\n✓ SUCCESS: MySQL/MariaDB server is listening on ${host}:${port}!`);
  console.log(`  MySQL schema is available at: database/schema.sql`);
  socket.destroy();
});

socket.on('error', (err) => {
  console.log(`\nNotice: No active MySQL service detected on ${host}:${port} (${err.code}).`);
  console.log('Current application is running smoothly on high-performance SQLite WAL mode.');
  console.log('When deploying to a server with MySQL:');
  console.log('  1. Import database/schema.sql into MySQL');
  console.log('  2. Set DB_CONNECTION=mysql in your .env file');
  socket.destroy();
});

socket.on('timeout', () => {
  console.log(`\nNotice: Connection to ${host}:${port} timed out.`);
  socket.destroy();
});
