# RMSTORVIX IGNITE — Technical Architecture & Specifications

**Product:** RMSTORVIX IGNITE  
**Brand:** RMSTORVIX  
**Tagline:** Complete Billing, Inventory, Accounting & Business Management SaaS  
**Architect:** Senior Software Architect, Security & Database Engineer  

---

## 1. System Architecture Overview

RMSTORVIX IGNITE is architected as a high-performance, modular, multi-tenant SaaS application that mirrors the keyboard-driven accounting rigor of Tally ERP 9 while providing the elegance of modern cloud platforms.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RMSTORVIX IGNITE CLIENT                         │
│  Vanilla HTML5 · Modern CSS (Navy/Blue/Orange) · Vanilla JS Engine     │
│  Tally ERP 9 Keyboard Keymap (F1-F9, Alt+P) · SVG Real-Time Charts     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / Cookies
┌───────────────────────────────────▼────────────────────────────────────┐
│                      APPLICATION SERVER LAYER                          │
│  Node.js v22 HTTP Engine · Rate Limiting · CSRF · Security Headers     │
│  Multi-Tenant Authentication & Session Management · RBAC Authorization │
└──────────────┬────────────────────┬────────────────────┬───────────────┘
               │                    │                    │
┌──────────────▼──────┐┌────────────▼──────────┐┌────────▼──────────────┐
│   BILLING & STOCK   ││ DOUBLE-ENTRY LEDGER   ││ PLATFORM ADMIN & QA   │
│  GST Tax Calculator ││ Chart of Accounts     ││ Business Approvals    │
│  Atomic Numbering   ││ Trial Balance Engine  ││ Build Control Center  │
│  Tracked vs Quick   ││ P&L & Balance Sheet   ││ 12-Workflow Test Suite│
└──────────────┬──────┘└────────────┬──────────┘└────────┬──────────────┘
               │                    │                    │
┌──────────────▼────────────────────▼────────────────────▼──────────────┐
│                        DATA PERSISTENCE LAYER                          │
│   SQLite WAL Mode (Native ACID Engine)  OR  MySQL 8.0 InnoDB Production│
│   Foreign Keys · Parameterized Queries · Tamper-Evident Audit Trails   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Layer | Primary Runtime (Active Standalone) | Production Mirror (Web Server Deployment) |
| :--- | :--- | :--- |
| **Backend** | Node.js v22 (`node:http`, `node:crypto`) | PHP 8.2+ PDO |
| **Database** | Embedded SQLite 3 (`node:sqlite` WAL mode) | MySQL 8.0+ / MariaDB (InnoDB) |
| **Frontend** | Vanilla HTML5, Semantic Elements | Blade / PHP Layout Templates |
| **Styling** | Vanilla Modern CSS (CSS Custom Properties) | Pure CSS (Zero Tailwind dependencies) |
| **Logic** | Vanilla Modern JavaScript (ES2022) | Vanilla JavaScript (ES2022) |
| **Security** | Scrypt KDF (`crypto.scryptSync`), CSP | `password_hash()` (Argon2id/Bcrypt) |

---

## 3. Multi-Tenant Data Isolation & RBAC

Every business entity is identified by a unique `business_id`. Except for Platform Super Administrators operating within the platform control portal, all operational queries strictly enforce:

$$\text{SELECT} \dots \text{WHERE } \text{business\_id} = ?$$

### Supported Roles
1. **Platform Super Admin:** Platform-wide oversight, business approvals, suspensions, and audit inspection.
2. **Business Owner:** Full administrative control over the business workspace.
3. **Business Admin:** Operational management excluding workspace deletion.
4. **Accountant:** Double-entry ledger, journal entries, trial balance, and tax returns.
5. **Billing Operator:** Invoice creation, payment collection, and customer directory.
6. **Inventory Manager:** Catalog maintenance, warehouse transfers, and stock adjustments.
7. **Read-Only User:** Viewing dashboards and reports without modification permissions.

---

## 4. Double-Entry Accounting Invariants

Every financial event writes to the General Ledger with mathematical balance verification:

$$\sum \text{Debits} = \sum \text{Credits}$$

If this invariant is violated, the transaction aborts with a rollback.

### Accounting Structure (Standard Chart of Accounts)
- **Assets (1000s):** Normal Balance = Debit (Cash, Bank, Accounts Receivable, Inventory, Input GST Credits).
- **Liabilities (2000s):** Normal Balance = Credit (Accounts Payable, Output GST Payable).
- **Equity (3000s):** Normal Balance = Credit (Owner's Capital, Retained Earnings).
- **Revenue (4000s):** Normal Balance = Credit (Sales Revenue, Service Income).
- **Expenses (5000s):** Normal Balance = Debit (Cost of Goods Sold, Rent, Salaries, Utilities).

### Financial Statements Formulation
- **Trial Balance:** Aggregation of net debit/credit per account.
- **Profit & Loss:** $\text{Net Profit} = \sum \text{Revenue} - \sum \text{Expenses}$.
- **Balance Sheet:** $\text{Total Assets} = \text{Total Liabilities} + (\text{Total Equity} + \text{Net Profit})$.

---

## 5. Indian GST Tax Logic

- **GSTIN Format:** 15 characters (`2 digits State Code` + `10 characters PAN` + `1 entity digit` + `Z` + `1 check digit`).
- **Intra-State:** Place of Supply == Business State $\implies \text{CGST} = \frac{\text{Tax}}{2}, \text{SGST} = \frac{\text{Tax}}{2}, \text{IGST} = 0$.
- **Inter-State:** Place of Supply $\ne$ Business State $\implies \text{CGST} = 0, \text{SGST} = 0, \text{IGST} = \text{Tax}$.
- **Tax Inclusive Pricing:** $\text{Taxable Value} = \frac{\text{Gross}}{1 + (\text{Rate}/100)}$.

---

## 6. Security & Hardening Controls

1. **Password Hashing:** `crypto.scryptSync` with 16-byte cryptographically random salt and timing-safe equality verification (`crypto.timingSafeEqual`).
2. **Session Security:** 64-character random hex session tokens stored server-side with expiration tracking; cookies set with `HttpOnly`, `SameSite=Lax`.
3. **SQL Injection Prevention:** 100% prepared parameterized statements across both SQLite and MySQL schemas.
4. **XSS Protection:** Context-aware HTML entity escaping on all user-supplied outputs.
5. **Rate Limiting:** Sliding-window IP-based rate limiter on authentication endpoints.
6. **Security Headers:** Enforced `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and strict CORS policies.
