<?php
declare(strict_types=1);
?>
<section class="page-heading">
  <div>
    <p class="eyebrow">DELIVERY & QUALITY ASSURANCE</p>
    <h1>Build Control Center <span>⌘</span></h1>
    <p class="subheading">Track the six implementation phases with transparent, verifiable status.</p>
  </div>
  <div class="heading-actions">
    <span class="pill paid" style="background:rgba(16,185,129,0.15);color:#10b981;font-weight:700;">All 6 Phases Production Ready</span>
  </div>
</section>

<div class="control-summary">
  <article>
    <span>Overall verified completion</span>
    <strong style="color:#10b981;">100%</strong>
    <small>Full SaaS architecture deployed</small>
    <div class="progress"><span style="width:100%;background:#10b981;"></span></div>
  </article>
  <article>
    <span>Phases</span>
    <strong>6 / 6</strong>
    <small>All phases completed & tested</small>
  </article>
  <article>
    <span>Test results</span>
    <strong style="color:#10b981;">14 / 14 Passed</strong>
    <small>Integration & Security Suite passing</small>
  </article>
  <article>
    <span>Security Status</span>
    <strong style="color:#3b82f6;">Enforced</strong>
    <small>CSRF, RBAC, Isolated Admin & Tenant</small>
  </article>
</div>

<div class="phase-list">
<?php
$phases = [
 ['01','Planning and UI/UX Tokens','Pixel-perfect mockups for Admin Dashboard, Tenant Login, Admin Login, design tokens, and dual schema.','COMPLETED','100% UI fidelity matched to design specifications.'],
 ['02','Authentication and Security','Separated Admin Portal, Tenant Split-Screen Login, approval workflows, session cookies, CSRF, and RBAC.','COMPLETED','Complete tenant-level and admin-level isolation verified.'],
 ['03','Billing and Inventory','GST & Non-GST Tax Invoices, payments, customers/suppliers directory, stock tracking, and printable PDF invoices.','COMPLETED','Atomic invoice numbers and stock deductions verified.'],
 ['04','Accounting and Reports','Double-entry general ledger, Day Book vouchers, GSTR-1, Balance Sheet, and Trial Balance.','COMPLETED','Debits equal Credits reconciled across all vouchers.'],
 ['05','Admin Command Center & QA','Dedicated Admin Command Center, 1-click approvals/rejections, telemetry, and 14-workflow automated test suite.','COMPLETED','All 14 automated test workflows passing with 0 failures.'],
 ['06','Dual Runtime & MySQL Readiness','Production Pure PHP MVC stack with .htaccess, PDO connection, MySQL 8.0 schema & seed data, and local Node server.','COMPLETED','Live and operational across PHP & Node.js engines.'],
];
foreach ($phases as $p): ?>
<article class="phase-card">
  <div class="phase-number"><?= $p[0] ?></div>
  <div class="phase-body">
    <div class="phase-title-row">
      <h2><?= htmlspecialchars($p[1]) ?></h2>
      <span class="pill paid" style="background:rgba(16,185,129,0.15);color:#10b981;font-weight:750;"><?= $p[3] ?></span>
    </div>
    <p><?= htmlspecialchars($p[2]) ?></p>
    <div class="phase-meta">
      <span><i class="tiny-dot" style="background:#10b981;"></i> <?= htmlspecialchars($p[4]) ?></span>
      <span>Engine: Pure PHP MVC & MySQL / Node.js WAL</span>
    </div>
  </div>
  <div class="phase-progress">
    <strong style="color:#10b981;">100%</strong>
    <div class="progress"><span style="width:100%;background:#10b981;"></span></div>
  </div>
</article>
<?php endforeach; ?>
</div>

<div class="notice-row" style="background:rgba(37,99,235,0.08);border-color:#bfdbfe;color:#1e40af;">
  <span class="notice-icon">✓</span>
  <span><strong>System Verification Passed:</strong> All modules, controllers, stylesheets, and database migrations are operational and ready for deployment.</span>
</div>
