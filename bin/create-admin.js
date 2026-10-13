#!/usr/bin/env node
// RMSTORVIX IGNITE — CLI Super Admin Provisioning Utility
// Usage: node --experimental-sqlite bin/create-admin.js <email> <full_name> <password>

const readline = require('node:readline');
const { getDb } = require('../server/db');
const { hashPassword, uuid } = require('../server/security');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('========================================================');
  console.log('  RMSTORVIX IGNITE — Provision Platform Super Admin');
  console.log('========================================================\n');

  let email = process.argv[2];
  let name = process.argv[3];
  let pass = process.argv[4];

  if (!email) email = await question('Super Admin Email Address: ');
  if (!name) name = await question('Admin Full Name: ');
  if (!pass) pass = await question('Admin Password (10+ characters): ');

  email = (email || '').trim().toLowerCase();
  name = (name || '').trim();
  pass = (pass || '').trim();

  if (!email || !name || pass.length < 10) {
    console.error('\nError: Invalid input. Valid email, full name, and 10+ char password required.');
    rl.close();
    process.exit(1);
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    console.error('\nError: An account with this email address already exists.');
    rl.close();
    process.exit(1);
  }

  db.prepare(`
    INSERT INTO users (public_id, business_id, full_name, email, password_hash, platform_role, business_role, account_status)
    VALUES (?, NULL, ?, ?, ?, 'SUPER_ADMIN', 'ADMIN', 'ACTIVE')
  `).run(uuid(), name, email, hashPassword(pass));

  console.log(`\n✓ Platform Super Admin successfully provisioned!`);
  console.log(`  Email:    ${email}`);
  console.log(`  Role:     SUPER_ADMIN`);
  console.log(`  Portal:   http://127.0.0.1:8080/admin\n`);
  rl.close();
}

main().catch(err => {
  console.error('Provisioning failed:', err);
  process.exit(1);
});
