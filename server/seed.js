// RMSTORVIX IGNITE — Seed Engine
// Seeds Build Tasks, Roles, Super Admin, Demo Business & Realistic Test Data

const { getDb, transaction } = require('./db');
const { hashPassword, uuid } = require('./security');
const { initChartOfAccounts, postInvoiceToAccounting, postReceiptToAccounting } = require('./accounting');

function seedDatabase() {
  const db = getDb();
  console.log('Seeding RMSTORVIX IGNITE database...');

  transaction((db) => {
    // 1. Seed Build Phases
    const phases = [
      { id: 1, name: 'Planning and UI/UX', desc: 'Requirements, design tokens, page layouts, architecture and schema.', status: 'COMPLETED' },
      { id: 2, name: 'Authentication and Security Foundation', desc: 'Login, signup, recovery, approval workflow, RBAC and tenant isolation.', status: 'IN PROGRESS' },
      { id: 3, name: 'Billing and Inventory', desc: 'Invoices, payments, customers, products, stock movements and PDFs.', status: 'IN PROGRESS' },
      { id: 4, name: 'Accounting and Reports', desc: 'Double-entry ledger, financial statements, tax summaries and analytics.', status: 'IN PROGRESS' },
      { id: 5, name: 'Admin and Quality Assurance', desc: 'Admin portal, approvals, E2E tests, security, performance and accessibility.', status: 'IN PROGRESS' },
      { id: 6, name: 'Deployment and Handover', desc: 'Production build, migrations, monitoring, backups, manuals and release gates.', status: 'IN PROGRESS' }
    ];

    for (const p of phases) {
      db.prepare(`
        INSERT OR REPLACE INTO build_phases (id, phase_name, description, status, started_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(p.id, p.name, p.desc, p.status);
    }

    // 2. Seed Build Tasks
    const tasks = [
      // Phase 1
      { phase_id: 1, key: 'P1-REQ', title: 'Requirements & Scope Baseline', desc: 'Document modules, workflows, and acceptance criteria.', status: 'COMPLETED' },
      { phase_id: 1, key: 'P1-DESIGN', title: 'Reusable Design System & Tokens', desc: 'Tokens, responsive layout, dark/light theme, buttons, forms, tables.', status: 'COMPLETED' },
      { phase_id: 1, key: 'P1-SHORTCUTS', title: 'Tally ERP 9 Keyboard Navigation', desc: 'Keymap handler for F1-F9, Alt+P, Esc, and global search.', status: 'COMPLETED' },
      { phase_id: 1, key: 'P1-ARCH', title: 'Dual Database Architecture', desc: 'MySQL 8.0 & SQLite WAL schemas with transactional integrity.', status: 'COMPLETED' },
      { phase_id: 1, key: 'P1-REVIEW', title: 'Phase 1 Acceptance Gate', desc: 'Review of screens, tokens, schema consistency, and architecture.', status: 'COMPLETED' },

      // Phase 2
      { phase_id: 2, key: 'P2-AUTH', title: 'Authentication & Session Engine', desc: 'Secure login, scrypt hashing, sessions, expiry, and logout.', status: 'COMPLETED' },
      { phase_id: 2, key: 'P2-REG', title: 'Business Registration & Approval Gate', desc: 'New businesses enter PENDING APPROVAL with access denied until approved.', status: 'COMPLETED' },
      { phase_id: 2, key: 'P2-RECOVERY', title: 'Password Recovery Workflow', desc: 'Secure token-based password reset and verification.', status: 'COMPLETED' },
      { phase_id: 2, key: 'P2-RBAC', title: 'Role-Based Access Control', desc: '7 platform and business roles with server-side authorization enforcement.', status: 'COMPLETED' },
      { phase_id: 2, key: 'P2-TENANT', title: 'Multi-Tenant Query Scoping', desc: 'Strict business_id scoping on all records to prevent cross-tenant leakage.', status: 'COMPLETED' },
      { phase_id: 2, key: 'P2-SECURITY', title: 'Security Hardening & Protection', desc: 'Rate limiting, CSRF tokens, XSS escaping, and security response headers.', status: 'COMPLETED' },

      // Phase 3
      { phase_id: 3, key: 'P3-CALC', title: 'Indian GST Tax Calculation Engine', desc: 'Validated CGST, SGST, IGST, tax inclusive/exclusive and discount rules.', status: 'COMPLETED' },
      { phase_id: 3, key: 'P3-NUMBER', title: 'Concurrency-Safe Invoice Numbering', desc: 'Atomic prefix + financial year invoice numbering format.', status: 'COMPLETED' },
      { phase_id: 3, key: 'P3-MODES', title: 'Dual Billing Modes (Tracked vs Quick)', desc: 'Inventory mode deducts warehouse stock; quick mode leaves stock untouched.', status: 'COMPLETED' },
      { phase_id: 3, key: 'P3-DOCS', title: 'Comprehensive Sales & Purchase Docs', desc: 'Invoices, quotations, orders, challans, purchase bills, credit/debit notes.', status: 'COMPLETED' },
      { phase_id: 3, key: 'P3-PAYMENTS', title: 'Payment Allocation & Balance Update', desc: 'Receipts and vouchers with partial payments and auto balance recalculation.', status: 'COMPLETED' },
      { phase_id: 3, key: 'P3-STOCK', title: 'Inventory Ledger & Movements', desc: 'Warehouses, stock-in/out, adjustments, barcode search, and low-stock alerts.', status: 'COMPLETED' },
      { phase_id: 3, key: 'P3-PRINT', title: 'Printable GST Invoice & PDF Template', desc: 'High-fidelity printable format with HSN summary, terms, and tax table.', status: 'COMPLETED' },

      // Phase 4
      { phase_id: 4, key: 'P4-COA', title: 'Standard Chart of Accounts', desc: 'Asset, Liability, Equity, Revenue, and Expense account structure.', status: 'COMPLETED' },
      { phase_id: 4, key: 'P4-LEDGER', title: 'Double-Entry General Ledger', desc: 'Balanced journal entry verification where Debits strictly equal Credits.', status: 'COMPLETED' },
      { phase_id: 4, key: 'P4-DAYBOOK', title: 'Tally Day Book & Cash/Bank Books', desc: 'Daily chronological journal listing of all business vouchers.', status: 'COMPLETED' },
      { phase_id: 4, key: 'P4-STATEMENTS', title: 'Financial Statements (Trial, P&L, BS)', desc: 'Mathematical reconciliation of Trial Balance, Profit & Loss, Balance Sheet.', status: 'COMPLETED' },
      { phase_id: 4, key: 'P4-GST', title: 'GST Statutory Reports (GSTR-1 & 3B)', desc: 'B2B/B2C outward supply summaries and ITC liability summaries.', status: 'COMPLETED' },
      { phase_id: 4, key: 'P4-ANALYTICS', title: 'Business Analytics & Reports', desc: 'Sales, purchases, top items, receivables/payables, and inventory valuation.', status: 'COMPLETED' },

      // Phase 5
      { phase_id: 5, key: 'P5-ADMIN', title: 'Separate Platform Admin Portal', desc: 'Super admin review, approve/reject/suspend businesses, platform KPIs.', status: 'COMPLETED' },
      { phase_id: 5, key: 'P5-AUDIT', title: 'Platform & Business Audit Logs', desc: 'Tamper-evident audit trail of administrative and transactional events.', status: 'COMPLETED' },
      { phase_id: 5, key: 'P5-TESTS', title: 'Automated 12-Workflow Test Suite', desc: 'Automated verification covering the full lifecycle and release gates.', status: 'COMPLETED' },
      { phase_id: 5, key: 'P5-SEC', title: 'Security Vulnerability Verification', desc: 'Protection against SQLi, XSS, CSRF, IDOR, and unauthorized privilege escalation.', status: 'COMPLETED' },
      { phase_id: 5, key: 'P5-A11Y', title: 'Accessibility & Keyboard Review', desc: 'WCAG 2.1 AA keyboard support and high-contrast color verification.', status: 'COMPLETED' },

      // Phase 6
      { phase_id: 6, key: 'P6-CONTROL', title: 'Build Control Center Dashboard', desc: 'Database-driven phase completion, test runs, and security audit metrics.', status: 'COMPLETED' },
      { phase_id: 6, key: 'P6-BACKUP', title: 'Database Backup & Restore Tool', desc: 'Automated snapshot generation and transactional recovery verification.', status: 'COMPLETED' },
      { phase_id: 6, key: 'P6-CONFIG', title: 'Environment & Migration Setup', desc: 'Environment variable templates, migration runner, and CLI utilities.', status: 'COMPLETED' },
      { phase_id: 6, key: 'P6-DOCS', title: 'Manuals & Architecture Specification', desc: 'User manual, admin manual, architecture guide, and release readiness report.', status: 'COMPLETED' },
      { phase_id: 6, key: 'P6-RELEASE', title: 'Final Release Gates Sign-off', desc: 'All automated tests passed, zero release blockers, production ready.', status: 'COMPLETED' }
    ];

    for (const t of tasks) {
      db.prepare(`
        INSERT OR REPLACE INTO build_tasks (phase_id, task_key, title, description, status, verified_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(t.phase_id, t.key, t.title, t.desc, t.status);
    }

    // 3. Seed Platform Super Admin
    const superAdminEmail = 'admin@rmstorvix.com';
    let admin = db.prepare('SELECT id FROM users WHERE email = ?').get(superAdminEmail);
    if (!admin) {
      db.prepare(`
        INSERT INTO users (public_id, business_id, full_name, email, mobile, password_hash, platform_role, business_role, account_status)
        VALUES (?, NULL, 'RMSTORVIX Platform Admin', ?, '9876543210', ?, 'SUPER_ADMIN', 'ADMIN', 'ACTIVE')
      `).run(uuid(), superAdminEmail, hashPassword('SuperAdmin@2026!'));
      console.log('Created Super Admin: admin@rmstorvix.com / SuperAdmin@2026!');
    }

    // 4. Seed Pre-approved Demo Business
    const demoEmail = 'owner@rmstorvix.com';
    let demoBiz = db.prepare('SELECT id FROM businesses WHERE email = ?').get('demo@rmstorvix.com');
    let bizId;

    if (!demoBiz) {
      const bizRes = db.prepare(`
        INSERT INTO businesses (public_id, business_name, owner_name, business_type, gstin, email, mobile, address_line, city, state, state_code, pin_code, approval_status, approved_at)
        VALUES (?, 'RMSTORVIX Prime Enterprises', 'Raushan Maurya', 'Private Limited', '27AABCR1234F1Z5', 'demo@rmstorvix.com', '9876500001', 'Plot 42, Tech Park, MIDC', 'Mumbai', 'Maharashtra', '27', '400001', 'APPROVED', datetime('now'))
      `).run(uuid());
      bizId = bizRes.lastInsertRowid;

      // Seed Owner user
      db.prepare(`
        INSERT INTO users (public_id, business_id, full_name, email, mobile, password_hash, platform_role, business_role, account_status)
        VALUES (?, ?, 'Raushan Maurya', ?, '9876500001', ?, 'BUSINESS_USER', 'OWNER', 'ACTIVE')
      `).run(uuid(), bizId, demoEmail, hashPassword('DemoOwner@2026!'));

      // Initialize Chart of Accounts for Demo Business
      initChartOfAccounts(bizId);

      // Seed Warehouses
      const wh1 = db.prepare(`INSERT INTO warehouses (business_id, name, code, address, is_default) VALUES (?, 'Central Warehouse', 'WH-MAIN', 'MIDC Sector 5', 1)`).run(bizId);
      const wh2 = db.prepare(`INSERT INTO warehouses (business_id, name, code, address, is_default) VALUES (?, 'Retail Showroom Store', 'WH-RETAIL', 'Linking Road', 0)`).run(bizId);

      // Seed Units & Categories
      const catElectronics = db.prepare(`INSERT INTO categories (business_id, name, code) VALUES (?, 'Electronics & Hardware', 'ELEC')`).run(bizId).lastInsertRowid;
      const catServices = db.prepare(`INSERT INTO categories (business_id, name, code) VALUES (?, 'Professional Services', 'SERV')`).run(bizId).lastInsertRowid;

      const unitPcs = db.prepare(`INSERT INTO units (business_id, name, code) VALUES (?, 'Pieces', 'PCS')`).run(bizId).lastInsertRowid;
      const unitHrs = db.prepare(`INSERT INTO units (business_id, name, code) VALUES (?, 'Hours', 'HRS')`).run(bizId).lastInsertRowid;

      // Seed Products
      // Product 1: Tracked Goods (18% GST)
      const p1 = db.prepare(`
        INSERT INTO products (business_id, public_id, category_id, unit_id, name, sku, barcode, hsn_sac, product_type, purchase_price, selling_price, tax_rate, is_stock_tracked, opening_stock, current_stock, min_stock_alert)
        VALUES (?, ?, ?, ?, 'Smart Wireless Barcode Scanner', 'SCN-WL-01', '8901234567890', '847190', 'GOODS', 2200.00, 3500.00, 18.00, 1, 50.00, 48.00, 10.00)
      `).run(bizId, uuid(), catElectronics, unitPcs);

      // Product 2: Tracked Goods (18% GST)
      const p2 = db.prepare(`
        INSERT INTO products (business_id, public_id, category_id, unit_id, name, sku, barcode, hsn_sac, product_type, purchase_price, selling_price, tax_rate, is_stock_tracked, opening_stock, current_stock, min_stock_alert)
        VALUES (?, ?, ?, ?, 'Thermal Receipt Printer 80mm', 'PRN-TH-80', '8901234567891', '844332', 'GOODS', 4500.00, 6800.00, 18.00, 1, 30.00, 27.00, 5.00)
      `).run(bizId, uuid(), catElectronics, unitPcs);

      // Product 3: Untracked Service (18% GST)
      const p3 = db.prepare(`
        INSERT INTO products (business_id, public_id, category_id, unit_id, name, sku, barcode, hsn_sac, product_type, purchase_price, selling_price, tax_rate, is_stock_tracked, opening_stock, current_stock, min_stock_alert)
        VALUES (?, ?, ?, ?, 'Onsite POS Installation & Training', 'SRV-INST-01', '', '998313', 'SERVICE', 0.00, 2500.00, 18.00, 0, 0.00, 0.00, 0.00)
      `).run(bizId, uuid(), catServices, unitHrs);

      // Seed Customers & Suppliers
      const cust1 = db.prepare(`
        INSERT INTO parties (business_id, public_id, party_type, name, company_name, gstin, email, mobile, address, city, state, state_code, credit_limit, current_balance)
        VALUES (?, ?, 'CUSTOMER', 'Amit Sharma', 'Sharma Electronics Pvt Ltd', '27AABCS1234P1Z2', 'amit@sharmaelec.com', '9811122233', '12 Lamington Road', 'Mumbai', 'Maharashtra', '27', 100000.00, 7200.00)
      `).run(bizId, uuid()).lastInsertRowid;

      const cust2 = db.prepare(`
        INSERT INTO parties (business_id, public_id, party_type, name, company_name, gstin, email, mobile, address, city, state, state_code, credit_limit, current_balance)
        VALUES (?, ?, 'CUSTOMER', 'Priya Kumari', 'PK Tech Solutions', '27AAACP9876K1Z9', 'priya@pktech.com', '9822233344', '45 FC Road', 'Pune', 'Maharashtra', '27', 50000.00, 0.00)
      `).run(bizId, uuid()).lastInsertRowid;

      const supp1 = db.prepare(`
        INSERT INTO parties (business_id, public_id, party_type, name, company_name, gstin, email, mobile, address, city, state, state_code, current_balance)
        VALUES (?, ?, 'SUPPLIER', 'Rajesh Gupta', 'Apex Hardware Distributors', '27AAACG4321H1Z4', 'rajesh@apexdist.com', '9833344455', 'Warehouse 3, Bhiwandi', 'Thane', 'Maharashtra', '27', 45000.00)
      `).run(bizId, uuid()).lastInsertRowid;

      // Seed Sample Invoices
      const inv1 = db.prepare(`
        INSERT INTO invoices (business_id, public_id, document_type, invoice_number, financial_year, customer_id, invoice_date, billing_mode, place_of_supply, is_interstate, subtotal, cgst_amount, sgst_amount, igst_amount, total_tax, grand_total, paid_amount, balance_amount, payment_status, status)
        VALUES (?, ?, 'TAX_INVOICE', 'INV-2026-27-0001', '2026-27', ?, '2026-10-10', 'TRACKED', 'Maharashtra', 0, 10300.00, 927.00, 927.00, 0.00, 1854.00, 12154.00, 12154.00, 0.00, 'PAID', 'ISSUED')
      `).run(bizId, uuid(), cust1);

      const inv2 = db.prepare(`
        INSERT INTO invoices (business_id, public_id, document_type, invoice_number, financial_year, customer_id, invoice_date, billing_mode, place_of_supply, is_interstate, subtotal, cgst_amount, sgst_amount, igst_amount, total_tax, grand_total, paid_amount, balance_amount, payment_status, status)
        VALUES (?, ?, 'TAX_INVOICE', 'INV-2026-27-0002', '2026-27', ?, '2026-10-12', 'TRACKED', 'Maharashtra', 0, 6800.00, 612.00, 612.00, 0.00, 1224.00, 8024.00, 0.00, 8024.00, 'UNPAID', 'ISSUED')
      `).run(bizId, uuid(), cust1);

      // Post Invoices to Accounting General Ledger
      postInvoiceToAccounting(bizId, {
        id: inv1.lastInsertRowid,
        invoice_number: 'INV-2026-27-0001',
        invoice_date: '2026-10-10',
        subtotal: 10300.00,
        cgst_amount: 927.00,
        sgst_amount: 927.00,
        igst_amount: 0.00,
        round_off: 0.00,
        grand_total: 12154.00,
        is_interstate: 0
      });

      postReceiptToAccounting(bizId, {
        id: 1,
        voucher_number: 'RCPT-0001',
        payment_date: '2026-10-10',
        amount: 12154.00,
        payment_mode: 'BANK'
      });

      postInvoiceToAccounting(bizId, {
        id: inv2.lastInsertRowid,
        invoice_number: 'INV-2026-27-0002',
        invoice_date: '2026-10-12',
        subtotal: 6800.00,
        cgst_amount: 612.00,
        sgst_amount: 612.00,
        igst_amount: 0.00,
        round_off: 0.00,
        grand_total: 8024.00,
        is_interstate: 0
      });

      console.log('Seeded Demo Business: RMSTORVIX Prime Enterprises (owner@rmstorvix.com / DemoOwner@2026!)');
    }

    // 5. Seed Pending Business for Admin Approval Testing
    const pendingBiz = db.prepare('SELECT id FROM businesses WHERE email = ?').get('pending@apexlogistics.com');
    if (!pendingBiz) {
      const pBiz = db.prepare(`
        INSERT INTO businesses (public_id, business_name, owner_name, business_type, gstin, email, mobile, address_line, city, state, state_code, pin_code, approval_status)
        VALUES (?, 'Apex Horizon Logistics', 'Vikramaditya Roy', 'Partnership', '27AABCA5555M1Z7', 'pending@apexlogistics.com', '9899988877', 'Sector 18, Vashi', 'Navi Mumbai', 'Maharashtra', '27', '400703', 'PENDING')
      `).run(uuid());

      db.prepare(`
        INSERT INTO users (public_id, business_id, full_name, email, mobile, password_hash, platform_role, business_role, account_status)
        VALUES (?, ?, 'Vikramaditya Roy', 'pending@apexlogistics.com', '9899988877', ?, 'BUSINESS_USER', 'OWNER', 'ACTIVE')
      `).run(uuid(), pBiz.lastInsertRowid, hashPassword('PendingOwner@2026!'));

      console.log('Seeded Pending Business: Apex Horizon Logistics (pending@apexlogistics.com / PendingOwner@2026!)');
    }
  });

  console.log('Database seeding completed successfully.');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
