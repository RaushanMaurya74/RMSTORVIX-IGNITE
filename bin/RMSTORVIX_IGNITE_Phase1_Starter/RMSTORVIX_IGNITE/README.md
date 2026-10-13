# RMSTORVIX IGNITE
Phase 1 foundation — PHP + MySQL + HTML + CSS + JavaScript

> This is the initial project foundation, not a claim that the complete production system is finished. Phase 1 includes a reusable UI shell, project structure, database schema draft, setup instructions, and a six-phase Build Control Center seed. Authentication, tenant authorization, accounting, GST validation, and production deployment must be implemented and tested in later phases before real business use.

## Requirements
- PHP 8.2+
- MySQL 8.0+ or compatible MariaDB
- Apache/Nginx or PHP built-in server for local development
- PDO MySQL extension

## Quick start
1. Create a database, for example `rmstorvix_ignite`.
2. Import `database/schema.sql`.
3. Copy `.env.example` to `.env` and set database credentials.
4. Configure your web server document root to the `public/` directory.
5. For a local-only smoke test, from the project directory run:
   `php -S 127.0.0.1:8080 -t public`
6. Open `http://127.0.0.1:8080`.

The current UI uses clearly labeled sample data. It is not connected to real business transactions yet.

## Security notes
- Never expose `.env` or database credentials publicly.
- Keep `public/` as the document root; do not serve the project root.
- The included schema is a starting point and must be reviewed before production migrations.
- Do not create an admin account by public signup. The future initial super-admin should be provisioned via a secure CLI command or deployment secret.
- Production requires CSRF protection, rate limiting, secure session cookies, server-side authorization, tenant-scoped queries, audit logging, backups, and automated tests.

## Phase plan
1. Planning and UI/UX — foundation included here.
2. Authentication and security foundation.
3. Billing and inventory.
4. Accounting and reports.
5. Admin and QA.
6. Deployment and handover.

Task status is intentionally initialized as `NOT STARTED` or `IN PROGRESS`; no test or security scan is claimed as executed by this package.
