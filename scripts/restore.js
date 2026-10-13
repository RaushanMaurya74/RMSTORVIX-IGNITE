// RMSTORVIX IGNITE — Database Restore Utility
// Restores database from a given snapshot file

const fs = require('node:fs');
const path = require('node:path');
const { DB_PATH } = require('../server/db');

function restoreBackup(backupFilePath) {
  if (!backupFilePath || !fs.existsSync(backupFilePath)) {
    console.error('Error: Specified backup file does not exist:', backupFilePath);
    process.exit(1);
  }

  // Backup current DB first as safety precaution
  if (fs.existsSync(DB_PATH)) {
    const safetyBackup = `${DB_PATH}.safety_${Date.now()}`;
    fs.copyFileSync(DB_PATH, safetyBackup);
    console.log(`Safety snapshot created at: ${safetyBackup}`);
  }

  fs.copyFileSync(backupFilePath, DB_PATH);
  console.log('========================================================');
  console.log('  RMSTORVIX IGNITE — Database Restored Successfully');
  console.log('========================================================');
  console.log(`  Source:    ${backupFilePath}`);
  console.log(`  Restored:  ${DB_PATH}`);
  console.log('========================================================');
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/restore.js <path-to-backup.sqlite>');
    process.exit(1);
  }
  restoreBackup(file);
}

module.exports = { restoreBackup };
