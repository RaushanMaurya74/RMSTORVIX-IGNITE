<?php
declare(strict_types=1);
?>
<!doctype html>
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
      <span style="margin-left:auto;font-size:11px;font-weight:750;color:#ff8c42;background:rgba(255,87,34,0.15);padding:4px 10px;border-radius:12px;border:1px solid rgba(255,87,34,0.3);">Admin Portal</span>
    </div>

    <div class="hero-copy">
      <h1>Manage • Monitor • Control <br><span>RMSTORVIX IGNITE</span> Platform</h1>
      <p>Complete control over businesses, users and system operations. Build a safer, smarter and more efficient platform.</p>
    </div>

    <!-- 2x3 Admin Feature Grid (Matching Image 3) -->
    <div class="hero-features">
      <div class="feature-box">
        <div class="feature-icon" style="background:rgba(37,99,235,0.2);color:#60a5fa;">🏢</div>
        <div class="feature-body">
          <strong>Business Management</strong>
          <span>View, approve and manage all business accounts</span>
        </div>
      </div>
      <div class="feature-box">
        <div class="feature-icon" style="background:rgba(255,87,34,0.2);color:#ff8c42;">👥</div>
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
            <div class="mockup-mini-card" style="border-left:3px solid #ef4444;"></div>
          </div>
          <div class="mockup-mini-chart">
            <span class="mockup-bar" style="height:35%;"></span>
            <span class="mockup-bar orange" style="height:60%;"></span>
            <span class="mockup-bar" style="height:80%;"></span>
            <span class="mockup-bar orange" style="height:45%;"></span>
            <span class="mockup-bar" style="height:95%;"></span>
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
      <a href="/login" style="color:#64748b;">← Back to Tenant Business Login</a>
    </div>

    <div class="auth-card-clean">
      <div class="auth-card-header">
        <div class="auth-card-logo">
          <img src="/assets/images/logo.png" alt="RMSTORVIX IGNITE">
        </div>
        <div class="auth-card-brand">RMSTORVIX <span>IGNITE</span></div>
        <h2>Admin Login</h2>
        <p>Sign in to access the platform administration panel.</p>
      </div>

      <?php if (!empty($flash)): ?>
        <div class="auth-notice-box" style="margin-bottom:16px;background:<?= ($flash['type'] ?? '') === 'error' ? '#fef2f2' : '#eff6ff' ?>;border-color:<?= ($flash['type'] ?? '') === 'error' ? '#fecaca' : '#bfdbfe' ?>;color:<?= ($flash['type'] ?? '') === 'error' ? '#b91c1c' : '#1e40af' ?>;">
          <span><?= ($flash['type'] ?? '') === 'error' ? '⚠️' : 'ℹ️' ?></span>
          <div><?= htmlspecialchars($flash['msg'] ?? '') ?></div>
        </div>
      <?php endif; ?>

      <form method="POST" action="/admin/login">
        <?= csrf() ?>
        <div class="auth-input-group">
          <label>Email / Username</label>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">👤</span>
            <input type="email" name="email" value="<?= htmlspecialchars($email ?? '') ?>" required placeholder="Enter your email or admin username" autocomplete="username" autofocus>
          </div>
        </div>

        <div class="auth-input-group">
          <label>Password</label>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">🔒</span>
            <input type="password" id="adminPassInput" name="password" required placeholder="Enter your password" autocomplete="current-password" value="">
            <button type="button" class="auth-input-toggle" onclick="togglePasswordVisibility('adminPassInput', this)" aria-label="Toggle password view">👁</button>
          </div>
        </div>

        <div class="auth-form-row">
          <label>
            <input type="checkbox" name="remember" checked> Remember me
          </label>
          <a href="#" onclick="alert('Super Admin key can be rotated from the server CLI: node bin/create-admin.js'); return false;">Forgot password?</a>
        </div>

        <button type="submit" class="btn-auth-primary btn-auth-admin" style="background:linear-gradient(90deg, #ff5722 0%, #ea580c 100%);">
          <span>→</span> Login
        </button>
      </form>

      <div class="auth-or-divider"><span>OR</span></div>

      <button type="button" class="btn-social" style="width:100%;margin-bottom:16px;" onclick="alert('Google Admin SSO is configured for verified organization accounts.');">
        <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.33 21.46 7.37 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2 0 10.04 0 12s.46 3.8 1.27 5.42l4.01-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.33 2.54 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
        Login with Google
      </button>

      <div class="auth-notice-box" style="background:#eff6ff;border-color:#bfdbfe;color:#1e40af;">
        <span>🛡️</span>
        <div><strong>Authorized personnel only:</strong> This is a secure admin portal. Unauthorized access is prohibited.</div>
      </div>
    </div>

    <div class="auth-footer-note">
      <strong>RMSTORVIX IGNITE</strong> v1.0.0 · © 2025 RMSTORVIX. All rights reserved.
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
</body>
</html>
