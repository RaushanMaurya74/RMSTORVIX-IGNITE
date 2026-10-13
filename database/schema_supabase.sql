-- RMSTORVIX IGNITE — Production Supabase (PostgreSQL 17) Database Schema
-- Multi-Tenant SaaS: Billing, Inventory, Accounting & Business Management

-- 1. BUSINESSES (TENANTS)
CREATE TABLE IF NOT EXISTS businesses (
  id BIGSERIAL PRIMARY KEY,
  public_id VARCHAR(64) NOT NULL UNIQUE,
  business_name VARCHAR(190) NOT NULL,
  owner_name VARCHAR(190) NOT NULL,
  business_type VARCHAR(80),
  gstin VARCHAR(15),
  email VARCHAR(190) NOT NULL,
  mobile VARCHAR(25) NOT NULL,
  address_line TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  state_code VARCHAR(5),
  pin_code VARCHAR(12),
  financial_year_start_month SMALLINT NOT NULL DEFAULT 4,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  logo_url TEXT,
  tax_preference VARCHAR(50) NOT NULL DEFAULT 'GST_REGISTERED',
  invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'INV',
  invoice_next_number INT NOT NULL DEFAULT 1,
  approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING','APPROVED','REJECTED','SUSPENDED')),
  approved_by BIGINT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  digital_signature_data TEXT,
  company_seal_data TEXT,
  signatory_name VARCHAR(190),
  signatory_designation VARCHAR(100),
  enable_digital_signature BOOLEAN NOT NULL DEFAULT true,
  signature_date_enabled BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_status_created ON businesses(approval_status, created_at);
CREATE INDEX IF NOT EXISTS idx_business_email ON businesses(email);
CREATE INDEX IF NOT EXISTS idx_business_gstin ON businesses(gstin);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  public_id VARCHAR(64) NOT NULL UNIQUE,
  business_id BIGINT REFERENCES businesses(id) ON DELETE RESTRICT,
  full_name VARCHAR(190) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  mobile VARCHAR(25),
  password_hash VARCHAR(255) NOT NULL,
  platform_role VARCHAR(30) NOT NULL DEFAULT 'BUSINESS_USER' CHECK (platform_role IN ('SUPER_ADMIN','PLATFORM_ADMIN','BUSINESS_USER')),
  business_role VARCHAR(30) NOT NULL DEFAULT 'OWNER' CHECK (business_role IN ('OWNER','ADMIN','ACCOUNTANT','BILLING_OPERATOR','INVENTORY_MANAGER','READ_ONLY')),
  account_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('PENDING_VERIFICATION','ACTIVE','LOCKED','DISABLED')),
  email_verified_at TIMESTAMPTZ,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  mfa_secret VARCHAR(64),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_business_status ON users(business_id, account_status);

-- 3. SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  session_token VARCHAR(128) NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id BIGINT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

-- 4. PASSWORD RESETS
CREATE TABLE IF NOT EXISTS password_resets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  action_key VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id BIGINT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_biz_action ON audit_logs(business_id, action_key);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- 6. PARTIES (CUSTOMERS & SUPPLIERS)
CREATE TABLE IF NOT EXISTS parties (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  public_id VARCHAR(64) NOT NULL UNIQUE,
  party_type VARCHAR(20) NOT NULL CHECK (party_type IN ('CUSTOMER','SUPPLIER','BOTH')),
  name VARCHAR(190) NOT NULL,
  company_name VARCHAR(190),
  gstin VARCHAR(15),
  pan VARCHAR(10),
  email VARCHAR(190),
  mobile VARCHAR(25),
  phone VARCHAR(25),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  state_code VARCHAR(5),
  pin_code VARCHAR(12),
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  payment_terms_days INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parties_biz_type ON parties(business_id, party_type);

-- 7. TAX RATES
CREATE TABLE IF NOT EXISTS tax_rates (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  tax_name VARCHAR(50) NOT NULL,
  rate_percent NUMERIC(5,2) NOT NULL,
  cgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  sgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  igst_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  is_default BOOLEAN NOT NULL DEFAULT false
);

-- 8. PRODUCT CATEGORIES
CREATE TABLE IF NOT EXISTS product_categories (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. PRODUCTS (ITEM MASTER)
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  public_id VARCHAR(64) NOT NULL UNIQUE,
  category_id BIGINT REFERENCES product_categories(id) ON DELETE SET NULL,
  name VARCHAR(190) NOT NULL,
  sku VARCHAR(100),
  hsn_sac VARCHAR(20),
  barcode VARCHAR(100),
  description TEXT,
  item_type VARCHAR(20) NOT NULL DEFAULT 'GOODS' CHECK (item_type IN ('GOODS','SERVICE')),
  unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
  selling_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  purchase_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  is_stock_tracked BOOLEAN NOT NULL DEFAULT true,
  current_stock NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  min_stock_alert NUMERIC(14,2) NOT NULL DEFAULT 5.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_biz ON products(business_id);

-- 10. STOCK MOVEMENTS
CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type VARCHAR(30) NOT NULL,
  reference_type VARCHAR(50),
  reference_id BIGINT,
  quantity NUMERIC(14,2) NOT NULL,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  public_id VARCHAR(64) NOT NULL UNIQUE,
  invoice_number VARCHAR(100) NOT NULL,
  customer_id BIGINT NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  invoice_date DATE NOT NULL,
  due_date DATE,
  financial_year VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'FINAL' CHECK (status IN ('DRAFT','FINAL','CANCELLED')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID','PARTIALLY_PAID','PAID')),
  place_of_supply VARCHAR(100),
  is_interstate BOOLEAN NOT NULL DEFAULT false,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  cgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  sgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  igst_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_tax NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  round_off NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  grand_total NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  balance_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_biz_inv_num UNIQUE(business_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_biz_date ON invoices(business_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);

-- 12. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  description VARCHAR(255) NOT NULL,
  hsn_sac VARCHAR(20),
  quantity NUMERIC(14,2) NOT NULL DEFAULT 1.00,
  unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
  rate NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  cgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  sgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  igst_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  is_stock_deducted BOOLEAN NOT NULL DEFAULT false
);

-- 13. PURCHASE BILLS
CREATE TABLE IF NOT EXISTS purchase_bills (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  public_id VARCHAR(64) NOT NULL UNIQUE,
  bill_number VARCHAR(100) NOT NULL,
  supplier_id BIGINT NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  vendor_invoice_number VARCHAR(100),
  bill_date DATE NOT NULL,
  due_date DATE,
  financial_year VARCHAR(20) NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID','PARTIALLY_PAID','PAID')),
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  cgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  sgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  igst_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_tax NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  round_off NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  grand_total NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  balance_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_biz_bill_num UNIQUE(business_id, bill_number)
);

-- 14. PURCHASE ITEMS
CREATE TABLE IF NOT EXISTS purchase_items (
  id BIGSERIAL PRIMARY KEY,
  purchase_bill_id BIGINT NOT NULL REFERENCES purchase_bills(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  description VARCHAR(255) NOT NULL,
  hsn_sac VARCHAR(20),
  quantity NUMERIC(14,2) NOT NULL DEFAULT 1.00,
  unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
  rate NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  cgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  sgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  igst_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00
);

-- 15. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  public_id VARCHAR(64) NOT NULL UNIQUE,
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('RECEIPT','PAYMENT')),
  party_id BIGINT NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  invoice_id BIGINT REFERENCES invoices(id) ON DELETE SET NULL,
  purchase_bill_id BIGINT REFERENCES purchase_bills(id) ON DELETE SET NULL,
  voucher_number VARCHAR(100) NOT NULL,
  payment_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  payment_mode VARCHAR(20) NOT NULL DEFAULT 'CASH' CHECK (payment_mode IN ('CASH','BANK','UPI','CHEQUE','CARD')),
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_biz_date ON payments(business_id, payment_date);

-- 16. ACCOUNTS (CHART OF ACCOUNTS)
CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  account_code VARCHAR(50) NOT NULL,
  account_name VARCHAR(150) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  parent_id BIGINT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_biz_acc_code UNIQUE (business_id, account_code)
);

-- 17. JOURNAL ENTRIES
CREATE TABLE IF NOT EXISTS journal_entries (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  entry_number VARCHAR(100) NOT NULL,
  entry_date DATE NOT NULL,
  reference_type VARCHAR(50),
  reference_id BIGINT,
  narration TEXT NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL,
  created_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_journal_biz_date ON journal_entries(business_id, entry_date);

-- 18. JOURNAL LINES
CREATE TABLE IF NOT EXISTS journal_lines (
  id BIGSERIAL PRIMARY KEY,
  journal_entry_id BIGINT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  description VARCHAR(255)
);

-- 19. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  public_id VARCHAR(64) NOT NULL UNIQUE,
  expense_number VARCHAR(100) NOT NULL,
  expense_date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  payment_mode VARCHAR(20) NOT NULL DEFAULT 'CASH' CHECK (payment_mode IN ('CASH','BANK','UPI','CARD')),
  paid_to VARCHAR(190),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 20. BUSINESS SETTINGS
CREATE TABLE IF NOT EXISTS business_settings (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_biz_setting UNIQUE(business_id, setting_key)
);

-- ========================================================
-- SEED DATA (PRODUCTION TENANTS, USERS, ROLES, LEDGER)
-- ========================================================

INSERT INTO businesses (id, public_id, business_name, owner_name, business_type, gstin, email, mobile, address_line, city, state, pin_code, approval_status, is_active)
VALUES 
  (1, 'biz-001-rr-enterprises', 'R R Enterprises', 'Raushan Maurya', 'PROPRIETORSHIP', '27AABCR1234F1Z5', 'owner@rmstorvix.com', '9876543210', 'Plot 42, MIDC Industrial Area', 'Mumbai', 'Maharashtra', '400001', 'APPROVED', true),
  (2, 'biz-002-apex-logistics', 'Apex Horizon Logistics', 'Vikramaditya Roy', 'PVT_LTD', '29ABCDE1234F1Z5', 'pending@apexlogistics.com', '9811223344', 'Tech Park, Whitefield', 'Bengaluru', 'Karnataka', '560066', 'PENDING', true)
ON CONFLICT (id) DO UPDATE SET business_name = EXCLUDED.business_name;

SELECT setval(pg_get_serial_sequence('businesses', 'id'), (SELECT MAX(id) FROM businesses));

INSERT INTO users (id, public_id, business_id, full_name, email, mobile, password_hash, platform_role, business_role, account_status)
VALUES
  (1, 'usr-001-superadmin', NULL, 'RMSTORVIX Platform Admin', 'admin@rmstorvix.com', '9999999999', '6c8316ae7d86d86b89ee62688547a4bf:2cf6eda503834adecd851ba9f0bab733287732c8a104599770e02b2b94f013f3b4e65ab198ab7863f0e811d0ae6af315a3ca0136ddc171a5e268a08f58c7f2fd', 'SUPER_ADMIN', 'ADMIN', 'ACTIVE'),
  (2, 'usr-002-demoowner', 1, 'Raushan Maurya', 'owner@rmstorvix.com', '9876543210', '8ff80abc8c45de7922cf3ca633333d4e:19ba6a3f69cf5e5cd0b0c98d367d721d6f4156d61fee0bcb4459edc4b013fcb2504aefcc1bbb93849b83dad40742dbceb67c652db49dd3132c858a058e482e87', 'BUSINESS_USER', 'OWNER', 'ACTIVE'),
  (3, 'usr-003-pendingowner', 2, 'Vikramaditya Roy', 'pending@apexlogistics.com', '9811223344', '8ff80abc8c45de7922cf3ca633333d4e:19ba6a3f69cf5e5cd0b0c98d367d721d6f4156d61fee0bcb4459edc4b013fcb2504aefcc1bbb93849b83dad40742dbceb67c652db49dd3132c858a058e482e87', 'BUSINESS_USER', 'OWNER', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));

INSERT INTO accounts (business_id, account_code, account_name, account_type, is_system, opening_balance, current_balance)
VALUES
  (1, '1001', 'Cash in Hand', 'ASSET', true, 25000.00, 25000.00),
  (1, '1002', 'HDFC Bank Operating Account', 'ASSET', true, 150000.00, 150000.00),
  (1, '1003', 'Accounts Receivable (Debtors)', 'ASSET', true, 0.00, 0.00),
  (1, '1004', 'Stock-in-Trade (Inventory)', 'ASSET', true, 85000.00, 85000.00),
  (1, '2001', 'Accounts Payable (Creditors)', 'LIABILITY', true, 0.00, 0.00),
  (1, '2002', 'Output CGST Payable', 'LIABILITY', true, 0.00, 0.00),
  (1, '2003', 'Output SGST Payable', 'LIABILITY', true, 0.00, 0.00),
  (1, '2004', 'Output IGST Payable', 'LIABILITY', true, 0.00, 0.00),
  (1, '3001', 'Proprietor / Equity Capital', 'EQUITY', true, 260000.00, 260000.00),
  (1, '4001', 'Sales Revenue (Goods & Services)', 'REVENUE', true, 0.00, 0.00),
  (1, '5001', 'Cost of Goods Sold (Purchases)', 'EXPENSE', true, 0.00, 0.00)
ON CONFLICT (business_id, account_code) DO NOTHING;
