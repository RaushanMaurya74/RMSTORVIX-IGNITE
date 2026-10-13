<?php declare(strict_types=1); ?>
<section class="page-heading">
  <div><p class="eyebrow">TUESDAY, OCTOBER 13, 2026</p><h1>Good evening, Raushan <span>✦</span></h1><p class="subheading">Here’s what’s happening with your business today.</p></div>
  <div class="heading-actions"><button class="button button-secondary" id="dateRange">▦ &nbsp; This month⌄</button><button class="button button-primary" id="createInvoice">＋ Create invoice</button></div>
</section>
<section class="metric-grid" aria-label="Business summary">
  <article class="metric-card"><div class="metric-top"><span>Sales this month</span><span class="metric-icon blue">↗</span></div><div class="metric-value">₹ 2,84,650</div><div class="metric-foot"><span class="trend positive">↗ 12.8%</span><span>vs. last month</span><svg class="sparkline" viewBox="0 0 100 30" aria-hidden="true"><path d="M1 25 L12 21 L22 23 L32 13 L43 17 L54 8 L65 13 L75 5 L86 9 L99 2"/></svg></div></article>
  <article class="metric-card"><div class="metric-top"><span>Receivables</span><span class="metric-icon orange">₹</span></div><div class="metric-value">₹ 68,420</div><div class="metric-foot"><span class="trend warning">12 overdue</span><span>invoices need attention</span></div><div class="mini-progress"><span style="width:62%"></span></div></article>
  <article class="metric-card"><div class="metric-top"><span>Stock items</span><span class="metric-icon purple">▧</span></div><div class="metric-value">1,248</div><div class="metric-foot"><span class="trend warning">8 low stock</span><span>across 2 warehouses</span></div><div class="mini-progress purple-progress"><span style="width:78%"></span></div></article>
  <article class="metric-card"><div class="metric-top"><span>Net profit</span><span class="metric-icon green">⌁</span></div><div class="metric-value">₹ 74,280</div><div class="metric-foot"><span class="trend positive">↗ 8.4%</span><span>vs. last month</span><svg class="sparkline green-line" viewBox="0 0 100 30" aria-hidden="true"><path d="M1 26 L12 20 L22 24 L32 16 L43 18 L54 9 L65 14 L75 6 L86 10 L99 3"/></svg></div></article>
</section>
<section class="dashboard-grid">
  <article class="panel sales-panel">
    <div class="panel-heading"><div><h2>Sales overview</h2><p>Track sales performance over time</p></div><select aria-label="Sales chart period"><option>Last 7 months</option><option>Last 30 days</option><option>This year</option></select></div>
    <div class="chart-legend"><span><i class="legend-sales"></i> Sales</span><span><i class="legend-purchases"></i> Purchases</span><strong>₹ 2.84L <small>total sales</small></strong></div>
    <div class="chart" role="img" aria-label="Sample bar chart of monthly sales and purchases">
      <div class="y-labels"><span>₹ 3L</span><span>₹ 2L</span><span>₹ 1L</span><span>₹ 0</span></div>
      <div class="chart-area"><div class="grid-line g1"></div><div class="grid-line g2"></div><div class="grid-line g3"></div><div class="grid-line g4"></div>
      <?php foreach ([['Jan',42,25],['Feb',58,38],['Mar',49,30],['Apr',72,44],['May',61,37],['Jun',86,54],['Jul',77,48]] as $bar): ?>
      <div class="bar-group"><div class="bars"><span class="bar sales-bar" style="height:<?= $bar[1] ?>%"></span><span class="bar purchase-bar" style="height:<?= $bar[2] ?>%"></span></div><small><?= $bar[0] ?></small></div>
      <?php endforeach; ?>
      </div>
    </div>
  </article>
  <article class="panel quick-panel"><div class="panel-heading"><div><h2>Quick actions</h2><p>Common tasks, one click away</p></div><span class="more">•••</span></div>
    <div class="quick-actions">
      <button class="quick-action" data-action="New invoice"><span class="quick-icon q-blue">＋</span><span><strong>New invoice</strong><small>Create a sales invoice</small></span><b>↗</b></button>
      <button class="quick-action" data-action="Add customer"><span class="quick-icon q-purple">♙</span><span><strong>Add customer</strong><small>Save a customer profile</small></span><b>↗</b></button>
      <button class="quick-action" data-action="Add product"><span class="quick-icon q-orange">▧</span><span><strong>Add product</strong><small>Update your catalogue</small></span><b>↗</b></button>
      <button class="quick-action" data-action="Record expense"><span class="quick-icon q-green">₹</span><span><strong>Record expense</strong><small>Track a business expense</small></span><b>↗</b></button>
    </div>
  </article>
</section>
<section class="panel transactions-panel">
  <div class="panel-heading"><div><h2>Recent invoices</h2><p>Your latest sales activity <span class="sample-label">SAMPLE</span></p></div><a class="text-link" href="#invoices">View all invoices →</a></div>
  <div class="table-wrap"><table><thead><tr><th>INVOICE</th><th>CUSTOMER</th><th>DATE</th><th>AMOUNT</th><th>STATUS</th><th></th></tr></thead><tbody>
  <tr><td><strong>INV-2026-0142</strong></td><td><span class="table-avatar av-blue">AS</span> Amit Sharma</td><td>13 Oct 2026</td><td class="amount">₹ 18,500.00</td><td><span class="pill paid">Paid</span></td><td>•••</td></tr>
  <tr><td><strong>INV-2026-0141</strong></td><td><span class="table-avatar av-orange">PK</span> Priya Kumari</td><td>12 Oct 2026</td><td class="amount">₹ 7,240.00</td><td><span class="pill pending">Partially paid</span></td><td>•••</td></tr>
  <tr><td><strong>INV-2026-0140</strong></td><td><span class="table-avatar av-purple">RK</span> Rajesh Kumar</td><td>12 Oct 2026</td><td class="amount">₹ 12,800.00</td><td><span class="pill overdue">Overdue</span></td><td>•••</td></tr>
  <tr><td><strong>INV-2026-0139</strong></td><td><span class="table-avatar av-green">SG</span> Suman Gupta</td><td>11 Oct 2026</td><td class="amount">₹ 4,650.00</td><td><span class="pill paid">Paid</span></td><td>•••</td></tr>
  </tbody></table></div>
</section>
<div class="notice-row"><span class="notice-icon">ⓘ</span><span><strong>Phase 1 preview:</strong> This dashboard is a UI foundation with sample figures. Invoice and quick-action controls are demonstration interactions until the billing module is implemented.</span><a href="/build-control">View build status →</a></div>
