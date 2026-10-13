# RMSTORVIX IGNITE — Master Delivery Plan & Execution Checklist

**Product:** RMSTORVIX IGNITE  
**Brand:** RMSTORVIX  
**Tagline:** Complete Billing, Inventory, Accounting & Business Management SaaS  
**Architecture:** Multi-Tenant SaaS with Tally ERP 9 Workflows + Modern Web Interface  
**Runtime:** Node.js v22 (Active Standalone Runtime with Native SQLite ACID Persistence) + Full PHP/MySQL Production Mirror  

---

## 1. Project Phase Breakdown

### Phase 1 — Planning, UI/UX & Architecture
- [ ] **P1-REQ**: Comprehensive Requirements & Specifications Document
- [ ] **P1-DESIGN**: Design Tokens, Dark/Light Themes, CSS Architecture (Navy, Blue, White, Orange)
- [ ] **P1-SHORTCUTS**: Tally ERP 9 Keyboard Shortcuts Engine (F1–F9, Alt+P, Esc, Ctrl+K)
- [ ] **P1-ARCH**: Dual Database Schema (MySQL 8.0 & SQLite WAL mode) with ACID Transactions
- [ ] **P1-REVIEW**: Phase 1 Acceptance Gate & Design Audit

### Phase 2 — Authentication & Multi-Tenant Security
- [ ] **P2-AUTH**: Session-based Authentication, Secure Hashing, Logout, Expiry
- [ ] **P2-REG**: Business Registration with Mandatory `PENDING APPROVAL` Gate
- [ ] **P2-RECOVERY**: Forgot & Reset Password Token Workflows
- [ ] **P2-VERIF**: Email / Mobile Verification Simulator & MFA
- [ ] **P2-RBAC**: 7 Strict Roles & Server-Side Permission Enforcement
- [ ] **P2-TENANT**: Multi-Tenant Query Scoping & Cross-Tenant Access Prevention
- [ ] **P2-SECHDR**: Rate Limiting, CSRF Protection, XSS Escaping & Security Headers

### Phase 3 — Billing, Invoicing & Inventory Engine
- [ ] **P3-CALC**: Indian GST Tax Engine (CGST, SGST, IGST, HSN, Inclusive/Exclusive, Discounts)
- [ ] **P3-NUMBER**: Atomic, Concurrency-Safe Invoice Numbering (`INV-2026-27-0001`)
- [ ] **P3-MODES**: Dual Billing Modes (Tracked Inventory Mode vs Quick Untracked Billing)
- [ ] **P3-DOCS**: Quotations, Sales Orders, Purchase Bills, Challans, Credit/Debit Notes
- [ ] **P3-PAYMENTS**: Receipts, Vouchers, Partial Payments & Outstanding Recalculation
- [ ] **P3-STOCK**: Inventory Catalog, Movements, Adjustments, Warehouses, Low-Stock Alerts
- [ ] **P3-PRINT**: High-Fidelity Printable GST Invoice & Clean PDF Export

### Phase 4 — Accounting & Financial Reports
- [ ] **P4-COA**: Standard Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expense)
- [ ] **P4-LEDGER**: Double-Entry Accounting Engine (Balanced Debits == Credits Posting)
- [ ] **P4-DAYBOOK**: Day Book, Cash Book, Bank Book Chronological Ledgers
- [ ] **P4-STATEMENTS**: Real-time Trial Balance, Profit & Loss, Balance Sheet
- [ ] **P4-GST**: GSTR-1 Outward Supplies & GSTR-3B Tax Liability Summaries
- [ ] **P4-ANALYTICS**: Business Intelligence, Sales/Purchase Trends & Product Valuation

### Phase 5 — Platform Admin Portal & Quality Assurance
- [ ] **P5-ADMIN**: Separate Super Admin Portal (`/admin`) for Business Approvals/Suspensions
- [ ] **P5-AUDIT**: Platform & Tenant Audit Logging Engine with IP & Metadata
- [ ] **P5-TESTS**: Automated Test Suite Covering the 12 Mandatory Workflows
- [ ] **P5-SEC**: Security Vulnerability Audit (SQLi, XSS, CSRF, IDOR, Tenant Isolation)
- [ ] **P5-A11Y**: WCAG 2.1 AA Accessibility & Keyboard Nav Review

### Phase 6 — Deployment, Documentation & Release Handover
- [ ] **P6-CONTROL**: Real Database-Driven Build Control Center (`/build-control`)
- [ ] **P6-BACKUP**: Database Backup & Restoration Utilities
- [ ] **P6-CONFIG**: Production `.env.example`, Migration Scripts & Seed CLI
- [ ] **P6-DOCS**: User Manual, Admin Manual, Architecture Specification & Release Report
- [ ] **P6-RELEASE**: Final Release Gate Verification & Sign-off

---

## 2. Release Testing Gates (The 12 Mandatory Workflows)
1. Business signs up → Enters `PENDING` status.
2. Pending account cannot access protected business functions.
3. Super Admin logs in, reviews business, and approves account.
4. Business Owner logs in with active status.
5. Owner creates customer and tracked product.
6. Owner generates invoice with GST breakdown & atomic invoice number.
7. Customer makes partial payment → Outstanding balance recalculates.
8. Inventory deducts only for tracked products (quick billing leaves stock intact).
9. General Ledger posts balanced journal entries (Debits == Credits).
10. Trial Balance and Day Book reconcile with transactions.
11. Unauthorized user is denied access to tenant endpoints.
12. Cross-business tenant data access attempts return 403 / 404.
