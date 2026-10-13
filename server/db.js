// RMSTORVIX IGNITE — Database Connection & Migration Layer
// Built with native Node.js v22 node:sqlite DatabaseSync with ACID & WAL Mode

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

let resolvedDbPath = process.env.DB_PATH;
if (!resolvedDbPath) {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    resolvedDbPath = path.join('/tmp', 'rmstorvix_ignite.sqlite');
    const sourceDb = path.join(__dirname, '..', 'database', 'rmstorvix_ignite.sqlite');
    if (fs.existsSync(sourceDb) && !fs.existsSync(resolvedDbPath)) {
      try {
        fs.copyFileSync(sourceDb, resolvedDbPath);
      } catch (e) {
        // Fallback to fresh creation
      }
    }
  } else {
    resolvedDbPath = path.join(__dirname, '..', 'database', 'rmstorvix_ignite.sqlite');
  }
}
const DB_PATH = resolvedDbPath;

let dbInstance = null;

function getDb() {
  if (dbInstance) return dbInstance;

  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new DatabaseSync(DB_PATH);
  // Enable foreign keys and Write-Ahead Logging for high performance & safety
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA synchronous = NORMAL;');

  initSchema(dbInstance);
  return dbInstance;
}

function initSchema(db) {
  const schemaFile = path.join(__dirname, '..', 'database', 'schema_sqlite.sql');
  if (fs.existsSync(schemaFile)) {
    const schemaSql = fs.readFileSync(schemaFile, 'utf8');
    db.exec(schemaSql);
  }

  const migrations = [
    'ALTER TABLE businesses ADD COLUMN digital_signature_data TEXT;',
    'ALTER TABLE businesses ADD COLUMN company_seal_data TEXT;',
    'ALTER TABLE businesses ADD COLUMN signatory_name TEXT;',
    'ALTER TABLE businesses ADD COLUMN signatory_designation TEXT;',
    'ALTER TABLE businesses ADD COLUMN enable_digital_signature INTEGER DEFAULT 1;',
    'ALTER TABLE businesses ADD COLUMN signature_date_enabled INTEGER DEFAULT 1;'
  ];
  for (const m of migrations) {
    try { db.exec(m); } catch (e) { /* column exists */ }
  }
}

let txDepth = 0;

// Transaction wrapper supporting nested calls
function transaction(fn) {
  const db = getDb();
  if (txDepth > 0) {
    // Nested transaction call: already inside transaction
    return fn(db);
  }

  txDepth++;
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = fn(db);
    db.exec('COMMIT;');
    txDepth--;
    return result;
  } catch (err) {
    db.exec('ROLLBACK;');
    txDepth = 0;
    throw err;
  }
}

module.exports = {
  getDb,
  transaction,
  DB_PATH
};
