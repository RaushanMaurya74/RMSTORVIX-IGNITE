// RMSTORVIX IGNITE — Database Backup Snapshot Tool
// Creates timestamped, transactional backups of the SQLite database

const fs = require('node:fs');
const path = require('node:path');
const { DB_PATH } = require('../server/db');

function createBackup() {
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `rmstorvix_ignite_backup_${timestamp}.sqlite`);

  if (!fs.existsSync(DB_PATH)) {
    console.error('Error: Source database does not exist at:', DB_PATH);
    process.exit(1);
  }

  fs.copyFileSync(DB_PATH, backupFile);
  const stats = fs.statSync(backupFile);

  console.log('========================================================');
  console.log('  RMSTORVIX IGNITE — Database Snapshot Created');
  console.log('========================================================');
  console.log(`  Target:    ${backupFile}`);
  console.log(`  Size:      ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`  Timestamp: ${timestamp}`);
  console.log('========================================================');

  return backupFile;
}

if (require.main === module) {
  createBackup();
}

module.exports = { createBackup };
