<?php
declare(strict_types=1);
$pageTitle = $pageTitle ?? 'Admin Dashboard';
$adminUser = $adminUser ?? (function_exists('admin_user') ? admin_user() : null);
$adminName = $adminUser['full_name'] ?? 'Super Admin';
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= htmlspecialchars($pageTitle) ?> · RMSTORVIX IGNITE Admin</title>
  <link rel="icon" type="image/png" href="/assets/images/favicon.png">
  <link rel="stylesheet" href="/assets/css/admin.css">
</head>
<body class="admin-body">
<div class="admin-layout">
  <!-- SIDEBAR (MATCHING IMAGE 1) -->
  <aside class="admin-sidebar" id="adminSidebar">
    <div class="admin-sidebar-brand">
      <img src="/assets/images/logo.png" alt="RMSTORVIX IGNITE" class="admin-sidebar-logo">
      <div class="admin-sidebar-brand-text">
        <strong>RMSTORVIX</strong>
        <span>IGNITE</span>
      </div>
      <button class="admin-sidebar-toggle" id="adminSidebarToggle" aria-label="Toggle Navigation">☰</button>
    </div>

    <!-- Group: Dashboard -->
    <div class="admin-nav-group">
      <div class="admin-nav-list">
        <a class="admin-nav-link active" href="/admin">
          <span class="admin-nav-link-icon">🏠</span>
          <span>Dashboard</span>
        </a>
      </div>
    </div>

    <!-- Group: Business Management -->
    <div class="admin-nav-group">
      <div class="admin-nav-heading">
        <span>Business Management</span>
        <span class="admin-nav-badge" id="sidebarPendingBadge">12</span>
      </div>
      <div class="admin-nav-list">
        <a class="admin-nav-link" href="#recent-registrations">
          <span class="admin-nav-link-icon">🏢</span>
          <span>All Businesses</span>
        </a>
        <a class="admin-nav-link" href="#pending-approvals">
          <span class="admin-nav-link-icon">📄</span>
          <span>Pending Approvals</span>
          <span class="admin-nav-link-badge">12</span>
        </a>
        <a class="admin-nav-link" href="#users">
          <span class="admin-nav-link-icon">👤</span>
          <span>User Management</span>
        </a>
        <a class="admin-nav-link" href="#roles">
          <span class="admin-nav-link-icon">🛡️</span>
          <span>Roles & Permissions</span>
        </a>
      </div>
    </div>

    <!-- Group: Reports -->
    <div class="admin-nav-group">
      <div class="admin-nav-heading">
        <span>Reports</span>
        <span style="font-size:10px;">⌄</span>
      </div>
      <div class="admin-nav-list">
        <a class="admin-nav-link" href="#monthly-reports">
          <span class="admin-nav-link-icon">📅</span>
          <span>Monthly Reports</span>
        </a>
        <a class="admin-nav-link" href="#yearly-reports">
          <span class="admin-nav-link-icon">📈</span>
          <span>Yearly Reports</span>
        </a>
        <a class="admin-nav-link" href="#analytics">
          <span class="admin-nav-link-icon">📊</span>
          <span>Platform Analytics</span>
        </a>
      </div>
    </div>

    <!-- Group: System -->
    <div class="admin-nav-group">
      <div class="admin-nav-heading">
        <span>System</span>
        <span style="font-size:10px;">⌄</span>
      </div>
      <div class="admin-nav-list">
        <a class="admin-nav-link" href="#system-health">
          <span class="admin-nav-link-icon">⚙️</span>
          <span>System Health</span>
        </a>
        <a class="admin-nav-link" href="#background-jobs">
          <span class="admin-nav-link-icon">⚡</span>
          <span>Background Jobs</span>
        </a>
        <a class="admin-nav-link" href="#audit-logs">
          <span class="admin-nav-link-icon">🛡️</span>
          <span>Audit Logs</span>
        </a>
        <a class="admin-nav-link" href="/build-control">
          <span class="admin-nav-link-icon">🚀</span>
          <span>Build Control</span>
        </a>
      </div>
    </div>

    <!-- Group: Support -->
    <div class="admin-nav-group">
      <div class="admin-nav-heading">
        <span>Support</span>
        <span style="font-size:10px;">⌄</span>
      </div>
      <div class="admin-nav-list">
        <a class="admin-nav-link" href="#support-requests">
          <span class="admin-nav-link-icon">💬</span>
          <span>Support Requests</span>
          <span class="admin-nav-badge" style="margin-left:auto;">5</span>
        </a>
        <a class="admin-nav-link" href="#security-alerts">
          <span class="admin-nav-link-icon">🚨</span>
          <span>Security Alerts</span>
          <span class="admin-nav-badge red" style="margin-left:auto;">2</span>
        </a>
      </div>
    </div>

    <!-- Sidebar Bottom (Matching Image 1) -->
    <div class="admin-sidebar-bottom">
      <div class="sidebar-brand-card">
        <img src="/assets/images/logo.png" alt="RMSTORVIX IGNITE">
        <div>
          <strong>RMSTORVIX IGNITE</strong>
          <small>Smarter Business, Bigger Tomorrow</small>
        </div>
      </div>
      <div class="sidebar-swoosh-decor"></div>
    </div>
  </aside>

  <!-- MAIN CONTAINER (MATCHING IMAGE 1) -->
  <div class="admin-main-wrap">
    <!-- TOPBAR (MATCHING IMAGE 1) -->
    <header class="admin-topbar">
      <div class="admin-topbar-search">
        <span class="search-icon-left">🔍</span>
        <input type="search" id="adminTopbarSearch" placeholder="Search businesses, users, or features..." aria-label="Search">
      </div>

      <div class="admin-topbar-actions">
        <div class="admin-top-bell" title="3 Notifications">
          <span>🔔</span>
          <span class="admin-bell-badge">3</span>
        </div>

        <div class="admin-profile-pill" onclick="if(confirm('Logout from Admin Console?')) window.location.href='/admin/logout';">
          <div class="admin-avatar-circle">A</div>
          <div class="admin-profile-text">
            <strong>Admin</strong>
            <small>Super Admin</small>
          </div>
        </div>
      </div>
    </header>

    <!-- CONTENT BODY (MATCHING IMAGE 1) -->
    <main class="admin-content" style="padding: 24px 32px;">
      <?php if (isset($contentView) && file_exists($contentView)): ?>
        <?php require $contentView; ?>
      <?php elseif (isset($bodyContent)): ?>
        <?= $bodyContent ?>
      <?php else: ?>
        <?php require __DIR__ . '/dashboard.php'; ?>
      <?php endif; ?>
    </main>

    <!-- FOOTER (MATCHING IMAGE 1) -->
    <footer class="admin-footer">
      <span>© 2025 RMSTORVIX IGNITE. All rights reserved.</span>
      <div>
        <a href="#privacy">Privacy Policy</a>
        <a href="#terms">Terms & Conditions</a>
        <a href="#help">Help</a>
      </div>
    </footer>
  </div>
</div>
<script src="/assets/js/admin.js"></script>
</body>
</html>
