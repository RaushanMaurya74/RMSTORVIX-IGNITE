<?php
declare(strict_types=1);
$stats = $stats ?? [];
?>
<!-- ADMIN DASHBOARD TITLE & CONTROLS (MATCHING IMAGE 1) -->
<div class="admin-dash-header">
  <div>
    <h2>Admin Dashboard</h2>
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
    <div class="kpi-number" id="kpiTotalBusinesses"><?= (int)($stats['totalBusinesses'] ?? 248) ?></div>
    <div class="kpi-trend up">
      <span>↑ 12%</span> <span style="color:#64748b;">vs. last month</span>
    </div>
  </div>

  <div class="kpi-card">
    <div class="kpi-top">
      <span class="kpi-icon-circle green">✓</span>
      <span class="kpi-title">Active Accounts</span>
    </div>
    <div class="kpi-number" id="kpiActiveAccounts"><?= (int)($stats['activeBusinesses'] ?? 212) ?></div>
    <div class="kpi-trend up">
      <span>↑ 10%</span> <span style="color:#64748b;">vs. last month</span>
    </div>
  </div>

  <div class="kpi-card">
    <div class="kpi-top">
      <span class="kpi-icon-circle orange">⏳</span>
      <span class="kpi-title">Pending Approvals</span>
    </div>
    <div class="kpi-number" id="kpiPendingApprovals"><?= (int)($stats['pendingApprovals'] ?? 12) ?></div>
    <div class="kpi-trend down">
      <span>↓ 3%</span> <span style="color:#64748b;">vs. last month</span>
    </div>
  </div>

  <div class="kpi-card">
    <div class="kpi-top">
      <span class="kpi-icon-circle red">✕</span>
      <span class="kpi-title">Rejected Accounts</span>
    </div>
    <div class="kpi-number" id="kpiRejectedAccounts"><?= (int)($stats['rejectedBusinesses'] ?? 8) ?></div>
    <div class="kpi-trend down">
      <span>↓ 2%</span> <span style="color:#64748b;">vs. last month</span>
    </div>
  </div>

  <div class="kpi-card">
    <div class="kpi-top">
      <span class="kpi-icon-circle purple">⏸</span>
      <span class="kpi-title">Suspended Accounts</span>
    </div>
    <div class="kpi-number" id="kpiSuspendedAccounts"><?= (int)($stats['suspendedBusinesses'] ?? 6) ?></div>
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

  <!-- Quick Actions (Matching Image 1) -->
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
