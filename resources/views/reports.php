<?php
declare(strict_types=1);
?>
<section class="page-heading">
  <div>
    <p class="eyebrow">STATUTORY COMPLIANCE & FINANCIALS</p>
    <h1>Business Analytics & Tax Reports <span>▥</span></h1>
    <p class="subheading">GSTR-1 outward supplies, GSTR-3B tax summary, Profit & Loss, and Balance Sheet.</p>
  </div>
  <div class="heading-actions">
    <button class="button button-secondary" onclick="window.print()">🖨 Print Report</button>
  </div>
</section>

<div class="metric-grid">
  <article class="metric-card">
    <div class="metric-top"><span>GSTR-1 Taxable Sales</span><span class="metric-icon blue">₹</span></div>
    <div class="metric-value" id="repTaxableSales">₹ 0.00</div>
  </article>
  <article class="metric-card">
    <div class="metric-top"><span>Total Output GST</span><span class="metric-icon green">₹</span></div>
    <div class="metric-value" id="repOutputGst">₹ 0.00</div>
  </article>
  <article class="metric-card">
    <div class="metric-top"><span>Net Profit (P&L)</span><span class="metric-icon purple">📈</span></div>
    <div class="metric-value" id="repNetProfit">₹ 0.00</div>
  </article>
  <article class="metric-card">
    <div class="metric-top"><span>Stock Valuation</span><span class="metric-icon orange">📦</span></div>
    <div class="metric-value" id="repStockVal">₹ 0.00</div>
  </article>
</div>

<section class="panel">
  <div class="panel-heading">
    <h2>GSTR-1 Summary (Outward Supplies)</h2>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>SECTION</th>
          <th>DESCRIPTION</th>
          <th>INVOICE COUNT</th>
          <th>TAXABLE VALUE</th>
          <th>IGST</th>
          <th>CGST</th>
          <th>SGST</th>
          <th>TOTAL TAX</th>
        </tr>
      </thead>
      <tbody id="gstr1TableBody">
        <tr><td colspan="8" class="text-center">Loading GSTR-1 data...</td></tr>
      </tbody>
    </table>
  </div>
</section>
