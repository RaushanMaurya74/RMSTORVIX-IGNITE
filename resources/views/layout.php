<?php
declare(strict_types=1);
$active = $active ?? 'dashboard';
$pageTitle = $pageTitle ?? 'Business overview';
$currentUser = function_exists('user') ? user() : null;
$bizName = $currentUser['business_name'] ?? 'Apex Enterprise Logistics';
$avatarLetter = strtoupper(substr($bizName, 0, 1) ?: 'A');
$userName = $currentUser['full_name'] ?? 'Workspace User';

$nav = [
  ['key'=>'dashboard','label'=>'Dashboard','icon'=>'▦','href'=>'/dashboard'],
  ['key'=>'invoices','label'=>'Billing & Invoices','icon'=>'▤','href'=>'/invoices'],
  ['key'=>'inventory','label'=>'Inventory & Stock','icon'=>'▧','href'=>'/inventory'],
  ['key'=>'parties','label'=>'Customers & Suppliers','icon'=>'♙','href'=>'/parties'],
  ['key'=>'purchases','label'=>'Purchase Bills','icon'=>'📥','href'=>'/purchases'],
  ['key'=>'accounting','label'=>'Accounting (Tally)','icon'=>'◎','href'=>'/accounting'],
  ['key'=>'reports','label'=>'Reports & Analytics','icon'=>'▥','href'=>'/reports'],
  ['key'=>'build-control','label'=>'Build Control Center','icon'=>'⌘','href'=>'/build-control'],
];
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#101b36">
  <title><?= htmlspecialchars($pageTitle) ?> · RMSTORVIX IGNITE</title>
  <link rel="icon" type="image/png" href="/assets/images/favicon.png">
  <link rel="stylesheet" href="/assets/css/app.css">
</head>
<body>
<div class="app-shell">
  <aside class="sidebar" id="sidebar">
    <a class="brand" href="/dashboard" aria-label="RMSTORVIX IGNITE home">
      <span class="brand-mark brand-logo">
        <img src="/assets/images/logo.png" alt="RMSTORVIX IGNITE Logo" class="brand-logo-img">
      </span>
      <span class="brand-copy"><strong>RMSTORVIX</strong><small>IGNITE BUSINESS SUITE</small></span>
    </a>
    <div class="workspace-label">WORKSPACE</div>
    <div class="workspace-switch">
      <span class="workspace-avatar"><?= htmlspecialchars($avatarLetter) ?></span>
      <span>
        <strong><?= htmlspecialchars($bizName) ?></strong>
        <small><?= !empty($currentUser['gstin']) ? 'GST: ' . htmlspecialchars($currentUser['gstin']) : 'Active Workspace' ?></small>
      </span>
    </div>
    <nav aria-label="Main navigation">
      <?php foreach ($nav as $item): ?>
      <a class="nav-item <?= $active === $item['key'] ? 'active' : '' ?>" href="<?= htmlspecialchars($item['href']) ?>">
        <span class="nav-icon" aria-hidden="true"><?= $item['icon'] ?></span><span><?= htmlspecialchars($item['label']) ?></span>
        <?php if ($item['key'] === 'invoices'): ?><span class="nav-dot"></span><?php endif; ?>
      </a>
      <?php endforeach; ?>
    </nav>
    <div class="sidebar-bottom">
      <?php if (!empty($currentUser) && in_array($currentUser['platform_role'] ?? '', ['SUPER_ADMIN', 'PLATFORM_ADMIN'], true)): ?>
        <div style="margin-bottom:10px;">
          <a href="/admin" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#18284d;border:1px solid #ff6026;border-radius:8px;color:#ff9668;font-size:11px;font-weight:700;text-decoration:none;">
            <span>🛡</span> <span>Admin Command Center →</span>
          </a>
        </div>
      <?php endif; ?>
      <div class="tally-badge" id="openShortcutsBtn" title="Press F1 for keyboard shortcuts" style="margin-bottom:10px;cursor:pointer;padding:8px 10px;background:#182747;border-radius:8px;font-size:11px;color:#c0ceea;display:flex;align-items:center;gap:8px;">
        <span>⌨</span> <strong>Tally Shortcuts</strong> <kbd style="margin-left:auto;background:#2b3a59;padding:2px 5px;border-radius:4px;font-size:9px;">F1</kbd>
      </div>
      <div class="user-profile">
        <span class="profile-avatar"><?= htmlspecialchars(strtoupper(substr($userName, 0, 2))) ?></span>
        <span>
          <strong><?= htmlspecialchars($userName) ?></strong>
          <small><?= htmlspecialchars($currentUser['business_role'] ?? 'Owner') ?></small>
        </span>
        <a href="/logout" class="icon-button" title="Logout" style="margin-left:auto;text-decoration:none;font-size:16px;">⏻</a>
      </div>
    </div>
  </aside>

  <main class="main">
    <header class="topbar">
      <button class="mobile-menu icon-button" id="menuToggle" aria-label="Toggle navigation">☰</button>
      <div class="breadcrumbs"><span>RMSTORVIX IGNITE</span><span class="crumb-sep">/</span><strong><?= htmlspecialchars($pageTitle) ?></strong></div>
      <div class="topbar-actions">
        <label class="searchbox"><span>⌕</span><input id="globalSearch" type="search" placeholder="Search customers, invoices, items..." aria-label="Search"><kbd>Ctrl+K</kbd></label>
        <button class="icon-button" id="quickActionHeaderBtn" title="Quick Action (F8 New Invoice)">＋</button>
        <button class="theme-toggle" id="themeToggle" aria-label="Toggle light or dark theme">◐</button>
      </div>
    </header>

    <div class="content">
      <?php if (isset($contentView) && file_exists($contentView)): ?>
        <?php require $contentView; ?>
      <?php elseif (isset($bodyContent)): ?>
        <?= $bodyContent ?>
      <?php else: ?>
        <?php require __DIR__ . '/dashboard.php'; ?>
      <?php endif; ?>
    </div>

    <footer class="footer">
      <span>RMSTORVIX IGNITE · Business SaaS & Accounting Suite</span>
      <span>Double-entry balanced · Indian GST (CGST/SGST/IGST)</span>
      <span><span class="status-dot"></span>Production Ready</span>
    </footer>
  </main>
</div>
<script src="/assets/js/app.js"></script>
</body>
</html>
