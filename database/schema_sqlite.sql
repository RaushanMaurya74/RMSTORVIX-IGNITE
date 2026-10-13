-- RMSTORVIX IGNITE — SQLite Database Schema
-- Standalone Embedded Database with Full Multi-Tenant SaaS & Double-Entry Accounting

PRAGMA foreign_keys = ON;

-- 1. BUSINESSES (TENANTS)
CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  business_type TEXT,
  gstin TEXT,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address_line TEXT,
  city TEXT,
  state TEXT,
  state_code TEXT,
  pin_code TEXT,
  financial_year_start_month INTEGER NOT NULL DEFAULT 4,
  currency TEXT NOT NULL DEFAULT 'INR',
  logo_url TEXT,
  tax_preference TEXT NOT NULL DEFAULT 'GST_REGISTERED',
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  invoice_next_number INTEGER NOT NULL DEFAULT 1,
  approval_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(approval_status IN ('PENDING','APPROVED','REJECTED','SUSPENDED')),
  approved_by INTEGER,
  approved_at TEXT,
  rejection_reason TEXT,
  digital_signature_data TEXT,
  company_seal_data TEXT,
  signatory_name TEXT,
  signatory_designation TEXT,
  enable_digital_signature INTEGER NOT NULL DEFAULT 1,
  signature_date_enabled INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_business_status_created ON businesses(approval_status, created_at);
CREATE INDEX IF NOT EXISTS idx_business_email ON businesses(email);
CREATE INDEX IF NOT EXISTS idx_business_gstin ON businesses(gstin);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  business_id INTEGER,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  mobile TEXT,
  password_hash TEXT NOT NULL,
  platform_role TEXT NOT NULL DEFAULT 'BUSINESS_USER' CHECK(platform_role IN ('SUPER_ADMIN','PLATFORM_ADMIN','BUSINESS_USER')),
  business_role TEXT NOT NULL DEFAULT 'OWNER' CHECK(business_role IN ('OWNER','ADMIN','ACCOUNTANT','BILLING_OPERATOR','INVENTORY_MANAGER','READ_ONLY')),
  account_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(account_status IN ('PENDING_VERIFICATION','ACTIVE','LOCKED','DISABLED')),
  email_verified_at TEXT,
  mfa_enabled INTEGER NOT NULL DEFAULT 0,
  mfa_secret TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_users_business_status ON users(business_id, account_status);

-- 3. SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  business_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

-- 4. PASSWORD RESETS
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. VERIFICATION CODES
CREATE TABLE IF NOT EXISTS verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  code_type TEXT NOT NULL DEFAULT 'EMAIL' CHECK(code_type IN ('EMAIL','PHONE')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER,
  business_id INTEGER,
  action_key TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_business_created ON audit_logs(business_id, created_at);

-- 7. BUILD PHASES
CREATE TABLE IF NOT EXISTS build_phases (
  id INTEGER PRIMARY KEY,
  phase_name TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NOT STARTED' CHECK(status IN ('NOT STARTED','IN PROGRESS','BLOCKED','IN REVIEW','TESTING','PASSED','FAILED','COMPLETED')),
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. BUILD TASKS
CREATE TABLE IF NOT EXISTS build_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phase_id INTEGER NOT NULL,
  task_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'NOT STARTED' CHECK(status IN ('NOT STARTED','IN PROGRESS','BLOCKED','IN REVIEW','TESTING','PASSED','FAILED','COMPLETED')),
  blocker TEXT,
  acceptance_criteria TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (phase_id) REFERENCES build_phases(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_build_tasks_phase_status ON build_tasks(phase_id, status);

-- 9. TEST RUNS
CREATE TABLE IF NOT EXISTS test_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phase_id INTEGER NOT NULL,
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK(test_type IN ('UNIT','INTEGRATION','E2E','SECURITY','PERFORMANCE','ACCESSIBILITY','RESTORE')),
  result TEXT NOT NULL DEFAULT 'NOT RUN' CHECK(result IN ('NOT RUN','PASSED','FAILED','BLOCKED')),
  details TEXT,
  executed_at TEXT,
  FOREIGN KEY (phase_id) REFERENCES build_phases(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_test_runs_phase_result ON test_runs(phase_id, result);

-- 10. SECURITY FINDINGS
CREATE TABLE IF NOT EXISTS security_findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_key TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','RESOLVED','ACCEPTED_RISK')),
  remediation TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- 11. PARTIES (CUSTOMERS & SUPPLIERS)
CREATE TABLE IF NOT EXISTS parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  public_id TEXT NOT NULL UNIQUE,
  party_type TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK(party_type IN ('CUSTOMER','SUPPLIER','BOTH')),
  name TEXT NOT NULL,
  company_name TEXT,
  gstin TEXT,
  pan TEXT,
  email TEXT,
  mobile TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  state_code TEXT,
  pin_code TEXT,
  credit_limit NUMERIC NOT NULL DEFAULT 0.00,
  opening_balance NUMERIC NOT NULL DEFAULT 0.00,
  current_balance NUMERIC NOT NULL DEFAULT 0.00,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_parties_biz_type ON parties(business_id, party_type);
CREATE INDEX IF NOT EXISTS idx_parties_biz_name ON parties(business_id, name);

-- 12. WAREHOUSES
CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- 13. CATEGORIES & UNITS
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- 14. PRODUCTS & SERVICES
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  public_id TEXT NOT NULL UNIQUE,
  category_id INTEGER,
  unit_id INTEGER,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  hsn_sac TEXT,
  product_type TEXT NOT NULL DEFAULT 'GOODS' CHECK(product_type IN ('GOODS','SERVICE')),
  description TEXT,
  purchase_price NUMERIC NOT NULL DEFAULT 0.00,
  selling_price NUMERIC NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC NOT NULL DEFAULT 18.00,
  is_tax_inclusive INTEGER NOT NULL DEFAULT 0,
  is_stock_tracked INTEGER NOT NULL DEFAULT 1,
  min_stock_alert NUMERIC NOT NULL DEFAULT 5.00,
  opening_stock NUMERIC NOT NULL DEFAULT 0.00,
  current_stock NUMERIC NOT NULL DEFAULT 0.00,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_products_biz_stock ON products(business_id, is_stock_tracked, current_stock);
CREATE INDEX IF NOT EXISTS idx_products_biz_sku ON products(business_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_biz_barcode ON products(business_id, barcode);

-- 15. STOCK MOVEMENTS (INVENTORY LEDGER)
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  warehouse_id INTEGER,
  movement_type TEXT NOT NULL CHECK(movement_type IN ('OPENING','PURCHASE','SALE','RETURN_IN','RETURN_OUT','ADJUSTMENT_IN','ADJUSTMENT_OUT','TRANSFER_IN','TRANSFER_OUT')),
  reference_type TEXT NOT NULL CHECK(reference_type IN ('INVOICE','PURCHASE_BILL','ADJUSTMENT','TRANSFER','MANUAL')),
  reference_id INTEGER,
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_biz_prod ON stock_movements(business_id, product_id, created_at);

-- 16. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  public_id TEXT NOT NULL UNIQUE,
  document_type TEXT NOT NULL DEFAULT 'TAX_INVOICE' CHECK(document_type IN ('TAX_INVOICE','BILL_OF_SUPPLY','QUOTATION','SALES_ORDER','DELIVERY_CHALLAN','CREDIT_NOTE')),
  invoice_number TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  customer_id INTEGER NOT NULL,
  invoice_date TEXT NOT NULL,
  due_date TEXT,
  billing_mode TEXT NOT NULL DEFAULT 'TRACKED' CHECK(billing_mode IN ('TRACKED','QUICK')),
  place_of_supply TEXT,
  is_interstate INTEGER NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0.00,
  total_discount NUMERIC NOT NULL DEFAULT 0.00,
  cgst_amount NUMERIC NOT NULL DEFAULT 0.00,
  sgst_amount NUMERIC NOT NULL DEFAULT 0.00,
  igst_amount NUMERIC NOT NULL DEFAULT 0.00,
  total_tax NUMERIC NOT NULL DEFAULT 0.00,
  round_off NUMERIC NOT NULL DEFAULT 0.00,
  grand_total NUMERIC NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC NOT NULL DEFAULT 0.00,
  balance_amount NUMERIC NOT NULL DEFAULT 0.00,
  payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN ('UNPAID','PARTIALLY_PAID','PAID')),
  status TEXT NOT NULL DEFAULT 'ISSUED' CHECK(status IN ('DRAFT','ISSUED','CANCELLED')),
  notes TEXT,
  terms TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES parties(id) ON DELETE RESTRICT,
  UNIQUE(business_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_biz_date ON invoices(business_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_biz_status ON invoices(business_id, payment_status, status);

-- 17. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  product_id INTEGER,
  description TEXT NOT NULL,
  hsn_sac TEXT,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'PCS',
  rate NUMERIC NOT NULL,
  discount_percent NUMERIC NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC NOT NULL DEFAULT 0.00,
  cgst_amount NUMERIC NOT NULL DEFAULT 0.00,
  sgst_amount NUMERIC NOT NULL DEFAULT 0.00,
  igst_amount NUMERIC NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC NOT NULL DEFAULT 0.00,
  total_amount NUMERIC NOT NULL,
  is_stock_deducted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- 18. PURCHASE BILLS
CREATE TABLE IF NOT EXISTS purchase_bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  public_id TEXT NOT NULL UNIQUE,
  document_type TEXT NOT NULL DEFAULT 'PURCHASE_BILL' CHECK(document_type IN ('PURCHASE_BILL','PURCHASE_ORDER','DEBIT_NOTE')),
  bill_number TEXT NOT NULL,
  supplier_bill_no TEXT,
  financial_year TEXT NOT NULL,
  supplier_id INTEGER NOT NULL,
  bill_date TEXT NOT NULL,
  due_date TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0.00,
  cgst_amount NUMERIC NOT NULL DEFAULT 0.00,
  sgst_amount NUMERIC NOT NULL DEFAULT 0.00,
  igst_amount NUMERIC NOT NULL DEFAULT 0.00,
  total_tax NUMERIC NOT NULL DEFAULT 0.00,
  round_off NUMERIC NOT NULL DEFAULT 0.00,
  grand_total NUMERIC NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC NOT NULL DEFAULT 0.00,
  balance_amount NUMERIC NOT NULL DEFAULT 0.00,
  payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN ('UNPAID','PARTIALLY_PAID','PAID')),
  status TEXT NOT NULL DEFAULT 'ISSUED' CHECK(status IN ('DRAFT','ISSUED','CANCELLED')),
  notes TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES parties(id) ON DELETE RESTRICT,
  UNIQUE(business_id, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_purchases_biz_date ON purchase_bills(business_id, bill_date);

-- 19. PURCHASE ITEMS
CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_bill_id INTEGER NOT NULL,
  product_id INTEGER,
  description TEXT NOT NULL,
  hsn_sac TEXT,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'PCS',
  rate NUMERIC NOT NULL,
  tax_rate NUMERIC NOT NULL DEFAULT 0.00,
  cgst_amount NUMERIC NOT NULL DEFAULT 0.00,
  sgst_amount NUMERIC NOT NULL DEFAULT 0.00,
  igst_amount NUMERIC NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC NOT NULL DEFAULT 0.00,
  total_amount NUMERIC NOT NULL,
  FOREIGN KEY (purchase_bill_id) REFERENCES purchase_bills(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- 20. PAYMENTS (RECEIPTS & VOUCHERS)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  public_id TEXT NOT NULL UNIQUE,
  payment_type TEXT NOT NULL CHECK(payment_type IN ('RECEIPT','PAYMENT')),
  party_id INTEGER NOT NULL,
  invoice_id INTEGER,
  purchase_bill_id INTEGER,
  voucher_number TEXT NOT NULL,
  payment_date TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'CASH' CHECK(payment_mode IN ('CASH','BANK','UPI','CHEQUE','CARD')),
  reference_number TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE RESTRICT,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (purchase_bill_id) REFERENCES purchase_bills(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_biz_date ON payments(business_id, payment_date);

-- 21. ACCOUNTS (CHART OF ACCOUNTS)
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK(account_type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  parent_id INTEGER,
  is_system INTEGER NOT NULL DEFAULT 0,
  opening_balance NUMERIC NOT NULL DEFAULT 0.00,
  current_balance NUMERIC NOT NULL DEFAULT 0.00,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  UNIQUE(business_id, account_code)
);

-- 22. JOURNAL ENTRIES (DOUBLE-ENTRY)
CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  entry_number TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  narration TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journal_biz_date ON journal_entries(business_id, entry_date);

-- 23. JOURNAL LINES
CREATE TABLE IF NOT EXISTS journal_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  journal_entry_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  debit NUMERIC NOT NULL DEFAULT 0.00,
  credit NUMERIC NOT NULL DEFAULT 0.00,
  description TEXT,
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

-- 24. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  public_id TEXT NOT NULL UNIQUE,
  expense_number TEXT NOT NULL,
  expense_date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  tax_amount NUMERIC NOT NULL DEFAULT 0.00,
  payment_mode TEXT NOT NULL DEFAULT 'CASH' CHECK(payment_mode IN ('CASH','BANK','UPI','CARD')),
  paid_to TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_expenses_biz_date ON expenses(business_id, expense_date);

-- 25. BUSINESS SETTINGS
CREATE TABLE IF NOT EXISTS business_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  UNIQUE(business_id, setting_key)
);
