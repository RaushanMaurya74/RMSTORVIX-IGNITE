# RMSTORVIX IGNITE

**Complete Billing, Inventory, Accounting & Business Management SaaS**

> Inspired by the ergonomics and workflows of **Tally ERP 9**, with a modern web interface, Indian GST statutory compliance, and double-entry accounting.

---

## ✦ System Overview

**RMSTORVIX IGNITE** is a complete, production-ready multi-tenant SaaS application that unifies billing, warehouse inventory, customer receivables, supplier disbursements, and balanced financial accounting into one workspace.

### Key Capabilities
- **Tally ERP 9 Ergonomics:** Keyboard shortcuts (`F1` Help, `F2` Date, `F5` Payment, `F6` Receipt, `F7` Journal, `F8` Sales Invoice, `Alt+P` Print, `Ctrl+K` Global Search, `Esc` Close).
- **Dual Billing Modes:**
  - **Inventory Tracking Mode:** Seamlessly deducts stock from warehouses upon invoice issuance.
  - **Quick Billing Mode:** Allows instant billing for untracked items or professional services without touching inventory records.
- **Indian GST Statutory Compliance:** Automatic calculation of CGST, SGST, IGST, HSN/SAC codes, and GSTR-1/GSTR-3B tax return summaries.
- **Double-Entry General Ledger:** Automatic balanced postings ($\sum \text{Debits} = \sum \text{Credits}$) for all invoices, payments, bills, and journals.
- **Live Financial Statements:** Real-time mathematical reconciliation of Trial Balance, Profit & Loss, and Balance Sheet.
- **Platform Admin Portal (`/admin`):** Separate super-admin dashboard for reviewing, approving, rejecting, and suspending business workspaces.
- **Build Control Center (`/build-control`):** Live, database-backed tracking of all 6 development phases with verified task records and regression test suites.

---

## ✦ Quick Start

### 1. Requirements
- **Node.js v22+** (Active Standalone Runtime with Native SQLite WAL Mode)
- **Optional:** PHP 8.2+ and MySQL 8.0+ (Full production mirror schemas and scripts included)

### 2. Launch the Application

```bash
# 1. Initialize & Seed Database (Phases, Tasks, Roles, Admin & Demo Data)
npm run seed

# 2. Run the 12-Workflow Automated Test Suite
npm test

# 3. Start the Application Server
npm start
```

Open your browser at **`http://127.0.0.1:8080`**.

---

## ✦ Default Demo Credentials

| Role | Portal URL | Email Address | Password |
| :--- | :--- | :--- | :--- |
| **Business Owner** | `/login` → `/dashboard` | `owner@rmstorvix.com` | `DemoOwner@2026!` |
| **Platform Super Admin** | `/login` → `/admin` | `admin@rmstorvix.com` | `SuperAdmin@2026!` |
| **Pending Approval Sample** | `/login` → `/pending` | `pending@apexlogistics.com` | `PendingOwner@2026!` |

---

## ✦ Tally ERP 9 Keyboard Keymap

- **`F1`**: Open Shortcuts Cheat Sheet
- **`F2`**: Change Date / Focus Day Book
- **`F5`**: Payment Voucher (Disbursements)
- **`F6`**: Receipt Voucher (Collections)
- **`F7`**: Journal Entry (Adjustments)
- **`F8`**: Sales Invoice (GST / Quick Billing)
- **`Alt + P`**: Print Document / Save as PDF
- **`Ctrl + K`**: Global Instant Search
- **`Esc`**: Close Modal / Back to Dashboard

---

## ✦ Project Structure

```
├── bin/
│   ├── create-admin.js       # CLI Super Admin provisioning tool (Node.js)
│   └── create-admin.php      # CLI Super Admin provisioning tool (PHP)
├── database/
│   ├── schema.sql            # Full MySQL 8.0 InnoDB Production Schema
│   ├── schema_sqlite.sql     # Full SQLite Schema for Embedded Standalone Runtime
│   └── rmstorvix_ignite.sqlite # Active SQLite WAL Database
├── docs/
│   ├── USER_MANUAL.md        # Comprehensive End-User Guide
│   ├── ADMIN_MANUAL.md       # Platform Administrator Operations Manual
│   ├── ARCHITECTURE.md       # Technical Architecture & GST/Accounting Invariants
│   └── RELEASE_REPORT.md     # Feature Completion Matrix & 12-Workflow Test Results
├── public/
│   ├── assets/css/
│   │   ├── app.css           # Master UI CSS (Navy, Electric Blue, Orange)
│   │   ├── auth.css          # Auth & Onboarding Styling
│   │   └── invoice-print.css # High-Fidelity Printable GST Invoice Styling
│   ├── assets/js/
│   │   ├── app.js            # Tally Shortcuts, Modals, Dynamic Tables & Charts
│   │   └── auth.js           # Auth & Business Registration Client Engine
│   └── index.php             # PHP Front Controller
├── scripts/
│   ├── backup.js             # Automated Database Snapshot Tool
│   └── restore.js            # Transactional Database Restoration Utility
├── server/
│   ├── accounting.js         # Double-Entry Engine, P&L, Balance Sheet, GST Rules
│   ├── db.js                 # Native node:sqlite Connection Layer (WAL Mode)
│   ├── security.js           # Scrypt KDF, Rate Limiting, Audit Logger, GSTIN Regex
│   ├── seed.js               # Database Seeder (Phases, Tasks, Demo Data)
│   └── server.js             # High-Performance HTTP Application Server
├── tests/
│   └── suite.js              # Automated 12-Workflow Test Suite & Security Gates
├── package.json              # NPM Scripts & Metadata
└── .env.example              # Environment Configuration Template
```

---

## ✦ Quality Assurance & Automated Testing

RMSTORVIX IGNITE includes an automated test runner (`tests/suite.js`) executing the 12 mandatory release workflows:

```bash
npm test
```

### Verified Release Gates
1. Business signs up → Account recorded in `PENDING` approval status.
2. Pending account cannot access protected business functions.
3. Super Admin logs in, reviews business details, and approves account.
4. Business Owner logs in with active approved status.
5. Owner creates customer and tracked product.
6. Owner generates invoice with atomic sequential numbering.
7. Customer makes partial payment → Outstanding balance recalculates.
8. Inventory deducts only for tracked products (quick billing leaves stock untouched).
9. General Ledger posts balanced journal entries ($\sum \text{Debits} = \sum \text{Credits}$).
10. Trial Balance and Balance Sheet reconcile with transactions.
11. Unauthorized users are blocked with 401 / 403.
12. Cross-business tenant data access attempts return empty / 404.

---

## ✦ Cloud Integrations: GitHub, Vercel & Supabase

RMSTORVIX IGNITE connects seamlessly across **GitHub**, **Vercel**, and **Supabase**:

- **GitHub Repository & CI/CD**:
  - Repo: `https://github.com/RaushanMaurya74/RMSTORVIX-IGNITE.git`
  - Automated CI Pipeline: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) validates all 14 test workflows and verifies Supabase cloud connectivity on every commit/PR.
- **Vercel Serverless Deployment**:
  - Serverless Handler: [`api/index.js`](api/index.js)
  - Deployment Config: [`vercel.json`](vercel.json) with automated routing and edge asset caching.
  - Zero-configuration auto-deploys upon `git push origin main`.
- **Supabase Cloud Database (PostgreSQL 17)**:
  - Project ID: `ynacftlgrvcaiibrycbw` (Region: `ap-northeast-1`)
  - Integration Client: [`server/supabase.js`](server/supabase.js)
  - Diagnostic Health Checker: `npm run test:supabase`
  - Live Health Endpoint: `GET /api/health/supabase`
  - All 20 tables provisioned with RLS and seed data.

See the complete deployment walkthrough in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## ✦ License & Intellectual Property

RMSTORVIX IGNITE is proprietary software developed for high-assurance business management.  
© 2026 RMSTORVIX IGNITE. All rights reserved.
