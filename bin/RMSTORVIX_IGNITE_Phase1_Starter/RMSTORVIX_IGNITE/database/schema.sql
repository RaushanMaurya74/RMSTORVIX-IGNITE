-- RMSTORVIX IGNITE initial schema draft (Phase 1).
-- Review and apply through a migration process before production use.
CREATE DATABASE IF NOT EXISTS rmstorvix_ignite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rmstorvix_ignite;

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
  pin_code VARCHAR(12) NULL,
  financial_year_start_month TINYINT UNSIGNED NOT NULL DEFAULT 4,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  approval_status ENUM('PENDING','APPROVED','REJECTED','SUSPENDED') NOT NULL DEFAULT 'PENDING',
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_business_status_created (approval_status, created_at),
  INDEX idx_business_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL UNIQUE,
  business_id BIGINT UNSIGNED NULL,
  full_name VARCHAR(190) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  mobile VARCHAR(25) NULL,
  password_hash VARCHAR(255) NOT NULL,
  platform_role ENUM('SUPER_ADMIN','PLATFORM_ADMIN','BUSINESS_USER') NOT NULL DEFAULT 'BUSINESS_USER',
  account_status ENUM('PENDING_VERIFICATION','ACTIVE','LOCKED','DISABLED') NOT NULL DEFAULT 'PENDING_VERIFICATION',
  email_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT,
  INDEX idx_users_business_status (business_id, account_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_key VARCHAR(60) NOT NULL UNIQUE,
  role_name VARCHAR(100) NOT NULL,
  scope ENUM('PLATFORM','BUSINESS') NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  permission_key VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  business_id BIGINT UNSIGNED NULL,
  PRIMARY KEY (user_id, role_id, business_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

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
  CONSTRAINT fk_audit_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
  INDEX idx_audit_business_created (business_id, created_at),
  INDEX idx_audit_action_created (action_key, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS build_phases (
  id TINYINT UNSIGNED PRIMARY KEY,
  phase_name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('NOT STARTED','IN PROGRESS','BLOCKED','IN REVIEW','TESTING','PASSED','FAILED','COMPLETED') NOT NULL DEFAULT 'NOT STARTED',
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

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

INSERT IGNORE INTO roles (role_key, role_name, scope) VALUES
('platform_super_admin','Platform Super Admin','PLATFORM'),
('platform_admin','Platform Admin','PLATFORM'),
('business_owner','Business Owner','BUSINESS'),
('business_admin','Business Admin','BUSINESS'),
('accountant','Accountant','BUSINESS'),
('billing_operator','Billing Operator','BUSINESS'),
('inventory_manager','Inventory Manager','BUSINESS'),
('read_only','Read-only User','BUSINESS');

INSERT IGNORE INTO build_phases (id, phase_name, description, status) VALUES
(1,'Planning and UI/UX','Requirements, design system, page layouts, architecture and database schema.','IN PROGRESS'),
(2,'Authentication and Security Foundation','Authentication, verification, approval workflow, roles and tenant isolation.','NOT STARTED'),
(3,'Billing and Inventory','Invoices, payments, inventory, stock movements, warehouses and PDFs.','NOT STARTED'),
(4,'Accounting and Reports','Double-entry ledger, financial statements, tax summaries and analytics.','NOT STARTED'),
(5,'Admin and Quality Assurance','Admin portal, permissions, end-to-end tests, security and performance checks.','NOT STARTED'),
(6,'Deployment and Handover','Production build, migrations, monitoring, backup, manuals and release gates.','NOT STARTED');

INSERT IGNORE INTO build_tasks (phase_id, task_key, title, description, status) VALUES
(1,'P1-REQ','Requirements and scope baseline','Document modules, workflows and acceptance criteria.','IN PROGRESS'),
(1,'P1-DESIGN','Reusable design system','Tokens, responsive layout, navigation and components.','IN PROGRESS'),
(1,'P1-ARCH','Architecture and schema draft','Starter PHP entry point and initial schema draft.','IN PROGRESS'),
(1,'P1-REVIEW','Phase 1 acceptance review','Review screens, accessibility, schema and requirements.','NOT STARTED'),
(2,'P2-AUTH','Authentication and recovery','Secure login, registration, verification and recovery.','NOT STARTED'),
(2,'P2-TENANT','Tenant authorization','Server-enforced business-level data isolation.','NOT STARTED'),
(3,'P3-INVOICE','Invoice and payment workflows','Transaction-safe billing and payment allocation.','NOT STARTED'),
(3,'P3-STOCK','Inventory movement engine','Tracked stock movement and quick billing separation.','NOT STARTED'),
(4,'P4-LEDGER','Double-entry accounting','Balanced postings and auditable correction records.','NOT STARTED'),
(5,'P5-QA','Automated quality gates','Unit, integration, E2E, security and accessibility tests.','NOT STARTED'),
(6,'P6-RELEASE','Release and handover','Deployment docs, backup restore and release sign-off.','NOT STARTED');
