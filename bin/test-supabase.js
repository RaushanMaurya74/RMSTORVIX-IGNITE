#!/usr/bin/env node
// RMSTORVIX IGNITE — Supabase Connection Diagnostic & Verification Utility

const { testSupabaseConnection, SUPABASE_URL, SUPABASE_PROJECT_ID } = require('../server/supabase');

async function main() {
  console.log('===============================================================');
  console.log('  RMSTORVIX IGNITE — Supabase Cloud Database Health Check');
  console.log(`  Project Ref: ${SUPABASE_PROJECT_ID}`);
  console.log(`  Target URL:  ${SUPABASE_URL}`);
  console.log('===============================================================');

  const result = await testSupabaseConnection();

  if (result.ok) {
    console.log(`✓ SUPABASE STATUS:      ${result.status}`);
    console.log(`✓ ROUND-TRIP LATENCY:   ${result.latencyMs}ms`);
    console.log(`✓ VERIFIED AT:          ${result.verifiedAt}`);
    console.log('--- Synced Cloud Tables ---');
    for (const [table, count] of Object.entries(result.tables)) {
      console.log(`  • ${table.padEnd(16)} : ${count} records`);
    }
    console.log('===============================================================');
    console.log('✓ Supabase connection is healthy, authenticated, and verified!');
    console.log('===============================================================');
    process.exit(0);
  } else {
    console.error(`✗ SUPABASE ERROR:       ${result.error}`);
    console.error(`✗ LATENCY:              ${result.latencyMs}ms`);
    console.error('===============================================================');
    console.error('✗ Supabase verification failed!');
    console.error('===============================================================');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected crash during Supabase test:', err);
  process.exit(1);
});
