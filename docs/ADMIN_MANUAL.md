# RMSTORVIX IGNITE — Platform Administrator Operations Manual

**Product:** RMSTORVIX IGNITE  
**Portal:** `/admin`  
**Audience:** Platform Super Administrators, DevOps, Security & Compliance Officers  

---

## 1. Super-Admin Security Architecture

In compliance with SaaS security standards, **public registration can never grant Platform Super Admin privileges**. All super-admin accounts must be provisioned via secure deployment seeds or the authenticated CLI utility.

### Provisioning the Initial Super-Admin via CLI
From the server command line:

```bash
# Node.js Standalone Runtime:
node --experimental-sqlite bin/create-admin.js admin@rmstorvix.com "Platform Administrator" "YourSecurePassword@2026!"

# PHP / MySQL Production Runtime:
php bin/create-admin.php
```

---

## 2. Platform Admin Dashboard (`/admin`)

The Platform Admin Portal provides real-time oversight of the multi-tenant SaaS ecosystem:

### Key Metrics
- **Total Businesses:** Aggregate count of all registered workspaces.
- **Pending Approvals:** Registrations awaiting credential verification.
- **Active Workspaces:** Fully verified and compliant business accounts.
- **Suspended / Rejected:** Accounts locked or disqualified from business operations.

---

## 3. Business Approval & Lifecycle Workflows

When a business signs up at `/signup`, it automatically enters the `PENDING` status. Until an administrator approves it, the business owner and staff cannot access invoices, accounting, or inventory endpoints.

### Reviewing Registrations
1. In the `/admin` portal, filter businesses by **"Pending Review"**.
2. Examine:
   - Business Legal Name and Type
   - Owner Full Name, Mobile, and Email
   - GSTIN syntax and State Code
   - Full Registered Business Address
3. **Approve:** Click **"Approve"**. Status transitions to `APPROVED`, recording the approving admin's ID, timestamp, and an immutable audit log entry.
4. **Reject:** Click **"Reject"**. Enter a justification (e.g., "Invalid GSTIN or unverified mobile"). The business status becomes `REJECTED`, and the user is redirected to `/rejected`.
5. **Suspend:** If an account violates terms or fails compliance, click **"Suspend"**. Access is immediately locked across all sessions.
6. **Reactivate:** Restores suspended businesses to active status.

---

## 4. Multi-Tenant Isolation & Server-Side Security

RMSTORVIX IGNITE enforces strict tenant data isolation:

1. **Scoped Queries:** All database queries for products, invoices, parties, accounts, and journals explicitly include `WHERE business_id = ?`.
2. **Session Hardening:**
   - 32-byte cryptographically secure random session tokens.
   - `HttpOnly`, `SameSite=Lax` cookies.
   - Automatic expiry tracking.
3. **Rate Limiting:** In-memory sliding window rate limiter protects `/api/auth/*` against brute-force attacks.
4. **Audit Logging:** Every critical action (login, business registration, approval, suspension, invoice creation, payment) is permanently recorded in `audit_logs` with actor ID, IP address, user agent, and metadata.

---

## 5. Backup & Disaster Recovery Procedures

### Creating a Snapshot
Run the automated snapshot tool:

```bash
node --experimental-sqlite scripts/backup.js
```
The snapshot is written to `backups/rmstorvix_ignite_backup_<timestamp>.sqlite`.

### Restoring from Backup
To restore a previous database snapshot:

```bash
node --experimental-sqlite scripts/restore.js backups/rmstorvix_ignite_backup_<timestamp>.sqlite
```
*Note: The restore script automatically creates a safety backup of the existing database before overwriting.*

---

## 6. Build Control Center (`/build-control`)

Administrators can monitor development phases, verified task completions, and run regression test suites directly from the browser:

1. Navigate to `/build-control`.
2. Review the verified completion percentages for all 6 phases.
3. Click **"▶ Run Automated Tests"** to trigger the 12-workflow regression test suite on demand.
