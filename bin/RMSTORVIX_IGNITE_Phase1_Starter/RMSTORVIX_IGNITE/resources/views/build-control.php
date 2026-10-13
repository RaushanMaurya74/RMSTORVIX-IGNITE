<section class="page-heading">
  <div><p class="eyebrow">DELIVERY & QUALITY</p><h1>Build Control Center <span>⌘</span></h1><p class="subheading">Track the six implementation phases with transparent, verifiable status.</p></div>
  <div class="heading-actions"><span class="pill in-progress">Phase 1 in progress</span></div>
</section>
<div class="control-summary">
  <article><span>Overall verified completion</span><strong>5%</strong><small>Initial foundation only</small><div class="progress"><span style="width:5%"></span></div></article>
  <article><span>Phases</span><strong>6</strong><small>Sequential delivery plan</small></article>
  <article><span>Test results</span><strong>Not run</strong><small>Automated test suite not configured yet</small></article>
  <article><span>Security findings</span><strong>Not assessed</strong><small>No security scan claimed</small></article>
</div>
<div class="phase-list">
<?php
$phases = [
 ['01','Planning and UI/UX','Requirements, design tokens, page layouts, architecture and schema.','IN PROGRESS','Foundation UI and starter schema drafted.'],
 ['02','Authentication and security','Login, signup, recovery, approval workflow, RBAC and tenant isolation.','NOT STARTED','Depends on Phase 1 review.'],
 ['03','Billing and inventory','Invoices, payments, customers, products, stock movements and PDFs.','NOT STARTED','Depends on authentication and tenant model.'],
 ['04','Accounting and reports','Double-entry ledger, financial statements, tax summaries and analytics.','NOT STARTED','Depends on consistent transaction model.'],
 ['05','Admin and quality assurance','Admin portal, approvals, E2E tests, security, performance and accessibility.','NOT STARTED','Requires core workflows.'],
 ['06','Deployment and handover','Production build, migrations, monitoring, backups, manuals and release gates.','NOT STARTED','Requires verified acceptance criteria.'],
];
foreach ($phases as $p): ?>
<article class="phase-card"><div class="phase-number"><?= $p[0] ?></div><div class="phase-body"><div class="phase-title-row"><h2><?= htmlspecialchars($p[1]) ?></h2><span class="pill <?= $p[3] === 'IN PROGRESS' ? 'in-progress' : 'not-started' ?>"><?= $p[3] ?></span></div><p><?= htmlspecialchars($p[2]) ?></p><div class="phase-meta"><span><i class="tiny-dot"></i><?= htmlspecialchars($p[4]) ?></span><span>Tasks: not yet verified in database</span></div></div><div class="phase-progress"><strong><?= $p[0] === '01' ? '5%' : '0%' ?></strong><div class="progress"><span style="width:<?= $p[0] === '01' ? '5%' : '0%' ?>"></span></div></div></article>
<?php endforeach; ?>
</div>
<div class="notice-row"><span class="notice-icon">⚠</span><span><strong>Integrity rule:</strong> The progress above is a starter estimate, not a database-verified delivery report. This screen becomes authoritative only after task records, test runs and audit events are wired to the backend.</span></div>
