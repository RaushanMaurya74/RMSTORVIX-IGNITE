# RMSTORVIX IGNITE — User Manual & Operations Guide

**Product:** RMSTORVIX IGNITE  
**Brand:** RMSTORVIX  
**Tagline:** Complete Billing, Inventory, Accounting & Business Management SaaS  
**Edition:** Enterprise Multi-Tenant SaaS  
**Inspiration:** Tally ERP 9 Accounting Ergonomics with Modern Web Usability  

---

## 1. Introduction & Overview

Welcome to **RMSTORVIX IGNITE**, an all-in-one business management platform designed to streamline billing, stock control, customer receivables, supplier payables, and balanced double-entry accounting for modern businesses and enterprises.

### Core Architecture Highlights
- **Tally ERP 9 Inspired Ergonomics:** Keyboard-driven workflow with familiar hotkeys (`F1` to `F9`, `Alt+P`, `Ctrl+K`, `Esc`).
- **Indian GST Compliance:** Automatic calculation of intra-state (CGST + SGST) and inter-state (IGST) taxes, HSN/SAC codes, and GSTR-1/GSTR-3B statutory summaries.
- **Dual Billing Modes:** Choose between **Inventory Tracking Mode** (auto-deducts warehouse stock) and **Quick Billing Mode** (direct invoicing without mandatory inventory cataloging).
- **Double-Entry General Ledger:** Every invoice, payment, bill, and voucher automatically creates balanced debit and credit entries.
- **Real-Time Financial Statements:** Instantly view your live Trial Balance, Profit & Loss Statement, and Balance Sheet.

---

## 2. Business Registration & Account Activation

1. **Sign Up:** Navigate to `/signup` and provide:
   - Business Legal Name and Owner Name
   - Business Type (Proprietorship, Partnership, Private Limited, LLP)
   - GSTIN (15-character alphanumeric, validated in real-time)
   - Work Email, Mobile, Address, City, State, and PIN Code
   - Financial Year Start Month (April by default)
   - Password (10+ characters)
2. **Pending Approval Gate:** Upon registration, your workspace enters `PENDING APPROVAL` status.
3. **Platform Verification:** A Platform Administrator verifies business credentials and activates your account. While pending, access to sensitive financial endpoints is securely restricted.
4. **Log In:** Once approved, sign in at `/login` to access your workspace.

---

## 3. Tally ERP 9 Keyboard Shortcuts

RMSTORVIX IGNITE includes an integrated keyboard shortcut engine designed for fast data entry:

| Shortcut | Description | Action |
| :--- | :--- | :--- |
| **F1** | Help / Shortcuts Sheet | Opens the Tally ERP 9 Keyboard Shortcuts Modal |
| **F2** | Change Date | Focuses date filter in Day Book and transaction ledgers |
| **F4** | Contra Voucher | Opens internal cash-to-bank or bank-to-cash transfer |
| **F5** | Payment Voucher | Opens Supplier / Expense Payment Voucher modal |
| **F6** | Receipt Voucher | Opens Customer Payment Receipt collection modal |
| **F7** | Journal Entry | Opens multi-line balanced General Journal posting modal |
| **F8** | Sales Invoice | Opens the New GST / Quick Sales Invoice modal |
| **F9** | Purchase Bill | Opens Purchase Bill entry modal |
| **Alt + P** | Print Document | Immediately triggers clean, printable invoice or PDF save |
| **Ctrl + K** | Global Search | Focuses the instant search box to look up parties or items |
| **Esc** | Close / Back | Closes any open modal overlay or returns to dashboard |

---

## 4. Sales Invoicing & Billing Workflows

### Creating an Invoice (`F8`)
1. Press `F8` or click **"＋ Create Invoice"**.
2. **Customer Selection:** Select an existing customer or click **"Add Customer"**.
3. **Supply Type:**
   - **Intra-State:** If customer is in the same state, tax is split evenly into **CGST** and **SGST**.
   - **Inter-State:** If customer is in a different state, tax is calculated as full **IGST**.
4. **Billing Mode:**
   - **Inventory Mode:** Links line items to catalog products. Stock is decremented upon issuance.
   - **Quick Billing Mode:** Direct entry of service or ad-hoc items without touching inventory stock.
5. **Line Items:** Add items, select tax rates (0%, 5%, 12%, 18%, 28%), apply percentage discounts, and specify quantities.
6. **Payment Allocation:** Enter any upfront cash, UPI, card, or bank payment received. Remaining balance is automatically assigned to customer receivables.
7. **Issuance:** Click **"Generate & Issue Invoice"**. The system generates an atomic, sequential invoice number (e.g., `INV-2026-27-0001`), creates stock movements, and writes balanced journal entries.

### Printing & PDF Export
- Click **"🖨 Print"** on any invoice row or press `Alt + P` while viewing an invoice.
- The clean print template formats your company logo, GSTIN, HSN tax summary, terms, and authorized signature. Use your browser's print dialog to save directly as PDF.

---

## 5. Inventory & Warehouse Management

- **Catalog:** Add products and services under `/inventory`. Specify SKU, barcode, HSN/SAC code, tax rate, and reorder levels.
- **Stock Tracking:** Products marked as `is_stock_tracked` maintain real-time current stock counts.
- **Low Stock Alerts:** Items falling below `min_stock_alert` are highlighted on the Dashboard and Inventory view.
- **Stock Adjustments:** Record damaged, lost, or physical count reconciliation with audit notes.
- **Valuation Report:** View inventory asset valuation calculated by current stock × acquisition cost under `/reports`.

---

## 6. Customers, Suppliers & Outstanding Collections

- **Directory:** Manage debtors (customers) and creditors (suppliers) under `/parties`.
- **Payment Collection (`F6`):** Record partial or full invoice collections via Cash, Bank, UPI, or Cheque. The invoice status automatically updates from `UNPAID` to `PARTIALLY_PAID` or `PAID`.
- **Supplier Payments (`F5`):** Record outward disbursements to vendors.
- **Customer Ledger Statements:** Review total billed, total paid, and net outstanding balance per client.

---

## 7. Accounting & Financial Ledgers

RMSTORVIX IGNITE enforces the strict mathematical invariants of double-entry bookkeeping:

1. **Trial Balance (`/accounting`):**
   - Summarizes net debit and credit balances for Assets, Liabilities, Equity, Revenue, and Expenses.
   - Verification status confirms that **Total Debits == Total Credits**.
2. **Profit & Loss Statement:**
   - Calculates **Operating Revenue** minus **Cost of Goods Sold (COGS)** and **Operating Expenses** to compute Net Profit.
3. **Balance Sheet:**
   - Verifies that **Total Assets == Total Liabilities + Owner's Equity (including Net Profit)**.
4. **Day Book (`F2`):**
   - Chronological daily register of all vouchers, invoices, and journal entries.
5. **Manual Journal Entries (`F7`):**
   - Post custom multi-line journal adjustments. The entry is rejected unless total debits exactly equal total credits.

---

## 8. Data Export & Backups

- Navigate to `/settings`.
- Under **Data Backup & Export**, click **"Export Business Backup (.JSON)"** to download a complete, unencrypted snapshot of your business ledgers, customer records, and invoices.
