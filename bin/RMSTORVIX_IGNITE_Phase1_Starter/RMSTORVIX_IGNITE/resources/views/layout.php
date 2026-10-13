<?php
declare(strict_types=1);
$active = $active ?? 'dashboard';
$pageTitle = $pageTitle ?? 'Business overview';
$nav = [
 ['key'=>'dashboard','label'=>'Dashboard','icon'=>'▦','href'=>'/dashboard'],
 ['key'=>'billing','label'=>'Billing','icon'=>'▤','href'=>'#billing'],
 ['key'=>'inventory','label'=>'Inventory & Stock','icon'=>'▧','href'=>'#inventory'],
 ['key'=>'parties','label'=>'Customers & Suppliers','icon'=>'♙','href'=>'#parties'],
 ['key'=>'accounting','label'=>'Accounting','icon'=>'◎','href'=>'#accounting'],
 ['key'=>'reports','label'=>'Reports & Analytics','icon'=>'▥','href'=>'#reports'],
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
  <link rel="stylesheet" href="/assets/css/app.css">
</head>
<body>
<div class="app-shell">
  <aside class="sidebar" id="sidebar">
    <a class="brand" href="/dashboard" aria-label="RMSTORVIX IGNITE home">
      <span class="brand-mark">R<span>✦</span></span>
      <span class="brand-copy"><strong>RMSTORVIX</strong><small>IGNITE BUSINESS SUITE</small></span>
    </a>
    <div class="workspace-label">WORKSPACE</div>
    <div class="workspace-switch"><span class="workspace-avatar">D</span><span><strong>Demo Business</strong><small>Sample workspace</small></span><span class="chevron">⌄</span></div>
    <nav aria-label="Main navigation">
      <?php foreach ($nav as $item): ?>
      <a class="nav-item <?= $active === $item['key'] ? 'active' : '' ?>" href="<?= htmlspecialchars($item['href']) ?>">
        <span class="nav-icon" aria-hidden="true"><?= $item['icon'] ?></span><span><?= htmlspecialchars($item['label']) ?></span>
        <?php if ($item['key'] === 'billing'): ?><span class="nav-dot"></span><?php endif; ?>
      </a>
      <?php endforeach; ?>
    </nav>
    <div class="sidebar-bottom">
      <div class="help-card"><span class="help-icon">✦</span><strong>Need a hand?</strong><p>Get help setting up your business workspace.</p><a href="#help">Visit help center ↗</a></div>
      <a class="nav-item" href="#settings"><span class="nav-icon">⚙</span><span>Settings</span></a>
      <div class="user-profile"><span class="profile-avatar">RM</span><span><strong>Raushan Maurya</strong><small>Workspace owner · Demo</small></span><button class="icon-button" aria-label="Profile menu">•••</button></div>
    </div>
  </aside>

  <main class="main">
    <header class="topbar">
      <button class="mobile-menu icon-button" id="menuToggle" aria-label="Toggle navigation">☰</button>
      <div class="breadcrumbs"><span>RMSTORVIX IGNITE</span><span class="crumb-sep">/</span><strong><?= htmlspecialchars($pageTitle) ?></strong></div>
      <div class="topbar-actions">
        <label class="searchbox"><span>⌕</span><input id="globalSearch" type="search" placeholder="Search anything..." aria-label="Search anything"><kbd>⌘ K</kbd></label>
        <button class="icon-button notification-button" aria-label="Notifications">♧<i></i></button>
        <button class="theme-toggle" id="themeToggle" aria-label="Toggle light or dark theme">◐</button>
      </div>
    </header>

    <div class="content">
      <div class="demo-banner"><span class="demo-pulse"></span><strong>DEMO ENVIRONMENT</strong><span>Sample figures shown — no real business activity is connected.</span></div>
      <?php if ($active === 'build-control'): ?>
        <?php require __DIR__ . '/build-control.php'; ?>
      <?php else: ?>
        <?php require __DIR__ . '/dashboard.php'; ?>
      <?php endif; ?>
    </div>
    <footer class="footer"><span>© <?= date('Y') ?> RMSTORVIX IGNITE</span><span>Built for clarity. Designed for control.</span><span><i class="status-dot"></i> Local preview</span></footer>
  </main>
</div>
<script src="/assets/js/app.js"></script>
</body>
</html>
