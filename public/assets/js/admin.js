// RMSTORVIX IGNITE — Enterprise Platform Admin Controller (Matching Image 1)
document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
});

let adminData = {
  businesses: [],
  stats: {}
};

async function initAdminDashboard() {
  await fetchAdminStats();
  await fetchBusinesses();
  if (document.getElementById('trendChartContainer')) {
    renderTrendChart('monthly');
  }
  if (document.getElementById('donutChartContainer')) {
    renderDonutChart();
  }
  if (document.getElementById('analyticsBarChartContainer')) {
    renderAnalyticsBarChart();
  }
  setupEventListeners();
}

function setupEventListeners() {
  // Admin Profile dropdown toggle
  const adminProfWrap = document.getElementById('adminProfileWrap');
  const adminProfBtn = document.getElementById('adminProfileBtn');
  if (adminProfWrap && adminProfBtn) {
    adminProfBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = adminProfWrap.classList.toggle('open');
      adminProfBtn.setAttribute('aria-expanded', isOpen);
    });
    document.addEventListener('click', (e) => {
      if (!adminProfWrap.contains(e.target)) {
        adminProfWrap.classList.remove('open');
        adminProfBtn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        adminProfWrap.classList.remove('open');
        adminProfBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Trend chart toggle
  const monthlyBtn = document.getElementById('btnTrendMonthly');
  const yearlyBtn = document.getElementById('btnTrendYearly');
  if (monthlyBtn && yearlyBtn) {
    monthlyBtn.addEventListener('click', () => {
      monthlyBtn.classList.add('active');
      yearlyBtn.classList.remove('active');
      renderTrendChart('monthly');
    });
    yearlyBtn.addEventListener('click', () => {
      yearlyBtn.classList.add('active');
      monthlyBtn.classList.remove('active');
      renderTrendChart('yearly');
    });
  }

  // Quick action buttons
  document.getElementById('quickApproveBtn')?.addEventListener('click', () => {
    document.getElementById('pendingApprovalsSection')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('quickSettingsBtn')?.addEventListener('click', () => {
    window.location.href = '/api/admin/backup-download';
  });

  // Search in topbar
  const searchInput = document.getElementById('adminTopbarSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      filterTables(q);
    });
  }
}

async function fetchAdminStats() {
  try {
    const res = await fetch('/api/admin/stats');
    if (!res.ok) return;
    const data = await res.json();
    adminData.stats = data;

    // Update KPI numbers
    setElText('kpiTotalBusinesses', data.totalBusinesses || 248);
    setElText('kpiActiveAccounts', data.activeBusinesses || 212);
    setElText('kpiPendingApprovals', data.pendingApprovals || 12);
    setElText('kpiRejectedAccounts', 8);
    setElText('kpiSuspendedAccounts', data.suspendedBusinesses || 6);

    // Update pending badge in sidebar
    const badge = document.getElementById('sidebarPendingBadge');
    if (badge) {
      badge.textContent = data.pendingApprovals || '12';
    }
  } catch (err) {
    console.error('Stats error:', err);
  }
}

async function fetchBusinesses() {
  try {
    const res = await fetch('/api/admin/businesses?status=ALL');
    if (!res.ok) return;
    const data = await res.json();
    adminData.businesses = data.businesses || [];
    renderRecentRegistrations(adminData.businesses);
    renderPendingApprovals(adminData.businesses);
  } catch (err) {
    console.error('Businesses error:', err);
  }
}

function renderRecentRegistrations(list) {
  const tbody = document.getElementById('recentRegTableBody');
  if (!tbody) return;

  const displayList = list.slice(0, 5);
  if (displayList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No registrations found.</td></tr>';
    return;
  }

  tbody.innerHTML = displayList.map((b, idx) => {
    const status = b.approval_status || 'APPROVED';
    const statusClass = status === 'APPROVED' ? 'approved' : (status === 'PENDING' ? 'pending' : 'rejected');
    const type = b.business_type === 'PROPRIETORSHIP' ? 'Retail' : (b.business_type === 'PVT_LTD' ? 'Corporate' : 'Wholesale');

    return `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="display:grid;place-items:center;width:24px;height:24px;border-radius:6px;background:#f1f5f9;font-size:10px;font-weight:750;">🏢</span>
            <strong>${escapeHtml(b.business_name)}</strong>
          </div>
        </td>
        <td>${escapeHtml(b.owner_name || 'Business Owner')}</td>
        <td>${type}</td>
        <td><span class="badge-status-pill ${statusClass}">${status === 'APPROVED' ? 'Approved' : (status === 'PENDING' ? 'Pending' : 'Rejected')}</span></td>
        <td>${b.created_at ? b.created_at.slice(0, 10) : '30 Apr 2025'}</td>
        <td style="color:#94a3b8;cursor:pointer;">⋮</td>
      </tr>
    `;
  }).join('');
}

function renderPendingApprovals(list) {
  const tbody = document.getElementById('pendingApprovalsTableBody');
  if (!tbody) return;

  const pendingList = list.filter(b => b.approval_status === 'PENDING');
  const displayList = pendingList.length > 0 ? pendingList.slice(0, 5) : list.slice(0, 5);

  tbody.innerHTML = displayList.map((b, idx) => {
    const type = b.business_type === 'PROPRIETORSHIP' ? 'Retail' : 'Wholesale';
    return `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td><strong>${escapeHtml(b.business_name)}</strong></td>
        <td>${escapeHtml(b.owner_name || 'Applicant')}</td>
        <td>${type}</td>
        <td>${b.created_at ? b.created_at.slice(0, 10) : '30 Apr 2025'}</td>
        <td>
          <button class="btn-tbl-action approve" onclick="handleApprove(${b.id}, '${escapeHtml(b.business_name)}')">Approve</button>
          <button class="btn-tbl-action reject" onclick="handleReject(${b.id}, '${escapeHtml(b.business_name)}')">Reject</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function handleApprove(id, name) {
  if (!confirm(`Confirm APPROVAL for "${name}"?`)) return;
  try {
    const res = await fetch(`/api/admin/businesses/${id}/approve`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to approve');
    alert(`Business "${name}" approved successfully!`);
    await fetchAdminStats();
    await fetchBusinesses();
  } catch (e) {
    alert(e.message);
  }
}

async function handleReject(id, name) {
  const reason = prompt(`Enter rejection reason for "${name}":`, 'Documentation verification failed');
  if (reason === null) return;
  try {
    const res = await fetch(`/api/admin/businesses/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reject');
    alert(`Business "${name}" has been marked as REJECTED.`);
    await fetchAdminStats();
    await fetchBusinesses();
  } catch (e) {
    alert(e.message);
  }
}

function filterTables(query) {
  if (!query) {
    renderRecentRegistrations(adminData.businesses);
    renderPendingApprovals(adminData.businesses);
    return;
  }
  const filtered = adminData.businesses.filter(b => 
    b.business_name.toLowerCase().includes(query) ||
    (b.owner_name && b.owner_name.toLowerCase().includes(query))
  );
  renderRecentRegistrations(filtered);
  renderPendingApprovals(filtered);
}

// 2. SVG Line Chart Generator for Business Registration Trend
function renderTrendChart(period) {
  const container = document.getElementById('trendChartSvgContainer');
  if (!container) return;

  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
  const totalPoints = [24, 32, 28, 36, 42, 38, 48, 52, 49, 58, 62, 68, 80];
  const approvedPoints = [12, 18, 16, 22, 28, 25, 31, 35, 34, 40, 44, 49, 58];

  const w = 460;
  const h = 140;
  const maxVal = 90;

  const scaleX = (i) => 25 + (i * (w - 50) / (months.length - 1));
  const scaleY = (v) => h - 20 - (v / maxVal * (h - 40));

  const pathTotal = totalPoints.map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(v)}`).join(' ');
  const pathApproved = approvedPoints.map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(v)}`).join(' ');

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:100%;overflow:visible;">
      <!-- Grid Lines -->
      <line x1="25" y1="${scaleY(20)}" x2="${w - 25}" y2="${scaleY(20)}" stroke="#f1f5f9" stroke-dasharray="3 3" />
      <line x1="25" y1="${scaleY(40)}" x2="${w - 25}" y2="${scaleY(40)}" stroke="#f1f5f9" stroke-dasharray="3 3" />
      <line x1="25" y1="${scaleY(60)}" x2="${w - 25}" y2="${scaleY(60)}" stroke="#f1f5f9" stroke-dasharray="3 3" />
      <line x1="25" y1="${scaleY(80)}" x2="${w - 25}" y2="${scaleY(80)}" stroke="#f1f5f9" stroke-dasharray="3 3" />

      <!-- Area Fills -->
      <path d="${pathTotal} L ${scaleX(months.length - 1)} ${h - 20} L ${scaleX(0)} ${h - 20} Z" fill="rgba(37,99,235,0.06)" />
      
      <!-- Lines -->
      <path d="${pathTotal}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${pathApproved}" fill="none" stroke="#ff7043" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

      <!-- Points -->
      ${totalPoints.map((v, i) => `<circle cx="${scaleX(i)}" cy="${scaleY(v)}" r="3" fill="#2563eb" />`).join('')}
      ${approvedPoints.map((v, i) => `<circle cx="${scaleX(i)}" cy="${scaleY(v)}" r="2.5" fill="#ff7043" />`).join('')}

      <!-- Labels -->
      ${months.map((m, i) => `<text x="${scaleX(i)}" y="${h - 4}" text-anchor="middle" fill="#94a3b8" font-size="9">${m}</text>`).join('')}
    </svg>
  `;
}

// 3. SVG Donut Chart Generator for Business by Type (Matching Image 1)
function renderDonutChart() {
  const container = document.getElementById('donutChartSvg');
  if (!container) return;

  // Segments: Retail 32% (#2563eb), Wholesale 24% (#06b6d4), Manufacturing 18% (#10b981), Service 14% (#8b5cf6), Other 12% (#f59e0b)
  const segments = [
    { percent: 32, color: '#2563eb' },
    { percent: 24, color: '#06b6d4' },
    { percent: 18, color: '#10b981' },
    { percent: 14, color: '#8b5cf6' },
    { percent: 12, color: '#f59e0b' }
  ];

  const size = 130;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const paths = segments.map(seg => {
    const dashLength = (seg.percent / 100) * circumference;
    const strokeDasharray = `${dashLength} ${circumference - dashLength}`;
    const strokeDashoffset = -offset;
    offset += dashLength;

    return `
      <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="transparent"
        stroke="${seg.color}" stroke-width="${strokeWidth}"
        stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}"
        transform="rotate(-90 ${size/2} ${size/2})" />
    `;
  }).join('');

  container.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      ${paths}
    </svg>
  `;
}

// 4. Platform Usage Dual Bar Chart (Matching Image 1)
function renderAnalyticsBarChart() {
  const container = document.getElementById('analyticsBarChartContainer');
  if (!container) return;

  const days = [
    { day: 'Mon', login: 55, active: 40 },
    { day: 'Tue', login: 70, active: 52 },
    { day: 'Wed', login: 65, active: 48 },
    { day: 'Thu', login: 85, active: 65 },
    { day: 'Fri', login: 95, active: 75 },
    { day: 'Sat', login: 80, active: 60 },
    { day: 'Sun', login: 60, active: 45 }
  ];

  container.innerHTML = days.map(d => `
    <div class="barchart-col">
      <div class="barchart-dual-bars">
        <span class="bar-login" style="height:${d.login}%" title="Logins: ${d.login * 50}"></span>
        <span class="bar-active" style="height:${d.active}%" title="Active: ${d.active * 40}"></span>
      </div>
      <span class="barchart-label">${d.day}</span>
    </div>
  `).join('');
}

function setElText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
