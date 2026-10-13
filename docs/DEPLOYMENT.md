# RMSTORVIX IGNITE — Deployment & Cloud Architecture Guide
## GitHub, Vercel & Supabase Connected Architecture

This document describes the three-pillar cloud deployment architecture for **RMSTORVIX IGNITE**:

```
 ┌──────────────────────┐        git push        ┌───────────────────────┐
 │   Developer Workstation   │ ─────────────────────> │   GitHub Repository   │
 │   Local Standalone Node   │                        │   (CI/CD Workflows)   │
 └──────────────────────┘                        └──────────┬────────────┘
                                                            │
                                                   Auto Deploy via Webhook
                                                            │
                                                            v
 ┌───────────────────────────────────────────────────────────────────────┐
 │                           VERCEL PLATFORM                             │
 │  ┌─────────────────────────┐          ┌────────────────────────────┐  │
 │  │   Edge Network & CDN    │          │  Vercel Serverless Function│  │
 │  │  Static Assets (/assets)│          │        (/api/index.js)     │  │
 │  └─────────────────────────┘          └──────────────┬─────────────┘  │
 └──────────────────────────────────────────────────────┼────────────────┘
                                                        │
                                            HTTPS REST / PostgreSQL
                                                        │
                                                        v
 ┌───────────────────────────────────────────────────────────────────────┐
 │                        SUPABASE CLOUD PLATFORM                        │
 │  • PostgreSQL 17 Engine (ap-northeast-1)                              │
 │  • Real-time PostgREST API & Row-Level Security (RLS)                 │
 │  • Project ID: ynacftlgrvcaiibrycbw                                   │
 └───────────────────────────────────────────────────────────────────────┘
```

---

## 1. Supabase Cloud Database

- **Project Name:** RMSTORVIX-IGNITE
- **Project ID / Reference:** `ynacftlgrvcaiibrycbw`
- **Region:** `ap-northeast-1` (Tokyo)
- **Status:** `ACTIVE_HEALTHY`
- **Database Engine:** PostgreSQL 17
- **Database Host:** `db.ynacftlgrvcaiibrycbw.supabase.co:5432`
- **API URL:** `https://ynacftlgrvcaiibrycbw.supabase.co`
- **Tables Provisioned & Seeded (20 Tables):**
  - `businesses`: Multi-tenant business master records
  - `users`: User authentication, platform/business RBAC roles
  - `sessions`: Session tokens with expiry timestamps
  - `password_resets`: Password recovery tokens
  - `parties`: Customers and suppliers with GSTIN and credit limits
  - `product_categories`: Categorization for goods and services
  - `products`: Product master, barcode, HSN/SAC, pricing, inventory flags
  - `stock_movements`: Stock in/out audit ledger
  - `invoices`: GST tax invoices (B2B, B2C) with CGST, SGST, IGST
  - `invoice_items`: Line items with HSN/SAC, quantity, rates, tax
  - `purchase_bills`: Inward supplier purchase invoices
  - `purchase_items`: Line items for supplier bills
  - `payments`: Receipt & Payment vouchers (Cash, Bank, UPI)
  - `accounts`: Standard Indian Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expenses)
  - `journal_entries`: Balanced general ledger journal vouchers
  - `journal_lines`: Debits and credits (strict Debits == Credits)
  - `expenses`: Direct business operating expenses
  - `tax_rates`: GST rates (0%, 5%, 12%, 18%, 28%)
  - `audit_logs`: Tamper-evident administrative & security audit trail
  - `business_settings`: Business invoice customization & prefixes

### Supabase Connectivity Verification:
Run the diagnostic verification tool:
```bash
node bin/test-supabase.js
```
Or check the live API endpoint:
```bash
curl http://localhost:8080/api/health/supabase
```

---

## 2. Vercel Serverless Deployment

RMSTORVIX IGNITE is configured for instant deployment to Vercel without build steps.

### Deployment Configuration Files:
- [`vercel.json`](file:///e:/PROJECTS/New%20folder/vercel.json):
  - Sets runtime environment variables (`NODE_OPTIONS=--experimental-sqlite`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_ID`).
  - Configures security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`).
  - Static asset cache headers (`Cache-Control: public, max-age=31536000, immutable`).
  - URL rewrites routing `/assets/*` to `/public/assets/*` and all dynamic requests to `/api/index.js`.
- [`api/index.js`](file:///e:/PROJECTS/New%20folder/api/index.js):
  - Serverless function handler wrapping the application router.
  - Automatically isolates `/tmp` directory for SQLite fallback when running inside AWS Lambda / Vercel container.

### Deploying to Vercel (2 Options):

#### Option A: 1-Click via GitHub Integration (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Connect your GitHub account and select repository: `RaushanMaurya74/RMSTORVIX-IGNITE`.
3. Set Framework Preset to **Other**.
4. In **Environment Variables**, add:
   - `NODE_OPTIONS`: `--experimental-sqlite`
   - `SUPABASE_URL`: `https://ynacftlgrvcaiibrycbw.supabase.co`
   - `SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYWNmdGxncnZjYWlpYnJ5Y2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MTIwNTQsImV4cCI6MjEwNzQ4ODA1NH0.cM5wpNrb9YJSkrk4CcQM3aVDqXqLL9qnvGkDiTbog34`
   - `SUPABASE_PROJECT_ID`: `ynacftlgrvcaiibrycbw`
5. Click **Deploy**. Vercel will deploy in ~20 seconds and assign a production URL (e.g., `https://rmstorvix-ignite.vercel.app`).
6. Every `git push` to `main` branch will automatically trigger a new deployment.

#### Option B: Deploying via Vercel CLI
```bash
npx vercel
# Follow prompt to select scope and project name
npx vercel --prod
```

---

## 3. GitHub Repository & Automated CI/CD

- **Repository:** `https://github.com/RaushanMaurya74/RMSTORVIX-IGNITE.git`
- **Default Branch:** `main`
- **Continuous Integration:** [`.github/workflows/ci.yml`](file:///e:/PROJECTS/New%20folder/.github/workflows/ci.yml)
  - Automatically triggers on every push and pull request to `main`.
  - Runs on `ubuntu-latest` with Node.js v22.
  - Executes the 14-workflow automated test suite (`tests/suite.js`).
  - Verifies live Supabase connectivity and schema availability (`bin/test-supabase.js`).
  - Verifies the Vercel serverless function entry point (`api/index.js`).
  - Guarantees zero release blockers on GitHub.

### Git Sync Commands:
```bash
git add .
git commit -m "Configure Supabase cloud integration, Vercel serverless deployment, and GitHub Actions CI"
git push origin main
```
