<?php
declare(strict_types=1);
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Register your business · RMSTORVIX IGNITE</title>
  <link rel="icon" type="image/png" href="/assets/images/favicon.png">
  <link rel="stylesheet" href="/assets/css/auth.css">
  <style>
    .signup-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .signup-full {
      grid-column: span 2;
    }
    .auth-card-clean.signup-card {
      max-width: 640px;
    }
  </style>
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

    <!-- 2x3 Feature Grid -->
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

    <div class="hero-footer-trust">
      <span>🛡 Secure & Reliable</span>
      <span>☁ Access From Anywhere</span>
      <span>🎧 Dedicated Support</span>
    </div>
  </aside>

  <!-- RIGHT FORM PANEL -->
  <main class="auth-form-side">
    <div class="top-auth-link">
      Already have an account? <a href="/login">Sign In →</a>
    </div>

    <div class="auth-card-clean signup-card">
      <div class="auth-card-header">
        <div class="auth-card-logo">
          <img src="/assets/images/logo.png" alt="RMSTORVIX IGNITE">
        </div>
        <div class="auth-card-brand">RMSTORVIX <span>IGNITE</span></div>
        <h2>Create Business Account</h2>
        <p>Set up your company workspace in seconds.</p>
      </div>

      <?php if (!empty($flash)): ?>
        <div class="auth-notice-box" style="margin-bottom:16px;background:<?= ($flash['type'] ?? '') === 'error' ? '#fef2f2' : '#eff6ff' ?>;border-color:<?= ($flash['type'] ?? '') === 'error' ? '#fecaca' : '#bfdbfe' ?>;color:<?= ($flash['type'] ?? '') === 'error' ? '#b91c1c' : '#1e40af' ?>;">
          <span><?= ($flash['type'] ?? '') === 'error' ? '⚠️' : 'ℹ️' ?></span>
          <div><?= htmlspecialchars($flash['msg'] ?? '') ?></div>
        </div>
      <?php endif; ?>

      <form id="signupForm" method="POST" action="/signup">
        <?= csrf() ?>
        <div class="signup-grid">
          <div class="auth-input-group signup-full">
            <label>Legal Business Name *</label>
            <div class="auth-input-wrap">
              <span class="auth-input-icon">🏢</span>
              <input type="text" name="business_name" required placeholder="e.g. Apex Global Solutions Pvt Ltd">
            </div>
          </div>

          <div class="auth-input-group">
            <label>Owner / Primary Contact *</label>
            <div class="auth-input-wrap">
              <span class="auth-input-icon">👤</span>
              <input type="text" name="owner_name" required placeholder="e.g. Raushan Kumar">
            </div>
          </div>

          <div class="auth-input-group">
            <label>Entity Structure</label>
            <div class="auth-input-wrap">
              <select name="business_type" style="width:100%;height:44px;padding:0 12px;border:1px solid var(--auth-line);border-radius:9px;font-size:13.5px;color:#0f172a;background:#ffffff;">
                <option value="PROPRIETORSHIP">Proprietorship</option>
                <option value="PVT_LTD">Private Limited (Pvt Ltd)</option>
                <option value="LLP">LLP</option>
                <option value="PARTNERSHIP">Partnership</option>
              </select>
            </div>
          </div>

          <div class="auth-input-group">
            <label>GSTIN (15 characters)</label>
            <div class="auth-input-wrap">
              <span class="auth-input-icon">🧾</span>
              <input type="text" name="gstin" placeholder="e.g. 27AAACA1234A1Z5" maxlength="15" style="text-transform:uppercase;">
            </div>
          </div>

          <div class="auth-input-group">
            <label>Mobile Number *</label>
            <div class="auth-input-wrap">
              <span class="auth-input-icon">📱</span>
              <input type="tel" name="mobile" required placeholder="e.g. 9876543210" maxlength="10">
            </div>
          </div>

          <div class="auth-input-group signup-full">
            <label>Work Email Address *</label>
            <div class="auth-input-wrap">
              <span class="auth-input-icon">✉️</span>
              <input type="email" name="email" required placeholder="owner@company.com">
            </div>
          </div>

          <div class="auth-input-group signup-full">
            <label>Account Password (10+ characters) *</label>
            <div class="auth-input-wrap">
              <span class="auth-input-icon">🔒</span>
              <input type="password" id="signupPass" name="password" required placeholder="••••••••••••" minlength="10">
              <button type="button" class="auth-input-toggle" onclick="togglePasswordVisibility('signupPass', this)" aria-label="Toggle password view">👁</button>
            </div>
          </div>
        </div>

        <div class="auth-notice-box" style="margin:16px 0;">
          <label style="display:flex;align-items:flex-start;gap:8px;font-size:11.5px;color:#1e40af;cursor:pointer;">
            <input type="checkbox" name="consent" required checked style="margin-top:2px;">
            <span>I understand that registrations enter <strong>Pending Approval</strong> status and must be verified by Platform Administrator before access is activated.</span>
          </label>
        </div>

        <button type="submit" class="btn-auth-primary" style="background:linear-gradient(90deg, #ff5722 0%, #f43f5e 100%);">
          <span>→</span> Submit Business for Verification
        </button>
      </form>
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
