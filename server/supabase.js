// RMSTORVIX IGNITE — Supabase Cloud Database Client & Integration Layer
// Connects to PostgreSQL 17 on Supabase (Project ID: ynacftlgrvcaiibrycbw)

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ynacftlgrvcaiibrycbw.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYWNmdGxncnZjYWlpYnJ5Y2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MTIwNTQsImV4cCI6MjEwNzQ4ODA1NH0.cM5wpNrb9YJSkrk4CcQM3aVDqXqLL9qnvGkDiTbog34';
const SUPABASE_PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'ynacftlgrvcaiibrycbw';

function getHeaders(customHeaders = {}) {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...customHeaders
  };
}

/**
 * Perform a health ping and connectivity check to Supabase
 * @returns {Promise<{ok: boolean, latencyMs: number, project: string, tables: Record<string, number>, error?: string}>}
 */
async function testSupabaseConnection() {
  const start = Date.now();
  const tables = ['businesses', 'users', 'parties', 'products', 'invoices', 'accounts'];
  const tableCounts = {};

  try {
    for (const table of tables) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        method: 'GET',
        headers: getHeaders({ 'Range-Unit': 'items', 'Range': '0-99' })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status} on table ${table}: ${errorText}`);
      }

      const data = await res.json();
      tableCounts[table] = Array.isArray(data) ? data.length : 0;
    }

    const latencyMs = Date.now() - start;
    return {
      ok: true,
      status: 'CONNECTED',
      latencyMs,
      projectId: SUPABASE_PROJECT_ID,
      supabaseUrl: SUPABASE_URL,
      tables: tableCounts,
      verifiedAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      ok: false,
      status: 'ERROR',
      latencyMs: Date.now() - start,
      projectId: SUPABASE_PROJECT_ID,
      supabaseUrl: SUPABASE_URL,
      error: err.message,
      verifiedAt: new Date().toISOString()
    };
  }
}

/**
 * Query a table on Supabase PostgREST
 * @param {string} table
 * @param {string} [queryString] - e.g. "select=*&limit=10"
 */
async function querySupabase(table, queryString = 'select=*') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${queryString}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders()
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Supabase query failed [${table}]: ${res.status} ${errorBody}`);
  }

  return res.json();
}

/**
 * Insert row(s) into Supabase
 * @param {string} table
 * @param {object|object[]} records
 */
async function insertSupabase(table, records) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(records)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Supabase insert failed [${table}]: ${res.status} ${errorBody}`);
  }

  return res.json();
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_PROJECT_ID,
  testSupabaseConnection,
  querySupabase,
  insertSupabase
};
