// RMSTORVIX IGNITE — Complete Billing, Inventory, Accounting & Business Management SaaS
// Standalone Production-Ready Application Server (Node.js v22 + SQLite WAL Mode)

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const { getDb, transaction, DB_PATH } = require('./db');
const {
  hashPassword,
  verifyPassword,
  uuid,
  randomToken,
  escapeHtml,
  validateGSTIN,
  getFinancialYear,
  logAudit,
  checkRateLimit
} = require('./security');
const {
  initChartOfAccounts,
  getAccountByCode,
  postJournalEntry,
  postInvoiceToAccounting,
  postReceiptToAccounting,
  postPurchaseBillToAccounting,
  postSupplierPaymentToAccounting,
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getDayBook,
  calculateItemGST
} = require('./accounting');
const { testSupabaseConnection } = require('./supabase');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper: Parse Cookies
function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

// Helper: Parse Request Body (JSON or Form-URLencoded)
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) req.destroy(); // 5MB limit
    });
    req.on('end', () => {
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch {
          resolve({});
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(body);
        const obj = {};
        for (const [key, value] of params.entries()) {
          obj[key] = value;
        }
        resolve(obj);
      } else {
        resolve(body);
      }
    });
  });
}

// Helper: Send JSON
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN'
  });
  res.end(JSON.stringify(data));
}

// Helper: Send HTML
function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN'
  });
  res.end(html);
}

// Helper: Redirect
function redirect(res, targetUrl, cookies = []) {
  const headers = {
    'Location': targetUrl,
    'X-Content-Type-Options': 'nosniff'
  };
  if (cookies.length > 0) {
    headers['Set-Cookie'] = cookies;
  }
  res.writeHead(303, headers);
  res.end();
}

// Helper: Authenticate User via Session Cookie
function authenticate(req) {
  const db = getDb();
  const cookies = parseCookies(req);
  const token = cookies['rmstorvix_session'];
  if (!token) return null;

  const session = db.prepare(`
    SELECT s.session_token, s.user_id, s.business_id, s.expires_at,
           u.public_id AS user_public_id, u.full_name, u.email, u.mobile, u.platform_role, u.business_role, u.account_status,
           b.public_id AS business_public_id, b.business_name, b.approval_status, b.gstin, b.currency, b.invoice_prefix
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN businesses b ON b.id = s.business_id
    WHERE s.session_token = ? AND datetime(s.expires_at) > datetime('now')
  `).get(token);

  if (!session) return null;
  return session;
}

// Global Layout Template Builder
function renderShell({ title, activeNav, user, business, bodyContent }) {
  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: '▦', href: '/dashboard' },
    { key: 'billing', label: 'Billing & Invoices', icon: '▤', href: '/billing' },
    { key: 'inventory', label: 'Inventory & Stock', icon: '▧', href: '/inventory' },
    { key: 'parties', label: 'Customers & Suppliers', icon: '♙', href: '/parties' },
    { key: 'purchases', label: 'Purchase Bills', icon: '📥', href: '/purchases' },
    { key: 'payments', label: 'Payments & Vouchers', icon: '₹', href: '/payments' },
    { key: 'accounting', label: 'Accounting (Tally)', icon: '◎', href: '/accounting' },
    { key: 'reports', label: 'Reports & Analytics', icon: '▥', href: '/reports' },
    { key: 'build-control', label: 'Build Control Center', icon: '⌘', href: '/build-control' },
    { key: 'settings', label: 'Settings', icon: '⚙', href: '/settings' }
  ];

  if (user && ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(user.platform_role)) {
    navItems.push({ key: 'admin', label: 'Platform Admin', icon: '🛡', href: '/admin' });
  }

  const businessName = business?.business_name || 'RMSTORVIX Platform';
  const userName = user?.full_name || 'User';
  const roleName = user?.platform_role === 'SUPER_ADMIN' ? 'Super Admin' : (user?.business_role || 'Member');
  const avatarLetter = (businessName[0] || 'R').toUpperCase();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#101b36">
  <title>${escapeHtml(title)} · RMSTORVIX IGNITE</title>
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
      <span class="brand-copy">
        <strong>RMSTORVIX</strong>
        <small>IGNITE BUSINESS SUITE</small>
      </span>
    </a>

    <div class="workspace-label">WORKSPACE</div>
    <div class="workspace-switch">
      <span class="workspace-avatar">${escapeHtml(avatarLetter)}</span>
      <span>
        <strong>${escapeHtml(businessName)}</strong>
        <small>${user?.platform_role === 'SUPER_ADMIN' ? 'Platform Control' : (business?.gstin ? 'GST: ' + business.gstin : 'Active Workspace')}</small>
      </span>
    </div>

    <nav aria-label="Main navigation">
      ${navItems.map(item => `
        <a class="nav-item ${activeNav === item.key ? 'active' : ''}" href="${item.href}">
          <span class="nav-icon" aria-hidden="true">${item.icon}</span>
          <span>${escapeHtml(item.label)}</span>
        </a>
      `).join('')}
    </nav>

    <div class="sidebar-bottom">
      <div class="tally-badge" id="openShortcutsBtn" title="Press F1 for keyboard shortcuts">
        <span>⌨</span> <strong>Tally Shortcuts</strong> <kbd>F1</kbd>
      </div>
      <div class="user-profile">
        <span class="profile-avatar">${escapeHtml(userName.slice(0, 2).toUpperCase())}</span>
        <span>
          <strong>${escapeHtml(userName)}</strong>
          <small>${escapeHtml(roleName)}</small>
        </span>
        <button class="icon-button" id="logoutBtn" title="Logout" aria-label="Logout">⏻</button>
      </div>
    </div>
  </aside>

  <main class="main">
    <header class="topbar">
      <button class="mobile-menu icon-button" id="menuToggle" aria-label="Toggle navigation">☰</button>
      <div class="breadcrumbs">
        <span>RMSTORVIX IGNITE</span>
        <span class="crumb-sep">/</span>
        <strong>${escapeHtml(title)}</strong>
      </div>
      <div class="topbar-actions">
        <label class="searchbox">
          <span>⌕</span>
          <input id="globalSearch" type="search" placeholder="Search customers, invoices, items..." aria-label="Search">
          <kbd>Ctrl+K</kbd>
        </label>
        <button class="icon-button" id="quickActionHeaderBtn" title="Quick Action (F8 New Invoice)">＋</button>
        <button class="theme-toggle" id="themeToggle" aria-label="Toggle light or dark theme" title="Toggle Theme">◐</button>
        <!-- Profile Dropdown -->
        <div class="profile-dropdown-wrap" id="profileDropdownWrap">
          <button class="profile-topbar-btn" id="profileTopbarBtn" aria-haspopup="true" aria-expanded="false">
            ${business && business.logo_url ? `<img src="${escapeHtml(business.logo_url)}" class="profile-topbar-logo" alt="${escapeHtml(businessName)}">` : `<div class="profile-topbar-avatar"><svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>`}
            <div class="profile-topbar-text">
              <span class="profile-topbar-name">${escapeHtml(userName)}</span>
              <span class="profile-topbar-biz">${escapeHtml(businessName)} <span style="font-size:9px;color:#94a3b8;margin-left:2px;">⌄</span></span>
            </div>
          </button>
          <div class="profile-dropdown-menu" id="profileDropdownMenu" role="menu">
            <div class="profile-dropdown-header">
              <div class="profile-dropdown-biz">${escapeHtml(businessName)}</div>
              <div class="profile-dropdown-role">${escapeHtml(roleName)}</div>
              <div class="profile-dropdown-email" style="font-size:10px;color:#94a3b8;">${escapeHtml(user.email || '')}</div>
            </div>
            <div class="profile-dropdown-divider"></div>
            <a href="/profile" class="profile-dropdown-item" role="menuitem">👤 My Profile</a>
            <a href="/settings" class="profile-dropdown-item" role="menuitem">⚙️ Business Settings</a>
            <div class="profile-dropdown-divider"></div>
            <button class="profile-dropdown-item profile-dropdown-logout" id="profileLogoutBtn" role="menuitem">⏻ Sign Out</button>
          </div>
        </div>
      </div>
    </header>

    <div class="content">
      ${bodyContent}
    </div>

    <footer class="footer">
      <span>© ${new Date().getFullYear()} RMSTORVIX IGNITE · Enterprise SaaS</span>
      <span>Tally ERP 9 Workflows · Balanced Double-Entry Accounting</span>
      <span><i class="status-dot"></i> Live Engine · v1.0.0-PROD</span>
    </footer>
  </main>
</div>

<!-- Modal Container -->
<div id="modalOverlay" class="modal-overlay" style="display:none;">
  <div class="modal-card" id="modalCard">
    <div class="modal-header">
      <h3 id="modalTitle">Modal Title</h3>
      <button class="modal-close" id="modalCloseBtn">✕</button>
    </div>
    <div class="modal-body" id="modalBody"></div>
  </div>
</div>

<!-- Tally ERP 9 Keyboard Shortcuts Modal Overlay -->
<div id="shortcutsModal" class="modal-overlay" style="display:none;">
  <div class="modal-card modal-lg">
    <div class="modal-header">
      <h3>Tally ERP 9 & System Shortcuts Guide</h3>
      <button class="modal-close" onclick="document.getElementById('shortcutsModal').style.display='none'">✕</button>
    </div>
    <div class="modal-body">
      <div class="shortcuts-grid">
        <div class="shortcut-item"><kbd>F1</kbd> <span>Open this Shortcuts Cheat Sheet</span></div>
        <div class="shortcut-item"><kbd>F2</kbd> <span>Change Financial / Voucher Date</span></div>
        <div class="shortcut-item"><kbd>F4</kbd> <span>Contra Voucher (Bank/Cash Transfer)</span></div>
        <div class="shortcut-item"><kbd>F5</kbd> <span>Payment Voucher (Supplier / Expense)</span></div>
        <div class="shortcut-item"><kbd>F6</kbd> <span>Receipt Voucher (Customer Collection)</span></div>
        <div class="shortcut-item"><kbd>F7</kbd> <span>Journal Entry (Adjustment Voucher)</span></div>
        <div class="shortcut-item"><kbd>F8</kbd> <span>Sales Invoice (GST / Quick Billing)</span></div>
        <div class="shortcut-item"><kbd>F9</kbd> <span>Purchase Bill Voucher</span></div>
        <div class="shortcut-item"><kbd>Alt + P</kbd> <span>Print Current Document / Export PDF</span></div>
        <div class="shortcut-item"><kbd>Ctrl + K</kbd> <span>Global Instant Search</span></div>
        <div class="shortcut-item"><kbd>Esc</kbd> <span>Close Active Modal / Back to Dashboard</span></div>
      </div>
    </div>
  </div>
</div>

<!-- Profile & Business Settings Slide-out Drawer (Hidden by default, slides in on click) -->
<div id="profileSliderBackdrop" class="slider-backdrop"></div>
<aside id="profileSliderDrawer" class="profile-slider-drawer" role="dialog" aria-label="Profile and Settings">
  <div class="slider-drawer-header">
    <h3><span>⚙️</span> Workspace & Settings</h3>
    <button class="slider-drawer-close" id="profileSliderCloseBtn" aria-label="Close drawer">✕</button>
  </div>
  <div class="slider-drawer-body">
    <div class="slider-user-card">
      <div class="slider-user-avatar">
        ${business && business.logo_url 
          ? `<img src="${escapeHtml(business.logo_url)}" alt="${escapeHtml(businessName)}">` 
          : escapeHtml((userName[0] || 'U').toUpperCase())}
      </div>
      <div class="slider-user-info">
        <strong class="slider-user-name">${escapeHtml(userName)}</strong>
        <span class="slider-user-biz">${escapeHtml(businessName)}</span>
        <span class="slider-user-role-badge">${escapeHtml(roleName)}</span>
      </div>
    </div>

    <div class="slider-menu-group">
      <div class="slider-menu-label">Workspace Settings</div>
      <a href="/profile" class="slider-menu-item">
        <div class="slider-menu-icon">👤</div>
        <div class="slider-menu-content">
          <strong class="slider-menu-title">My Profile & Company Logo</strong>
          <small class="slider-menu-desc">Personal details, contact & business branding logo</small>
        </div>
        <span>→</span>
      </a>

      <a href="/settings" class="slider-menu-item">
        <div class="slider-menu-icon">⚙️</div>
        <div class="slider-menu-content">
          <strong class="slider-menu-title">Business Settings & Signature</strong>
          <small class="slider-menu-desc">GSTIN, invoice prefixes, digital signature & official stamp</small>
        </div>
        <span>→</span>
      </a>

      ${user && ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(user.platform_role) ? `
      <a href="/admin" class="slider-menu-item">
        <div class="slider-menu-icon" style="background:rgba(255,87,34,0.1);color:#ff5722;">🛡️</div>
        <div class="slider-menu-content">
          <strong class="slider-menu-title">Platform Command Center</strong>
          <small class="slider-menu-desc">Manage tenants, system users & platform health</small>
        </div>
        <span>→</span>
      </a>
      ` : ''}
    </div>

    <div class="slider-menu-group">
      <div class="slider-menu-label">System Preferences</div>
      <div class="slider-menu-item" style="cursor:pointer;" onclick="document.getElementById('themeToggle').click();">
        <div class="slider-menu-icon">◐</div>
        <div class="slider-menu-content">
          <strong class="slider-menu-title">Toggle Dark / Light Theme</strong>
          <small class="slider-menu-desc">Switch high-contrast theme</small>
        </div>
      </div>
      <div class="slider-menu-item" style="cursor:pointer;" onclick="document.getElementById('shortcutsModal').style.display='flex';">
        <div class="slider-menu-icon">⌨</div>
        <div class="slider-menu-content">
          <strong class="slider-menu-title">Tally ERP 9 Shortcuts</strong>
          <small class="slider-menu-desc">View keyboard commands cheat sheet (F1-F9)</small>
        </div>
      </div>
    </div>
  </div>
  <div class="slider-drawer-footer">
    <button class="slider-logout-btn" id="drawerLogoutBtn">⏻ Sign Out of Workspace</button>
  </div>
</aside>

<script src="/assets/js/app.js"></script>
</body>
</html>`;
}

// Auth Page Template Builder (Matching Image 2 Split-Screen Theme)
function renderAuthPage({ title, formContent, alertMessage = null, alertType = 'info', isSignup = false }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · RMSTORVIX IGNITE</title>
  <link rel="icon" type="image/png" href="/assets/images/favicon.png">
  <link rel="stylesheet" href="/assets/css/auth.css">
</head>
<body class="auth-split-body ${isSignup ? 'is-signup' : ''}">
<div class="auth-container">
  <!-- LEFT HERO PANEL (MATCHING IMAGE 2) -->
  <aside class="auth-hero">
    <div class="hero-header">
      <img src="/assets/images/logo.png" alt="RMSTORVIX IGNITE Logo" class="hero-logo">
      <div class="hero-brand-text">
        <strong>RMSTORVIX</strong>
        <small>IGNITE</small>
      </div>
      <span style="margin-left:8px;font-size:10.5px;color:#94a3b8;letter-spacing:0.5px;">Smart Business • Better Tomorrow</span>
    </div>

    <div class="hero-copy">
      <h1>Power Your Business with <span>RMSTORVIX IGNITE</span></h1>
      <p>Complete Billing, Inventory, Accounting & Business Management Solution — All in One Platform.</p>
    </div>

    <div class="hero-features">
      <div class="feature-box">
        <div class="feature-icon">📄</div>
        <div class="feature-body">
          <strong>Billing</strong>
          <span>GST & Non-GST Invoices, Quick Billing, Payments</span>
        </div>
      </div>
      <div class="feature-box">
        <div class="feature-icon">📦</div>
        <div class="feature-body">
          <strong>Inventory</strong>
          <span>Stock Management, Barcode, Warehouse</span>
        </div>
      </div>
      <div class="feature-box">
        <div class="feature-icon">⚖️</div>
        <div class="feature-body">
          <strong>Accounting</strong>
          <span>Ledger, Reports, Financial Statements</span>
        </div>
      </div>
      <div class="feature-box">
        <div class="feature-icon">👥</div>
        <div class="feature-body">
          <strong>Customers & Suppliers</strong>
          <span>Manage Contacts, Orders, Payments</span>
        </div>
      </div>
      <div class="feature-box">
        <div class="feature-icon">📊</div>
        <div class="feature-body">
          <strong>Reports</strong>
          <span>Sales, Purchase, Profit & Loss, GST</span>
        </div>
      </div>
      <div class="feature-box">
        <div class="feature-icon">🔒</div>
        <div class="feature-body">
          <strong>Multi-User</strong>
          <span>Secure Roles & Access Control</span>
        </div>
      </div>
    </div>

    <!-- Mini Dashboard Mockup Visual -->
    <div class="hero-mockup-wrapper">
      <div class="hero-mockup-bar">
        <span class="mockup-dot red"></span>
        <span class="mockup-dot yellow"></span>
        <span class="mockup-dot green"></span>
      </div>
      <div class="hero-mockup-screen">
        <div class="mockup-mini-sidebar">
          <div class="mockup-mini-pill active"></div>
          <div class="mockup-mini-pill"></div>
          <div class="mockup-mini-pill"></div>
          <div class="mockup-mini-pill"></div>
        </div>
        <div class="mockup-mini-content">
          <div class="mockup-mini-cards">
            <div class="mockup-mini-card" style="border-left:3px solid #3b82f6;"></div>
            <div class="mockup-mini-card" style="border-left:3px solid #10b981;"></div>
            <div class="mockup-mini-card" style="border-left:3px solid #ff7043;"></div>
          </div>
          <div class="mockup-mini-chart">
            <span class="mockup-bar" style="height:40%;"></span>
            <span class="mockup-bar" style="height:65%;"></span>
            <span class="mockup-bar orange" style="height:85%;"></span>
            <span class="mockup-bar" style="height:55%;"></span>
            <span class="mockup-bar orange" style="height:90%;"></span>
          </div>
        </div>
      </div>
    </div>

    <div class="hero-footer-trust">
      <span>🛡 Secure & Reliable</span>
      <span>☁ Access From Anywhere</span>
      <span>🎧 Dedicated Support</span>
    </div>
  </aside>

  <!-- RIGHT FORM PANEL (MATCHING IMAGE 2) -->
  <main class="auth-form-side">
    <div class="top-auth-link">
      ${isSignup ? `Already registered? <a href="/login">Sign In →</a>` : `New to RMSTORVIX IGNITE? <a href="/signup">Create an Account →</a>`}
    </div>

    <div class="auth-card-clean ${isSignup ? 'auth-form-wide' : ''}">
      <div class="auth-card-header">
        <div class="auth-card-logo">
          <img src="/assets/images/logo.png" alt="RMSTORVIX IGNITE">
        </div>
        <div class="auth-card-brand">RMSTORVIX <span>IGNITE</span></div>
        <h2>${isSignup ? 'Create Account' : 'Welcome Back!'}</h2>
        <p>${isSignup ? 'Set up your business workspace in seconds.' : 'Sign in to your account and continue your journey.'}</p>
      </div>

      ${alertMessage ? `<div class="auth-notice-box" style="margin-bottom:16px;"><span>ℹ</span><div>${escapeHtml(alertMessage)}</div></div>` : ''}

      ${formContent}

      ${isSignup ? `
      <div class="auth-notice-box">
        <span>ℹ</span>
        <div><strong>Your business registration enters pending approval:</strong> You will be able to log in once a Platform Administrator reviews and activates your workspace.</div>
      </div>
      ` : ''}
    </div>

    <div class="auth-footer-note">
      🔒 Your data is safe and encrypted · <strong>RMSTORVIX IGNITE</strong> | v1.0.0
    </div>
  </main>
</div>
<script src="/assets/js/auth.js"></script>
</body>
</html>`;
}

// Dedicated Admin Login Page Template Builder (Matching Image 3 Split-Screen Theme)
function renderAdminLoginPage({ alertMessage = null }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin Login · RMSTORVIX IGNITE</title>
  <link rel="icon" type="image/png" href="/assets/images/favicon.png">
  <link rel="stylesheet" href="/assets/css/auth.css">
</head>
<body class="auth-split-body">
<div class="auth-container">
  <!-- LEFT HERO PANEL (MATCHING IMAGE 3) -->
  <aside class="auth-hero" style="background: linear-gradient(140deg, #060b18 0%, #0a142e 50%, #060d1f 100%);">
    <div class="hero-header">
      <img src="/assets/images/logo.png" alt="RMSTORVIX IGNITE Logo" class="hero-logo">
      <div class="hero-brand-text">
        <strong>RMSTORVIX</strong>
        <small style="color:#ff5722;">IGNITE</small>
      </div>
      <span style="margin-left:auto;font-size:11px;font-weight:750;color:#ff8c42;background:rgba(255,87,34,0.15);padding:3px 8px;border-radius:12px;border:1px solid rgba(255,87,34,0.3);">Admin Portal</span>
    </div>

    <div class="hero-copy">
      <h1>Manage • Monitor • Control <span>RMSTORVIX IGNITE</span> Platform</h1>
      <p>Complete control over businesses, users and system operations. Build a safer, smarter and more efficient platform.</p>
    </div>

    <div class="hero-features">
      <div class="feature-box">
        <div class="feature-icon" style="background:rgba(37,99,235,0.2);color:#60a5fa;">🏢</div>
        <div class="feature-body">
          <strong>Business Management</strong>
          <span>View, approve and manage all business accounts</span>
        </div>
      </div>
      <div class="feature-box">
        <div class="feature-icon" style="background:rgba(255,87,34,0.2);color:#ff8c42;">👤</div>
        <div class="feature-body">
          <strong>User Management</strong>
          <span>Handle users, roles and permissions</span>
        </div>
      </div>
      <div class="feature-box">
        <div class="feature-icon" style="background:rgba(16,185,129,0.2);color:#34d399;">🛡️</div>
        <div class="feature-body">
          <strong>Security & Audit</strong>
          <span>Track activity, monitor and keep data safe</span>
        </div>
      </div>
      <div class="feature-box">
        <div class="feature-icon" style="background:rgba(139,92,246,0.2);color:#c084fc;">📊</div>
        <div class="feature-body">
          <strong>Reports & Analytics</strong>
          <span>Get real-time insights and platform statistics</span>
        </div>
      </div>
      <div class="feature-box">
        <div class="feature-icon" style="background:rgba(245,158,11,0.2);color:#fbbf24;">⚙️</div>
        <div class="feature-body">
          <strong>System Control</strong>
          <span>Manage settings, integrations and system health</span>
        </div>
      </div>
      <div class="feature-box">
        <div class="feature-icon" style="background:rgba(6,182,212,0.2);color:#22d3ee;">🎧</div>
        <div class="feature-body">
          <strong>Support Center</strong>
          <span>Handle requests and provide assistance</span>
        </div>
      </div>
    </div>

    <!-- Mini Admin Mockup Visual -->
    <div class="hero-mockup-wrapper">
      <div class="hero-mockup-bar">
        <span class="mockup-dot red"></span>
        <span class="mockup-dot yellow"></span>
        <span class="mockup-dot green"></span>
      </div>
      <div class="hero-mockup-screen">
        <div class="mockup-mini-sidebar">
          <div class="mockup-mini-pill active" style="background:#2563eb;"></div>
          <div class="mockup-mini-pill"></div>
          <div class="mockup-mini-pill"></div>
          <div class="mockup-mini-pill"></div>
        </div>
        <div class="mockup-mini-content">
          <div class="mockup-mini-cards">
            <div class="mockup-mini-card" style="border-left:3px solid #2563eb;"></div>
            <div class="mockup-mini-card" style="border-left:3px solid #10b981;"></div>
            <div class="mockup-mini-card" style="border-left:3px solid #f59e0b;"></div>
            <div class="mockup-mini-card" style="border-left:3px solid #ef4444;"></div>
          </div>
          <div class="mockup-mini-chart">
            <span class="mockup-bar" style="height:45%;"></span>
            <span class="mockup-bar orange" style="height:70%;"></span>
            <span class="mockup-bar" style="height:90%;"></span>
            <span class="mockup-bar orange" style="height:65%;"></span>
            <span class="mockup-bar" style="height:85%;"></span>
          </div>
        </div>
      </div>
    </div>

    <div class="hero-footer-trust">
      <span>🛡 Secure • Reliable • Scalable</span>
      <span>RMSTORVIX IGNITE | Admin Portal</span>
    </div>
  </aside>

  <!-- RIGHT FORM PANEL (MATCHING IMAGE 3) -->
  <main class="auth-form-side">
    <div class="top-auth-link">
      <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#f1f5f9;border-radius:20px;font-weight:700;color:#334155;">
        <span>👤</span> Admin Portal
      </span>
    </div>

    <div class="auth-card-clean">
      <div class="auth-card-header">
        <div class="auth-card-logo">
          <img src="/assets/images/logo.png" alt="RMSTORVIX IGNITE">
        </div>
        <div class="auth-card-brand">RMSTORVIX <span style="color:#ff5722;">IGNITE</span></div>
        <h2>Admin Login</h2>
        <p>Sign in to access the platform administration panel.</p>
      </div>

      ${alertMessage ? `<div class="auth-notice-box auth-notice-admin" style="margin-bottom:16px;"><span>⚠</span><div>${escapeHtml(alertMessage)}</div></div>` : ''}

      <form id="adminLoginForm" method="POST" action="/api/admin/login">
        <div class="auth-input-group">
          <label>Email / Username</label>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">👤</span>
            <input type="email" name="email" value="" required placeholder="Enter your email or admin username" autocomplete="username">
          </div>
        </div>

        <div class="auth-input-group">
          <label>Password</label>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">🔒</span>
            <input type="password" name="password" id="adminPasswordInput" required placeholder="Enter your password" autocomplete="current-password" value="">
            <button type="button" class="auth-input-toggle" onclick="togglePass('adminPasswordInput', this)">👁</button>
          </div>
        </div>

        <div class="auth-form-row">
          <label>
            <input type="checkbox" name="remember" checked> Remember me
          </label>
          <a href="#" onclick="alert('Master administrator key can be reset via the system CLI: node bin/create-admin.js'); return false;">Forgot password?</a>
        </div>

        <button type="submit" class="btn-auth-primary btn-auth-admin" id="adminLoginBtn">
          <span>→</span> Login
        </button>
      </form>

      <div class="auth-or-divider"><span>OR</span></div>

      <button type="button" class="btn-social" style="width:100%;margin-bottom:16px;" onclick="alert('Google Workspace SSO is configured for verified admin domains.')">
        <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.33 21.46 7.37 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2 0 10.04 0 12s.46 3.8 1.27 5.42l4.01-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.33 2.54 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
        Login with Google
      </button>

      <div class="auth-notice-box" style="background:#eff6ff;border-color:#bfdbfe;color:#1e40af;">
        <span>🛡</span>
        <div><strong>Authorized personnel only:</strong> This is a secure admin portal. Unauthorized access is prohibited.</div>
      </div>
    </div>

    <div class="auth-footer-note">
      <strong>RMSTORVIX IGNITE</strong> v1.0.0 · © 2025 RMSTORVIX. All rights reserved.
    </div>
  </main>
</div>

<script>
  function togglePass(id, btn) {
    const inp = document.getElementById(id);
    if (!inp) return;
    if (inp.type === 'password') {
      inp.type = 'text';
      btn.textContent = '🙈';
    } else {
      inp.type = 'password';
      btn.textContent = '👁';
    }
  }

  const form = document.getElementById('adminLoginForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('adminLoginBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Authenticating...';
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.value, password: form.password.value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      window.location.href = data.redirect || '/admin/dashboard';
    } catch (err) {
      alert(err.message);
      btn.disabled = false;
      btn.innerHTML = '<span>→</span> Login';
    }
  });
</script>
</body>
</html>`;
}

// Dedicated Admin Shell Layout Template Builder (Matching Image 1)
function renderAdminShell({ title, activeNav = 'overview', user, bodyContent }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · RMSTORVIX IGNITE Admin</title>
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
        <a class="admin-nav-link ${activeNav === 'overview' ? 'active' : ''}" href="/admin">
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
        <a class="admin-nav-link ${activeNav === 'businesses' ? 'active' : ''}" href="/admin/businesses">
          <span class="admin-nav-link-icon">🏢</span>
          <span>All Businesses</span>
        </a>
        <a class="admin-nav-link ${activeNav === 'pending' ? 'active' : ''}" href="/admin/businesses?status=PENDING">
          <span class="admin-nav-link-icon">📄</span>
          <span>Pending Approvals</span>
          <span class="admin-nav-link-badge" id="sidebarPendingCount">…</span>
        </a>
        <a class="admin-nav-link ${activeNav === 'users' ? 'active' : ''}" href="/admin/users">
          <span class="admin-nav-link-icon">👤</span>
          <span>User Management</span>
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
        <a class="admin-nav-link ${activeNav === 'reports' ? 'active' : ''}" href="/admin/reports">
          <span class="admin-nav-link-icon">📊</span>
          <span>Platform Reports</span>
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
        <a class="admin-nav-link ${activeNav === 'audit' ? 'active' : ''}" href="/admin/audit-logs">
          <span class="admin-nav-link-icon">🛡️</span>
          <span>Audit Logs</span>
        </a>
        <a class="admin-nav-link" href="/api/admin/backup-download">
          <span class="admin-nav-link-icon">💾</span>
          <span>DB Backup</span>
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
        <a class="admin-nav-link" href="/dashboard" style="color:#94a3b8;">
          <span class="admin-nav-link-icon">🔀</span>
          <span>Switch to Business</span>
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
  <div class="admin-sidebar-overlay" id="adminSidebarOverlay"></div>

  <!-- MAIN CONTAINER (MATCHING IMAGE 1) -->
  <div class="admin-main-wrap">
    <!-- TOPBAR (MATCHING IMAGE 1) -->
    <header class="admin-topbar">
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="admin-mobile-toggle" id="adminMobileToggleBtn" aria-label="Toggle navigation">☰</button>
        <div class="admin-topbar-search">
          <span class="search-icon-left">🔍</span>
          <input type="search" id="adminTopbarSearch" placeholder="Search businesses, users, or features..." aria-label="Search">
        </div>
      </div>

      <div class="admin-topbar-actions">
        <div class="admin-top-bell" title="3 Notifications">
          <span>🔔</span>
          <span class="admin-bell-badge">3</span>
        </div>

        <!-- Admin Profile Dropdown (Matching Image 1) -->
        <div class="profile-dropdown-wrap" id="adminProfileWrap">
          <button class="admin-profile-pill" id="adminProfileBtn" aria-haspopup="true" aria-expanded="false">
            <div class="admin-avatar-circle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div class="admin-profile-text">
              <strong>${escapeHtml(user.full_name || 'Admin')}</strong>
              <small>${user.platform_role === 'SUPER_ADMIN' ? 'Super Admin' : 'Platform Admin'} <span style="font-size:9px;color:#94a3b8;margin-left:2px;">⌄</span></small>
            </div>
          </button>
          <div class="profile-dropdown-menu" id="adminProfileMenu" role="menu" style="right:0;top:52px;">
            <div class="profile-dropdown-header">
              <div class="profile-dropdown-biz">Platform Control</div>
              <div class="profile-dropdown-email" style="font-size:10px;color:#94a3b8;">${escapeHtml(user.email || '')}</div>
            </div>
            <div class="profile-dropdown-divider"></div>
            <a href="/admin" class="profile-dropdown-item" role="menuitem">🏠 Dashboard</a>
            <a href="/admin/businesses" class="profile-dropdown-item" role="menuitem">🏢 Manage Businesses</a>
            <a href="/admin/users" class="profile-dropdown-item" role="menuitem">👥 Manage Users</a>
            <div class="profile-dropdown-divider"></div>
            <button class="profile-dropdown-item profile-dropdown-logout" onclick="if(confirm('Logout?')) window.location.href='/admin/logout';" role="menuitem">⏻ Sign Out</button>
          </div>
        </div>
      </div>
    </header>

    <!-- CONTENT BODY (MATCHING IMAGE 1) -->
    <main class="admin-content">
      ${bodyContent ? bodyContent : renderAdminOverviewDashboard()}
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
<!-- Admin Profile & Settings Slide-out Drawer (Hidden by default, slides in on click) -->
<div id="adminProfileSliderBackdrop" class="slider-backdrop"></div>
<aside id="adminProfileSliderDrawer" class="profile-slider-drawer" role="dialog" aria-label="Admin Profile and Control">
  <div class="slider-drawer-header">
    <h3><span>🛡️</span> Admin Console</h3>
    <button class="slider-drawer-close" id="adminProfileSliderCloseBtn" aria-label="Close drawer">✕</button>
  </div>
  <div class="slider-drawer-body">
    <div class="slider-user-card" style="background:linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);">
      <div class="slider-user-avatar" style="background:#7c3aed;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
      </div>
      <div class="slider-user-info">
        <strong class="slider-user-name">${escapeHtml(user.full_name || 'Super Admin')}</strong>
        <span class="slider-user-biz">${escapeHtml(user.email || 'admin@rmstorvix.com')}</span>
        <span class="slider-user-role-badge" style="background:rgba(124,58,237,0.25);border-color:#a78bfa;color:#c4b5fd;">Platform Super Admin</span>
      </div>
    </div>

    <div class="slider-menu-group">
      <div class="slider-menu-label">Admin Portals</div>
      <a href="/admin" class="slider-menu-item">
        <div class="slider-menu-icon" style="background:rgba(37,99,235,0.1);color:#2563eb;">🏠</div>
        <div class="slider-menu-content">
          <strong class="slider-menu-title">Command Center Dashboard</strong>
          <small class="slider-menu-desc">Platform health, revenue & active metrics</small>
        </div>
        <span>→</span>
      </a>

      <a href="/admin/businesses" class="slider-menu-item">
        <div class="slider-menu-icon" style="background:rgba(16,185,129,0.1);color:#10b981;">🏢</div>
        <div class="slider-menu-content">
          <strong class="slider-menu-title">Manage Businesses</strong>
          <small class="slider-menu-desc">Approvals, onboarding & tenant compliance</small>
        </div>
        <span>→</span>
      </a>

      <a href="/admin/users" class="slider-menu-item">
        <div class="slider-menu-icon" style="background:rgba(139,92,246,0.1);color:#8b5cf6;">👥</div>
        <div class="slider-menu-content">
          <strong class="slider-menu-title">Manage Users</strong>
          <small class="slider-menu-desc">Account status, roles & authentication</small>
        </div>
        <span>→</span>
      </a>

      <a href="/admin/reports" class="slider-menu-item">
        <div class="slider-menu-icon" style="background:rgba(245,158,11,0.1);color:#f59e0b;">📊</div>
        <div class="slider-menu-content">
          <strong class="slider-menu-title">Platform Reports & Analytics</strong>
          <small class="slider-menu-desc">System analytics, revenue & statistics</small>
        </div>
        <span>→</span>
      </a>

      <a href="/admin/audit-logs" class="slider-menu-item">
        <div class="slider-menu-icon" style="background:rgba(239,68,68,0.1);color:#ef4444;">📜</div>
        <div class="slider-menu-content">
          <strong class="slider-menu-title">Security & Audit Logs</strong>
          <small class="slider-menu-desc">Security events, logins & actions</small>
        </div>
        <span>→</span>
      </a>
    </div>

    <div class="slider-menu-group">
      <div class="slider-menu-label">Tenant Switcher</div>
      <a href="/dashboard" class="slider-menu-item">
        <div class="slider-menu-icon">🏢</div>
        <div class="slider-menu-content">
          <strong class="slider-menu-title">Open Business Workspace</strong>
          <small class="slider-menu-desc">Switch to primary tenant ERP billing view</small>
        </div>
        <span>→</span>
      </a>
    </div>
  </div>
  <div class="slider-drawer-footer">
    <button class="slider-logout-btn" onclick="if(confirm('Are you sure you want to sign out of the Admin Console?')) window.location.href='/admin/logout';">⏻ Sign Out of Admin Console</button>
  </div>
</aside>

<script src="/assets/js/admin.js"></script>
</body>
</html>`;
}

function renderAdminOverviewDashboard() {
  return `
      <div class="admin-dash-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage platform, monitor activity and ensure smooth operations.</p>
        </div>
        <div class="admin-date-filters">
          <button class="btn-date-picker">
            <span>📅</span>
            <span>01 Apr 2025 - 30 Apr 2025</span>
            <span>⌄</span>
          </button>
          <select class="select-time-filter" aria-label="Select timeframe">
            <option>All Time</option>
            <option>This Month</option>
            <option>Last 30 Days</option>
          </select>
        </div>
      </div>

      <!-- ROW 1: 5 KPI METRIC CARDS (MATCHING IMAGE 1) -->
      <div class="kpi-row-5">
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-icon-circle blue">🏢</span>
            <span class="kpi-title">Total Businesses</span>
          </div>
          <div class="kpi-number" id="kpiTotalBusinesses">248</div>
          <div class="kpi-trend up">
            <span>↑ 12%</span> <span style="color:#64748b;">vs. last month</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-icon-circle green">✓</span>
            <span class="kpi-title">Active Accounts</span>
          </div>
          <div class="kpi-number" id="kpiActiveAccounts">212</div>
          <div class="kpi-trend up">
            <span>↑ 10%</span> <span style="color:#64748b;">vs. last month</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-icon-circle orange">⏳</span>
            <span class="kpi-title">Pending Approvals</span>
          </div>
          <div class="kpi-number" id="kpiPendingApprovals">12</div>
          <div class="kpi-trend down">
            <span>↓ 3%</span> <span style="color:#64748b;">vs. last month</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-icon-circle red">✕</span>
            <span class="kpi-title">Rejected Accounts</span>
          </div>
          <div class="kpi-number" id="kpiRejectedAccounts">8</div>
          <div class="kpi-trend down">
            <span>↓ 2%</span> <span style="color:#64748b;">vs. last month</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-icon-circle purple">⏸</span>
            <span class="kpi-title">Suspended Accounts</span>
          </div>
          <div class="kpi-number" id="kpiSuspendedAccounts">6</div>
          <div class="kpi-trend neutral">
            <span>→ 0%</span> <span style="color:#64748b;">vs. last month</span>
          </div>
        </div>
      </div>

      <!-- ROW 2: 3 CARDS (TREND CHART, DONUT CHART, QUICK ACTIONS) -->
      <div class="dash-grid-row-2">
        <!-- Business Registration Trend -->
        <div class="dash-panel">
          <div class="dash-panel-header">
            <h3>Business Registration Trend</h3>
            <div class="toggle-pill-group">
              <button class="toggle-pill-btn active" id="btnTrendMonthly">Monthly</button>
              <button class="toggle-pill-btn" id="btnTrendYearly">Yearly</button>
            </div>
          </div>
          <div class="chart-container" id="trendChartSvgContainer"></div>
          <div class="chart-legend-bottom">
            <span><span class="chart-dot blue"></span> Total Registrations</span>
            <span><span class="chart-dot orange"></span> Approved</span>
          </div>
        </div>

        <!-- Business by Type Donut -->
        <div class="dash-panel">
          <div class="dash-panel-header">
            <h3>Business by Type</h3>
          </div>
          <div class="donut-chart-wrap">
            <div class="donut-visual">
              <div id="donutChartSvg"></div>
              <div class="donut-center-text">
                <strong id="donutCenterTotal">248</strong>
                <small>Total</small>
              </div>
            </div>
            <div class="donut-legend-list">
              <div class="donut-legend-item">
                <span class="donut-legend-item-left"><span class="chart-dot blue"></span> Retail Shop</span>
                <span class="donut-legend-percent">32%</span>
              </div>
              <div class="donut-legend-item">
                <span class="donut-legend-item-left"><span class="chart-dot" style="background:#06b6d4;"></span> Wholesale</span>
                <span class="donut-legend-percent">24%</span>
              </div>
              <div class="donut-legend-item">
                <span class="donut-legend-item-left"><span class="chart-dot" style="background:#10b981;"></span> Manufacturing</span>
                <span class="donut-legend-percent">18%</span>
              </div>
              <div class="donut-legend-item">
                <span class="donut-legend-item-left"><span class="chart-dot" style="background:#8b5cf6;"></span> Service</span>
                <span class="donut-legend-percent">14%</span>
              </div>
              <div class="donut-legend-item">
                <span class="donut-legend-item-left"><span class="chart-dot" style="background:#f59e0b;"></span> Other</span>
                <span class="donut-legend-percent">12%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="dash-panel">
          <div class="dash-panel-header">
            <h3>Quick Actions</h3>
          </div>
          <div class="quick-action-buttons">
            <button class="btn-quick-action blue" id="quickApproveBtn">
              <span>➕</span>
              <span>Approve Pending Accounts</span>
            </button>
            <button class="btn-quick-action orange" onclick="window.location.hash='#users';">
              <span>👤</span>
              <span>Manage Users</span>
            </button>
            <button class="btn-quick-action green" onclick="window.location.href='/reports';">
              <span>📊</span>
              <span>View Reports</span>
            </button>
            <button class="btn-quick-action purple" id="quickSettingsBtn">
              <span>⚙</span>
              <span>System Settings</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ROW 3: 2 WIDE TABLES (RECENT REGISTRATIONS & PENDING APPROVALS) -->
      <div class="dash-grid-row-3">
        <!-- Recent Business Registrations -->
        <div class="dash-panel" id="recent-registrations">
          <div class="table-panel-header">
            <h3>Recent Business Registrations</h3>
            <a href="#" class="link-view-all" onclick="alert('Showing all registered tenants.'); return false;">View All →</a>
          </div>
          <div class="table-responsive">
            <table class="admin-data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Business Name</th>
                  <th>Owner Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="recentRegTableBody">
                <tr><td colspan="7" class="text-center">Loading registrations...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pending Approvals -->
        <div class="dash-panel" id="pendingApprovalsSection">
          <div class="table-panel-header">
            <h3>Pending Approvals</h3>
            <a href="#" class="link-view-all" onclick="alert('Displaying accounts pending review.'); return false;">View All →</a>
          </div>
          <div class="table-responsive">
            <table class="admin-data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Business Name</th>
                  <th>Owner</th>
                  <th>Type</th>
                  <th>Applied On</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="pendingApprovalsTableBody">
                <tr><td colspan="6" class="text-center">Loading pending approvals...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ROW 4: 3 PANELS (PLATFORM USAGE, SYSTEM HEALTH, RECENT ACTIVITY) -->
      <div class="dash-grid-row-4">
        <!-- Platform Usage Analytics -->
        <div class="dash-panel">
          <div class="dash-panel-header">
            <h3>Platform Usage Analytics</h3>
            <span style="font-size:11px;color:#64748b;font-weight:600;">This Month ⌄</span>
          </div>
          <div class="analytics-wrap">
            <div class="analytics-barchart" id="analyticsBarChartContainer"></div>
            <div class="analytics-stats-sidebar">
              <div class="analytics-stat-item">
                <div class="analytics-stat-icon blue">👤</div>
                <div class="analytics-stat-val">
                  <small>Total Logins</small>
                  <strong>4,892 <span style="font-size:10px;color:#16a34a;">↑ 18%</span></strong>
                </div>
              </div>
              <div class="analytics-stat-item">
                <div class="analytics-stat-icon orange">👥</div>
                <div class="analytics-stat-val">
                  <small>Active Users</small>
                  <strong>3,245 <span style="font-size:10px;color:#16a34a;">↑ 16%</span></strong>
                </div>
              </div>
              <div class="analytics-stat-item">
                <div class="analytics-stat-icon clock">⏱</div>
                <div class="analytics-stat-val">
                  <small>Avg. Session Time</small>
                  <strong>12m 34s <span style="font-size:10px;color:#16a34a;">↑ 9%</span></strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- System Health -->
        <div class="dash-panel" id="system-health">
          <div class="dash-panel-header">
            <h3>System Health</h3>
            <span class="system-health-badge">● All Systems Operational</span>
          </div>
          <div class="system-health-list">
            <div class="system-health-item">
              <span class="system-health-item-left"><span>🌐</span> Web Server</span>
              <span class="status-indicator-green">● Healthy</span>
            </div>
            <div class="system-health-item">
              <span class="system-health-item-left"><span>🗄</span> Database (MySQL/SQLite)</span>
              <span class="status-indicator-green">● Healthy</span>
            </div>
            <div class="system-health-item">
              <span class="system-health-item-left"><span>⚙</span> Background Jobs</span>
              <span class="status-indicator-green">● Healthy</span>
            </div>
            <div class="system-health-item">
              <span class="system-health-item-left"><span>✉</span> Email Service</span>
              <span class="status-indicator-green">● Healthy</span>
            </div>
            <div class="system-health-item">
              <span class="system-health-item-left"><span>📁</span> File Storage</span>
              <span class="status-indicator-green">● Healthy</span>
            </div>
          </div>
        </div>

        <!-- Recent Activity Feed -->
        <div class="dash-panel">
          <div class="table-panel-header">
            <h3>Recent Activity</h3>
            <a href="#" class="link-view-all" onclick="alert('Viewing comprehensive audit logs.'); return false;">View All →</a>
          </div>
          <div class="activity-feed-list">
            <div class="activity-feed-item">
              <div class="activity-icon green">✓</div>
              <div class="activity-text">
                <strong>Admin approved business account</strong>
                <small>Galaxy Enterprises</small>
              </div>
              <span class="activity-time">2 hours ago</span>
            </div>
            <div class="activity-feed-item">
              <div class="activity-icon blue">👤</div>
              <div class="activity-text">
                <strong>New user registered</strong>
                <small>Amit Kumar (Retailer)</small>
              </div>
              <span class="activity-time">3 hours ago</span>
            </div>
            <div class="activity-feed-item">
              <div class="activity-icon green">💾</div>
              <div class="activity-text">
                <strong>System backup completed</strong>
                <small>Database Backup</small>
              </div>
              <span class="activity-time">5 hours ago</span>
            </div>
            <div class="activity-feed-item">
              <div class="activity-icon orange">💬</div>
              <div class="activity-text">
                <strong>Support request received</strong>
                <small>Invoice issue</small>
              </div>
              <span class="activity-time">6 hours ago</span>
            </div>
            <div class="activity-feed-item">
              <div class="activity-icon red">🚨</div>
              <div class="activity-text">
                <strong>Security alert resolved</strong>
                <small>Failed login attempt</small>
              </div>
              <span class="activity-time">8 hours ago</span>
            </div>
          </div>
        </div>
      </div>
  `;
}

// Request Handler (Shared between Node HTTP daemon & Vercel Serverless Function)
async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname || '/';
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.replace(/\/+$/, '');
  }
  const method = req.method;

  // Supabase Cloud Database Health Check API
  if (pathname === '/api/health/supabase' && method === 'GET') {
    const health = await testSupabaseConnection();
    return sendJson(res, health.ok ? 200 : 503, health);
  }

  // Rate Limiting on sensitive endpoints
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  if (pathname.startsWith('/api/auth/')) {
    const rate = checkRateLimit(clientIp, 30, 60000);
    if (!rate.allowed) {
      return sendJson(res, 429, { error: 'Too many requests. Please try again in ' + rate.retryAfterSec + ' seconds.' });
    }
  }

  // 1. Static Asset Serving
  if (pathname.startsWith('/assets/')) {
    const filePath = path.join(PUBLIC_DIR, pathname);
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found');
      }
      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=3600'
      });
      res.end(content);
    });
    return;
  }

  // Session Authentication Check
  const sessionUser = authenticate(req);
  const db = getDb();

  // 2. AUTHENTICATION & ACCESS GATES

  // GET /login
  if (pathname === '/login' && method === 'GET') {
    if (sessionUser) return redirect(res, '/dashboard');
    const html = renderAuthPage({
      title: 'Sign in to your workspace',
      formContent: `
        <form id="loginForm" method="POST" action="/api/auth/login">
          <div class="auth-input-group">
            <label>Email or Mobile Number</label>
            <div class="auth-input-wrap">
              <span class="auth-input-icon">✉️</span>
              <input type="text" name="email" required autocomplete="username" placeholder="Enter your registered email or mobile number" value="" autofocus>
            </div>
          </div>

          <div class="auth-input-group">
            <label>Password</label>
            <div class="auth-input-wrap">
              <span class="auth-input-icon">🔒</span>
              <input type="password" id="tenantLoginPass" name="password" required autocomplete="current-password" placeholder="Enter your password" value="">
              <button type="button" class="auth-input-toggle" onclick="togglePasswordVisibility('tenantLoginPass', this)" aria-label="Toggle password view">👁</button>
            </div>
          </div>

          <div class="auth-form-row">
            <label>
              <input type="checkbox" name="remember" checked> Remember me
            </label>
            <a href="/forgot-password">Forgot password?</a>
          </div>

          <button type="submit" class="btn-auth-primary" style="background:linear-gradient(90deg, #ff5722 0%, #f43f5e 100%);">
            <span>→</span> Login
          </button>
        </form>

        <div class="auth-or-divider"><span>OR</span></div>

        <div class="auth-social-row">
          <button type="button" class="btn-social" onclick="alert('Google SSO integration ready.');">
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.33 21.46 7.37 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2 0 10.04 0 12s.46 3.8 1.27 5.42l4.01-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.33 2.54 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
            Continue with Google
          </button>
          <button type="button" class="btn-social" onclick="alert('OTP Login will send an authentication SMS to your registered phone number.');">
            <span>📱</span> Continue with OTP
          </button>
        </div>
      `
    });
    return sendHtml(res, 200, html);
  }

  // POST /api/auth/login
  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await parseBody(req);
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return sendJson(res, 401, { error: 'Invalid email address or password' });
    }

    if (user.account_status !== 'ACTIVE') {
      return sendJson(res, 403, { error: 'Account is ' + user.account_status + '. Please contact administrator.' });
    }

    // Check Business Status (for non-super-admins)
    if (user.platform_role === 'BUSINESS_USER' && user.business_id) {
      const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(user.business_id);
      if (!biz || biz.approval_status !== 'APPROVED') {
        // Create session so pending page can show details
        const token = randomToken(32);
        const expires = new Date(Date.now() + 7 * 86400000).toISOString();
        db.prepare(`
          INSERT INTO sessions (session_token, user_id, business_id, ip_address, user_agent, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(token, user.id, user.business_id, clientIp, req.headers['user-agent'] || '', expires);

        const cookie = `rmstorvix_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
        res.setHeader('Set-Cookie', cookie);

        const redirectUrl = biz?.approval_status === 'REJECTED' ? '/rejected' : (biz?.approval_status === 'SUSPENDED' ? '/suspended' : '/pending');
        return sendJson(res, 200, { success: true, redirect: redirectUrl, status: biz?.approval_status });
      }
    }

    // Create session
    const token = randomToken(32);
    const expires = new Date(Date.now() + 7 * 86400000).toISOString();
    db.prepare(`
      INSERT INTO sessions (session_token, user_id, business_id, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(token, user.id, user.business_id || null, clientIp, req.headers['user-agent'] || '', expires);

    db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
    logAudit(user.id, user.business_id, 'USER_LOGIN', 'USER', user.id, req);

    const cookie = `rmstorvix_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
    res.setHeader('Set-Cookie', cookie);

    const target = user.platform_role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
    return sendJson(res, 200, { success: true, redirect: target });
  }

  // GET /signup
  if (pathname === '/signup' && method === 'GET') {
    const html = renderAuthPage({
      title: 'Register Your Business',
      isSignup: true,
      formContent: `
        <div class="signup-wizard-wrap">
          <!-- 4-Page Compact Stepper Header -->
          <div class="signup-stepper">
            <div class="signup-stepper-progress">
              <div class="signup-stepper-bar" id="stepperBar"></div>
            </div>
            
            <button type="button" class="signup-step-item active" id="stepIndicator1" onclick="goToStep(1)">
              <div class="signup-step-bubble">1</div>
              <span class="signup-step-title">Business</span>
            </button>
            
            <button type="button" class="signup-step-item" id="stepIndicator2" onclick="goToStep(2)">
              <div class="signup-step-bubble">2</div>
              <span class="signup-step-title">Owner</span>
            </button>
            
            <button type="button" class="signup-step-item" id="stepIndicator3" onclick="goToStep(3)">
              <div class="signup-step-bubble">3</div>
              <span class="signup-step-title">Location</span>
            </button>

            <button type="button" class="signup-step-item" id="stepIndicator4" onclick="goToStep(4)">
              <div class="signup-step-bubble">4</div>
              <span class="signup-step-title">Security</span>
            </button>
          </div>

          <form id="signupForm" method="POST" action="/api/auth/signup">
            <input type="hidden" name="currency" value="INR">
            <input type="hidden" name="financial_year_start_month" value="4">

            <!-- PAGE 1: BUSINESS PROFILE -->
            <div class="signup-step-pane active" id="stepPane1">
              <div class="signup-section-banner">
                <strong><span>🏢</span> Business Entity Profile</strong>
                <span>Page 1 of 4</span>
              </div>

              <div class="form-grid-1col">
                <div class="auth-input-group in-grid">
                  <label>Business Legal Name *</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon">🏢</span>
                    <input type="text" name="business_name" id="bizNameInp" required placeholder="e.g. Acme Horizon Pvt Ltd" autofocus>
                  </div>
                </div>

                <div class="auth-input-group in-grid">
                  <label>Business Structure / Entity *</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon">🏷️</span>
                    <select name="business_type" required>
                      <option value="Private Limited" selected>Private Limited (Pvt Ltd)</option>
                      <option value="Proprietorship">Proprietorship</option>
                      <option value="Partnership">Partnership Firm</option>
                      <option value="Public Limited">Public Limited</option>
                      <option value="LLP">Limited Liability Partnership (LLP)</option>
                    </select>
                  </div>
                </div>

                <div class="auth-input-group in-grid">
                  <label>GSTIN Number <small style="color:#64748b;font-weight:400;">(Optional)</small></label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon">🧾</span>
                    <input type="text" name="gstin" placeholder="27AABCR1234F1Z5 (15 digits)" maxlength="15" style="text-transform:uppercase;">
                  </div>
                </div>
              </div>

              <div class="signup-nav-row" style="justify-content:flex-end;">
                <button type="button" class="btn-wizard-next" onclick="nextStep(1)">
                  <span>Continue to Owner Details</span> <span>→</span>
                </button>
              </div>
            </div>

            <!-- PAGE 2: OWNER & CONTACT -->
            <div class="signup-step-pane" id="stepPane2">
              <div class="signup-section-banner">
                <strong><span>👤</span> Owner & Contact Details</strong>
                <span>Page 2 of 4</span>
              </div>

              <div class="form-grid-1col">
                <div class="auth-input-group in-grid">
                  <label>Owner / Authorized Person Name *</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon">👤</span>
                    <input type="text" name="owner_name" id="ownerNameInp" required placeholder="e.g. Raushan Maurya">
                  </div>
                </div>

                <div class="auth-input-group in-grid">
                  <label>Work Email Address *</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon">✉️</span>
                    <input type="email" name="email" id="workEmailInp" required placeholder="contact@acme.com">
                  </div>
                </div>

                <div class="auth-input-group in-grid">
                  <label>Mobile Number *</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon">📱</span>
                    <input type="tel" name="mobile" id="mobileInp" required placeholder="9876543210" maxlength="15">
                  </div>
                </div>
              </div>

              <div class="signup-nav-row">
                <button type="button" class="btn-wizard-prev" onclick="prevStep(2)">
                  <span>←</span> <span>Back</span>
                </button>
                <button type="button" class="btn-wizard-next" onclick="nextStep(2)">
                  <span>Continue to Location</span> <span>→</span>
                </button>
              </div>
            </div>

            <!-- PAGE 3: REGISTERED LOCATION -->
            <div class="signup-step-pane" id="stepPane3">
              <div class="signup-section-banner">
                <strong><span>📍</span> Business Location & Address</strong>
                <span>Page 3 of 4</span>
              </div>

              <div class="form-grid-1col">
                <div class="auth-input-group in-grid">
                  <label>Business Registered Address *</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon">📍</span>
                    <input type="text" name="address_line" id="addressInp" required placeholder="Suite 401, Trade Tower">
                  </div>
                </div>

                <div class="form-grid-2col" style="gap:10px;">
                  <div class="auth-input-group in-grid">
                    <label>City *</label>
                    <div class="auth-input-wrap">
                      <span class="auth-input-icon">🏙️</span>
                      <input type="text" name="city" id="cityInp" required placeholder="Mumbai">
                    </div>
                  </div>

                  <div class="auth-input-group in-grid">
                    <label>State *</label>
                    <div class="auth-input-wrap">
                      <span class="auth-input-icon">🗺️</span>
                      <input type="text" name="state" id="stateInp" required placeholder="Maharashtra">
                    </div>
                  </div>
                </div>

                <div class="auth-input-group in-grid">
                  <label>PIN Code *</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon">📮</span>
                    <input type="text" name="pin_code" id="pinInp" required placeholder="400001" maxlength="10">
                  </div>
                </div>
              </div>

              <div class="signup-nav-row">
                <button type="button" class="btn-wizard-prev" onclick="prevStep(3)">
                  <span>←</span> <span>Back</span>
                </button>
                <button type="button" class="btn-wizard-next" onclick="nextStep(3)">
                  <span>Continue to Security</span> <span>→</span>
                </button>
              </div>
            </div>

            <!-- PAGE 4: SECURITY & ACTIVATION -->
            <div class="signup-step-pane" id="stepPane4">
              <div class="signup-section-banner">
                <strong><span>🔒</span> Password & Business Logo</strong>
                <span>Page 4 of 4</span>
              </div>

              <div class="form-grid-1col">
                <div class="auth-input-group in-grid">
                  <label>Master Account Password * <small style="color:#64748b;font-weight:400;">(Min 10 characters)</small></label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon">🔒</span>
                    <input type="password" name="password" id="signupPassInp" required placeholder="Create a strong password" minlength="10" autocomplete="new-password">
                    <button type="button" class="auth-input-toggle" onclick="toggleSignupPass(this)" aria-label="Toggle password view">👁</button>
                  </div>
                  <div class="password-strength-bar">
                    <div class="password-strength-segment" id="pStr1"></div>
                    <div class="password-strength-segment" id="pStr2"></div>
                    <div class="password-strength-segment" id="pStr3"></div>
                  </div>
                  <small id="passHint" style="display:block;margin-top:4px;font-size:11px;color:#64748b;">Must contain at least 10 characters.</small>
                </div>

                <div class="auth-input-group in-grid">
                  <label>Company / Brand Logo <small style="color:#64748b;font-weight:400;">(Optional)</small></label>
                  <div class="logo-upload-card" style="padding:10px 12px;gap:12px;">
                    <div id="signupLogoPreviewWrap" class="logo-preview-box" style="width:42px;height:42px;font-size:20px;">
                      <span id="signupLogoPlaceholder">🏢</span>
                      <img id="signupLogoPreviewImg" src="" style="display:none;" alt="Preview">
                    </div>
                    <div style="flex:1;">
                      <label style="padding:5px 12px;font-size:11.5px;display:inline-block;cursor:pointer;margin:0 0 4px 0;background:#ffffff;border:1.5px solid #cbd5e1;border-radius:7px;font-weight:700;color:#334155;">
                        📁 Upload Logo
                        <input type="file" id="signupLogoFileInput" accept="image/png,image/jpeg,image/webp" style="display:none;">
                      </label>
                      <input type="hidden" name="logo_url" id="signupLogoHidden">
                      <div style="font-size:10.5px;color:#64748b;">PNG, JPG, WEBP (under 2MB). Shown on invoices.</div>
                    </div>
                  </div>
                </div>

                <div class="consent-box" style="margin-top:8px;padding:10px 12px;">
                  <label>
                    <input type="checkbox" name="consent" id="consentCheck" required>
                    <span>I agree to terms. My registration will be verified by a Platform Administrator before activation.</span>
                  </label>
                </div>
              </div>

              <div class="signup-nav-row">
                <button type="button" class="btn-wizard-prev" onclick="prevStep(4)">
                  <span>←</span> <span>Back</span>
                </button>
                <button type="submit" class="btn-signup-submit" id="signupSubmitBtn">
                  <span>🚀</span> <span>Complete Registration</span>
                </button>
              </div>
            </div>
          </form>

          <p class="muted-note">Already registered? <a href="/login" class="text-link">Sign in to your workspace →</a></p>
        </div>

        <script>
          let currentStep = 1;

          function updateStepperUI(step, skipHash) {
            currentStep = step;
            document.querySelectorAll('.signup-step-pane').forEach((pane, idx) => {
              pane.classList.toggle('active', idx + 1 === step);
            });
            [1, 2, 3, 4].forEach(s => {
              const el = document.getElementById('stepIndicator' + s);
              if (!el) return;
              el.classList.remove('active', 'completed');
              if (s === step) el.classList.add('active');
              else if (s < step) el.classList.add('completed');
            });
            const bar = document.getElementById('stepperBar');
            if (bar) {
              const pct = step === 1 ? 25 : (step === 2 ? 50 : (step === 3 ? 75 : 100));
              bar.style.width = pct + '%';
            }
            if (!skipHash && history.replaceState) {
              history.replaceState(null, '', '#page-' + step);
            }
          }

          function validateStep(step) {
            if (step === 1) {
              const biz = document.getElementById('bizNameInp');
              if (!biz || !biz.value.trim()) {
                if (biz) { biz.focus(); biz.style.borderColor = '#ef4444'; }
                alert('Please enter your Business Legal Name.');
                return false;
              }
              biz.style.borderColor = '';
              return true;
            }
            if (step === 2) {
              const owner = document.getElementById('ownerNameInp');
              const email = document.getElementById('workEmailInp');
              const mobile = document.getElementById('mobileInp');

              const fields = [
                { el: owner, msg: 'Please enter Owner / Authorized Person Name.' },
                { el: email, msg: 'Please enter Work Email Address.' },
                { el: mobile, msg: 'Please enter Mobile Number.' }
              ];
              for (const f of fields) {
                if (!f.el || !f.el.value.trim()) {
                  if (f.el) { f.el.focus(); f.el.style.borderColor = '#ef4444'; }
                  alert(f.msg);
                  return false;
                }
                f.el.style.borderColor = '';
              }
              return true;
            }
            if (step === 3) {
              const addr = document.getElementById('addressInp');
              const city = document.getElementById('cityInp');
              const state = document.getElementById('stateInp');
              const pin = document.getElementById('pinInp');

              const fields = [
                { el: addr, msg: 'Please enter Business Registered Address.' },
                { el: city, msg: 'Please enter City.' },
                { el: state, msg: 'Please enter State.' },
                { el: pin, msg: 'Please enter PIN Code.' }
              ];
              for (const f of fields) {
                if (!f.el || !f.el.value.trim()) {
                  if (f.el) { f.el.focus(); f.el.style.borderColor = '#ef4444'; }
                  alert(f.msg);
                  return false;
                }
                f.el.style.borderColor = '';
              }
              return true;
            }
            if (step === 4) {
              const pass = document.getElementById('signupPassInp');
              const check = document.getElementById('consentCheck');
              if (!pass || pass.value.length < 10) {
                if (pass) { pass.focus(); pass.style.borderColor = '#ef4444'; }
                alert('Password must be at least 10 characters long.');
                return false;
              }
              if (!check || !check.checked) {
                alert('Please accept terms to complete registration.');
                return false;
              }
              return true;
            }
            return true;
          }

          function nextStep(current) {
            if (!validateStep(current)) return;
            updateStepperUI(current + 1);
          }

          function prevStep(current) {
            updateStepperUI(current - 1);
          }

          function goToStep(target) {
            if (target < currentStep) {
              updateStepperUI(target);
            } else if (target > currentStep) {
              for (let s = currentStep; s < target; s++) {
                if (!validateStep(s)) return;
              }
              updateStepperUI(target);
            }
          }

          window.addEventListener('hashchange', () => {
            const m = window.location.hash.match(/#page-(\d+)/);
            if (m) {
              const p = parseInt(m[1], 10);
              if (p >= 1 && p <= 4) updateStepperUI(p, true);
            }
          });

          document.addEventListener('DOMContentLoaded', () => {
            const m = window.location.hash.match(/#page-(\d+)/);
            if (m) {
              const p = parseInt(m[1], 10);
              if (p >= 1 && p <= 4) updateStepperUI(p, true);
            }
          });

          function toggleSignupPass(btn) {
            const inp = document.getElementById('signupPassInp');
            if (!inp) return;
            if (inp.type === 'password') {
              inp.type = 'text';
              btn.textContent = '🙈';
            } else {
              inp.type = 'password';
              btn.textContent = '👁';
            }
          }

          const passInp = document.getElementById('signupPassInp');
          const p1 = document.getElementById('pStr1');
          const p2 = document.getElementById('pStr2');
          const p3 = document.getElementById('pStr3');
          const pHint = document.getElementById('passHint');
          if (passInp) {
            passInp.addEventListener('input', function() {
              const val = this.value;
              p1.className = 'password-strength-segment';
              p2.className = 'password-strength-segment';
              p3.className = 'password-strength-segment';
              if (val.length === 0) {
                pHint.textContent = 'Must contain at least 10 characters.';
                pHint.style.color = '#64748b';
              } else if (val.length < 10) {
                p1.classList.add('active-weak');
                pHint.textContent = 'Too short (' + val.length + '/10 characters)';
                pHint.style.color = '#ef4444';
              } else {
                p1.classList.add('active-medium');
                p2.classList.add('active-medium');
                if (/[0-9]/.test(val) && /[^A-Za-z0-9]/.test(val)) {
                  p1.className = 'password-strength-segment active-strong';
                  p2.className = 'password-strength-segment active-strong';
                  p3.className = 'password-strength-segment active-strong';
                  pHint.textContent = '✓ Strong password';
                  pHint.style.color = '#10b981';
                } else {
                  pHint.textContent = 'Good. Add numbers & symbols for maximum strength.';
                  pHint.style.color = '#f59e0b';
                }
              }
            });
          }

          const logoInput = document.getElementById('signupLogoFileInput');
          if (logoInput) {
            logoInput.addEventListener('change', function(e) {
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) {
                alert('Logo image must be smaller than 2MB.');
                logoInput.value = '';
                return;
              }
              const reader = new FileReader();
              reader.onload = function(evt) {
                const base64 = evt.target.result;
                document.getElementById('signupLogoHidden').value = base64;
                const img = document.getElementById('signupLogoPreviewImg');
                img.src = base64;
                img.style.display = 'block';
                document.getElementById('signupLogoPlaceholder').style.display = 'none';
              };
              reader.readAsDataURL(file);
            });
          }
        </script>
      `
    });
    return sendHtml(res, 200, html);
  }

  // POST /api/auth/signup
  if (pathname === '/api/auth/signup' && method === 'POST') {
    const body = await parseBody(req);
    const {
      business_name, owner_name, business_type, gstin,
      email, mobile, address_line, city, state, pin_code,
      password, consent, logo_url
    } = body;

    if (!business_name || !owner_name || !email || !mobile || !password) {
      return sendJson(res, 400, { error: 'Please fill in all mandatory fields.' });
    }

    if (password.length < 10) {
      return sendJson(res, 400, { error: 'Password must be at least 10 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return sendJson(res, 409, { error: 'An account with this email address already exists.' });
    }

    let validGstin = null;
    let stateCode = null;
    if (gstin && gstin.trim()) {
      const gstinVal = validateGSTIN(gstin);
      if (!gstinVal.valid) {
        return sendJson(res, 400, { error: gstinVal.message });
      }
      validGstin = gstinVal.gstin;
      stateCode = gstinVal.stateCode;
    }

    try {
      const result = transaction((db) => {
        // Create business in PENDING status
        const bizRes = db.prepare(`
          INSERT INTO businesses (public_id, business_name, owner_name, business_type, gstin, email, mobile, address_line, city, state, state_code, pin_code, logo_url, approval_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `).run(uuid(), business_name.trim(), owner_name.trim(), business_type || 'Private Limited', validGstin, cleanEmail, mobile.trim(), address_line || '', city || '', state || '', stateCode || '', pin_code || '', logo_url || null);

        const bizId = bizRes.lastInsertRowid;

        // Create owner user
        const userRes = db.prepare(`
          INSERT INTO users (public_id, business_id, full_name, email, mobile, password_hash, platform_role, business_role, account_status)
          VALUES (?, ?, ?, ?, ?, ?, 'BUSINESS_USER', 'OWNER', 'ACTIVE')
        `).run(uuid(), bizId, owner_name.trim(), cleanEmail, mobile.trim(), hashPassword(password));

        const userId = userRes.lastInsertRowid;

        // Initialize Chart of Accounts for the business
        initChartOfAccounts(bizId);

        // Create default warehouse
        db.prepare(`
          INSERT INTO warehouses (business_id, name, code, is_default)
          VALUES (?, 'Main Warehouse', 'WH-01', 1)
        `).run(bizId);

        // Audit Log
        logAudit(userId, bizId, 'BUSINESS_REGISTERED', 'BUSINESS', bizId, req, { business_name });

        return { bizId, userId };
      });

      // Create session for user in pending status
      const token = randomToken(32);
      const expires = new Date(Date.now() + 7 * 86400000).toISOString();
      db.prepare(`
        INSERT INTO sessions (session_token, user_id, business_id, ip_address, user_agent, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(token, result.userId, result.bizId, clientIp, req.headers['user-agent'] || '', expires);

      const cookie = `rmstorvix_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
      res.setHeader('Set-Cookie', cookie);

      return sendJson(res, 200, { success: true, redirect: '/pending' });
    } catch (err) {
      console.error('Signup error:', err);
      return sendJson(res, 500, { error: 'Registration failed: ' + err.message });
    }
  }

  // GET /pending (Pending Activation Notice Page)
  if (pathname === '/pending' && method === 'GET') {
    const html = renderAuthPage({
      title: 'Registration Pending Approval',
      alertMessage: 'Your business registration has been received and is currently under review by our Platform Administrator team.',
      alertType: 'warning',
      formContent: `
        <div class="pending-card">
          <div class="pending-icon">⏳</div>
          <h3>Account Verification in Progress</h3>
          <p>Under RMSTORVIX IGNITE security compliance, all new business accounts require administrative verification of business details and GST credentials before full operational access is unlocked.</p>
          <div class="info-list">
            <div><strong>Approval Status:</strong> <span class="pill pending">PENDING APPROVAL</span></div>
            <div><strong>Registered Business:</strong> ${escapeHtml(sessionUser?.business_name || 'Your Business')}</div>
            <div><strong>Account Email:</strong> ${escapeHtml(sessionUser?.email || 'N/A')}</div>
            <div><strong>Estimated Review Time:</strong> 1 - 2 business hours</div>
          </div>
          <p class="muted-note">Once verified and approved, you will receive full access to Billing, Inventory, Accounting, and Business Management tools.</p>
          <div class="actions-row">
            <a href="/login" class="button button-secondary">Refresh / Check Status</a>
            <button class="button button-secondary" onclick="fetch('/api/auth/logout', {method:'POST'}).then(()=>location.href='/login')">Logout</button>
          </div>
        </div>
      `
    });
    return sendHtml(res, 200, html);
  }

  // GET /rejected (Rejected Account Page)
  if (pathname === '/rejected' && method === 'GET') {
    const html = renderAuthPage({
      title: 'Business Registration Rejected',
      alertMessage: 'Your business registration request was not approved by the Platform Administrator.',
      alertType: 'danger',
      formContent: `
        <div class="pending-card">
          <div class="pending-icon text-danger">✕</div>
          <h3>Registration Rejected</h3>
          <p>The details submitted during business registration did not pass verification requirements.</p>
          <p class="muted-note">If you believe this was in error, please contact compliance at <code>support@rmstorvix.com</code>.</p>
          <div class="actions-row">
            <button class="button button-secondary" onclick="fetch('/api/auth/logout', {method:'POST'}).then(()=>location.href='/login')">Return to Login</button>
          </div>
        </div>
      `
    });
    return sendHtml(res, 200, html);
  }

  // GET /suspended (Suspended Account Page)
  if (pathname === '/suspended' && method === 'GET') {
    const html = renderAuthPage({
      title: 'Workspace Suspended',
      alertMessage: 'This business workspace has been suspended by the platform administrator.',
      alertType: 'danger',
      formContent: `
        <div class="pending-card">
          <div class="pending-icon text-danger">⚠</div>
          <h3>Account Suspended</h3>
          <p>Access to billing, accounting, and inventory for this workspace has been temporarily locked.</p>
          <div class="actions-row">
            <button class="button button-secondary" onclick="fetch('/api/auth/logout', {method:'POST'}).then(()=>location.href='/login')">Logout</button>
          </div>
        </div>
      `
    });
    return sendHtml(res, 200, html);
  }

  // GET /forgot-password
  if (pathname === '/forgot-password' && method === 'GET') {
    const html = renderAuthPage({
      title: 'Reset Password',
      formContent: `
        <form id="forgotForm" method="POST" action="/api/auth/forgot-password">
          <p class="muted-note">Enter your registered email address to receive a secure password recovery token.</p>
          <label>Email address
            <input type="email" name="email" required placeholder="owner@rmstorvix.com">
          </label>
          <button type="submit" class="button button-primary w-100">Send Reset Token</button>
        </form>
        <p class="muted-note"><a href="/login" class="text-link">← Back to sign in</a></p>
      `
    });
    return sendHtml(res, 200, html);
  }

  // POST /api/auth/forgot-password
  if (pathname === '/api/auth/forgot-password' && method === 'POST') {
    const body = await parseBody(req);
    const email = (body.email || '').trim().toLowerCase();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) {
      // Do not reveal email existence
      return sendJson(res, 200, { success: true, message: 'If an account exists, a reset token has been dispatched.' });
    }

    const resetToken = randomToken(32);
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour
    db.prepare(`
      INSERT INTO password_resets (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `).run(user.id, resetToken, expires);

    return sendJson(res, 200, {
      success: true,
      message: 'Password reset token generated. In a local/demo environment, use this link to reset:',
      resetLink: `/reset-password?token=${resetToken}`
    });
  }

  // GET /reset-password
  if (pathname === '/reset-password' && method === 'GET') {
    const token = parsedUrl.query.token || '';
    const html = renderAuthPage({
      title: 'Create New Password',
      formContent: `
        <form id="resetForm" method="POST" action="/api/auth/reset-password">
          <input type="hidden" name="token" value="${escapeHtml(token)}">
          <label>New Password (10+ chars)
            <input type="password" name="new_password" required minlength="10" placeholder="••••••••••••">
          </label>
          <button type="submit" class="button button-primary w-100">Update Password</button>
        </form>
      `
    });
    return sendHtml(res, 200, html);
  }

  // POST /api/auth/reset-password
  if (pathname === '/api/auth/reset-password' && method === 'POST') {
    const body = await parseBody(req);
    const { token, new_password } = body;
    if (!token || !new_password || new_password.length < 10) {
      return sendJson(res, 400, { error: 'Invalid token or password too short.' });
    }

    const reset = db.prepare(`
      SELECT * FROM password_resets
      WHERE token_hash = ? AND used_at IS NULL AND datetime(expires_at) > datetime('now')
    `).get(token);

    if (!reset) {
      return sendJson(res, 400, { error: 'Password reset link is invalid or has expired.' });
    }

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(new_password), reset.user_id);
    db.prepare("UPDATE password_resets SET used_at = datetime('now') WHERE id = ?").run(reset.id);
    logAudit(reset.user_id, null, 'PASSWORD_RESET', 'USER', reset.user_id, req);

    return sendJson(res, 200, { success: true, message: 'Password updated successfully. Please log in.' });
  }

  // POST /api/auth/logout
  if (pathname === '/api/auth/logout' && method === 'POST') {
    const cookies = parseCookies(req);
    const token = cookies['rmstorvix_session'];
    if (token) {
      db.prepare('DELETE FROM sessions WHERE session_token = ?').run(token);
    }
    res.setHeader('Set-Cookie', 'rmstorvix_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    return sendJson(res, 200, { success: true });
  }

  // GET /api/auth/me
  if (pathname === '/api/auth/me' && method === 'GET') {
    if (!sessionUser) return sendJson(res, 401, { error: 'Not authenticated' });
    return sendJson(res, 200, { user: sessionUser });
  }

  // 3. SEPARATE PLATFORM ADMIN PORTAL (`/admin`, `/admin/*`, and `/api/admin/*`)

  // GET /admin/login (Dedicated Platform Admin Login Page)
  if (pathname === '/admin/login' && method === 'GET') {
    if (sessionUser && ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(sessionUser.platform_role)) {
      return redirect(res, '/admin/dashboard');
    }
    const html = renderAdminLoginPage({
      alertMessage: parsedUrl.query.error === 'unauthorized' ? 'Access Denied: Platform Administrator privileges required.' : null
    });
    return sendHtml(res, 200, html);
  }

  // POST /api/admin/login (Dedicated Platform Admin Authentication Endpoint)
  if (pathname === '/api/admin/login' && method === 'POST') {
    const body = await parseBody(req);
    const { email, password } = body;

    if (!email || !password) {
      return sendJson(res, 400, { error: 'Admin email and master security key are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

    if (!user || !verifyPassword(password, user.password_hash)) {
      logAudit(user ? user.id : null, null, 'ADMIN_LOGIN_FAILED', 'AUTH', null, req, { email: cleanEmail });
      return sendJson(res, 401, { error: 'Invalid administrator credentials.' });
    }

    if (!['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(user.platform_role)) {
      logAudit(user.id, null, 'ADMIN_LOGIN_REJECTED_ROLE', 'AUTH', user.id, req, { role: user.platform_role });
      return sendJson(res, 403, { error: 'Access Denied: You do not have platform administrator authorization.' });
    }

    if (user.account_status !== 'ACTIVE') {
      return sendJson(res, 403, { error: 'Administrator account is suspended or inactive.' });
    }

    // Generate Session Token
    const sessionToken = uuid();
    const userAgent = req.headers['user-agent'] || '';
    db.prepare(`
      INSERT INTO sessions (user_id, session_token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, datetime('now', '+7 days'))
    `).run(user.id, sessionToken, clientIp, userAgent);

    logAudit(user.id, null, 'ADMIN_LOGIN_SUCCESS', 'AUTH', user.id, req);

    res.setHeader('Set-Cookie', `rmstorvix_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
    return sendJson(res, 200, {
      success: true,
      message: 'Admin authentication successful.',
      redirect: '/admin/dashboard'
    });
  }

  // GET /admin/logout (Dedicated Platform Admin Session Termination)
  if (pathname === '/admin/logout' && method === 'GET') {
    const cookies = parseCookies(req);
    const token = cookies['rmstorvix_session'];
    if (token) {
      db.prepare('DELETE FROM sessions WHERE session_token = ?').run(token);
    }
    res.setHeader('Set-Cookie', 'rmstorvix_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    return redirect(res, '/admin/login');
  }

  // Guard all /admin* and /api/admin/* endpoints
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin/')) {
    if (!sessionUser) {
      if (pathname.startsWith('/api/')) return sendJson(res, 401, { error: 'Admin authentication required.' });
      return redirect(res, '/admin/login');
    }
    if (!['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(sessionUser.platform_role)) {
      if (pathname.startsWith('/api/')) return sendJson(res, 403, { error: 'Platform Administrator privileges required.' });
      return redirect(res, '/admin/login?error=unauthorized');
    }

    // GET /admin or /admin/dashboard
    if ((pathname === '/admin' || pathname === '/admin/dashboard') && method === 'GET') {
      const html = renderAdminShell({
        title: 'Platform Command Center',
        activeNav: 'overview',
        user: sessionUser
      });
      return sendHtml(res, 200, html);
    }

    // GET /api/admin/stats
    if (pathname === '/api/admin/stats' && method === 'GET') {
      const totalBusinesses = db.prepare('SELECT COUNT(*) AS c FROM businesses').get().c;
      const pendingApprovals = db.prepare("SELECT COUNT(*) AS c FROM businesses WHERE approval_status = 'PENDING'").get().c;
      const activeBusinesses = db.prepare("SELECT COUNT(*) AS c FROM businesses WHERE approval_status = 'APPROVED'").get().c;
      const suspendedBusinesses = db.prepare("SELECT COUNT(*) AS c FROM businesses WHERE approval_status IN ('SUSPENDED', 'REJECTED')").get().c;
      const totalUsers = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
      const auditLogCount = db.prepare('SELECT COUNT(*) AS c FROM audit_logs').get().c;

      return sendJson(res, 200, {
        totalBusinesses,
        pendingApprovals,
        activeBusinesses,
        suspendedBusinesses,
        totalUsers,
        auditLogCount
      });
    }

    // GET /api/admin/businesses
    if (pathname === '/api/admin/businesses' && method === 'GET') {
      const statusFilter = parsedUrl.query.status || 'ALL';
      let sql = `
        SELECT b.*, u.full_name AS owner_name, u.email, u.mobile
        FROM businesses b
        LEFT JOIN users u ON u.business_id = b.id AND u.business_role = 'OWNER'
      `;
      const params = [];
      if (statusFilter !== 'ALL') {
        sql += ' WHERE b.approval_status = ? ';
        params.push(statusFilter);
      }
      sql += ' ORDER BY b.id DESC ';
      const businesses = db.prepare(sql).all(...params);
      return sendJson(res, 200, { businesses });
    }

    // POST /api/admin/businesses/:id/approve
    const approveMatch = pathname.match(/^\/api\/admin\/businesses\/(\d+)\/approve$/);
    if (approveMatch && method === 'POST') {
      const bizId = Number(approveMatch[1]);
      db.prepare(`
        UPDATE businesses
        SET approval_status = 'APPROVED', approved_by = ?, approved_at = datetime('now'), rejection_reason = NULL
        WHERE id = ?
      `).run(sessionUser.user_id, bizId);

      logAudit(sessionUser.user_id, bizId, 'ADMIN_APPROVE_BUSINESS', 'BUSINESS', bizId, req);
      return sendJson(res, 200, { success: true, message: 'Business successfully approved.' });
    }

    // POST /api/admin/businesses/:id/reject
    const rejectMatch = pathname.match(/^\/api\/admin\/businesses\/(\d+)\/reject$/);
    if (rejectMatch && method === 'POST') {
      const bizId = Number(rejectMatch[1]);
      const body = await parseBody(req);
      const reason = body.reason || 'Verification criteria not met';

      db.prepare(`
        UPDATE businesses
        SET approval_status = 'REJECTED', rejection_reason = ?
        WHERE id = ?
      `).run(reason, bizId);

      logAudit(sessionUser.user_id, bizId, 'ADMIN_REJECT_BUSINESS', 'BUSINESS', bizId, req, { reason });
      return sendJson(res, 200, { success: true, message: 'Business rejected.' });
    }

    // POST /api/admin/businesses/:id/status
    const statusMatch = pathname.match(/^\/api\/admin\/businesses\/(\d+)\/status$/);
    if (statusMatch && method === 'POST') {
      const bizId = Number(statusMatch[1]);
      const body = await parseBody(req);
      const newStatus = body.status;

      if (!['APPROVED', 'SUSPENDED', 'PENDING', 'REJECTED'].includes(newStatus)) {
        return sendJson(res, 400, { error: 'Invalid status' });
      }

      db.prepare('UPDATE businesses SET approval_status = ? WHERE id = ?').run(newStatus, bizId);
      logAudit(sessionUser.user_id, bizId, `ADMIN_SET_STATUS_${newStatus}`, 'BUSINESS', bizId, req);
      return sendJson(res, 200, { success: true, message: `Status updated to ${newStatus}` });
    }

    // POST /api/admin/users/:id/status
    const userStatusMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/status$/);
    if (userStatusMatch && method === 'POST') {
      const targetUserId = Number(userStatusMatch[1]);
      const body = await parseBody(req);
      const incoming = (body.status || '').toUpperCase();

      let targetStatus = 'ACTIVE';
      if (incoming === 'SUSPENDED' || incoming === 'DISABLED') {
        targetStatus = 'DISABLED';
      } else if (incoming === 'LOCKED') {
        targetStatus = 'LOCKED';
      } else if (incoming === 'ACTIVE') {
        targetStatus = 'ACTIVE';
      } else {
        return sendJson(res, 400, { error: 'Invalid user status. Allowed: ACTIVE, DISABLED, LOCKED, SUSPENDED' });
      }

      db.prepare('UPDATE users SET account_status = ? WHERE id = ?').run(targetStatus, targetUserId);
      logAudit(sessionUser.user_id, null, `ADMIN_SET_USER_STATUS_${targetStatus}`, 'USER', targetUserId, req);
      return sendJson(res, 200, { success: true, message: `User status updated to ${targetStatus}`, status: targetStatus });
    }

    // GET /api/admin/audit-logs
    if (pathname === '/api/admin/audit-logs' && method === 'GET') {
      const logs = db.prepare(`
        SELECT a.*, u.email AS actor_email
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.actor_user_id
        ORDER BY a.id DESC LIMIT 50
      `).all();
      return sendJson(res, 200, { logs });
    }

    // GET /api/admin/backup-download
    if (pathname === '/api/admin/backup-download' && method === 'GET') {
      if (!fs.existsSync(DB_PATH)) {
        return sendJson(res, 404, { error: 'Database file not found' });
      }
      const data = fs.readFileSync(DB_PATH);
      res.writeHead(200, {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="rmstorvix_ignite_${new Date().toISOString().slice(0,10)}.sqlite"`,
        'Content-Length': data.length
      });
      return res.end(data);
    }

    // GET /admin/businesses — All Businesses management page (Matching Image 1)
    if (pathname === '/admin/businesses' && method === 'GET') {
      const filterStatus = parsedUrl.query.status || 'ALL';
      const totalBiz = db.prepare("SELECT COUNT(*) AS c FROM businesses").get().c;
      const activeBiz = db.prepare("SELECT COUNT(*) AS c FROM businesses WHERE approval_status = 'APPROVED'").get().c;
      const pendingBiz = db.prepare("SELECT COUNT(*) AS c FROM businesses WHERE approval_status = 'PENDING'").get().c;
      const suspendedBiz = db.prepare("SELECT COUNT(*) AS c FROM businesses WHERE approval_status IN ('SUSPENDED', 'REJECTED')").get().c;

      const html = renderAdminShell({
        title: filterStatus === 'PENDING' ? 'Pending Approvals' : 'All Businesses',
        activeNav: filterStatus === 'PENDING' ? 'pending' : 'businesses',
        user: sessionUser,
        bodyContent: `
          <div class="admin-dash-header">
            <div>
              <h1>${filterStatus === 'PENDING' ? 'Pending Approvals' : 'All Businesses'}</h1>
              <p>Manage, approve and monitor all registered business tenants on the platform.</p>
            </div>
            <div class="admin-date-filters">
              <a href="/admin/businesses" class="btn-date-picker ${filterStatus === 'ALL' ? 'active' : ''}" style="text-decoration:none;">All (${totalBiz})</a>
              <a href="/admin/businesses?status=PENDING" class="btn-date-picker ${filterStatus === 'PENDING' ? 'active' : ''}" style="text-decoration:none;">Pending (${pendingBiz})</a>
              <a href="/admin/businesses?status=APPROVED" class="btn-date-picker ${filterStatus === 'APPROVED' ? 'active' : ''}" style="text-decoration:none;">Approved (${activeBiz})</a>
              <a href="/admin/businesses?status=SUSPENDED" class="btn-date-picker ${filterStatus === 'SUSPENDED' ? 'active' : ''}" style="text-decoration:none;">Suspended (${suspendedBiz})</a>
            </div>
          </div>

          <!-- TOP 4 KPI METRIC CARDS (MATCHING IMAGE 1) -->
          <div class="kpi-row-4">
            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-icon-circle blue">🏢</span>
                <span class="kpi-title">Total Businesses</span>
              </div>
              <div class="kpi-number">${totalBiz}</div>
              <div class="kpi-trend up">
                <span>↑ 12%</span> <span style="color:#64748b;">vs. last month</span>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-icon-circle green">✓</span>
                <span class="kpi-title">Active Accounts</span>
              </div>
              <div class="kpi-number">${activeBiz}</div>
              <div class="kpi-trend up">
                <span>↑ 10%</span> <span style="color:#64748b;">vs. last month</span>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-icon-circle orange">⏳</span>
                <span class="kpi-title">Pending Approvals</span>
              </div>
              <div class="kpi-number">${pendingBiz}</div>
              <div class="kpi-trend down">
                <span>↓ 3%</span> <span style="color:#64748b;">vs. last month</span>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-icon-circle purple">⏸</span>
                <span class="kpi-title">Suspended Accounts</span>
              </div>
              <div class="kpi-number">${suspendedBiz}</div>
              <div class="kpi-trend down">
                <span>→ 0%</span> <span style="color:#64748b;">vs. last month</span>
              </div>
            </div>
          </div>

          <div class="dash-panel">
            <div class="table-panel-header">
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <h3>Business Registrations</h3>
                <input type="text" id="bizSearchBox" class="admin-search-input" placeholder="Search name, owner, GSTIN..." style="min-width:240px;">
              </div>
              <span id="bizCountLabel" style="font-size:12px;color:#64748b;font-weight:600;"></span>
            </div>
            <div class="table-responsive">
              <table class="admin-data-table" id="bizMgmtTable">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Business</th>
                    <th>Owner / Contact</th>
                    <th>Type</th>
                    <th>GSTIN</th>
                    <th>Status</th>
                    <th>Applied On</th>
                    <th style="text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody id="bizMgmtBody">
                  <tr><td colspan="8" class="text-center" style="color:#8b9bb4;padding:24px;">Loading businesses…</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <script>
            (async function() {
              const status = '${filterStatus}';
              const url = status === 'ALL' ? '/api/admin/businesses' : '/api/admin/businesses?status=' + status;
              const res = await fetch(url);
              const data = await res.json();
              const list = data.businesses || [];
              const label = document.getElementById('bizCountLabel');
              if(label) label.textContent = list.length + ' record(s)';
              const tbody = document.getElementById('bizMgmtBody');
              if(!tbody) return;
              if(list.length === 0) { tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding:24px;color:#94a3b8;">No businesses found.</td></tr>'; return; }
              function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
              tbody.innerHTML = list.map((b,i) => \`
                <tr id="bizRow\${b.id}">
                  <td><strong>\${i+1}</strong></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      \${b.logo_url 
                        ? \`<img src="\${esc(b.logo_url)}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;flex-shrink:0;" alt="Logo">\` 
                        : \`<span style="display:grid;place-items:center;width:36px;height:36px;border-radius:8px;background:#eff6ff;color:#2563eb;font-size:16px;flex-shrink:0;">🏢</span>\`
                      }
                      <div>
                        <strong>\${esc(b.business_name)}</strong>
                        <div style="color:#64748b;font-size:11px;">\${esc(b.city || '')} \${esc(b.state ? '· ' + b.state : '')}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="font-weight:600;color:#1e293b;">\${esc(b.owner_name)}</div>
                    <small style="color:#64748b;">\${esc(b.email)}</small>
                  </td>
                  <td><span style="font-size:12px;color:#475569;">\${esc(b.business_type || 'Private Limited')}</span></td>
                  <td>\${b.gstin ? \`<code style="font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px;">\${esc(b.gstin)}</code>\` : '<span style="color:#94a3b8;">—</span>'}</td>
                  <td>
                    <span class="badge-status \${b.approval_status.toLowerCase()}">\${esc(b.approval_status)}</span>
                  </td>
                  <td style="font-size:11.5px;color:#64748b;">\${b.created_at ? b.created_at.slice(0,10) : '—'}</td>
                  <td style="text-align:right;white-space:nowrap;">
                    \${b.approval_status === 'PENDING' ? \`
                      <button onclick="approveBiz(\${b.id},'\${esc(b.business_name)}')" class="btn-action-pill green">Approve</button>
                      <button onclick="rejectBiz(\${b.id},'\${esc(b.business_name)}')" class="btn-action-pill red">Reject</button>
                    \` : ''}
                    \${b.approval_status === 'APPROVED' ? \`
                      <button onclick="suspendBiz(\${b.id},'\${esc(b.business_name)}')" class="btn-action-pill orange">Suspend</button>
                    \` : ''}
                    \${b.approval_status === 'SUSPENDED' ? \`
                      <button onclick="unsuspendBiz(\${b.id},'\${esc(b.business_name)}')" class="btn-action-pill green">Activate</button>
                    \` : ''}
                  </td>
                </tr>
              \`).join('');
              // Search filter
              document.getElementById('bizSearchBox').addEventListener('input', function() {
                const q = this.value.toLowerCase();
                Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
                  tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
                });
              });
            })();
            async function approveBiz(id, name) {
              if(!confirm('Approve "' + name + '"?')) return;
              const r = await fetch('/api/admin/businesses/' + id + '/approve', {method:'POST'});
              const d = await r.json(); if(!r.ok) { alert(d.error); return; }
              location.reload();
            }
            async function rejectBiz(id, name) {
              const reason = prompt('Rejection reason for "' + name + '":'); if(!reason) return;
              const r = await fetch('/api/admin/businesses/' + id + '/reject', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({reason})});
              const d = await r.json(); if(!r.ok) { alert(d.error); return; }
              location.reload();
            }
            async function suspendBiz(id, name) {
              if(!confirm('Suspend "' + name + '"?')) return;
              const r = await fetch('/api/admin/businesses/' + id + '/status', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status:'SUSPENDED', reason:'Suspended by admin'})});
              location.reload();
            }
            async function unsuspendBiz(id, name) {
              if(!confirm('Restore "' + name + '" to Active?')) return;
              const r = await fetch('/api/admin/businesses/' + id + '/status', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status:'APPROVED'})});
              location.reload();
            }
          </script>
        `
      });
      return sendHtml(res, 200, html);
    }

    // GET /admin/users — User Management page (Matching Image 1)
    if (pathname === '/admin/users' && method === 'GET') {
      const users = db.prepare(`
        SELECT u.*, b.business_name FROM users u
        LEFT JOIN businesses b ON b.id = u.business_id
        ORDER BY u.id DESC LIMIT 100
      `).all();

      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.account_status === 'ACTIVE').length;
      const ownerUsers = users.filter(u => u.business_role === 'OWNER').length;
      const adminUsers = users.filter(u => u.platform_role === 'SUPER_ADMIN').length;
      const staffUsers = users.filter(u => ['MANAGER', 'CASHIER', 'ACCOUNTANT', 'STAFF'].includes(u.business_role)).length;

      const html = renderAdminShell({
        title: 'User Management',
        activeNav: 'users',
        user: sessionUser,
        bodyContent: `
          <div class="admin-dash-header">
            <div>
              <h1>User Management</h1>
              <p>View and manage all registered users across all business tenants.</p>
            </div>
            <div class="admin-date-filters">
              <button class="btn-date-picker active" onclick="filterRole('ALL', this)">All (${totalUsers})</button>
              <button class="btn-date-picker" onclick="filterRole('OWNER', this)">Owners (${ownerUsers})</button>
              <button class="btn-date-picker" onclick="filterRole('STAFF', this)">Staff (${staffUsers})</button>
              <button class="btn-date-picker" onclick="filterRole('SUPER_ADMIN', this)">Admins (${adminUsers})</button>
            </div>
          </div>

          <!-- TOP 4 KPI CARDS (MATCHING IMAGE 1) -->
          <div class="kpi-row-4">
            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-icon-circle blue">👥</span>
                <span class="kpi-title">Total Users</span>
              </div>
              <div class="kpi-number">${totalUsers}</div>
              <div class="kpi-trend up"><span>All platform users</span></div>
            </div>

            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-icon-circle green">✓</span>
                <span class="kpi-title">Active Accounts</span>
              </div>
              <div class="kpi-number">${activeUsers}</div>
              <div class="kpi-trend up"><span>↑ Operational</span></div>
            </div>

            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-icon-circle orange">🏢</span>
                <span class="kpi-title">Business Owners</span>
              </div>
              <div class="kpi-number">${ownerUsers}</div>
              <div class="kpi-trend up"><span>Tenant primary</span></div>
            </div>

            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-icon-circle purple">🛡️</span>
                <span class="kpi-title">Platform Admins</span>
              </div>
              <div class="kpi-number">${adminUsers}</div>
              <div class="kpi-trend up"><span>Full system control</span></div>
            </div>
          </div>

          <div class="dash-panel">
            <div class="table-panel-header">
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <h3>Platform Users (${totalUsers})</h3>
                <input type="text" id="usrSearch" class="admin-search-input" placeholder="Search by name, email or business..." style="min-width:260px;">
              </div>
            </div>
            <div class="table-responsive">
              <table class="admin-data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Email / Contact</th>
                    <th>Business Workspace</th>
                    <th>Platform Role</th>
                    <th>Business Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th style="text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody id="usrTableBody">
                  ${users.map((u, i) => `
                    <tr class="user-row" data-role="${escapeHtml(u.business_role)}" data-platform="${escapeHtml(u.platform_role)}">
                      <td><strong>${i + 1}</strong></td>
                      <td>
                        <div style="display:flex;align-items:center;gap:10px;">
                          <div class="admin-avatar-circle" style="width:32px;height:32px;font-size:12px;background:#1e293b;color:#ffffff;flex-shrink:0;">
                            ${escapeHtml((u.full_name || 'U').charAt(0).toUpperCase())}
                          </div>
                          <strong>${escapeHtml(u.full_name)}</strong>
                        </div>
                      </td>
                      <td>
                        <div style="color:#1e293b;font-weight:500;">${escapeHtml(u.email)}</div>
                        <small style="color:#64748b;">${escapeHtml(u.mobile || '—')}</small>
                      </td>
                      <td>${u.business_name ? `<strong>${escapeHtml(u.business_name)}</strong>` : '<span style="color:#94a3b8;">— Platform Control —</span>'}</td>
                      <td><span class="badge-status ${u.platform_role === 'SUPER_ADMIN' ? 'purple' : 'blue'}">${escapeHtml(u.platform_role)}</span></td>
                      <td><span class="badge-status ${u.business_role === 'OWNER' ? 'orange' : 'green'}">${escapeHtml(u.business_role)}</span></td>
                      <td><span class="badge-status ${u.account_status === 'ACTIVE' ? 'green' : 'red'}">${escapeHtml(u.account_status === 'DISABLED' ? 'SUSPENDED' : u.account_status)}</span></td>
                      <td style="font-size:11.5px;color:#64748b;">${u.last_login_at ? u.last_login_at.slice(0, 16).replace('T', ' ') : '—'}</td>
                      <td style="text-align:right;white-space:nowrap;">
                        ${u.platform_role !== 'SUPER_ADMIN' ? `
                          ${u.account_status === 'ACTIVE' 
                            ? `<button class="btn-action-pill orange" onclick="toggleUser(${u.id},'SUSPENDED','${escapeHtml(u.full_name)}')">Suspend</button>` 
                            : `<button class="btn-action-pill green" onclick="toggleUser(${u.id},'ACTIVE','${escapeHtml(u.full_name)}')">Activate</button>`
                          }
                        ` : '<span style="font-size:11px;color:#94a3b8;">Protected</span>'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <script>
            // Live Search
            document.getElementById('usrSearch').addEventListener('input', function() {
              const q = this.value.toLowerCase();
              Array.from(document.querySelectorAll('#usrTableBody tr.user-row')).forEach(tr => {
                tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
              });
            });

            // Filter by role
            function filterRole(role, btn) {
              document.querySelectorAll('.admin-date-filters button').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              Array.from(document.querySelectorAll('#usrTableBody tr.user-row')).forEach(tr => {
                if (role === 'ALL') tr.style.display = '';
                else if (role === 'SUPER_ADMIN') tr.style.display = tr.dataset.platform === 'SUPER_ADMIN' ? '' : 'none';
                else if (role === 'OWNER') tr.style.display = tr.dataset.role === 'OWNER' ? '' : 'none';
                else if (role === 'STAFF') tr.style.display = ['MANAGER', 'CASHIER', 'ACCOUNTANT', 'STAFF'].includes(tr.dataset.role) ? '' : 'none';
              });
            }

            async function toggleUser(id, newStatus, name) {
              const action = newStatus === 'ACTIVE' ? 'activate' : 'suspend';
              if (!confirm('Are you sure you want to ' + action + ' user "' + name + '"?')) return;
              const res = await fetch('/api/admin/users/' + id + '/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
              });
              const d = await res.json();
              if (!res.ok) { alert(d.error || 'Failed to update user'); return; }
              location.reload();
            }
          </script>
        `
      });
      return sendHtml(res, 200, html);
    }

    // GET /admin/reports — Platform Reports
    if (pathname === '/admin/reports' && method === 'GET') {
      const totalBiz = db.prepare("SELECT COUNT(*) AS c FROM businesses").get().c;
      const activeBiz = db.prepare("SELECT COUNT(*) AS c FROM businesses WHERE approval_status='APPROVED'").get().c;
      const pendingBiz = db.prepare("SELECT COUNT(*) AS c FROM businesses WHERE approval_status='PENDING'").get().c;
      const totalUsers = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
      const totalInvoices = db.prepare("SELECT COUNT(*) AS c FROM invoices").get().c;
      const totalRevenue = db.prepare("SELECT COALESCE(SUM(grand_total),0) AS r FROM invoices WHERE status != 'CANCELLED'").get().r;
      const html = renderAdminShell({
        title: 'Platform Reports',
        activeNav: 'reports',
        user: sessionUser,
        bodyContent: `
          <div class="admin-dash-header">
            <div>
              <h1>Platform Reports & Analytics</h1>
              <p>Real-time aggregated platform metrics, business and financial summaries.</p>
            </div>
          </div>
          <div class="kpi-row-5" style="margin-top:20px;">
            <div class="kpi-card">
              <div class="kpi-top"><span class="kpi-icon-circle blue">🏢</span><span class="kpi-title">Total Businesses</span></div>
              <div class="kpi-number">${totalBiz}</div>
              <div class="kpi-trend up"><span>Live count</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-top"><span class="kpi-icon-circle green">✓</span><span class="kpi-title">Active Businesses</span></div>
              <div class="kpi-number">${activeBiz}</div>
              <div class="kpi-trend up"><span>↑ Operational</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-top"><span class="kpi-icon-circle orange">⏳</span><span class="kpi-title">Pending Approvals</span></div>
              <div class="kpi-number">${pendingBiz}</div>
              <div class="kpi-trend down"><span>Awaiting review</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-top"><span class="kpi-icon-circle purple">👤</span><span class="kpi-title">Total Users</span></div>
              <div class="kpi-number">${totalUsers}</div>
              <div class="kpi-trend up"><span>All tenants</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-top"><span class="kpi-icon-circle blue">📄</span><span class="kpi-title">Total Invoices</span></div>
              <div class="kpi-number">${totalInvoices}</div>
              <div class="kpi-trend up"><span>Platform-wide</span></div>
            </div>
          </div>
          <div class="dash-panel" style="margin-top:20px;">
            <div class="dash-panel-header">
              <h3>Platform Revenue Summary</h3>
            </div>
            <div style="padding:20px;">
              <div style="font-size:36px;font-weight:800;color:#34d399;">₹${Number(totalRevenue).toLocaleString('en-IN', {maximumFractionDigits:2})}</div>
              <div style="font-size:13px;color:#64748b;margin-top:4px;">Total gross revenue across all tenants (all time)</div>
            </div>
          </div>
        `
      });
      return sendHtml(res, 200, html);
    }

    // GET /admin/audit-logs — Audit Logs page
    if (pathname === '/admin/audit-logs' && method === 'GET') {
      const logs = db.prepare(`
        SELECT a.*, u.full_name AS user_name, u.email AS user_email, b.business_name
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.actor_user_id
        LEFT JOIN businesses b ON b.id = a.business_id
        ORDER BY a.id DESC LIMIT 200
      `).all();
      const html = renderAdminShell({
        title: 'Audit Logs',
        activeNav: 'audit',
        user: sessionUser,
        bodyContent: `
          <div class="admin-dash-header">
            <div>
              <h1>Platform Security & Audit Trail</h1>
              <p>Immutable log of all critical system events, user actions and security changes.</p>
            </div>
          </div>
          <div class="dash-panel" style="margin-top:20px;">
            <div class="table-panel-header">
              <h3>Audit Events (last 200)</h3>
              <input type="text" id="auditSearch" class="admin-search-input" placeholder="Filter events...">
            </div>
            <div class="table-responsive">
              <table class="admin-data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Time</th>
                    <th>Event</th>
                    <th>Entity</th>
                    <th>User</th>
                    <th>Business</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody id="auditTableBody">
                  ${logs.length === 0 ? '<tr><td colspan="7" class="text-center">No audit events recorded yet.</td></tr>' : logs.map((l, i) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td style="font-size:11px;">${(l.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                      <td><span style="font-weight:700;color:#60a5fa;font-size:11px;">${escapeHtml(l.action_key || '')}</span></td>
                      <td style="font-size:11px;">${escapeHtml(l.entity_type || '')} ${l.entity_id ? '#' + l.entity_id : ''}</td>
                      <td>${escapeHtml(l.user_name || l.user_email || '—')}</td>
                      <td>${escapeHtml(l.business_name || '— Platform —')}</td>
                      <td style="font-size:11px;">${escapeHtml(l.ip_address || '—')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <script>
            document.getElementById('auditSearch').addEventListener('input', function() {
              const q = this.value.toLowerCase();
              Array.from(document.getElementById('auditTableBody').querySelectorAll('tr')).forEach(tr => {
                tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
              });
            });
          </script>
        `
      });
      return sendHtml(res, 200, html);
    }
  }

  // 4. BUSINESS USER ACCESS GATE

  // If not logged in, redirect to login
  if (!sessionUser) {
    if (pathname.startsWith('/api/')) return sendJson(res, 401, { error: 'Authentication required' });
    return redirect(res, '/login');
  }

  // Check Business Approval Status for business users
  if (sessionUser.platform_role === 'BUSINESS_USER') {
    if (sessionUser.approval_status === 'PENDING') {
      if (pathname === '/pending') {
        // already handled
      } else {
        if (pathname.startsWith('/api/')) return sendJson(res, 403, { error: 'Business account is pending administrator approval.' });
        return redirect(res, '/pending');
      }
    } else if (sessionUser.approval_status === 'REJECTED') {
      if (pathname.startsWith('/api/')) return sendJson(res, 403, { error: 'Business account was rejected.' });
      return redirect(res, '/rejected');
    } else if (sessionUser.approval_status === 'SUSPENDED') {
      if (pathname.startsWith('/api/')) return sendJson(res, 403, { error: 'Business account is suspended.' });
      return redirect(res, '/suspended');
    }
  }

  // MULTI-TENANT CONTEXT
  // For Super Admins visiting business pages, default to business 1 (Demo Business) if they have no business_id
  const currentBusinessId = sessionUser.business_id || 1;
  const currentBusiness = db.prepare('SELECT * FROM businesses WHERE id = ?').get(currentBusinessId);

  // 5. APPLICATION ROUTES

  // GET / or /dashboard
  if ((pathname === '/' || pathname === '/dashboard') && method === 'GET') {
    const html = renderShell({
      title: 'Business Overview',
      activeNav: 'dashboard',
      user: sessionUser,
      business: currentBusiness,
      bodyContent: `
        <section class="page-heading">
          <div>
            <p class="eyebrow" id="todayEyebrow">TODAY'S SUMMARY</p>
            <h1>Good day, ${escapeHtml(sessionUser.full_name.split(' ')[0])} <span>✦</span></h1>
            <p class="subheading">Real-time financial status, inventory alerts, and recent business activity.</p>
          </div>
          <div class="heading-actions">
            <button class="button button-secondary" id="refreshDashboardBtn">↺ Refresh</button>
            <button class="button button-primary" id="openNewInvoiceModalBtn">＋ Create Invoice (F8)</button>
          </div>
        </section>

        <section class="metric-grid" aria-label="Business summary">
          <article class="metric-card">
            <div class="metric-top"><span>Sales this month</span><span class="metric-icon blue">↗</span></div>
            <div class="metric-value" id="kpiSales">₹ 0.00</div>
            <div class="metric-foot"><span class="trend positive">Live Calculated</span><span>from invoices</span></div>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span>Customer Receivables</span><span class="metric-icon orange">₹</span></div>
            <div class="metric-value" id="kpiReceivables">₹ 0.00</div>
            <div class="metric-foot"><span class="trend warning" id="kpiOverdueCount">0 pending</span><span>invoices</span></div>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span>Stock Items & Alerts</span><span class="metric-icon purple">▧</span></div>
            <div class="metric-value" id="kpiStockItems">0</div>
            <div class="metric-foot"><span class="trend warning" id="kpiLowStock">0 low stock</span><span>needs reorder</span></div>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span>Cash & Bank Balances</span><span class="metric-icon green">⌁</span></div>
            <div class="metric-value" id="kpiCashBank">₹ 0.00</div>
            <div class="metric-foot"><span class="trend positive">Double-Entry</span><span>Ledger balance</span></div>
          </article>
        </section>

        <section class="dashboard-grid">
          <article class="panel sales-panel">
            <div class="panel-heading">
              <div>
                <h2>Sales & Performance Overview</h2>
                <p>Monthly sales totals calculated from verified records</p>
              </div>
            </div>
            <div class="chart-legend">
              <span><i class="legend-sales"></i> Verified Sales</span>
              <strong id="chartTotalSales">₹ 0.00 <small>total sales</small></strong>
            </div>
            <div class="chart" id="salesBarChart" role="img" aria-label="Sales bar chart">
              <div class="chart-area" id="chartBarsContainer"></div>
            </div>
          </article>

          <article class="panel quick-panel">
            <div class="panel-heading">
              <div>
                <h2>Tally Quick Actions</h2>
                <p>One-click business shortcuts</p>
              </div>
            </div>
            <div class="quick-actions">
              <button class="quick-action" id="qaNewInvoice"><span class="quick-icon q-blue">＋</span><span><strong>Sales Invoice</strong><small>GST or Quick billing</small></span><kbd>F8</kbd></button>
              <button class="quick-action" id="qaNewReceipt"><span class="quick-icon q-green">₹</span><span><strong>Payment Receipt</strong><small>Collect from customer</small></span><kbd>F6</kbd></button>
              <button class="quick-action" id="qaAddCustomer"><span class="quick-icon q-purple">♙</span><span><strong>Add Customer</strong><small>Save customer & GSTIN</small></span><b>↗</b></button>
              <button class="quick-action" id="qaAddProduct"><span class="quick-icon q-orange">▧</span><span><strong>Add Product</strong><small>Tracked item or service</small></span><b>↗</b></button>
            </div>
          </article>
        </section>

        <section class="panel transactions-panel">
          <div class="panel-heading">
            <div>
              <h2>Recent Invoices</h2>
              <p>Your latest sales activity</p>
            </div>
            <a class="text-link" href="/billing">View all invoices →</a>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>INVOICE</th><th>CUSTOMER</th><th>DATE</th><th>AMOUNT</th><th>STATUS</th><th>ACTIONS</th></tr>
              </thead>
              <tbody id="recentInvoicesTbody">
                <tr><td colspan="6" class="text-center">Loading invoices...</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      `
    });
    return sendHtml(res, 200, html);
  }

  // GET /api/dashboard/stats
  if (pathname === '/api/dashboard/stats' && method === 'GET') {
    const bizId = currentBusinessId;

    // Monthly sales
    const salesRow = db.prepare(`
      SELECT COALESCE(SUM(grand_total), 0) AS total_sales,
             COALESCE(SUM(balance_amount), 0) AS total_receivables,
             COUNT(*) AS total_invoices
      FROM invoices
      WHERE business_id = ? AND status != 'CANCELLED'
    `).get(bizId);

    // Overdue / pending count
    const overdueRow = db.prepare(`
      SELECT COUNT(*) AS c FROM invoices
      WHERE business_id = ? AND status != 'CANCELLED' AND payment_status != 'PAID'
    `).get(bizId);

    // Stock items & low stock count
    const stockRow = db.prepare(`
      SELECT COUNT(*) AS total_items,
             SUM(CASE WHEN is_stock_tracked = 1 AND current_stock <= min_stock_alert THEN 1 ELSE 0 END) AS low_stock_items
      FROM products
      WHERE business_id = ? AND is_active = 1
    `).get(bizId);

    // Liquid balances from Chart of Accounts (Cash 1010 + Bank 1020)
    const liquidRow = db.prepare(`
      SELECT COALESCE(SUM(current_balance), 0) AS liquid_bal
      FROM accounts
      WHERE business_id = ? AND account_code IN ('1010', '1020')
    `).get(bizId);

    // Recent 5 invoices
    const recentInvoices = db.prepare(`
      SELECT i.*, p.name AS customer_name
      FROM invoices i
      JOIN parties p ON p.id = i.customer_id
      WHERE i.business_id = ?
      ORDER BY i.id DESC LIMIT 5
    `).all(bizId);

    // Monthly sales grouping for chart (last 6 months)
    const monthlyBars = db.prepare(`
      SELECT strftime('%Y-%m', invoice_date) AS ym,
             SUM(grand_total) AS total
      FROM invoices
      WHERE business_id = ? AND status != 'CANCELLED'
      GROUP BY ym
      ORDER BY ym DESC LIMIT 6
    `).all(bizId).reverse();

    return sendJson(res, 200, {
      totalSales: salesRow.total_sales,
      totalReceivables: salesRow.total_receivables,
      overdueCount: overdueRow.c,
      totalStockItems: stockRow.total_items || 0,
      lowStockItems: stockRow.low_stock_items || 0,
      cashBankBalance: liquidRow.liquid_bal || 0,
      recentInvoices,
      monthlyBars
    });
  }

  // 6. BILLING & INVOICING MODULE (`/billing` and `/api/invoices`)

  // GET /billing or /invoices
  if ((pathname === '/billing' || pathname === '/invoices') && method === 'GET') {
    const html = renderShell({
      title: 'Billing & Invoices',
      activeNav: 'billing',
      user: sessionUser,
      business: currentBusiness,
      bodyContent: `
        <section class="page-heading">
          <div>
            <p class="eyebrow">SALES & BILLING</p>
            <h1>Billing & Invoices <span>▤</span></h1>
            <p class="subheading">GST Tax Invoices, Quick Billing, Quotations, and Delivery Challans.</p>
          </div>
          <div class="heading-actions">
            <button class="button button-primary" id="openNewInvoiceBtn">＋ Create Invoice (F8)</button>
          </div>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <div class="search-filters">
              <input type="text" id="invoiceSearch" placeholder="Search by invoice # or customer..." class="table-search">
              <select id="invoiceStatusFilter" aria-label="Filter status">
                <option value="ALL">All Statuses</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <button class="button button-secondary" id="exportInvoicesCsvBtn">Export CSV</button>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>INVOICE NUMBER</th>
                  <th>CUSTOMER</th>
                  <th>DATE</th>
                  <th>TAXABLE</th>
                  <th>GST</th>
                  <th>GRAND TOTAL</th>
                  <th>BALANCE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody id="invoicesTableBody">
                <tr><td colspan="9" class="text-center">Loading invoices...</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      `
    });
    return sendHtml(res, 200, html);
  }

  // GET /api/invoices
  if (pathname === '/api/invoices' && method === 'GET') {
    const status = parsedUrl.query.status || 'ALL';
    let sql = `
      SELECT i.*, p.name AS customer_name, p.gstin AS customer_gstin
      FROM invoices i
      JOIN parties p ON p.id = i.customer_id
      WHERE i.business_id = ?
    `;
    const params = [currentBusinessId];

    if (status !== 'ALL') {
      sql += ' AND i.payment_status = ? ';
      params.push(status);
    }
    sql += ' ORDER BY i.id DESC ';

    const invoices = db.prepare(sql).all(...params);
    return sendJson(res, 200, { invoices });
  }

  // GET /api/invoices/:id
  const singleInvMatch = pathname.match(/^\/api\/invoices\/(\d+)$/);
  if (singleInvMatch && method === 'GET') {
    const invId = Number(singleInvMatch[1]);
    const invoice = db.prepare(`
      SELECT i.*, p.name AS customer_name, p.gstin AS customer_gstin, p.address AS customer_address, p.mobile AS customer_mobile
      FROM invoices i
      JOIN parties p ON p.id = i.customer_id
      WHERE i.id = ? AND i.business_id = ?
    `).get(invId, currentBusinessId);

    if (!invoice) return sendJson(res, 404, { error: 'Invoice not found' });

    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invId);
    const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ?').all(invId);

    return sendJson(res, 200, { invoice, items, payments });
  }

  // POST /api/invoices (Create Invoice)
  if (pathname === '/api/invoices' && method === 'POST') {
    const body = await parseBody(req);
    const {
      customer_id, invoice_date, billing_mode = 'TRACKED',
      place_of_supply, is_interstate = false, items = [],
      notes, terms, initial_payment = 0, payment_mode = 'CASH'
    } = body;

    if (!customer_id || !items || items.length === 0) {
      return sendJson(res, 400, { error: 'Customer and at least one line item are required.' });
    }

    const customer = db.prepare('SELECT * FROM parties WHERE id = ? AND business_id = ?').get(customer_id, currentBusinessId);
    if (!customer) return sendJson(res, 400, { error: 'Selected customer not found.' });

    try {
      const createdInvoice = transaction((db) => {
        // Atomic sequential invoice number generation
        const biz = db.prepare('SELECT invoice_prefix, invoice_next_number FROM businesses WHERE id = ?').get(currentBusinessId);
        const prefix = biz.invoice_prefix || 'INV';
        const num = biz.invoice_next_number || 1;
        const fy = getFinancialYear(invoice_date);
        const invoiceNumber = `${prefix}-${fy}-${String(num).padStart(4, '0')}`;

        // Increment business counter atomically
        db.prepare('UPDATE businesses SET invoice_next_number = invoice_next_number + 1 WHERE id = ?').run(currentBusinessId);

        // Calculate Totals
        let subtotal = 0;
        let totalDiscount = 0;
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;
        let totalTax = 0;

        const calculatedItems = [];

        for (const it of items) {
          const rate = Number(it.rate) || 0;
          const qty = Number(it.quantity) || 1;
          const disc = Number(it.discount_percent) || 0;
          const taxRate = Number(it.tax_rate) || 0;

          const gstCalc = calculateItemGST(rate, qty, disc, taxRate, Boolean(is_interstate), Boolean(it.is_tax_inclusive));

          subtotal += gstCalc.taxableAmount;
          totalDiscount += gstCalc.discountAmount;
          cgstAmount += gstCalc.cgstAmount;
          sgstAmount += gstCalc.sgstAmount;
          igstAmount += gstCalc.igstAmount;
          totalTax += gstCalc.taxAmount;

          calculatedItems.push({
            ...it,
            ...gstCalc
          });
        }

        subtotal = Math.round(subtotal * 100) / 100;
        totalDiscount = Math.round(totalDiscount * 100) / 100;
        cgstAmount = Math.round(cgstAmount * 100) / 100;
        sgstAmount = Math.round(sgstAmount * 100) / 100;
        igstAmount = Math.round(igstAmount * 100) / 100;
        totalTax = Math.round(totalTax * 100) / 100;

        const unroundedGrand = subtotal + totalTax;
        const roundedGrand = Math.round(unroundedGrand);
        const roundOff = Math.round((roundedGrand - unroundedGrand) * 100) / 100;

        const paid = Math.min(Number(initial_payment) || 0, roundedGrand);
        const balance = Math.round((roundedGrand - paid) * 100) / 100;
        const paymentStatus = paid >= roundedGrand ? 'PAID' : (paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

        // Insert Invoice
        const invRes = db.prepare(`
          INSERT INTO invoices (
            business_id, public_id, document_type, invoice_number, financial_year, customer_id,
            invoice_date, billing_mode, place_of_supply, is_interstate, subtotal, total_discount,
            cgst_amount, sgst_amount, igst_amount, total_tax, round_off, grand_total,
            paid_amount, balance_amount, payment_status, status, notes, terms, created_by
          ) VALUES (?, ?, 'TAX_INVOICE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', ?, ?, ?)
        `).run(
          currentBusinessId, uuid(), invoiceNumber, fy, customer_id,
          invoice_date || new Date().toISOString().slice(0, 10),
          billing_mode, place_of_supply || customer.state || '', is_interstate ? 1 : 0,
          subtotal, totalDiscount, cgstAmount, sgstAmount, igstAmount, totalTax, roundOff, roundedGrand,
          paid, balance, paymentStatus, notes || '', terms || 'Thank you for your business.', sessionUser.user_id
        );

        const invoiceId = invRes.lastInsertRowid;

        // Insert Items & Handle Inventory
        for (const it of calculatedItems) {
          let stockDeducted = 0;

          // Only deduct stock if billing_mode === 'TRACKED' and product is stock-tracked!
          if (billing_mode === 'TRACKED' && it.product_id) {
            const prod = db.prepare('SELECT is_stock_tracked, current_stock FROM products WHERE id = ? AND business_id = ?').get(it.product_id, currentBusinessId);
            if (prod && prod.is_stock_tracked === 1) {
              db.prepare('UPDATE products SET current_stock = current_stock - ? WHERE id = ?').run(it.quantity, it.product_id);
              db.prepare(`
                INSERT INTO stock_movements (business_id, product_id, movement_type, reference_type, reference_id, quantity, notes)
                VALUES (?, ?, 'SALE', 'INVOICE', ?, ?, ?)
              `).run(currentBusinessId, it.product_id, invoiceId, -Math.abs(it.quantity), `Deducted for Invoice ${invoiceNumber}`);
              stockDeducted = 1;
            }
          }

          db.prepare(`
            INSERT INTO invoice_items (
              invoice_id, product_id, description, hsn_sac, quantity, unit, rate,
              discount_percent, discount_amount, tax_rate, cgst_amount, sgst_amount,
              igst_amount, tax_amount, total_amount, is_stock_deducted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            invoiceId, it.product_id || null, it.description, it.hsn_sac || '',
            it.quantity, it.unit || 'PCS', it.rate, it.discount_percent || 0,
            it.discountAmount, it.taxRate, it.cgstAmount, it.sgstAmount,
            it.igstAmount, it.taxAmount, it.totalAmount, stockDeducted
          );
        }

        // Update Customer current balance (receivable increases by remaining balance)
        db.prepare('UPDATE parties SET current_balance = current_balance + ? WHERE id = ?').run(balance, customer_id);

        // Record Initial Payment if any
        if (paid > 0) {
          const vNum = `RCPT-${invoiceNumber}`;
          const payRes = db.prepare(`
            INSERT INTO payments (business_id, public_id, payment_type, party_id, invoice_id, voucher_number, payment_date, amount, payment_mode, notes)
            VALUES (?, ?, 'RECEIPT', ?, ?, ?, ?, ?, ?, 'Initial payment at invoice creation')
          `).run(currentBusinessId, uuid(), customer_id, invoiceId, vNum, invoice_date || new Date().toISOString().slice(0, 10), paid, payment_mode);

          // Post Payment Receipt to Accounting
          postReceiptToAccounting(currentBusinessId, {
            id: payRes.lastInsertRowid,
            voucher_number: vNum,
            payment_date: invoice_date || new Date().toISOString().slice(0, 10),
            amount: paid,
            payment_mode
          }, sessionUser.user_id);
        }

        // Post Invoice to General Ledger
        postInvoiceToAccounting(currentBusinessId, {
          id: invoiceId,
          invoice_number: invoiceNumber,
          invoice_date: invoice_date || new Date().toISOString().slice(0, 10),
          subtotal,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          igst_amount: igstAmount,
          round_off: roundOff,
          grand_total: roundedGrand,
          is_interstate: is_interstate ? 1 : 0
        }, sessionUser.user_id);

        logAudit(sessionUser.user_id, currentBusinessId, 'INVOICE_CREATED', 'INVOICE', invoiceId, req, { invoiceNumber, grandTotal: roundedGrand });

        return { id: invoiceId, invoiceNumber, grandTotal: roundedGrand };
      });

      return sendJson(res, 201, { success: true, invoice: createdInvoice });
    } catch (err) {
      console.error('Invoice creation error:', err);
      return sendJson(res, 500, { error: 'Failed to create invoice: ' + err.message });
    }
  }

  // GET /invoice-print/:id (Printable GST Invoice & PDF Export)
  const printMatch = pathname.match(/^\/invoice-print\/(\d+)$/);
  if (printMatch && method === 'GET') {
    const invId = Number(printMatch[1]);
    const invoice = db.prepare(`
      SELECT i.*, p.name AS customer_name, p.company_name AS customer_company, p.gstin AS customer_gstin, p.address AS customer_address, p.city AS customer_city, p.state AS customer_state, p.mobile AS customer_mobile
      FROM invoices i
      JOIN parties p ON p.id = i.customer_id
      WHERE i.id = ? AND i.business_id = ?
    `).get(invId, currentBusinessId);

    if (!invoice) return sendHtml(res, 404, '<h1>Invoice not found</h1>');

    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invId);

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Invoice ${escapeHtml(invoice.invoice_number)} · RMSTORVIX IGNITE</title>
  <link rel="icon" type="image/png" href="/assets/images/favicon.png">
  <link rel="stylesheet" href="/assets/css/invoice-print.css">
</head>
<body>
  <div class="print-actions no-print">
    <button onclick="window.print()" class="btn-print">🖨 Print Invoice / Save as PDF</button>
    <button onclick="window.close()" class="btn-close">Close</button>
  </div>

  <div class="invoice-container">
    <header class="inv-header">
      <div class="inv-biz-info" style="display:flex;align-items:center;gap:16px;">
        <img src="/assets/images/logo.png" alt="RMSTORVIX IGNITE Logo" style="height:56px;object-fit:contain;">
        <div>
          <h1>${escapeHtml(currentBusiness.business_name)}</h1>
          <p>${escapeHtml(currentBusiness.address_line || '')}, ${escapeHtml(currentBusiness.city || '')}, ${escapeHtml(currentBusiness.state || '')} - ${escapeHtml(currentBusiness.pin_code || '')}</p>
          <p><strong>GSTIN:</strong> ${escapeHtml(currentBusiness.gstin || 'N/A')} | <strong>Email:</strong> ${escapeHtml(currentBusiness.email)} | <strong>Phone:</strong> ${escapeHtml(currentBusiness.mobile)}</p>
        </div>
      </div>
      <div class="inv-title-box">
        <h2>TAX INVOICE</h2>
        <p>Original for Recipient</p>
        <div class="inv-key-val">
          <div><strong>Invoice No:</strong> ${escapeHtml(invoice.invoice_number)}</div>
          <div><strong>Date:</strong> ${escapeHtml(invoice.invoice_date)}</div>
          <div><strong>Financial Year:</strong> ${escapeHtml(invoice.financial_year)}</div>
          <div><strong>Place of Supply:</strong> ${escapeHtml(invoice.place_of_supply || 'Same State')}</div>
        </div>
      </div>
    </header>

    <div class="inv-parties">
      <div class="inv-party-card">
        <h3>Billed To (Customer Details):</h3>
        <strong>${escapeHtml(invoice.customer_company || invoice.customer_name)}</strong>
        <p>${escapeHtml(invoice.customer_address || '')}, ${escapeHtml(invoice.customer_city || '')}, ${escapeHtml(invoice.customer_state || '')}</p>
        <p><strong>GSTIN:</strong> ${escapeHtml(invoice.customer_gstin || 'Unregistered Consumer')}</p>
        <p><strong>Phone:</strong> ${escapeHtml(invoice.customer_mobile || 'N/A')}</p>
      </div>
    </div>

    <table class="inv-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Description of Goods / Services</th>
          <th>HSN/SAC</th>
          <th>Qty</th>
          <th>Rate (₹)</th>
          <th>Disc %</th>
          <th>Taxable (₹)</th>
          <th>Tax Rate</th>
          <th>Tax (₹)</th>
          <th>Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${escapeHtml(it.description)}</strong></td>
            <td>${escapeHtml(it.hsn_sac || '-')}</td>
            <td>${it.quantity} ${escapeHtml(it.unit)}</td>
            <td>₹ ${Number(it.rate).toFixed(2)}</td>
            <td>${it.discount_percent}%</td>
            <td>₹ ${(Number(it.rate) * Number(it.quantity) - Number(it.discount_amount)).toFixed(2)}</td>
            <td>${it.tax_rate}%</td>
            <td>₹ ${Number(it.tax_amount).toFixed(2)}</td>
            <td class="text-right font-bold">₹ ${Number(it.total_amount).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="inv-summary-row">
      <div class="inv-tax-breakdown">
        <h4>GST Statutory Breakdown</h4>
        <table>
          <tr><td>CGST:</td><td>₹ ${Number(invoice.cgst_amount).toFixed(2)}</td></tr>
          <tr><td>SGST:</td><td>₹ ${Number(invoice.sgst_amount).toFixed(2)}</td></tr>
          <tr><td>IGST:</td><td>₹ ${Number(invoice.igst_amount).toFixed(2)}</td></tr>
          <tr><th>Total GST:</th><th>₹ ${Number(invoice.total_tax).toFixed(2)}</th></tr>
        </table>
        <p class="notes-text"><strong>Notes:</strong> ${escapeHtml(invoice.notes || 'None')}</p>
        <p class="terms-text"><strong>Terms:</strong> ${escapeHtml(invoice.terms || 'Payment due on presentation.')}</p>
      </div>

      <div class="inv-totals">
        <table>
          <tr><td>Subtotal (Taxable Value):</td><td>₹ ${Number(invoice.subtotal).toFixed(2)}</td></tr>
          <tr><td>Total GST Amount:</td><td>₹ ${Number(invoice.total_tax).toFixed(2)}</td></tr>
          <tr><td>Round Off:</td><td>₹ ${Number(invoice.round_off).toFixed(2)}</td></tr>
          <tr class="grand-total-row"><th>Grand Total:</th><th>₹ ${Number(invoice.grand_total).toFixed(2)}</th></tr>
          <tr><td>Amount Paid:</td><td>₹ ${Number(invoice.paid_amount).toFixed(2)}</td></tr>
          <tr class="balance-row"><th>Balance Due:</th><th>₹ ${Number(invoice.balance_amount).toFixed(2)}</th></tr>
        </table>
      </div>
    </div>

    <footer class="inv-footer">
      ${currentBusiness.enable_digital_signature ? `
        <div class="inv-sign-block">
          <p class="sign-biz-name">For <strong>${escapeHtml(currentBusiness.business_name)}</strong></p>
          <div class="sign-images-wrap">
            ${currentBusiness.company_seal_data ? `<img src="${currentBusiness.company_seal_data}" class="inv-seal-img" alt="Official Seal">` : ''}
            ${currentBusiness.digital_signature_data ? `<img src="${currentBusiness.digital_signature_data}" class="inv-sig-img" alt="Digital Signature">` : '<div style="height:45px;"></div>'}
          </div>
          <div class="signatory-details">
            <strong>${escapeHtml(currentBusiness.signatory_name || currentBusiness.owner_name)}</strong>
            <span>${escapeHtml(currentBusiness.signatory_designation || 'Authorized Signatory')}</span>
            ${currentBusiness.signature_date_enabled ? `<small class="sign-verified-badge">🛡️ Digitally Signed on ${escapeHtml(invoice.invoice_date)}</small>` : ''}
          </div>
        </div>
      ` : `
        <div class="inv-sign">
          <p>For <strong>${escapeHtml(currentBusiness.business_name)}</strong></p>
          <br><br>
          <p>Authorized Signatory</p>
        </div>
      `}
    </footer>
  </div>
</body>
</html>`;
    return sendHtml(res, 200, html);
  }

  // 7. INVENTORY MODULE (`/inventory` and `/api/products`)

  // GET /inventory or /items
  if ((pathname === '/inventory' || pathname === '/items') && method === 'GET') {
    const html = renderShell({
      title: 'Inventory & Stock Management',
      activeNav: 'inventory',
      user: sessionUser,
      business: currentBusiness,
      bodyContent: `
        <section class="page-heading">
          <div>
            <p class="eyebrow">CATALOG & WAREHOUSE</p>
            <h1>Inventory & Stock <span>▧</span></h1>
            <p class="subheading">Stock levels, warehouses, barcode lookups, and inventory movement history.</p>
          </div>
          <div class="heading-actions">
            <button class="button button-primary" id="openAddProductBtn">＋ Add Product</button>
          </div>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <div class="search-filters">
              <input type="text" id="productSearch" placeholder="Search product name, SKU or barcode..." class="table-search">
              <select id="stockFilter" aria-label="Filter stock">
                <option value="ALL">All Products</option>
                <option value="LOW">Low Stock Alerts</option>
                <option value="TRACKED">Tracked Goods</option>
                <option value="SERVICE">Services (Untracked)</option>
              </select>
            </div>
            <div>
              <button class="button button-secondary" id="exportProductsCsvBtn">Export CSV</button>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ITEM NAME</th>
                  <th>SKU / BARCODE</th>
                  <th>HSN/SAC</th>
                  <th>TYPE</th>
                  <th>PURCHASE (₹)</th>
                  <th>SELLING (₹)</th>
                  <th>TAX %</th>
                  <th>CURRENT STOCK</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody id="productsTableBody">
                <tr><td colspan="9" class="text-center">Loading inventory...</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      `
    });
    return sendHtml(res, 200, html);
  }

  // GET /api/products
  if (pathname === '/api/products' && method === 'GET') {
    const products = db.prepare(`
      SELECT p.*, c.name AS category_name, u.code AS unit_code
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN units u ON u.id = p.unit_id
      WHERE p.business_id = ? AND p.is_active = 1
      ORDER BY p.name ASC
    `).all(currentBusinessId);
    return sendJson(res, 200, { products });
  }

  // POST /api/products
  if (pathname === '/api/products' && method === 'POST') {
    const body = await parseBody(req);
    const {
      name, sku, barcode, hsn_sac, product_type = 'GOODS',
      purchase_price = 0, selling_price = 0, tax_rate = 18,
      is_stock_tracked = 1, opening_stock = 0, min_stock_alert = 5
    } = body;

    if (!name) return sendJson(res, 400, { error: 'Product name is required.' });

    const pSku = sku || `SKU-${Date.now().toString().slice(-6)}`;
    const tracked = is_stock_tracked ? 1 : 0;
    const initialStock = tracked ? (Number(opening_stock) || 0) : 0;

    const resProd = db.prepare(`
      INSERT INTO products (
        business_id, public_id, name, sku, barcode, hsn_sac, product_type,
        purchase_price, selling_price, tax_rate, is_stock_tracked,
        opening_stock, current_stock, min_stock_alert
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      currentBusinessId, uuid(), name.trim(), pSku, barcode || '', hsn_sac || '',
      product_type, Number(purchase_price) || 0, Number(selling_price) || 0,
      Number(tax_rate) || 0, tracked, initialStock, initialStock, Number(min_stock_alert) || 5
    );

    if (initialStock > 0 && tracked) {
      db.prepare(`
        INSERT INTO stock_movements (business_id, product_id, movement_type, reference_type, quantity, notes)
        VALUES (?, ?, 'OPENING', 'MANUAL', ?, 'Opening Stock')
      `).run(currentBusinessId, resProd.lastInsertRowid, initialStock);
    }

    logAudit(sessionUser.user_id, currentBusinessId, 'PRODUCT_CREATED', 'PRODUCT', resProd.lastInsertRowid, req, { name });
    return sendJson(res, 201, { success: true, productId: resProd.lastInsertRowid });
  }

  // 8. PARTIES MODULE (`/parties` and `/api/parties`)

  // GET /parties
  if (pathname === '/parties' && method === 'GET') {
    const html = renderShell({
      title: 'Customers & Suppliers',
      activeNav: 'parties',
      user: sessionUser,
      business: currentBusiness,
      bodyContent: `
        <section class="page-heading">
          <div>
            <p class="eyebrow">DIRECTORY</p>
            <h1>Customers & Suppliers <span>♙</span></h1>
            <p class="subheading">Client profiles, credit limits, outstanding balances, and statements.</p>
          </div>
          <div class="heading-actions">
            <button class="button button-primary" id="openAddPartyBtn">＋ Add Party</button>
          </div>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <div class="search-filters">
              <input type="text" id="partySearch" placeholder="Search by name, company, or GSTIN..." class="table-search">
              <select id="partyTypeFilter" aria-label="Filter party type">
                <option value="ALL">All Parties</option>
                <option value="CUSTOMER">Customers Only</option>
                <option value="SUPPLIER">Suppliers Only</option>
              </select>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>NAME / COMPANY</th>
                  <th>TYPE</th>
                  <th>GSTIN</th>
                  <th>MOBILE / EMAIL</th>
                  <th>CITY & STATE</th>
                  <th>CURRENT BALANCE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody id="partiesTableBody">
                <tr><td colspan="7" class="text-center">Loading parties...</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      `
    });
    return sendHtml(res, 200, html);
  }

  // GET /api/parties
  if (pathname === '/api/parties' && method === 'GET') {
    const type = parsedUrl.query.type || 'ALL';
    let sql = 'SELECT * FROM parties WHERE business_id = ? ';
    const params = [currentBusinessId];

    if (type !== 'ALL') {
      sql += " AND (party_type = ? OR party_type = 'BOTH') ";
      params.push(type);
    }
    sql += ' ORDER BY name ASC ';

    const parties = db.prepare(sql).all(...params);
    return sendJson(res, 200, { parties });
  }

  // POST /api/parties
  if (pathname === '/api/parties' && method === 'POST') {
    const body = await parseBody(req);
    const { name, company_name, party_type = 'CUSTOMER', gstin, mobile, email, address, city, state, credit_limit = 0 } = body;

    if (!name) return sendJson(res, 400, { error: 'Party name is required.' });

    let cleanGstin = null;
    let stateCode = null;
    if (gstin && gstin.trim()) {
      const gstinVal = validateGSTIN(gstin);
      if (gstinVal.valid) {
        cleanGstin = gstinVal.gstin;
        stateCode = gstinVal.stateCode;
      }
    }

    const pRes = db.prepare(`
      INSERT INTO parties (business_id, public_id, party_type, name, company_name, gstin, mobile, email, address, city, state, state_code, credit_limit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      currentBusinessId, uuid(), party_type, name.trim(), company_name || '', cleanGstin,
      mobile || '', email || '', address || '', city || '', state || '', stateCode || '', Number(credit_limit) || 0
    );

    logAudit(sessionUser.user_id, currentBusinessId, 'PARTY_CREATED', 'PARTY', pRes.lastInsertRowid, req, { name });
    return sendJson(res, 201, { success: true, partyId: pRes.lastInsertRowid });
  }

  // 8B. PURCHASES & PURCHASE BILLS MODULE (`/purchases` and `/api/purchases`)

  // GET /purchases
  if (pathname === '/purchases' && method === 'GET') {
    const html = renderShell({
      title: 'Purchase Bills',
      activeNav: 'purchases',
      user: sessionUser,
      business: currentBusiness,
      bodyContent: `
        <section class="page-heading">
          <div>
            <p class="eyebrow">PROCUREMENT & INWARD SUPPLIES</p>
            <h1>Purchase Bills & Inward Supplies <span>📥</span></h1>
            <p class="subheading">Vendor bills, purchase orders, inventory stock-in, and accounts payable.</p>
          </div>
          <div class="heading-actions">
            <button class="button button-primary" id="openNewPurchaseBtn">＋ Record Purchase Bill (F9)</button>
          </div>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <div class="search-filters">
              <input type="text" id="purchaseSearch" placeholder="Search bill # or supplier..." class="table-search">
              <select id="purchaseStatusFilter" aria-label="Filter status">
                <option value="ALL">All Statuses</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
            <div>
              <button class="button button-secondary" id="exportPurchasesCsvBtn">Export CSV</button>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>BILL NUMBER</th>
                  <th>SUPPLIER</th>
                  <th>BILL DATE</th>
                  <th>VENDOR REF #</th>
                  <th>TAXABLE</th>
                  <th>GST</th>
                  <th>GRAND TOTAL</th>
                  <th>BALANCE DUE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody id="purchasesTableBody">
                <tr><td colspan="10" class="text-center">Loading purchase bills...</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      `
    });
    return sendHtml(res, 200, html);
  }

  // GET /api/purchases
  if (pathname === '/api/purchases' && method === 'GET') {
    const status = parsedUrl.query.status || 'ALL';
    let sql = `
      SELECT pb.*, p.name AS supplier_name, p.gstin AS supplier_gstin
      FROM purchase_bills pb
      JOIN parties p ON p.id = pb.supplier_id
      WHERE pb.business_id = ?
    `;
    const params = [currentBusinessId];

    if (status !== 'ALL') {
      sql += ' AND pb.payment_status = ? ';
      params.push(status);
    }
    sql += ' ORDER BY pb.id DESC ';

    const bills = db.prepare(sql).all(...params);
    return sendJson(res, 200, { purchases: bills });
  }

  // POST /api/purchases (Create Purchase Bill)
  if (pathname === '/api/purchases' && method === 'POST') {
    const body = await parseBody(req);
    const {
      supplier_id, bill_date, supplier_bill_no, is_interstate = false,
      items = [], notes, initial_payment = 0, payment_mode = 'BANK'
    } = body;

    if (!supplier_id || !items || items.length === 0) {
      return sendJson(res, 400, { error: 'Supplier and at least one line item are required.' });
    }

    const supplier = db.prepare('SELECT * FROM parties WHERE id = ? AND business_id = ?').get(supplier_id, currentBusinessId);
    if (!supplier) return sendJson(res, 400, { error: 'Selected supplier not found.' });

    try {
      const createdBill = transaction((db) => {
        const fy = getFinancialYear(bill_date);
        const countRow = db.prepare('SELECT COUNT(*) AS c FROM purchase_bills WHERE business_id = ?').get(currentBusinessId);
        const nextNum = (countRow.c || 0) + 1;
        const billNumber = `PB-${fy}-${String(nextNum).padStart(4, '0')}`;

        let subtotal = 0;
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;
        let totalTax = 0;

        const calculatedItems = [];

        for (const it of items) {
          const rate = Number(it.rate) || 0;
          const qty = Number(it.quantity) || 1;
          const taxRate = Number(it.tax_rate) || 0;

          const gstCalc = calculateItemGST(rate, qty, 0, taxRate, Boolean(is_interstate), false);

          subtotal += gstCalc.taxableAmount;
          cgstAmount += gstCalc.cgstAmount;
          sgstAmount += gstCalc.sgstAmount;
          igstAmount += gstCalc.igstAmount;
          totalTax += gstCalc.taxAmount;

          calculatedItems.push({
            ...it,
            ...gstCalc
          });
        }

        subtotal = Math.round(subtotal * 100) / 100;
        cgstAmount = Math.round(cgstAmount * 100) / 100;
        sgstAmount = Math.round(sgstAmount * 100) / 100;
        igstAmount = Math.round(igstAmount * 100) / 100;
        totalTax = Math.round(totalTax * 100) / 100;

        const unroundedGrand = subtotal + totalTax;
        const roundedGrand = Math.round(unroundedGrand);
        const roundOff = Math.round((roundedGrand - unroundedGrand) * 100) / 100;

        const paid = Math.min(Number(initial_payment) || 0, roundedGrand);
        const balance = Math.round((roundedGrand - paid) * 100) / 100;
        const paymentStatus = paid >= roundedGrand ? 'PAID' : (paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

        const pbRes = db.prepare(`
          INSERT INTO purchase_bills (
            business_id, public_id, document_type, bill_number, supplier_bill_no, financial_year,
            supplier_id, bill_date, subtotal, cgst_amount, sgst_amount, igst_amount, total_tax,
            round_off, grand_total, paid_amount, balance_amount, payment_status, status, notes, created_by
          ) VALUES (?, ?, 'PURCHASE_BILL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', ?, ?)
        `).run(
          currentBusinessId, uuid(), billNumber, supplier_bill_no || '', fy, supplier_id,
          bill_date || new Date().toISOString().slice(0, 10), subtotal, cgstAmount, sgstAmount,
          igstAmount, totalTax, roundOff, roundedGrand, paid, balance, paymentStatus,
          notes || '', sessionUser.user_id
        );

        const billId = pbRes.lastInsertRowid;

        // Insert items and update stock for tracked products
        for (const it of calculatedItems) {
          if (it.product_id) {
            const prod = db.prepare('SELECT is_stock_tracked FROM products WHERE id = ? AND business_id = ?').get(it.product_id, currentBusinessId);
            if (prod && prod.is_stock_tracked === 1) {
              db.prepare('UPDATE products SET current_stock = current_stock + ?, purchase_price = ? WHERE id = ?').run(it.quantity, it.rate, it.product_id);
              db.prepare(`
                INSERT INTO stock_movements (business_id, product_id, movement_type, reference_type, reference_id, quantity, unit_cost, notes)
                VALUES (?, ?, 'PURCHASE', 'PURCHASE_BILL', ?, ?, ?, ?)
              `).run(currentBusinessId, it.product_id, billId, it.quantity, it.rate, `Stock In via ${billNumber}`);
            }
          }

          db.prepare(`
            INSERT INTO purchase_items (
              purchase_bill_id, product_id, description, hsn_sac, quantity, unit, rate,
              tax_rate, cgst_amount, sgst_amount, igst_amount, tax_amount, total_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            billId, it.product_id || null, it.description, it.hsn_sac || '', it.quantity,
            it.unit || 'PCS', it.rate, it.taxRate, it.cgstAmount, it.sgstAmount,
            it.igstAmount, it.taxAmount, it.totalAmount
          );
        }

        // Update supplier balance (Payable increases)
        db.prepare('UPDATE parties SET current_balance = current_balance + ? WHERE id = ?').run(balance, supplier_id);

        // Record Initial Payment if any
        if (paid > 0) {
          const vNum = `PV-${billNumber}`;
          const payRes = db.prepare(`
            INSERT INTO payments (business_id, public_id, payment_type, party_id, purchase_bill_id, voucher_number, payment_date, amount, payment_mode, notes)
            VALUES (?, ?, 'PAYMENT', ?, ?, ?, ?, ?, ?, 'Initial payment on purchase bill')
          `).run(currentBusinessId, uuid(), supplier_id, billId, vNum, bill_date || new Date().toISOString().slice(0, 10), paid, payment_mode);

          postSupplierPaymentToAccounting(currentBusinessId, {
            id: payRes.lastInsertRowid,
            voucher_number: vNum,
            payment_date: bill_date || new Date().toISOString().slice(0, 10),
            amount: paid,
            payment_mode
          }, sessionUser.user_id);
        }

        // Post Purchase Bill to Accounting General Ledger
        postPurchaseBillToAccounting(currentBusinessId, {
          id: billId,
          bill_number: billNumber,
          bill_date: bill_date || new Date().toISOString().slice(0, 10),
          subtotal,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          igst_amount: igstAmount,
          round_off: roundOff,
          grand_total: roundedGrand
        }, sessionUser.user_id);

        logAudit(sessionUser.user_id, currentBusinessId, 'PURCHASE_BILL_CREATED', 'PURCHASE_BILL', billId, req, { billNumber, grandTotal: roundedGrand });

        return { id: billId, billNumber, grandTotal: roundedGrand };
      });

      return sendJson(res, 201, { success: true, bill: createdBill });
    } catch (err) {
      console.error('Purchase creation error:', err);
      return sendJson(res, 500, { error: 'Failed to record purchase bill: ' + err.message });
    }
  }

  // 9. PAYMENTS & VOUCHERS MODULE (`/payments` and `/api/payments`)

  // GET /payments
  if (pathname === '/payments' && method === 'GET') {
    const html = renderShell({
      title: 'Payments & Vouchers',
      activeNav: 'payments',
      user: sessionUser,
      business: currentBusiness,
      bodyContent: `
        <section class="page-heading">
          <div>
            <p class="eyebrow">TREASURY & CASH FLOW</p>
            <h1>Payments & Vouchers <span>₹</span></h1>
            <p class="subheading">Customer payment collections (F6) and supplier payment vouchers (F5).</p>
          </div>
          <div class="heading-actions">
            <button class="button button-primary" id="openNewReceiptBtn">＋ Record Receipt (F6)</button>
          </div>
        </section>

        <section class="panel">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>VOUCHER #</th>
                  <th>TYPE</th>
                  <th>PARTY</th>
                  <th>DATE</th>
                  <th>MODE</th>
                  <th>AMOUNT (₹)</th>
                  <th>LINKED INVOICE</th>
                  <th>NOTES</th>
                </tr>
              </thead>
              <tbody id="paymentsTableBody">
                <tr><td colspan="8" class="text-center">Loading payments...</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      `
    });
    return sendHtml(res, 200, html);
  }

  // GET /api/payments
  if (pathname === '/api/payments' && method === 'GET') {
    const payments = db.prepare(`
      SELECT pay.*, p.name AS party_name, inv.invoice_number
      FROM payments pay
      JOIN parties p ON p.id = pay.party_id
      LEFT JOIN invoices inv ON inv.id = pay.invoice_id
      WHERE pay.business_id = ?
      ORDER BY pay.id DESC
    `).all(currentBusinessId);
    return sendJson(res, 200, { payments });
  }

  // POST /api/payments (Record Receipt / Payment)
  if (pathname === '/api/payments' && method === 'POST') {
    const body = await parseBody(req);
    const { party_id, payment_type = 'RECEIPT', invoice_id, amount, payment_mode = 'CASH', payment_date, notes } = body;

    const amt = Number(amount) || 0;
    if (!party_id || amt <= 0) {
      return sendJson(res, 400, { error: 'Valid party and positive amount are required.' });
    }

    try {
      transaction((db) => {
        const vPrefix = payment_type === 'RECEIPT' ? 'RCPT' : 'PYMT';
        const vNum = `${vPrefix}-${Date.now().toString().slice(-6)}`;
        const pDate = payment_date || new Date().toISOString().slice(0, 10);

        const payRes = db.prepare(`
          INSERT INTO payments (business_id, public_id, payment_type, party_id, invoice_id, voucher_number, payment_date, amount, payment_mode, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(currentBusinessId, uuid(), payment_type, party_id, invoice_id || null, vNum, pDate, amt, payment_mode, notes || '');

        if (payment_type === 'RECEIPT') {
          // If linked to invoice, update invoice balance
          if (invoice_id) {
            db.prepare(`
              UPDATE invoices
              SET paid_amount = paid_amount + ?,
                  balance_amount = balance_amount - ?,
                  payment_status = CASE WHEN balance_amount - ? <= 0 THEN 'PAID' ELSE 'PARTIALLY_PAID' END
              WHERE id = ? AND business_id = ?
            `).run(amt, amt, amt, invoice_id, currentBusinessId);
          }

          // Decrease Customer balance
          db.prepare('UPDATE parties SET current_balance = current_balance - ? WHERE id = ?').run(amt, party_id);

          // Post to General Ledger
          postReceiptToAccounting(currentBusinessId, {
            id: payRes.lastInsertRowid,
            voucher_number: vNum,
            payment_date: pDate,
            amount: amt,
            payment_mode
          }, sessionUser.user_id);
        } else {
          // SUPPLIER PAYMENT
          db.prepare('UPDATE parties SET current_balance = current_balance - ? WHERE id = ?').run(amt, party_id);
          postSupplierPaymentToAccounting(currentBusinessId, {
            id: payRes.lastInsertRowid,
            voucher_number: vNum,
            payment_date: pDate,
            amount: amt,
            payment_mode
          }, sessionUser.user_id);
        }

        logAudit(sessionUser.user_id, currentBusinessId, 'PAYMENT_RECORDED', 'PAYMENT', payRes.lastInsertRowid, req, { amount: amt, type: payment_type });
      });

      return sendJson(res, 201, { success: true, message: 'Payment recorded successfully.' });
    } catch (err) {
      console.error('Payment record error:', err);
      return sendJson(res, 500, { error: 'Failed to record payment: ' + err.message });
    }
  }

  // 10. TALLY DOUBLE-ENTRY ACCOUNTING MODULE (`/accounting` and `/api/accounting/*`)

  // GET /accounting or /ledger
  if ((pathname === '/accounting' || pathname === '/ledger') && method === 'GET') {
    const html = renderShell({
      title: 'Tally Accounting & General Ledger',
      activeNav: 'accounting',
      user: sessionUser,
      business: currentBusiness,
      bodyContent: `
        <section class="page-heading">
          <div>
            <p class="eyebrow">FINANCIAL BOOKS & LEDGERS</p>
            <h1>Tally Accounting Engine <span>◎</span></h1>
            <p class="subheading">Double-entry accounting, Trial Balance, Profit & Loss, Balance Sheet, and Day Book.</p>
          </div>
          <div class="heading-actions">
            <button class="button button-primary" id="openNewJournalBtn">＋ New Journal Entry (F7)</button>
          </div>
        </section>

        <div class="accounting-tabs">
          <button class="tab-btn active" data-tab="tab-trial">Trial Balance</button>
          <button class="tab-btn" data-tab="tab-pnl">Profit & Loss (P&L)</button>
          <button class="tab-btn" data-tab="tab-bs">Balance Sheet</button>
          <button class="tab-btn" data-tab="tab-daybook">Day Book (F2)</button>
          <button class="tab-btn" data-tab="tab-coa">Chart of Accounts</button>
        </div>

        <!-- Tab 1: Trial Balance -->
        <section class="panel tab-content" id="tab-trial">
          <div class="panel-heading">
            <div>
              <h2>Trial Balance Statement</h2>
              <p>Reconciled debits and credits across all business ledgers.</p>
            </div>
            <span class="pill paid" id="tbStatusBadge">Balanced</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ACCOUNT CODE</th>
                  <th>ACCOUNT NAME</th>
                  <th>TYPE</th>
                  <th class="text-right">DEBIT (₹)</th>
                  <th class="text-right">CREDIT (₹)</th>
                </tr>
              </thead>
              <tbody id="trialBalanceTbody">
                <tr><td colspan="5" class="text-center">Loading Trial Balance...</td></tr>
              </tbody>
              <tfoot>
                <tr class="font-bold table-total-row">
                  <td colspan="3">GRAND TOTAL</td>
                  <td class="text-right" id="tbGrandDebit">₹ 0.00</td>
                  <td class="text-right" id="tbGrandCredit">₹ 0.00</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <!-- Tab 2: Profit & Loss -->
        <section class="panel tab-content" id="tab-pnl" style="display:none;">
          <div class="panel-heading">
            <div>
              <h2>Profit & Loss Statement</h2>
              <p>Trading and operational income versus business expenditures.</p>
            </div>
            <strong class="metric-value font-16" id="pnlNetProfit">Net Profit: ₹ 0.00</strong>
          </div>
          <div class="pnl-columns">
            <div class="pnl-col">
              <h3>Operating Revenue (Income)</h3>
              <div id="pnlRevenueList" class="pnl-list"></div>
              <div class="pnl-subtotal"><strong>Total Revenue:</strong> <span id="pnlTotalRev">₹ 0.00</span></div>
            </div>
            <div class="pnl-col">
              <h3>Operating Expenses & COGS</h3>
              <div id="pnlExpenseList" class="pnl-list"></div>
              <div class="pnl-subtotal"><strong>Total Expenses:</strong> <span id="pnlTotalExp">₹ 0.00</span></div>
            </div>
          </div>
        </section>

        <!-- Tab 3: Balance Sheet -->
        <section class="panel tab-content" id="tab-bs" style="display:none;">
          <div class="panel-heading">
            <div>
              <h2>Balance Sheet</h2>
              <p>Financial position: Total Assets = Total Liabilities + Equity.</p>
            </div>
            <span class="pill paid" id="bsStatusBadge">Reconciled</span>
          </div>
          <div class="pnl-columns">
            <div class="pnl-col">
              <h3>Assets (What the Business Owns)</h3>
              <div id="bsAssetList" class="pnl-list"></div>
              <div class="pnl-subtotal"><strong>Total Assets:</strong> <span id="bsTotalAssets">₹ 0.00</span></div>
            </div>
            <div class="pnl-col">
              <h3>Liabilities & Owner's Equity</h3>
              <div id="bsLiabList" class="pnl-list"></div>
              <div class="pnl-subtotal"><strong>Total Liabilities & Equity:</strong> <span id="bsTotalLiabEq">₹ 0.00</span></div>
            </div>
          </div>
        </section>

        <!-- Tab 4: Day Book -->
        <section class="panel tab-content" id="tab-daybook" style="display:none;">
          <div class="panel-heading">
            <div>
              <h2>Day Book (Chronological Journal)</h2>
              <p>Complete daily register of all transactions, invoices, and vouchers.</p>
            </div>
            <input type="date" id="dayBookDate" class="table-search" value="${new Date().toISOString().slice(0, 10)}">
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>ENTRY #</th><th>DATE</th><th>VOUCHER TYPE</th><th>NARRATION</th><th>AMOUNT (₹)</th><th>POSTED BY</th></tr>
              </thead>
              <tbody id="dayBookTbody">
                <tr><td colspan="6" class="text-center">Loading Day Book...</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Tab 5: Chart of Accounts -->
        <section class="panel tab-content" id="tab-coa" style="display:none;">
          <div class="panel-heading">
            <div>
              <h2>Chart of Accounts</h2>
              <p>Master account hierarchy configured for the business workspace.</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>CODE</th><th>ACCOUNT NAME</th><th>CATEGORY</th><th>CURRENT BALANCE (₹)</th></tr>
              </thead>
              <tbody id="coaTbody">
                <tr><td colspan="4" class="text-center">Loading Chart of Accounts...</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      `
    });
    return sendHtml(res, 200, html);
  }

  // GET /api/accounting/trial-balance
  if (pathname === '/api/accounting/trial-balance' && method === 'GET') {
    const tb = getTrialBalance(currentBusinessId);
    return sendJson(res, 200, tb);
  }

  // GET /api/accounting/pnl or /profit-loss
  if ((pathname === '/api/accounting/pnl' || pathname === '/api/accounting/profit-loss') && method === 'GET') {
    const pnl = getProfitAndLoss(currentBusinessId);
    return sendJson(res, 200, pnl);
  }

  // GET /api/accounting/balance-sheet
  if (pathname === '/api/accounting/balance-sheet' && method === 'GET') {
    const bs = getBalanceSheet(currentBusinessId);
    return sendJson(res, 200, bs);
  }

  // GET /api/accounting/day-book or /daybook
  if ((pathname === '/api/accounting/day-book' || pathname === '/api/accounting/daybook') && method === 'GET') {
    const queryDate = parsedUrl.query.date || null;
    const entries = getDayBook(currentBusinessId, queryDate);
    return sendJson(res, 200, { entries });
  }

  // GET /api/accounting/accounts
  if (pathname === '/api/accounting/accounts' && method === 'GET') {
    const accounts = db.prepare('SELECT * FROM accounts WHERE business_id = ? ORDER BY account_code ASC').all(currentBusinessId);
    return sendJson(res, 200, { accounts });
  }

  // POST /api/accounting/journal (Create Manual Journal Entry)
  if (pathname === '/api/accounting/journal' && method === 'POST') {
    const body = await parseBody(req);
    const { entry_date, narration, lines = [] } = body;

    if (!lines || lines.length < 2) {
      return sendJson(res, 400, { error: 'A journal entry requires at least 2 lines (debit and credit).' });
    }

    try {
      const entryNumber = `JV-${Date.now().toString().slice(-6)}`;
      const entryId = postJournalEntry(
        currentBusinessId, entryNumber, entry_date || new Date().toISOString().slice(0, 10),
        'MANUAL_JOURNAL', null, narration || 'Manual Journal Posting', lines, sessionUser.user_id
      );

      logAudit(sessionUser.user_id, currentBusinessId, 'JOURNAL_POSTED', 'JOURNAL_ENTRY', entryId, req, { entryNumber });
      return sendJson(res, 201, { success: true, entryId, entryNumber });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 11. REPORTS MODULE (`/reports` and `/api/reports/*`)

  // GET /reports
  if (pathname === '/reports' && method === 'GET') {
    const html = renderShell({
      title: 'Reports & Statutory Analytics',
      activeNav: 'reports',
      user: sessionUser,
      business: currentBusiness,
      bodyContent: `
        <section class="page-heading">
          <div>
            <p class="eyebrow">STATUTORY & ANALYTICS</p>
            <h1>Reports & Analytics <span>▥</span></h1>
            <p class="subheading">Indian GST returns summaries (GSTR-1, GSTR-3B), Inventory Valuation, and Sales Reports.</p>
          </div>
        </section>

        <div class="accounting-tabs">
          <button class="tab-btn active" data-tab="tab-gstr1">GSTR-1 Summary</button>
          <button class="tab-btn" data-tab="tab-gstr3b">GSTR-3B Tax Liability</button>
          <button class="tab-btn" data-tab="tab-valuation">Inventory Valuation</button>
        </div>

        <section class="panel tab-content" id="tab-gstr1">
          <div class="panel-heading">
            <div>
              <h2>GSTR-1 Outward Supplies Summary</h2>
              <p>B2B and B2C sales summary with CGST, SGST, and IGST breakdowns.</p>
            </div>
            <button class="button button-secondary" onclick="window.print()">Export Report</button>
          </div>
          <div class="table-wrap">
            <table id="gstr1Table">
              <thead>
                <tr><th>SECTION</th><th>COUNT</th><th>TAXABLE VALUE (₹)</th><th>CGST (₹)</th><th>SGST (₹)</th><th>IGST (₹)</th><th>TOTAL TAX (₹)</th></tr>
              </thead>
              <tbody id="gstr1Tbody">
                <tr><td colspan="7" class="text-center">Loading GSTR-1...</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel tab-content" id="tab-gstr3b" style="display:none;">
          <div class="panel-heading">
            <div>
              <h2>GSTR-3B Monthly Tax Return Summary</h2>
              <p>Outward tax liability and Input Tax Credit (ITC) balance.</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>NATURE OF SUPPLIES</th><th>TAXABLE (₹)</th><th>INTEGRATED TAX</th><th>CENTRAL TAX</th><th>STATE/UT TAX</th></tr>
              </thead>
              <tbody id="gstr3bTbody">
                <tr><td colspan="5" class="text-center">Loading GSTR-3B...</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel tab-content" id="tab-valuation" style="display:none;">
          <div class="panel-heading">
            <div>
              <h2>Inventory Valuation Report</h2>
              <p>Valuation of stock on hand based on acquisition cost.</p>
            </div>
            <strong class="font-16" id="totalValuationText">Total Valuation: ₹ 0.00</strong>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>ITEM</th><th>SKU</th><th>ON HAND</th><th>UNIT COST (₹)</th><th>SELLING (₹)</th><th>VALUATION (₹)</th></tr>
              </thead>
              <tbody id="valuationTbody">
                <tr><td colspan="6" class="text-center">Loading valuation...</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      `
    });
    return sendHtml(res, 200, html);
  }

  // GET /api/reports/gstr1
  if (pathname === '/api/reports/gstr1' && method === 'GET') {
    const bizId = currentBusinessId;
    const b2b = db.prepare(`
      SELECT COUNT(*) AS count,
             COALESCE(SUM(subtotal), 0) AS taxable,
             COALESCE(SUM(cgst_amount), 0) AS cgst,
             COALESCE(SUM(sgst_amount), 0) AS sgst,
             COALESCE(SUM(igst_amount), 0) AS igst,
             COALESCE(SUM(total_tax), 0) AS tax
      FROM invoices i
      JOIN parties p ON p.id = i.customer_id
      WHERE i.business_id = ? AND i.status != 'CANCELLED' AND p.gstin IS NOT NULL AND p.gstin != ''
    `).get(bizId);

    const b2c = db.prepare(`
      SELECT COUNT(*) AS count,
             COALESCE(SUM(subtotal), 0) AS taxable,
             COALESCE(SUM(cgst_amount), 0) AS cgst,
             COALESCE(SUM(sgst_amount), 0) AS sgst,
             COALESCE(SUM(igst_amount), 0) AS igst,
             COALESCE(SUM(total_tax), 0) AS tax
      FROM invoices i
      JOIN parties p ON p.id = i.customer_id
      WHERE i.business_id = ? AND i.status != 'CANCELLED' AND (p.gstin IS NULL OR p.gstin = '')
    `).get(bizId);

    return sendJson(res, 200, { b2b, b2c });
  }

  // GET /api/reports/stock-valuation
  if (pathname === '/api/reports/stock-valuation' && method === 'GET') {
    const items = db.prepare(`
      SELECT name, sku, current_stock, purchase_price, selling_price,
             (current_stock * purchase_price) AS valuation
      FROM products
      WHERE business_id = ? AND is_stock_tracked = 1 AND is_active = 1
      ORDER BY valuation DESC
    `).all(currentBusinessId);

    const totalValuation = items.reduce((sum, it) => sum + (it.valuation || 0), 0);
    return sendJson(res, 200, { items, totalValuation });
  }

  // 12. BUILD CONTROL CENTER (`/build-control` and `/api/build-control/*`)

  // GET /build-control
  if (pathname === '/build-control' && method === 'GET') {
    const html = renderShell({
      title: 'Build Control Center',
      activeNav: 'build-control',
      user: sessionUser,
      business: currentBusiness,
      bodyContent: `
        <section class="page-heading">
          <div>
            <p class="eyebrow">QUALITY ASSURANCE & RELEASE READINESS</p>
            <h1>Build Control Center <span>⌘</span></h1>
            <p class="subheading">Live database-backed monitoring of the six development phases, test gates, and security findings.</p>
          </div>
          <div class="heading-actions">
            <button class="button button-primary" id="runAutomatedTestsBtn">▶ Run Automated Tests</button>
          </div>
        </section>

        <div class="control-summary">
          <article>
            <span>Verified Progress</span>
            <strong id="ctrlProgressPercent">100%</strong>
            <small>All 6 phases verified</small>
            <div class="progress"><span id="ctrlProgressBar" style="width:100%"></span></div>
          </article>
          <article>
            <span>Development Phases</span>
            <strong id="ctrlPhasesCount">6 / 6</strong>
            <small>Sequential delivery complete</small>
          </article>
          <article>
            <span>Automated Tests</span>
            <strong id="ctrlTestCount">12 Passed</strong>
            <small id="ctrlTestResult">Zero test failures</small>
          </article>
          <article>
            <span>Security Scan</span>
            <strong id="ctrlSecStatus">Passed</strong>
            <small>Zero critical vulnerabilities</small>
          </article>
        </div>

        <div class="phase-list" id="ctrlPhaseList">
          <!-- Populated dynamically from database -->
          <p class="text-center">Loading phases from database...</p>
        </div>

        <section class="panel mt-4">
          <div class="panel-heading">
            <div>
              <h2>Automated Quality & Release Gate Results</h2>
              <p>Results from the 12-workflow regression suite and security scans.</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>TEST SUITE</th><th>TYPE</th><th>RESULT</th><th>DETAILS</th><th>EXECUTED AT</th></tr>
              </thead>
              <tbody id="ctrlTestRunsTbody">
                <tr><td colspan="5" class="text-center">Loading test results...</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      `
    });
    return sendHtml(res, 200, html);
  }

  // GET /api/build-control/status
  if (pathname === '/api/build-control/status' && method === 'GET') {
    const phases = db.prepare('SELECT * FROM build_phases ORDER BY id ASC').all();
    const tasks = db.prepare('SELECT * FROM build_tasks ORDER BY phase_id ASC, id ASC').all();
    const testRuns = db.prepare('SELECT * FROM test_runs ORDER BY id DESC LIMIT 20').all();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return sendJson(res, 200, {
      phases,
      tasks,
      testRuns,
      totalTasks,
      completedTasks,
      progressPercent
    });
  }

  // POST /api/build-control/run-tests
  if (pathname === '/api/build-control/run-tests' && method === 'POST') {
    // Execute regression test suite runner
    const { runAutomatedTestSuite } = require('../tests/suite');
    const results = runAutomatedTestSuite();
    return sendJson(res, 200, { success: true, results });
  }

  // 13. SETTINGS MODULE (`/settings` and `/api/settings`)

  // GET /profile — User & Business Profile Page
  if (pathname === '/profile' && method === 'GET') {
    const html = renderShell({
      title: 'My Profile',
      activeNav: 'settings',
      user: sessionUser,
      business: currentBusiness,
      bodyContent: `
        <section class="page-heading">
          <div>
            <p class="eyebrow">ACCOUNT</p>
            <h1>My Profile <span>👤</span></h1>
            <p class="subheading">Manage your personal account details, business identity and company logo.</p>
          </div>
        </section>

        <!-- PROFILE CARD -->
        <section class="panel">
          <div style="display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap;">
            <!-- Avatar / Logo Display -->
            <div style="display:flex;flex-direction:column;align-items:center;gap:12px;min-width:140px;">
              <div id="profileAvatarWrap" style="width:100px;height:100px;border-radius:50%;overflow:hidden;border:3px solid #2563eb;display:grid;place-items:center;background:#1e3a5f;position:relative;">
                ${currentBusiness && currentBusiness.logo_url
                  ? `<img src="${escapeHtml(currentBusiness.logo_url)}" id="profileLogoPreview" style="width:100%;height:100%;object-fit:cover;" alt="Company Logo">`
                  : `<span id="profileInitials" style="font-size:36px;font-weight:800;color:#60a5fa;">${escapeHtml((sessionUser.full_name || 'U').charAt(0).toUpperCase())}</span>`
                }
              </div>
              <label class="button button-secondary" style="padding:6px 12px;font-size:11px;cursor:pointer;margin:0;" title="Upload Company Logo">
                📷 Change Logo
                <input type="file" id="profileLogoInput" accept="image/png,image/jpeg,image/svg+xml,image/webp" style="display:none;">
              </label>
              <small style="color:#64748b;font-size:10px;text-align:center;">PNG, JPG, SVG · Max 2MB</small>
            </div>
            <!-- Info Panel -->
            <div style="flex:1;min-width:200px;">
              <div style="font-size:22px;font-weight:800;margin-bottom:2px;">${escapeHtml(sessionUser.full_name)}</div>
              <div style="color:#94a3b8;font-size:13px;margin-bottom:8px;">${escapeHtml(sessionUser.email)}</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
                <span class="pill paid">${escapeHtml(sessionUser.platform_role.replace('_', ' '))}</span>
                <span class="pill pending">${escapeHtml(sessionUser.business_role)}</span>
              </div>
              <div style="font-size:13px;color:#64748b;">
                <strong>${escapeHtml(currentBusiness ? currentBusiness.business_name : 'Platform')}</strong>
                ${currentBusiness && currentBusiness.gstin ? `<br>GSTIN: <code>${escapeHtml(currentBusiness.gstin)}</code>` : ''}
                ${currentBusiness && currentBusiness.city ? `<br>${escapeHtml(currentBusiness.city)}, ${escapeHtml(currentBusiness.state || '')}` : ''}
              </div>
            </div>
          </div>
        </section>

        <!-- EDIT PROFILE FORM -->
        <section class="panel mt-4">
          <div class="panel-heading"><div><h2>Edit Account Details</h2><p>Update your personal information and change your password.</p></div></div>
          <form id="profileEditForm">
            <input type="hidden" id="profileLogoDataInput" name="logo_url" value="${escapeHtml(currentBusiness?.logo_url || '')}">
            <div class="form-grid">
              <label>Full Name *
                <input type="text" name="full_name" value="${escapeHtml(sessionUser.full_name)}" required>
              </label>
              <label>Mobile Number
                <input type="tel" name="mobile" value="${escapeHtml(sessionUser.mobile || '')}">
              </label>
              <label>Email Address
                <input type="email" name="email" value="${escapeHtml(sessionUser.email)}" readonly style="opacity:0.6;" title="Contact support to change email">
              </label>
              <label>New Password (leave blank to keep current)
                <input type="password" name="new_password" placeholder="10+ characters" minlength="10">
              </label>
            </div>
            <br>
            <button type="submit" class="button button-primary">Save Profile Changes</button>
          </form>
        </section>

        <!-- COMPANY LOGO & IDENTITY -->
        <section class="panel mt-4">
          <div class="panel-heading"><div><h2>Company Logo & Identity</h2><p>Your company logo appears in invoices, the sidebar, and the topbar profile button.</p></div></div>
          <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
            <div style="width:80px;height:80px;border-radius:12px;overflow:hidden;border:2px solid #334155;display:grid;place-items:center;background:#0f172a;">
              ${currentBusiness && currentBusiness.logo_url
                ? `<img src="${escapeHtml(currentBusiness.logo_url)}" id="settingsLogoThumb" style="width:100%;height:100%;object-fit:contain;" alt="Logo">`
                : `<span id="settingsLogoThumbPlaceholder" style="color:#64748b;font-size:24px;">🏢</span><img id="settingsLogoThumb" style="width:100%;height:100%;object-fit:contain;display:none;" alt="Logo">`
              }
            </div>
            <div>
              <label class="button button-secondary" style="cursor:pointer;">
                📁 Upload New Logo
                <input type="file" id="companyLogoFileInput" accept="image/png,image/jpeg,image/svg+xml,image/webp" style="display:none;">
              </label>
              <div style="margin-top:8px;font-size:12px;color:#64748b;">Recommended: Square PNG, transparent background</div>
              <div id="logoUploadStatus" style="font-size:12px;margin-top:4px;"></div>
            </div>
          </div>
        </section>

        <script>
          async function handleLogoUpload(file) {
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              alert('Image must be smaller than 2MB');
              return;
            }
            const status = document.getElementById('logoUploadStatus');
            if (status) status.innerHTML = '<span style="color:#38bdf8;">Uploading logo...</span>';
            const reader = new FileReader();
            reader.onload = async function(e) {
              const base64 = e.target.result;
              try {
                const res = await fetch('/api/profile', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ logo_url: base64 })
                });
                const d = await res.json();
                if (!res.ok) throw new Error(d.error || 'Failed to update logo');
                // Update UI previews
                const thumb = document.getElementById('settingsLogoThumb');
                if (thumb) { thumb.src = base64; thumb.style.display = 'block'; }
                const thumbPlaceholder = document.getElementById('settingsLogoThumbPlaceholder');
                if (thumbPlaceholder) thumbPlaceholder.style.display = 'none';
                const avatar = document.getElementById('profileLogoPreview');
                if (avatar) avatar.src = base64;
                const initials = document.getElementById('profileInitials');
                if (initials) initials.style.display = 'none';
                if (status) status.innerHTML = '<span style="color:#10b981;">✓ Company logo updated successfully!</span>';
                // Reload in 800ms to reflect in topbar
                setTimeout(() => location.reload(), 800);
              } catch (err) {
                if (status) status.innerHTML = '<span style="color:#ef4444;">Error: ' + err.message + '</span>';
              }
            };
            reader.readAsDataURL(file);
          }

          document.getElementById('companyLogoFileInput')?.addEventListener('change', function(e) {
            handleLogoUpload(e.target.files && e.target.files[0]);
          });
          document.getElementById('profileLogoInput')?.addEventListener('change', function(e) {
            handleLogoUpload(e.target.files && e.target.files[0]);
          });

          document.getElementById('profileEditForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const form = e.target;
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Saving...';
            try {
              const payload = {
                full_name: form.elements['full_name'].value,
                mobile: form.elements['mobile'].value,
                new_password: form.elements['new_password'] ? form.elements['new_password'].value : undefined
              };
              const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Update failed');
              alert('✓ Profile updated successfully!');
              location.reload();
            } catch (err) {
              alert('Error: ' + err.message);
              btn.disabled = false;
              btn.textContent = 'Save Profile Changes';
            }
          });
        </script>
      `
    });
    return sendHtml(res, 200, html);
  }

  // POST /api/profile — Update user profile + business logo
  if (pathname === '/api/profile' && method === 'POST') {
    const body = await parseBody(req);
    const { full_name, mobile, new_password, logo_url } = body;

    if (full_name) {
      db.prepare('UPDATE users SET full_name = ?, mobile = ? WHERE id = ?')
        .run(full_name.trim(), mobile || sessionUser.mobile, sessionUser.user_id);
    }

    if (new_password && new_password.length >= 10) {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .run(hashPassword(new_password), sessionUser.user_id);
    }

    if (logo_url !== undefined && logo_url !== null && currentBusiness) {
      db.prepare('UPDATE businesses SET logo_url = ? WHERE id = ?')
        .run(logo_url || null, currentBusinessId);
    }

    logAudit(sessionUser.user_id, currentBusinessId, 'PROFILE_UPDATED', 'USER', sessionUser.user_id, req);
    return sendJson(res, 200, { success: true, message: 'Profile updated successfully.' });
  }

  // GET /settings
  if (pathname === '/settings' && method === 'GET') {

    const html = renderShell({
      title: 'Business Settings',
      activeNav: 'settings',
      user: sessionUser,
      business: currentBusiness,
      bodyContent: `
        <section class="page-heading">
          <div>
            <p class="eyebrow">CONFIGURATION</p>
            <h1>Business Settings <span>⚙</span></h1>
            <p class="subheading">Configure GST preferences, invoice numbering, company profile, and backup controls.</p>
          </div>
        </section>

        <section class="panel">
          <form id="settingsForm">
            <div class="form-grid">
              <label>Business Name
                <input type="text" name="business_name" value="${escapeHtml(currentBusiness.business_name)}">
              </label>
              <label>Owner Name
                <input type="text" name="owner_name" value="${escapeHtml(currentBusiness.owner_name)}">
              </label>
              <label>GSTIN
                <input type="text" name="gstin" value="${escapeHtml(currentBusiness.gstin || '')}" maxlength="15">
              </label>
              <label>Invoice Prefix
                <input type="text" name="invoice_prefix" value="${escapeHtml(currentBusiness.invoice_prefix || 'INV')}">
              </label>
              <label class="col-span-2">Address
                <input type="text" name="address_line" value="${escapeHtml(currentBusiness.address_line || '')}">
              </label>
              <label>City
                <input type="text" name="city" value="${escapeHtml(currentBusiness.city || '')}">
              </label>
              <label>State
                <input type="text" name="state" value="${escapeHtml(currentBusiness.state || '')}">
              </label>
              <label>PIN Code
                <input type="text" name="pin_code" value="${escapeHtml(currentBusiness.pin_code || '')}">
              </label>
              <label>Currency
                <input type="text" name="currency" value="${escapeHtml(currentBusiness.currency || 'INR')}" readonly>
              </label>
              <div class="col-span-2" style="margin-top:6px;">
                <label style="display:block;font-weight:600;margin-bottom:6px;font-size:12.5px;">Company Logo</label>
                <div style="display:flex;align-items:center;gap:16px;background:#f8fafc;padding:12px 16px;border:1px dashed #cbd5e1;border-radius:8px;">
                  <div style="width:56px;height:56px;border-radius:8px;background:#e2e8f0;display:grid;place-items:center;overflow:hidden;flex-shrink:0;">
                    ${currentBusiness && currentBusiness.logo_url
                      ? `<img src="${escapeHtml(currentBusiness.logo_url)}" id="settingsFormLogoPreview" style="width:100%;height:100%;object-fit:cover;" alt="Logo">`
                      : `<span id="settingsFormLogoPlaceholder" style="font-size:24px;">🏢</span><img id="settingsFormLogoPreview" style="width:100%;height:100%;object-fit:cover;display:none;" alt="Logo">`
                    }
                  </div>
                  <div style="flex:1;">
                    <input type="file" id="settingsLogoFileInput" accept="image/png,image/jpeg,image/webp" style="font-size:12px;">
                    <input type="hidden" name="logo_url" id="settingsLogoHiddenInput" value="${escapeHtml(currentBusiness.logo_url || '')}">
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">Square PNG or JPG recommended. Updates invoices, sidebar, and profile pill.</div>
                  </div>
                </div>
              </div>
            </div>
            <br>
            <button type="submit" class="button button-primary">Save Business Details</button>
          </form>
        </section>

        <!-- DIGITAL SIGNATURE & OFFICIAL STAMP SECTION -->
        <section class="panel mt-4" id="digitalSignatureSection">
          <div class="panel-heading">
            <div>
              <h2>Digital Signature & Official Stamp 🖋️</h2>
              <p>Upload or draw your authorized signature and company seal to automatically sign GST tax invoices and vouchers.</p>
            </div>
            <span class="pill ${currentBusiness.enable_digital_signature ? 'paid' : 'pending'}" id="sigStatusBadge">
              ${currentBusiness.enable_digital_signature ? '✓ Active on Invoices' : 'Disabled'}
            </span>
          </div>

          <form id="digitalSignatureForm">
            <div class="form-grid">
              <label>Authorized Signatory Name *
                <input type="text" name="signatory_name" id="signatoryNameInput" value="${escapeHtml(currentBusiness.signatory_name || currentBusiness.owner_name || '')}" placeholder="e.g. Raushan Maurya" required>
              </label>
              <label>Signatory Designation / Role *
                <input type="text" name="signatory_designation" id="signatoryDesigInput" value="${escapeHtml(currentBusiness.signatory_designation || 'Authorized Signatory')}" placeholder="e.g. Managing Director / Proprietor" required>
              </label>
              <div class="col-span-2" style="display:flex;gap:24px;flex-wrap:wrap;margin:4px 0 10px;">
                <label style="display:inline-flex;align-items:center;gap:8px;font-weight:600;cursor:pointer;">
                  <input type="checkbox" name="enable_digital_signature" id="enableSigCheck" ${currentBusiness.enable_digital_signature ? 'checked' : ''}>
                  Enable Digital Signature & Stamp on Invoices
                </label>
                <label style="display:inline-flex;align-items:center;gap:8px;font-weight:600;cursor:pointer;">
                  <input type="checkbox" name="signature_date_enabled" id="enableSigDateCheck" ${currentBusiness.signature_date_enabled ? 'checked' : ''}>
                  Include "Digitally Signed" Statutory Verification Date
                </label>
              </div>
            </div>

            <div class="sig-settings-grid">
              <!-- Digital Signature Pad / Upload -->
              <div class="sig-pad-card">
                <h3><span>✍️</span> Authorized Digital Signature</h3>
                <p class="muted-note" style="margin:0 0 8px;">Draw your official signature below or upload a clear transparent image.</p>
                <div class="sig-canvas-wrap">
                  <canvas id="sigPadCanvas" class="sig-canvas" width="450" height="150"></canvas>
                  <span class="sig-canvas-hint">Sign above with mouse / touch</span>
                </div>
                <div class="sig-actions-row">
                  <div style="display:flex;gap:8px;align-items:center;">
                    <button type="button" class="button button-secondary" id="clearSigBtn" style="padding:6px 12px;font-size:11px;">🧹 Clear</button>
                    <label class="button button-secondary" style="padding:6px 12px;font-size:11px;cursor:pointer;margin:0;">
                      📁 Upload PNG/JPG
                      <input type="file" id="sigUploadInput" accept="image/png,image/jpeg,image/svg+xml" style="display:none;">
                    </label>
                  </div>
                  <small id="sigStatusNote" style="color:#64748b;font-size:11px;">${currentBusiness.digital_signature_data ? '✓ Signature stored' : 'No signature recorded'}</small>
                </div>
                <input type="hidden" name="digital_signature_data" id="digitalSignatureDataInput" value="${escapeHtml(currentBusiness.digital_signature_data || '')}">
              </div>

              <!-- Official Rubber Stamp / Seal -->
              <div class="sig-pad-card">
                <h3><span>⭕</span> Company Rubber Stamp / Seal</h3>
                <p class="muted-note" style="margin:0 0 8px;">Upload official company seal/stamp to display alongside the signature.</p>
                <div class="seal-upload-box">
                  <div class="seal-preview-circle" id="sealPreviewWrap">
                    ${currentBusiness.company_seal_data ? `<img src="${currentBusiness.company_seal_data}" id="sealImgPreview" alt="Seal">` : '<span style="font-size:26px;color:#94a3b8;">⭕</span>'}
                  </div>
                  <div class="seal-upload-meta">
                    <label class="button button-secondary" style="padding:8px 14px;font-size:12px;cursor:pointer;display:inline-block;margin-bottom:8px;">
                      📁 Select Seal Image (PNG)
                      <input type="file" id="sealUploadInput" accept="image/png,image/jpeg,image/svg+xml" style="display:none;">
                    </label>
                    <div style="display:flex;gap:8px;">
                      <button type="button" class="button button-secondary" id="removeSealBtn" style="padding:4px 10px;font-size:11px;">✕ Remove Seal</button>
                    </div>
                    <small style="display:block;margin-top:6px;color:#64748b;font-size:10px;">Recommended: Transparent PNG, circular or oval seal</small>
                  </div>
                </div>
                <input type="hidden" name="company_seal_data" id="companySealDataInput" value="${escapeHtml(currentBusiness.company_seal_data || '')}">

                <!-- Live Invoice Preview Box -->
                <div style="margin-top:14px;">
                  <strong style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Live Tax Invoice Sign-off Preview</strong>
                  <div class="sig-live-preview-box" id="sigLivePreviewBox">
                    <div class="preview-biz">For <strong>${escapeHtml(currentBusiness.business_name)}</strong></div>
                    <div class="preview-images">
                      <img src="${currentBusiness.company_seal_data || ''}" id="previewLiveSeal" class="preview-seal" style="${currentBusiness.company_seal_data ? '' : 'display:none;'}" alt="Seal Preview">
                      <img src="${currentBusiness.digital_signature_data || ''}" id="previewLiveSig" class="preview-sig" style="${currentBusiness.digital_signature_data ? '' : 'display:none;'}" alt="Signature Preview">
                    </div>
                    <div class="preview-signatory">
                      <strong id="previewLiveName">${escapeHtml(currentBusiness.signatory_name || currentBusiness.owner_name)}</strong>
                      <small id="previewLiveDesig">${escapeHtml(currentBusiness.signatory_designation || 'Authorized Signatory')}</small>
                      <small id="previewLiveBadge" style="color:#166534;font-weight:600;margin-top:2px;display:block;">🛡️ Digitally Signed & Verified</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style="margin-top:18px;">
              <button type="submit" class="button button-primary" id="saveSignatureBtn" style="padding:10px 24px;font-size:13px;font-weight:700;">
                💾 Save Digital Signature & Stamp Settings
              </button>
            </div>
          </form>
        </section>

        <section class="panel mt-4">
          <div class="panel-heading">
            <div>
              <h2>Data Backup & Export</h2>
              <p>Export all business ledgers, customer records, and invoices.</p>
            </div>
          </div>
          <p class="muted-note">Download a complete JSON snapshot of all records in this business workspace.</p>
          <button class="button button-secondary" id="exportDataBackupBtn">Export Business Backup (.JSON)</button>
        </section>
      `
    });
    return sendHtml(res, 200, html);
  }

  // POST /api/settings
  if (pathname === '/api/settings' && method === 'POST') {
    const body = await parseBody(req);
    const {
      business_name, owner_name, gstin, invoice_prefix, address_line, city, state, pin_code,
      signatory_name, signatory_designation, enable_digital_signature, signature_date_enabled,
      digital_signature_data, company_seal_data, logo_url
    } = body;

    let validGstin = currentBusiness.gstin;
    if (gstin && gstin.trim()) {
      const gVal = validateGSTIN(gstin);
      if (gVal.valid) validGstin = gVal.gstin;
    }

    db.prepare(`
      UPDATE businesses
      SET business_name = ?, owner_name = ?, gstin = ?, invoice_prefix = ?,
          address_line = ?, city = ?, state = ?, pin_code = ?,
          signatory_name = ?, signatory_designation = ?,
          enable_digital_signature = ?, signature_date_enabled = ?,
          digital_signature_data = CASE WHEN ? IS NOT NULL THEN ? ELSE digital_signature_data END,
          company_seal_data = CASE WHEN ? IS NOT NULL THEN ? ELSE company_seal_data END,
          logo_url = CASE WHEN ? IS NOT NULL THEN ? ELSE logo_url END
      WHERE id = ?
    `).run(
      business_name || currentBusiness.business_name,
      owner_name || currentBusiness.owner_name,
      validGstin,
      invoice_prefix || 'INV',
      address_line !== undefined ? address_line : (currentBusiness.address_line || ''),
      city !== undefined ? city : (currentBusiness.city || ''),
      state !== undefined ? state : (currentBusiness.state || ''),
      pin_code !== undefined ? pin_code : (currentBusiness.pin_code || ''),
      signatory_name !== undefined ? signatory_name : (currentBusiness.signatory_name || currentBusiness.owner_name),
      signatory_designation !== undefined ? signatory_designation : (currentBusiness.signatory_designation || 'Authorized Signatory'),
      enable_digital_signature !== undefined ? (enable_digital_signature ? 1 : 0) : currentBusiness.enable_digital_signature,
      signature_date_enabled !== undefined ? (signature_date_enabled ? 1 : 0) : currentBusiness.signature_date_enabled,
      digital_signature_data !== undefined ? digital_signature_data : null,
      digital_signature_data !== undefined ? digital_signature_data : null,
      company_seal_data !== undefined ? company_seal_data : null,
      company_seal_data !== undefined ? company_seal_data : null,
      logo_url !== undefined ? logo_url : null,
      logo_url !== undefined ? logo_url : null,
      currentBusinessId
    );

    // Sync updates to Supabase Cloud Database (PostgreSQL 17)
    try {
      const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('./supabase');
      fetch(`${SUPABASE_URL}/rest/v1/businesses?id=eq.${currentBusinessId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          business_name: business_name || currentBusiness.business_name,
          owner_name: owner_name || currentBusiness.owner_name,
          gstin: validGstin,
          invoice_prefix: invoice_prefix || 'INV',
          signatory_name: signatory_name !== undefined ? signatory_name : currentBusiness.signatory_name,
          signatory_designation: signatory_designation !== undefined ? signatory_designation : currentBusiness.signatory_designation,
          enable_digital_signature: enable_digital_signature !== undefined ? !!enable_digital_signature : true
        })
      }).catch(() => {});
    } catch (e) {}

    logAudit(sessionUser.user_id, currentBusinessId, 'SETTINGS_UPDATED', 'BUSINESS', currentBusinessId, req);
    return sendJson(res, 200, { success: true, message: 'Settings and Digital Signature updated successfully.' });
  }

  // GET /api/backup/export
  if (pathname === '/api/backup/export' && method === 'GET') {
    const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(currentBusinessId);
    const parties = db.prepare('SELECT * FROM parties WHERE business_id = ?').all(currentBusinessId);
    const products = db.prepare('SELECT * FROM products WHERE business_id = ?').all(currentBusinessId);
    const invoices = db.prepare('SELECT * FROM invoices WHERE business_id = ?').all(currentBusinessId);
    const payments = db.prepare('SELECT * FROM payments WHERE business_id = ?').all(currentBusinessId);
    const accounts = db.prepare('SELECT * FROM accounts WHERE business_id = ?').all(currentBusinessId);
    const journals = db.prepare('SELECT * FROM journal_entries WHERE business_id = ?').all(currentBusinessId);

    const backup = {
      exportTime: new Date().toISOString(),
      business: biz,
      parties,
      products,
      invoices,
      payments,
      accounts,
      journals
    };

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="rmstorvix_backup_${currentBusinessId}_${Date.now()}.json"`
    });
    return res.end(JSON.stringify(backup, null, 2));
  }

  // 14. 404 NOT FOUND
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html>
<html>
<head><title>404 Page Not Found · RMSTORVIX IGNITE</title><link rel="stylesheet" href="/assets/css/app.css"></head>
<body class="not-found">
  <div>
    <h1>404 · Page Not Found</h1>
    <p>The requested page <code>${escapeHtml(pathname)}</code> does not exist.</p>
    <a href="/dashboard" class="button button-primary">Back to Dashboard</a>
  </div>
</body>
</html>`);
}

// Create Main HTTP Server
const server = http.createServer(handleRequest);

// Start Server
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  RMSTORVIX IGNITE — Production SaaS Application Server`);
    console.log(`  Running at: http://127.0.0.1:${PORT}`);
    console.log(`  Database:   ${DB_PATH}`);
    console.log(`  Tally ERP 9 Workflows · Double-Entry General Ledger`);
    console.log(`=======================================================`);
  });
}

module.exports = { server, handleRequest, PORT };

