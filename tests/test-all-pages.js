// RMSTORVIX IGNITE — Comprehensive All-Pages & Endpoints Verification
const assert = require('node:assert');

async function testAll() {
  const baseUrl = 'http://127.0.0.1:8080';
  let passed = 0;
  let failed = 0;

  console.log('=== RMSTORVIX IGNITE: Comprehensive All-Pages Verification ===\n');

  async function check(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [PASSED] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAILED] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. PUBLIC & AUTH PAGES
  console.log('--- 1. Public & Authentication Pages ---');
  await check('Root Path Redirects (/ -> /login)', async () => {
    const res = await fetch(`${baseUrl}/`, { redirect: 'manual' });
    assert.strictEqual(res.status, 303);
    assert.strictEqual(res.headers.get('location'), '/login');
  });

  await check('Tenant Login Page (/login)', async () => {
    const res = await fetch(`${baseUrl}/login`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('RMSTORVIX IGNITE'));
    assert.ok(html.includes('Sign in to your workspace'));
  });

  await check('Business Registration Page (/signup)', async () => {
    const res = await fetch(`${baseUrl}/signup`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Register Your Business'));
  });

  await check('Forgot Password Page (/forgot-password)', async () => {
    const res = await fetch(`${baseUrl}/forgot-password`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Reset Password'));
  });

  await check('Dedicated Admin Login Page (/admin/login)', async () => {
    const res = await fetch(`${baseUrl}/admin/login`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Admin Login'));
    assert.ok(html.includes('Admin Portal'));
  });

  await check('Status Notice: Pending Review (/pending)', async () => {
    const res = await fetch(`${baseUrl}/pending`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Account Verification in Progress'));
  });

  await check('Status Notice: Rejected Registration (/rejected)', async () => {
    const res = await fetch(`${baseUrl}/rejected`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Registration Rejected'));
  });

  await check('Status Notice: Suspended Account (/suspended)', async () => {
    const res = await fetch(`${baseUrl}/suspended`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Workspace Suspended'));
  });

  // 2. STATIC ASSETS
  console.log('\n--- 2. Static Assets & Design System ---');
  const assets = [
    '/assets/css/app.css',
    '/assets/css/auth.css',
    '/assets/css/admin.css',
    '/assets/css/invoice-print.css',
    '/assets/js/app.js',
    '/assets/js/admin.js',
    '/assets/images/logo.png',
    '/assets/images/favicon.png'
  ];
  for (const asset of assets) {
    await check(`Static Asset (${asset})`, async () => {
      const res = await fetch(`${baseUrl}${asset}`);
      assert.strictEqual(res.status, 200, `Expected 200 for ${asset}`);
      const buf = await res.arrayBuffer();
      assert.ok(buf.byteLength > 0, `Asset ${asset} must not be empty`);
    });
  }

  // 3. ADMIN PORTAL (AUTHENTICATED)
  console.log('\n--- 3. Platform Admin Portal (Super Admin Session) ---');
  let adminCookie = null;
  await check('Admin Authentication (POST /api/admin/login)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@rmstorvix.com', password: 'SuperAdmin@2026!' })
    });
    assert.strictEqual(res.status, 200);
    adminCookie = res.headers.get('set-cookie');
    assert.ok(adminCookie, 'Must set session cookie');
  });

  await check('Platform Command Center Dashboard (/admin)', async () => {
    const res = await fetch(`${baseUrl}/admin`, { headers: { 'Cookie': adminCookie } });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Admin Dashboard') || html.includes('Platform Command Center'));
  });

  await check('Admin Platform Stats API (/api/admin/stats)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/stats`, { headers: { 'Cookie': adminCookie } });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.totalBusinesses === 'number');
  });

  await check('Admin Tenant Management List API (/api/admin/businesses)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/businesses`, { headers: { 'Cookie': adminCookie } });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.businesses));
  });

  await check('Admin Page: Manage All Businesses (/admin/businesses)', async () => {
    const res = await fetch(`${baseUrl}/admin/businesses`, { headers: { 'Cookie': adminCookie } });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Manage Businesses'));
    assert.ok(html.includes('Business Registrations'));
  });

  await check('Admin Page: Pending Approvals (/admin/businesses?status=PENDING)', async () => {
    const res = await fetch(`${baseUrl}/admin/businesses?status=PENDING`, { headers: { 'Cookie': adminCookie } });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Pending Approvals'));
  });

  await check('Admin Page: User Management (/admin/users)', async () => {
    const res = await fetch(`${baseUrl}/admin/users`, { headers: { 'Cookie': adminCookie } });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('User Management'));
  });

  await check('Admin Page: Platform Reports (/admin/reports)', async () => {
    const res = await fetch(`${baseUrl}/admin/reports`, { headers: { 'Cookie': adminCookie } });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Platform Reports & Analytics'));
  });

  await check('Admin Page: Audit Logs (/admin/audit-logs)', async () => {
    const res = await fetch(`${baseUrl}/admin/audit-logs`, { headers: { 'Cookie': adminCookie } });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Platform Security & Audit Trail'));
  });

  // 4. BUSINESS WORKSPACE MODULES (AUTHENTICATED)
  console.log('\n--- 4. Business Workspace Modules (Owner Session) ---');
  let ownerCookie = null;
  await check('Owner Authentication (POST /api/auth/login)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@rmstorvix.com', password: 'DemoOwner@2026!' })
    });
    assert.strictEqual(res.status, 200);
    ownerCookie = res.headers.get('set-cookie');
    assert.ok(ownerCookie, 'Must set owner session cookie');
  });

  const businessPages = [
    { path: '/dashboard', label: 'Business Dashboard', checkContent: 'Business Overview' },
    { path: '/billing', label: 'Billing & Invoices', checkContent: 'Billing & Invoices' },
    { path: '/inventory', label: 'Inventory & Stock Master', checkContent: 'Inventory & Stock' },
    { path: '/parties', label: 'Customers & Suppliers Master', checkContent: 'Customers & Suppliers' },
    { path: '/purchases', label: 'Purchase Inward Bills', checkContent: 'Purchase Bills' },
    { path: '/payments', label: 'Payments & Collections Vouchers', checkContent: 'Payments & Vouchers' },
    { path: '/accounting', label: 'Tally Accounting & General Ledger', checkContent: 'Tally Accounting' },
    { path: '/reports', label: 'Statutory Reports & GSTR-1/3B', checkContent: 'Reports & Analytics' },
    { path: '/profile', label: 'My Profile & Company Logo', checkContent: 'My Profile' },
    { path: '/settings', label: 'Business Settings & Digital Signature', checkContent: 'Digital Signature & Official Stamp' },
    { path: '/build-control', label: '6-Phase Build Control Center', checkContent: 'Build Control Center' }
  ];

  for (const page of businessPages) {
    await check(`Workspace Page: ${page.label} (${page.path})`, async () => {
      const res = await fetch(`${baseUrl}${page.path}`, { headers: { 'Cookie': ownerCookie } });
      assert.strictEqual(res.status, 200, `Expected 200 on ${page.path}`);
      const html = await res.text();
      assert.ok(html.includes(page.checkContent), `Page ${page.path} must contain ${page.checkContent}`);
    });
  }

  // 5. PRINTABLE INVOICE WITH DIGITAL SIGNATURE
  console.log('\n--- 5. High-Fidelity Printable GST Invoice ---');
  await check('Printable GST Invoice with Digital Signature (/invoice-print/1)', async () => {
    const res = await fetch(`${baseUrl}/invoice-print/1`, { headers: { 'Cookie': ownerCookie } });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('TAX INVOICE'));
    assert.ok(html.includes('inv-sign-block'));
    assert.ok(html.includes('inv-sig-img'));
    assert.ok(html.includes('Digitally Signed'));
  });

  // 6. BUSINESS & REPORTING APIS
  console.log('\n--- 6. Business Data & Accounting APIs ---');
  const apiEndpoints = [
    '/api/parties',
    '/api/products',
    '/api/invoices',
    '/api/payments',
    '/api/accounting/trial-balance',
    '/api/accounting/profit-loss',
    '/api/accounting/balance-sheet',
    '/api/accounting/daybook',
    '/api/accounting/accounts',
    '/api/reports/gstr1',
    '/api/reports/stock-valuation',
    '/api/build-control/status',
    '/api/health/supabase'
  ];

  for (const ep of apiEndpoints) {
    await check(`API Endpoint (${ep})`, async () => {
      const res = await fetch(`${baseUrl}${ep}`, { headers: { 'Cookie': ownerCookie } });
      assert.strictEqual(res.status, 200, `Expected 200 on ${ep}`);
      const data = await res.json();
      assert.ok(data !== null && typeof data === 'object', `Response must be JSON object on ${ep}`);
    });
  }

  console.log('\n=============================================================');
  console.log(`All Pages & Endpoints Verification: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================');

  if (failed > 0) process.exit(1);
}

testAll().catch(e => {
  console.error('Fatal crash during verification:', e);
  process.exit(1);
});
