-- RMSTORVIX IGNITE — Production Database Schema (MySQL 8.0+)
-- Multi-Tenant SaaS: Billing, Inventory, Accounting & Business Management

CREATE DATABASE IF NOT EXISTS rmstorvix_ignite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rmstorvix_ignite;

-- 1. BUSINESSES (TENANTS)
CREATE TABLE IF NOT EXISTS businesses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL UNIQUE,
  business_name VARCHAR(190) NOT NULL,
  owner_name VARCHAR(190) NOT NULL,
  business_type VARCHAR(80) NULL,
  gstin VARCHAR(15) NULL,
  email VARCHAR(190) NOT NULL,
  mobile VARCHAR(25) NOT NULL,
  address_line TEXT NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  state_code VARCHAR(5) NULL,
  pin_code VARCHAR(12) NULL,
  financial_year_start_month TINYINT UNSIGNED NOT NULL DEFAULT 4,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  logo_url TEXT NULL,
  tax_preference VARCHAR(50) NOT NULL DEFAULT 'GST_REGISTERED',
  invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'INV',
  invoice_next_number INT UNSIGNED NOT NULL DEFAULT 1,
  approval_status ENUM('PENDING','APPROVED','REJECTED','SUSPENDED') NOT NULL DEFAULT 'PENDING',
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  rejection_reason TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_business_status_created (approval_status, created_at),
  INDEX idx_business_email (email),
  INDEX idx_business_gstin (gstin)
) ENGINE=InnoDB;

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL UNIQUE,
  business_id BIGINT UNSIGNED NULL,
  full_name VARCHAR(190) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  mobile VARCHAR(25) NULL,
  password_hash VARCHAR(255) NOT NULL,
  platform_role ENUM('SUPER_ADMIN','PLATFORM_ADMIN','BUSINESS_USER') NOT NULL DEFAULT 'BUSINESS_USER',
  business_role ENUM('OWNER','ADMIN','ACCOUNTANT','BILLING_OPERATOR','INVENTORY_MANAGER','READ_ONLY') NOT NULL DEFAULT 'OWNER',
  account_status ENUM('PENDING_VERIFICATION','ACTIVE','LOCKED','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  email_verified_at DATETIME NULL,
  mfa_enabled TINYINT(1) NOT NULL DEFAULT 0,
  mfa_secret VARCHAR(64) NULL,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT,
  INDEX idx_users_business_status (business_id, account_status)
) ENGINE=InnoDB;

-- 3. SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_token VARCHAR(128) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  business_id BIGINT UNSIGNED NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_token (session_token),
  INDEX idx_sessions_expiry (expires_at)
) ENGINE=InnoDB;

-- 4. PASSWORD RESETS
CREATE TABLE IF NOT EXISTS password_resets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_password_reset_expiry (expires_at, used_at)
) ENGINE=InnoDB;

-- 5. VERIFICATION CODES
CREATE TABLE IF NOT EXISTS verification_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(10) NOT NULL,
  code_type ENUM('EMAIL','PHONE') NOT NULL DEFAULT 'EMAIL',
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_verif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED NULL,
  business_id BIGINT UNSIGNED NULL,
  action_key VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NULL,
  entity_id VARCHAR(100) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_audit_business_created (business_id, created_at),
  INDEX idx_audit_action_created (action_key, created_at)
) ENGINE=InnoDB;

-- 7. BUILD PHASES
CREATE TABLE IF NOT EXISTS build_phases (
  id TINYINT UNSIGNED PRIMARY KEY,
  phase_name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('NOT STARTED','IN PROGRESS','BLOCKED','IN REVIEW','TESTING','PASSED','FAILED','COMPLETED') NOT NULL DEFAULT 'NOT STARTED',
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 8. BUILD TASKS
CREATE TABLE IF NOT EXISTS build_tasks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phase_id TINYINT UNSIGNED NOT NULL,
  task_key VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(190) NOT NULL,
  description TEXT NULL,
  status ENUM('NOT STARTED','IN PROGRESS','BLOCKED','IN REVIEW','TESTING','PASSED','FAILED','COMPLETED') NOT NULL DEFAULT 'NOT STARTED',
  blocker TEXT NULL,
  acceptance_criteria JSON NULL,
  verified_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_build_tasks_phase FOREIGN KEY (phase_id) REFERENCES build_phases(id) ON DELETE RESTRICT,
  INDEX idx_build_tasks_phase_status (phase_id, status)
) ENGINE=InnoDB;

-- 9. TEST RUNS
CREATE TABLE IF NOT EXISTS test_runs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phase_id TINYINT UNSIGNED NOT NULL,
  test_name VARCHAR(190) NOT NULL,
  test_type ENUM('UNIT','INTEGRATION','E2E','SECURITY','PERFORMANCE','ACCESSIBILITY','RESTORE') NOT NULL,
  result ENUM('NOT RUN','PASSED','FAILED','BLOCKED') NOT NULL DEFAULT 'NOT RUN',
  details TEXT NULL,
  executed_at DATETIME NULL,
  CONSTRAINT fk_test_runs_phase FOREIGN KEY (phase_id) REFERENCES build_phases(id) ON DELETE RESTRICT,
  INDEX idx_test_runs_phase_result (phase_id, result)
) ENGINE=InnoDB;

-- 10. SECURITY FINDINGS
CREATE TABLE IF NOT EXISTS security_findings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_key VARCHAR(100) NOT NULL,
  severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  title VARCHAR(190) NOT NULL,
  description TEXT NULL,
  status ENUM('OPEN','RESOLVED','ACCEPTED_RISK') NOT NULL DEFAULT 'OPEN',
  remediation TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL
) ENGINE=InnoDB;

-- 11. PARTIES (CUSTOMERS & SUPPLIERS)
CREATE TABLE IF NOT EXISTS parties (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT UNSIGNED NOT NULL,
  public_id CHAR(36) NOT NULL UNIQUE,
  party_type ENUM('CUSTOMER','SUPPLIER','BOTH') NOT NULL DEFAULT 'CUSTOMER',
  name VARCHAR(190) NOT NULL,
  company_name VARCHAR(190) NULL,
  gstin VARCHAR(15) NULL,
  pan VARCHAR(10) NULL,
  email VARCHAR(190) NULL,
  mobile VARCHAR(25) NULL,
  address TEXT NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  state_code VARCHAR(5) NULL,
  pin_code VARCHAR(12) NULL,
  credit_limit DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  current_balance DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_parties_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_parties_biz_type (business_id, party_type),
  INDEX idx_parties_biz_name (business_id, name)
) ENGINE=InnoDB;

-- 12. WAREHOUSES
CREATE TABLE IF NOT EXISTS warehouses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL,
  address TEXT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_warehouses_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_warehouses_biz (business_id)
) ENGINE=InnoDB;

-- 13. CATEGORIES & UNITS
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS units (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_units_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 14. PRODUCTS & SERVICES
CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT UNSIGNED NOT NULL,
  public_id CHAR(36) NOT NULL UNIQUE,
  category_id BIGINT UNSIGNED NULL,
  unit_id BIGINT UNSIGNED NULL,
  name VARCHAR(190) NOT NULL,
  sku VARCHAR(100) NULL,
  barcode VARCHAR(100) NULL,
  hsn_sac VARCHAR(20) NULL,
  product_type ENUM('GOODS','SERVICE') NOT NULL DEFAULT 'GOODS',
  description TEXT NULL,
  purchase_price DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  selling_price DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  is_tax_inclusive TINYINT(1) NOT NULL DEFAULT 0,
  is_stock_tracked TINYINT(1) NOT NULL DEFAULT 1,
  min_stock_alert DECIMAL(12,2) NOT NULL DEFAULT 5.00,
  opening_stock DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  current_stock DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_products_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
  INDEX idx_products_biz_stock (business_id, is_stock_tracked, current_stock),
  INDEX idx_products_biz_sku (business_id, sku),
  INDEX idx_products_biz_barcode (business_id, barcode)
) ENGINE=InnoDB;

-- 15. STOCK MOVEMENTS (INVENTORY LEDGER)
CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NULL,
  movement_type ENUM('OPENING','PURCHASE','SALE','RETURN_IN','RETURN_OUT','ADJUSTMENT_IN','ADJUSTMENT_OUT','TRANSFER_IN','TRANSFER_OUT') NOT NULL,
  reference_type ENUM('INVOICE','PURCHASE_BILL','ADJUSTMENT','TRANSFER','MANUAL') NOT NULL,
  reference_id BIGINT UNSIGNED NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit_cost DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
  INDEX idx_stock_biz_prod (business_id, product_id, created_at)
) ENGINE=InnoDB;

-- 16. INVOICES (SALES, QUOTES, ORDERS, CHALLANS, CREDIT NOTES)
CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT UNSIGNED NOT NULL,
  public_id CHAR(36) NOT NULL UNIQUE,
  document_type ENUM('TAX_INVOICE','BILL_OF_SUPPLY','QUOTATION','SALES_ORDER','DELIVERY_CHALLAN','CREDIT_NOTE') NOT NULL DEFAULT 'TAX_INVOICE',
  invoice_number VARCHAR(100) NOT NULL,
  financial_year VARCHAR(20) NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NULL,
  billing_mode ENUM('TRACKED','QUICK') NOT NULL DEFAULT 'TRACKED',
  place_of_supply VARCHAR(100) NULL,
  is_interstate TINYINT(1) NOT NULL DEFAULT 0,
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_discount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  cgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  sgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  igst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_tax DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  round_off DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  grand_total DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  balance_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  payment_status ENUM('UNPAID','PARTIALLY_PAID','PAID') NOT NULL DEFAULT 'UNPAID',
  status ENUM('DRAFT','ISSUED','CANCELLED') NOT NULL DEFAULT 'ISSUED',
  notes TEXT NULL,
  terms TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoices_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES parties(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_business_invoice_num (business_id, invoice_number),
  INDEX idx_invoices_biz_date (business_id, invoice_date),
  INDEX idx_invoices_biz_status (business_id, payment_status, status)
) ENGINE=InnoDB;

-- 17. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL,
  hsn_sac VARCHAR(20) NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
  rate DECIMAL(14,2) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  cgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  sgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  igst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(14,2) NOT NULL,
  is_stock_deducted TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_inv_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 18. PURCHASE BILLS (PURCHASES, ORDERS, DEBIT NOTES)
CREATE TABLE IF NOT EXISTS purchase_bills (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT UNSIGNED NOT NULL,
  public_id CHAR(36) NOT NULL UNIQUE,
  document_type ENUM('PURCHASE_BILL','PURCHASE_ORDER','DEBIT_NOTE') NOT NULL DEFAULT 'PURCHASE_BILL',
  bill_number VARCHAR(100) NOT NULL,
  supplier_bill_no VARCHAR(100) NULL,
  financial_year VARCHAR(20) NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  bill_date DATE NOT NULL,
  due_date DATE NULL,
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  cgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  sgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  igst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_tax DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  round_off DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  grand_total DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  balance_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  payment_status ENUM('UNPAID','PARTIALLY_PAID','PAID') NOT NULL DEFAULT 'UNPAID',
  status ENUM('DRAFT','ISSUED','CANCELLED') NOT NULL DEFAULT 'ISSUED',
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_purchases_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchases_supplier FOREIGN KEY (supplier_id) REFERENCES parties(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_business_bill_num (business_id, bill_number),
  INDEX idx_purchases_biz_date (business_id, bill_date)
) ENGINE=InnoDB;

-- 19. PURCHASE ITEMS
CREATE TABLE IF NOT EXISTS purchase_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_bill_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL,
  hsn_sac VARCHAR(20) NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
  rate DECIMAL(14,2) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  cgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  sgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  igst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(14,2) NOT NULL,
  CONSTRAINT fk_purch_items_bill FOREIGN KEY (purchase_bill_id) REFERENCES purchase_bills(id) ON DELETE CASCADE,
  CONSTRAINT fk_purch_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 20. PAYMENTS (RECEIPTS & VOUCHERS)
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT UNSIGNED NOT NULL,
  public_id CHAR(36) NOT NULL UNIQUE,
  payment_type ENUM('RECEIPT','PAYMENT') NOT NULL,
  party_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NULL,
  purchase_bill_id BIGINT UNSIGNED NULL,
  voucher_number VARCHAR(100) NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  payment_mode ENUM('CASH','BANK','UPI','CHEQUE','CARD') NOT NULL DEFAULT 'CASH',
  reference_number VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_party FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_purchase FOREIGN KEY (purchase_bill_id) REFERENCES purchase_bills(id) ON DELETE SET NULL,
  INDEX idx_payments_biz_date (business_id, payment_date)
) ENGINE=InnoDB;

-- 21. ACCOUNTS (CHART OF ACCOUNTS)
CREATE TABLE IF NOT EXISTS accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT UNSIGNED NOT NULL,
  account_code VARCHAR(50) NOT NULL,
  account_name VARCHAR(150) NOT NULL,
  account_type ENUM('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE') NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  current_balance DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_accounts_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  UNIQUE KEY uq_biz_acc_code (business_id, account_code)
) ENGINE=InnoDB;

-- 22. JOURNAL ENTRIES (DOUBLE ENTRY)
CREATE TABLE IF NOT EXISTS journal_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT UNSIGNED NOT NULL,
  entry_number VARCHAR(100) NOT NULL,
  entry_date DATE NOT NULL,
  reference_type VARCHAR(50) NULL,
  reference_id BIGINT UNSIGNED NULL,
  narration TEXT NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_journal_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_journal_biz_date (business_id, entry_date)
) ENGINE=InnoDB;

-- 23. JOURNAL LINES
CREATE TABLE IF NOT EXISTS journal_lines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  journal_entry_id BIGINT UNSIGNED NOT NULL,
  account_id BIGINT UNSIGNED NOT NULL,
  debit DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  credit DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  description VARCHAR(255) NULL,
  CONSTRAINT fk_jlines_entry FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  CONSTRAINT fk_jlines_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 24. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT UNSIGNED NOT NULL,
  public_id CHAR(36) NOT NULL UNIQUE,
  expense_number VARCHAR(100) NOT NULL,
  expense_date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  payment_mode ENUM('CASH','BANK','UPI','CARD') NOT NULL DEFAULT 'CASH',
  paid_to VARCHAR(190) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_expenses_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_expenses_biz_date (business_id, expense_date)
) ENGINE=InnoDB;

-- 25. BUSINESS SETTINGS
CREATE TABLE IF NOT EXISTS business_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT UNSIGNED NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  UNIQUE KEY uq_biz_setting (business_id, setting_key)
) ENGINE=InnoDB;

-- ========================================================
-- DEFAULT SEED DATA (PRODUCTION DEMO ACCOUNTS & WORKSPACES)
-- ========================================================

INSERT INTO businesses (id, public_id, business_name, owner_name, business_type, gstin, email, mobile, address_line, city, state, pin_code, approval_status, is_active)
VALUES 
  (1, 'biz-001-rr-enterprises', 'R R Enterprises', 'Raushan Maurya', 'PROPRIETORSHIP', '27AABCR1234F1Z5', 'owner@rmstorvix.com', '9876543210', 'Plot 42, MIDC Industrial Area', 'Mumbai', 'Maharashtra', '400001', 'APPROVED', 1),
  (2, 'biz-002-apex-logistics', 'Apex Horizon Logistics', 'Vikramaditya Roy', 'PVT_LTD', '29ABCDE1234F1Z5', 'pending@apexlogistics.com', '9811223344', 'Tech Park, Whitefield', 'Bengaluru', 'Karnataka', '560066', 'PENDING', 1)
ON DUPLICATE KEY UPDATE business_name = VALUES(business_name);

INSERT INTO users (id, public_id, business_id, full_name, email, mobile, password_hash, platform_role, business_role, account_status)
VALUES
  (1, 'usr-001-superadmin', NULL, 'RMSTORVIX Platform Admin', 'admin@rmstorvix.com', '9999999999', '6c8316ae7d86d86b89ee62688547a4bf:2cf6eda503834adecd851ba9f0bab733287732c8a104599770e02b2b94f013f3b4e65ab198ab7863f0e811d0ae6af315a3ca0136ddc171a5e268a08f58c7f2fd', 'SUPER_ADMIN', 'ADMIN', 'ACTIVE'),
  (2, 'usr-002-demoowner', 1, 'Raushan Maurya', 'owner@rmstorvix.com', '9876543210', '8ff80abc8c45de7922cf3ca633333d4e:19ba6a3f69cf5e5cd0b0c98d367d721d6f4156d61fee0bcb4459edc4b013fcb2504aefcc1bbb93849b83dad40742dbceb67c652db49dd3132c858a058e482e87', 'BUSINESS_USER', 'OWNER', 'ACTIVE'),
  (3, 'usr-003-pendingowner', 2, 'Vikramaditya Roy', 'pending@apexlogistics.com', '9811223344', '8ff80abc8c45de7922cf3ca633333d4e:19ba6a3f69cf5e5cd0b0c98d367d721d6f4156d61fee0bcb4459edc4b013fcb2504aefcc1bbb93849b83dad40742dbceb67c652db49dd3132c858a058e482e87', 'BUSINESS_USER', 'OWNER', 'ACTIVE')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

INSERT INTO accounts (business_id, account_code, account_name, account_type, is_system, opening_balance, current_balance)
VALUES
  (1, '1001', 'Cash in Hand', 'ASSET', 1, 25000.00, 25000.00),
  (1, '1002', 'HDFC Bank Operating Account', 'ASSET', 1, 150000.00, 150000.00),
  (1, '1003', 'Accounts Receivable (Debtors)', 'ASSET', 1, 0.00, 0.00),
  (1, '1004', 'Stock-in-Trade (Inventory)', 'ASSET', 1, 85000.00, 85000.00),
  (1, '2001', 'Accounts Payable (Creditors)', 'LIABILITY', 1, 0.00, 0.00),
  (1, '2002', 'Output CGST Payable', 'LIABILITY', 1, 0.00, 0.00),
  (1, '2003', 'Output SGST Payable', 'LIABILITY', 1, 0.00, 0.00),
  (1, '2004', 'Output IGST Payable', 'LIABILITY', 1, 0.00, 0.00),
  (1, '3001', 'Proprietor / Equity Capital', 'EQUITY', 1, 260000.00, 260000.00),
  (1, '4001', 'Sales Revenue (Goods & Services)', 'REVENUE', 1, 0.00, 0.00),
  (1, '5001', 'Cost of Goods Sold (Purchases)', 'EXPENSE', 1, 0.00, 0.00)
ON DUPLICATE KEY UPDATE account_name = VALUES(account_name);

