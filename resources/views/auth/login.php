<?php
declare(strict_types=1);
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in to your workspace · RMSTORVIX IGNITE</title>
  <link rel="icon" type="image/png" href="/assets/images/favicon.png">
  <link rel="stylesheet" href="/assets/css/auth.css">
</head>
<body class="auth-split-body">
<div class="auth-container">
  <!-- LEFT HERO PANEL (MATCHING IMAGE 2) -->
  <aside class="auth-hero">
    <div class="hero-header">
      <img src="/assets/images/logo.png" alt="RMSTORVIX IGNITE Logo" class="hero-logo">
      <div class="hero-brand-text">
        <strong>RMSTORVIX</strong>
        <small>IGNITE</small>
      </div>
      <span style="margin-left:auto;font-size:10.5px;color:#94a3b8;font-weight:600;">Smart Business • Better Tomorrow</span>
    </div>

    <div class="hero-copy">
      <h1>Power Your Business with <span>RMSTORVIX IGNITE</span></h1>
      <p>Complete Billing, Inventory, Accounting & Business Management Solution — All in One Platform.</p>
    </div>

    <!-- 2x3 Feature Grid (Matching Image 2) -->
    <div class="hero-features">
      <div class="feature-box">
        <div class="feature-icon">📑</div>
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

    <!-- Mini Dashboard Mockup Visual (Matching Image 2) -->
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
      New to RMSTORVIX IGNITE? <a href="/signup">Create an Account →</a>
    </div>

    <div class="auth-card-clean">
      <div class="auth-card-header">
        <div class="auth-card-logo">
          <img src="/assets/images/logo.png" alt="RMSTORVIX IGNITE">
        </div>
        <div class="auth-card-brand">RMSTORVIX <span>IGNITE</span></div>
        <h2>Welcome Back!</h2>
        <p>Sign in to your account and continue your journey.</p>
      </div>

      <?php if (!empty($flash)): ?>
        <div class="auth-notice-box" style="margin-bottom:16px;background:<?= ($flash['type'] ?? '') === 'error' ? '#fef2f2' : '#eff6ff' ?>;border-color:<?= ($flash['type'] ?? '') === 'error' ? '#fecaca' : '#bfdbfe' ?>;color:<?= ($flash['type'] ?? '') === 'error' ? '#b91c1c' : '#1e40af' ?>;">
          <span><?= ($flash['type'] ?? '') === 'error' ? '⚠️' : 'ℹ️' ?></span>
          <div><?= htmlspecialchars($flash['msg'] ?? '') ?></div>
        </div>
      <?php endif; ?>

      <form id="loginForm" method="POST" action="/login">
        <?= csrf() ?>
        <div class="auth-input-group">
          <label>Email or Mobile Number</label>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">✉️</span>
            <input type="text" name="email" required autocomplete="username" placeholder="Enter your registered email or mobile number" value="<?= htmlspecialchars($email ?? '') ?>" autofocus>
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
          <a href="/reset-password">Forgot password?</a>
        </div>

        <button type="submit" class="btn-auth-primary" style="background:linear-gradient(90deg, #ff5722 0%, #f43f5e 100%);">
          <span>→</span> Login
        </button>
      </form>

      <div class="auth-or-divider"><span>OR</span></div>

      <div class="auth-social-row">
        <button type="button" class="btn-social" onclick="alert('Google SSO integration ready for enterprise domains.');">
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.33 21.46 7.37 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2 0 10.04 0 12s.46 3.8 1.27 5.42l4.01-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.33 2.54 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
          Continue with Google
        </button>
        <button type="button" class="btn-social" onclick="alert('OTP Login will send a one-time passcode to your verified phone number.');">
          <span>📱</span> Continue with OTP
        </button>
      </div>

      <div class="auth-notice-box">
        <span>ℹ️</span>
        <div><strong>Your account is pending approval:</strong> You will be able to access the system once an administrator approves your registration.</div>
      </div>
    </div>

    <div class="auth-footer-note">
      🔒 Your data is safe and encrypted · <strong>RMSTORVIX IGNITE</strong> | v1.0.0
    </div>
  </main>
</div>

<script>
function togglePasswordVisibility(fieldId, btn) {
  const f = document.getElementById(fieldId);
  if (!f) return;
  if (f.type === 'password') {
    f.type = 'text';
    btn.textContent = '🙈';
  } else {
    f.type = 'password';
    btn.textContent = '👁';
  }
}
</script>
<script src="/assets/js/auth.js"></script>
</body>
</html>
